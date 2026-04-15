import { create } from 'zustand'
import type { GridState, Placement, ObjectType, Team } from '../types'
import { DEFAULT_GRID_WIDTH, DEFAULT_GRID_HEIGHT, DEFAULT_TEAMS, DEFAULT_GRID_X_MIN, DEFAULT_GRID_X_MAX, DEFAULT_GRID_Y_MIN, DEFAULT_GRID_Y_MAX } from '../constants/gridConfig'
import { OBJECT_DEFINITIONS } from '../constants/objectDefinitions'
import { cellKey } from '../utils/serialization'
import { getExclusionZone, getAllianceArea, getAreaOwnerAtCell, isAllianceNetworkConnected } from '../utils/gameCoords'

interface HistoryEntry {
  past: GridState[]
  present: GridState
  future: GridState[]
}

interface GridStore extends HistoryEntry {
  getCellMap: () => Map<string, Placement>

  addPlacement: (col: number, row: number, type: ObjectType, teamId: string) => void
  removePlacement: (id: string) => void
  movePlacement: (id: string, col: number, row: number) => void
  updatePlacementLabel: (id: string, label: string) => void
  updatePlacement: (id: string, updates: Partial<{ teamId: string; label: string }>) => void
  updateTeam: (id: string, updates: Partial<Omit<Team, 'id'>>) => void
  addTeam: () => void
  removeTeam: (id: string) => void
  setGridRange: (xMin: number, xMax: number, yMin: number, yMax: number) => void
  resetToSolarCitadelTemplate: () => void
  resetToFreeMode: () => void

  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  loadState: (state: GridState) => void
  clearAll: () => void
  getPresentState: () => GridState
}

const DEFAULT_SOLAR_CITADEL: Placement = {
  id: 'solar-citadel-default',
  type: 'solar_citadel',
  col: 11,
  row: 11,
  teamId: '',
}

const defaultGridState = (): GridState => ({
  gridWidth: DEFAULT_GRID_WIDTH,
  gridHeight: DEFAULT_GRID_HEIGHT,
  gridXMin: DEFAULT_GRID_X_MIN,
  gridXMax: DEFAULT_GRID_X_MAX,
  gridYMin: DEFAULT_GRID_Y_MIN,
  gridYMax: DEFAULT_GRID_Y_MAX,
  placements: [DEFAULT_SOLAR_CITADEL],
  teams: DEFAULT_TEAMS,
})

function isCityInExclusionZone(col: number, row: number, cellSpan: number, placements: Placement[]): boolean {
  const sc = placements.find(p => p.type === 'solar_citadel')
  if (!sc) return false
  const zone = getExclusionZone(sc)
  for (let r = row; r < row + cellSpan; r++) {
    for (let c = col; c < col + cellSpan; c++) {
      if (c >= zone.colMin && c < zone.colMax && r >= zone.rowMin && r < zone.rowMax) return true
    }
  }
  return false
}

// クマ罠の配置可否: 同チームのエリアに3×3全マスが内包
function isBearTrapPlaceable(col: number, row: number, cellSpan: number, teamId: string, placements: Placement[]): boolean {
  const allies = placements.filter(p => p.teamId === teamId && (p.type === 'alliance_hq' || p.type === 'flag'))
  for (const a of allies) {
    const def = OBJECT_DEFINITIONS[a.type]
    if (def.areaRadius === undefined) continue
    const area = getAllianceArea(a, def.cellSpan, def.areaRadius)
    let allInside = true
    for (let r = row; r < row + cellSpan; r++) {
      for (let c = col; c < col + cellSpan; c++) {
        if (c < area.colMin || c >= area.colMax || r < area.rowMin || r >= area.rowMax) {
          allInside = false
          break
        }
      }
      if (!allInside) break
    }
    if (allInside) return true
  }
  return false
}

