import { create } from 'zustand'
import type { GridState, Placement, ObjectType, Team } from '../types'
import { DEFAULT_GRID_WIDTH, DEFAULT_GRID_HEIGHT, DEFAULT_TEAMS } from '../constants/gridConfig'
import { OBJECT_DEFINITIONS } from '../constants/objectDefinitions'
import { cellKey } from '../utils/serialization'
import { getExclusionZone } from '../utils/gameCoords'

interface HistoryEntry {
  past: GridState[]
  present: GridState
  future: GridState[]
}

interface GridStore extends HistoryEntry {
  // Derived
  getCellMap: () => Map<string, Placement>

  // Mutations
  addPlacement: (col: number, row: number, type: ObjectType, teamId: string) => void
  removePlacement: (id: string) => void
  movePlacement: (id: string, col: number, row: number) => void
  updatePlacementLabel: (id: string, label: string) => void
  updateTeam: (id: string, updates: Partial<Omit<Team, 'id'>>) => void
  addTeam: () => void
  removeTeam: (id: string) => void

  // History
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  // Layout
  loadState: (state: GridState) => void
  clearAll: () => void
  getPresentState: () => GridState
}

const defaultGridState = (): GridState => ({
  gridWidth: DEFAULT_GRID_WIDTH,
  gridHeight: DEFAULT_GRID_HEIGHT,
  placements: [],
  teams: DEFAULT_TEAMS,
})

function isCityInExclusionZone(
  col: number,
  row: number,
  cellSpan: number,
  placements: Placement[]
): boolean {
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

    // Check maxCount
    if (def.maxCount !== undefined) {
      const count = present.placements.filter(p => p.type === type).length
      if (count >= def.maxCount) return
    }

    // Check bounds
    if (col + def.cellSpan > present.gridWidth || row + def.cellSpan > present.gridHeight) return
    if (col < 0 || row < 0) return

    // Check conflicts
    const cellMap = get().getCellMap()
    for (let r = row; r < row + def.cellSpan; r++) {
      for (let c = col; c < col + def.cellSpan; c++) {
        if (cellMap.has(cellKey(c, r))) return
      }
    }

    // 都市は排除ゾーン内に配置不可
    if (type === 'city' && isCityInExclusionZone(col, row, def.cellSpan, present.placements)) return

    const newPlacement: Placement = {
      id: crypto.randomUUID(),
      type,
      col,
      row,
      teamId,
    }

    const newPresent: GridState = {
      ...present,
      placements: [...present.placements, newPlacement],
    }

    set({ past: [...past, present], present: newPresent, future: [] })
  },

  removePlacement: (id) => {
    const { present, past } = get()
    const newPresent: GridState = {
      ...present,
      placements: present.placements.filter(p => p.id !== id),
    }
    set({ past: [...past, present], present: newPresent, future: [] })
  },

  movePlacement: (id, col, row) => {
    const { present, past } = get()
    const placement = present.placements.find(p => p.id === id)
    if (!placement) return

    const def = OBJECT_DEFINITIONS[placement.type]

    // Check bounds
    if (col + def.cellSpan > present.gridWidth || row + def.cellSpan > present.gridHeight) return
    if (col < 0 || row < 0) return

    // Check conflicts (exclude self)
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

    // 都市は排除ゾーン内に移動不可（太陽城自身は除く）
    if (placement.type === 'city' && isCityInExclusionZone(col, row, def.cellSpan, otherPlacements)) return

    const newPresent: GridState = {
      ...present,
      placements: present.placements.map(p =>
        p.id === id ? { ...p, col, row } : p
      ),
    }
    set({ past: [...past, present], present: newPresent, future: [] })
  },

  updatePlacementLabel: (id, label) => {
    const { present, past } = get()
    const newPresent: GridState = {
      ...present,
      placements: present.placements.map(p => p.id === id ? { ...p, label } : p),
    }
    set({ past: [...past, present], present: newPresent, future: [] })
  },

  updateTeam: (id, updates) => {
    const { present } = get()
    const newPresent: GridState = {
      ...present,
      teams: present.teams.map(t => t.id === id ? { ...t, ...updates } : t),
    }
    set({ present: newPresent })
  },

  addTeam: () => {
    const { present } = get()
    const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
    const color = colors[present.teams.length % colors.length]
    const newTeam: Team = {
      id: crypto.randomUUID(),
      name: `チーム${present.teams.length + 1}`,
      color,
    }
    set({ present: { ...present, teams: [...present.teams, newTeam] } })
  },

  removeTeam: (id) => {
    const { present, past } = get()
    const newPresent: GridState = {
      ...present,
      teams: present.teams.filter(t => t.id !== id),
      placements: present.placements.map(p =>
        p.teamId === id ? { ...p, teamId: '' } : p
      ),
    }
    set({ past: [...past, present], present: newPresent, future: [] })
  },

  undo: () => {
    const { past, present, future } = get()
    if (past.length === 0) return
    const previous = past[past.length - 1]
    set({
      past: past.slice(0, -1),
      present: previous,
      future: [present, ...future],
    })
  },

  redo: () => {
    const { past, present, future } = get()
    if (future.length === 0) return
    const next = future[0]
    set({
      past: [...past, present],
      present: next,
      future: future.slice(1),
    })
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  loadState: (state) => {
    set({ past: [], present: state, future: [] })
  },

  clearAll: () => {
    const { present, past } = get()
    const newPresent: GridState = { ...present, placements: [] }
    set({ past: [...past, present], present: newPresent, future: [] })
  },

  getPresentState: () => get().present,
}))