// 敵チームエリア内かチェック（先置き優先）
function isInEnemyArea(col: number, row: number, span: number, teamId: string, placements: Placement[]): boolean {
  const areaBuildings = placements.filter(p => p.teamId !== '' && (p.type === 'alliance_hq' || p.type === 'flag'))
  for (let r = row; r < row + span; r++) {
    for (let c = col; c < col + span; c++) {
      const owner = getAreaOwnerAtCell(c, r, areaBuildings, OBJECT_DEFINITIONS)
      if (owner !== null && owner !== teamId) return true
    }
  }
  return false
}

function checkPlacementRules(
  col: number, row: number, type: ObjectType, teamId: string, placements: Placement[]
): boolean {
  const def = OBJECT_DEFINITIONS[type]
  if (type === 'city' && isCityInExclusionZone(col, row, def.cellSpan, placements)) return false
  if (type === 'flag') {
    const hypotheticalFlag: Placement = { id: '__hypothetical__', type: 'flag', col, row, teamId }
    if (!isAllianceNetworkConnected(teamId, [...placements, hypotheticalFlag], OBJECT_DEFINITIONS)) return false
  }
  if (type === 'bear_trap' && !isBearTrapPlaceable(col, row, def.cellSpan, teamId, placements)) return false
  if (teamId !== '' && isInEnemyArea(col, row, def.cellSpan, teamId, placements)) return false
  return true
}

export const useGridStore = create<GridStore>((set, get) => ({
  past: [],
  present: defaultGridState(),
  future: [],

  getCellMap: () => {
    const { placements } = get().present
    const map = new Map<string, Placement>()
    for (const p of placements) {
      const span = OBJECT_DEFINITIONS[p.type].cellSpan
      for (let r = p.row; r < p.row + span; r++) {
        for (let c = p.col; c < p.col + span; c++) {
          map.set(cellKey(c, r), p)
        }
      }
    }
    return map
  },

  addPlacement: (col, row, type, teamId) => {
    const { present, past } = get()
    const def = OBJECT_DEFINITIONS[type]

    if (def.maxCount !== undefined) {
      const count = present.placements.filter(p => p.type === type).length
      if (count >= def.maxCount) return
    }

    if (col + def.cellSpan > present.gridWidth || row + def.cellSpan > present.gridHeight) return
    if (col < 0 || row < 0) return

    const cellMap = get().getCellMap()
    for (let r = row; r < row + def.cellSpan; r++) {
      for (let c = col; c < col + def.cellSpan; c++) {
        if (cellMap.has(cellKey(c, r))) return
      }
    }

    if (!checkPlacementRules(col, row, type, teamId, present.placements)) return

    const newPlacement: Placement = {
      id: crypto.randomUUID(),
      type,
      col,
      row,
      teamId,
    }

    set({ past: [...past, present], present: { ...present, placements: [...present.placements, newPlacement] }, future: [] })
  },

  removePlacement: (id) => {
    const { present, past } = get()
    set({ past: [...past, present], present: { ...present, placements: present.placements.filter(p => p.id !== id) }, future: [] })
  },

  movePlacement: (id, col, row) => {
    const { present, past } = get()
    const placement = present.placements.find(p => p.id === id)
    if (!placement) return

    const def = OBJECT_DEFINITIONS[placement.type]

    if (col + def.cellSpan > present.gridWidth || row + def.cellSpan > present.gridHeight) return
    if (col < 0 || row < 0) return

    const otherPlacements = present.placements.filter(p => p.id !== id)
    const cellMap = new Map<string, Placement>()
    for (const p of otherPlacements) {
      const span = OBJECT_DEFINITIONS[p.type].cellSpan
      for (let r = p.row; r < p.row + span; r++) {
        for (let c = p.col; c < p.col + span; c++) {
          cellMap.set(cellKey(c, r), p)
        }
      }
    }

    for (let r = row; r < row + def.cellSpan; r++) {
      for (let c = col; c < col + def.cellSpan; c++) {
        if (cellMap.has(cellKey(c, r))) return
      }
    }

    if (!checkPlacementRules(col, row, placement.type, placement.teamId, otherPlacements)) return

    set({
      past: [...past, present],
      present: { ...present, placements: present.placements.map(p => p.id === id ? { ...p, col, row } : p) },
      future: [],
    })
  },

  updatePlacementLabel: (id, label) => {
    const { present, past } = get()
    set({ past: [...past, present], present: { ...present, placements: present.placements.map(p => p.id === id ? { ...p, label } : p) }, future: [] })
  },

  updatePlacement: (id, updates) => {
    const { present, past } = get()
    set({ past: [...past, present], present: { ...present, placements: present.placements.map(p => p.id === id ? { ...p, ...updates } : p) }, future: [] })
  },

  updateTeam: (id, updates) => {
    const { present } = get()
    set({ present: { ...present, teams: present.teams.map(t => t.id === id ? { ...t, ...updates } : t) } })
  },

  addTeam: () => {
    const { present } = get()
    const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
    const color = colors[present.teams.length % colors.length]
    const newTeam: Team = { id: crypto.randomUUID(), name: `チーム${present.teams.length + 1}`, color }
    set({ present: { ...present, teams: [...present.teams, newTeam] } })
  },

  removeTeam: (id) => {
    const { present, past } = get()
    set({
      past: [...past, present],
      present: {
        ...present,
        teams: present.teams.filter(t => t.id !== id),
        placements: present.placements.map(p => p.teamId === id ? { ...p, teamId: '' } : p),
      },
      future: [],
    })
  },

  setGridRange: (xMin, xMax, yMin, yMax) => {
    const { present, past } = get()
    // x = gridXMax - row → rowの数 = xの範囲 = gridHeight
    // y = gridYMax - col → colの数 = yの範囲 = gridWidth
    const gridHeight = xMax - xMin + 1
    const gridWidth = yMax - yMin + 1
    set({
      past: [...past, present],
      present: { ...present, gridXMin: xMin, gridXMax: xMax, gridYMin: yMin, gridYMax: yMax, gridWidth, gridHeight },
      future: [],
    })
  },

  resetToSolarCitadelTemplate: () => {
    set({ past: [], present: defaultGridState(), future: [] })
  },

  resetToFreeMode: () => {
    const freeState: GridState = {
      gridWidth: DEFAULT_GRID_WIDTH,
      gridHeight: DEFAULT_GRID_HEIGHT,
      gridXMin: DEFAULT_GRID_X_MIN,
      gridXMax: DEFAULT_GRID_X_MAX,
      gridYMin: DEFAULT_GRID_Y_MIN,
      gridYMax: DEFAULT_GRID_Y_MAX,
      placements: [],
      teams: DEFAULT_TEAMS,
    }
    set({ past: [], present: freeState, future: [] })
  },

  undo: () => {
    const { past, present, future } = get()
    if (past.length === 0) return
    const previous = past[past.length - 1]
    set({ past: past.slice(0, -1), present: previous, future: [present, ...future] })
  },

  redo: () => {
    const { past, present, future } = get()
    if (future.length === 0) return
    const next = future[0]
    set({ past: [...past, present], present: next, future: future.slice(1) })
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  loadState: (state) => {
    // 旧形式の互換性（gridXMin等がない場合はデフォルト値を補完）
    const normalized: GridState = {
      ...{
        gridXMin: DEFAULT_GRID_X_MIN,
        gridXMax: DEFAULT_GRID_X_MAX,
        gridYMin: DEFAULT_GRID_Y_MIN,
        gridYMax: DEFAULT_GRID_Y_MAX,
      },
      ...state,
    }
    set({ past: [], present: normalized, future: [] })
  },

  clearAll: () => {
    const { present, past } = get()
    set({ past: [...past, present], present: { ...present, placements: [] }, future: [] })
  },

  getPresentState: () => get().present,
}))
