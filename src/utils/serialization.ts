import LZString from 'lz-string'
import type { GridState, ObjectType, Placement, Team } from '../types'

// ─── 共通ユーティリティ ───────────────────────────────────────────────────────

export function cellKey(col: number, row: number): string {
  return `${col},${row}`
}

export function isURLTooLong(encoded: string): boolean {
  // ベースURL + "?layout=" (9文字) + エンコード文字列が2000文字を超えると警告
  return encoded.length > 1991
}

// ─── V1 形式（旧来の全GridState JSON圧縮）────────────────────────────────────

const VALID_TYPES = new Set<string>([
  'city', 'solar_citadel', 'cannon', 'alliance_hq', 'flag', 'bear_trap', 'fortress',
])

function isValidPlacement(p: unknown): p is Placement {
  if (typeof p !== 'object' || p === null) return false
  const obj = p as Record<string, unknown>
  if (typeof obj.id !== 'string') return false
  if (!VALID_TYPES.has(obj.type as string)) return false
  if (typeof obj.col !== 'number' || obj.col < 0 || obj.col > 999 || !Number.isInteger(obj.col)) return false
  if (typeof obj.row !== 'number' || obj.row < 0 || obj.row > 999 || !Number.isInteger(obj.row)) return false
  if (typeof obj.teamId !== 'string') return false
  return true
}

function isValidTeam(t: unknown): t is Team {
  if (typeof t !== 'object' || t === null) return false
  const obj = t as Record<string, unknown>
  if (typeof obj.id !== 'string') return false
  if (typeof obj.name !== 'string') return false
  if (typeof obj.color !== 'string') return false
  return true
}

export function encodeLayout(state: GridState): string {
  const json = JSON.stringify(state)
  return LZString.compressToEncodedURIComponent(json)
}

export function decodeLayout(param: string): GridState | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(param)
    if (!json) return null
    const parsed = JSON.parse(json)
    if (typeof parsed !== 'object' || parsed === null) return null
    if (!Array.isArray(parsed.placements) || !Array.isArray(parsed.teams)) return null

    // 不正な要素を除去して続行（クラッシュしない）
    const placements = (parsed.placements as unknown[]).filter(isValidPlacement)
    const teams = (parsed.teams as unknown[]).filter(isValidTeam)

    return {
      ...parsed,
      placements,
      teams,
    } as GridState
  } catch {
    return null
  }
}

// ─── V2 形式（URL専用コンパクト形式）─────────────────────────────────────────
// V2 の特徴:
//   - members を含めない（マップ共有とメンバー管理を分離）
//   - UUID の代わりに配列インデックスで参照
//   - type を数値コードで表現
//   - 先頭に "2:" プレフィックスを付与してバージョン判別

const TYPE_TO_CODE: Record<ObjectType, number> = {
  city: 0, solar_citadel: 1, cannon: 2,
  alliance_hq: 3, flag: 4, bear_trap: 5, fortress: 6,
}
const CODE_TO_TYPE: ObjectType[] = [
  'city', 'solar_citadel', 'cannon', 'alliance_hq', 'flag', 'bear_trap', 'fortress',
]

// CompactPlacement: [col, row, typeCode, teamIndex(-1=none), marchTargetPlacementIndex(-1=none), label?]
type CompactPlacement = [number, number, number, number, number] | [number, number, number, number, number, string]

export function encodeLayoutV2(state: GridState): string {
  const teams = state.teams
  const teamIdToIndex = new Map<string, number>()
  teams.forEach((t, i) => teamIdToIndex.set(t.id, i))

  const placementIdToIndex = new Map<string, number>()
  state.placements.forEach((p, i) => placementIdToIndex.set(p.id, i))

  const compactPlacements: CompactPlacement[] = state.placements.map(p => {
    const teamIdx = p.teamId ? (teamIdToIndex.get(p.teamId) ?? -1) : -1
    // marchTargetIndex: このplacementを目標にしているチームの情報はteam側に持つので不要。
    // ただし各配置自体の marchTargetId はない（チーム側が持つ）。
    // team の marchTargetId は placement の index で表現する。
    const base: [number, number, number, number, number] = [
      p.col, p.row, TYPE_TO_CODE[p.type], teamIdx, -1,
    ]
    if (p.label) return [...base, p.label] as [number, number, number, number, number, string]
    return base
  })

  // teams の marchTargetId を placement index に変換して compactPlacement の第5要素に埋める
  // → チーム側に marchTargetIndex を持たせる形に変更（チームとplacementは別配列）
  const compactTeams: [string, string, number][] = teams.map(t => {
    const targetIdx = t.marchTargetId ? (placementIdToIndex.get(t.marchTargetId) ?? -1) : -1
    return [t.name, t.color, targetIdx]
  })

  const compact: { v: 2; g: [number, number, number, number]; t: [string, string, number][]; p: CompactPlacement[] } = {
    v: 2,
    g: [state.gridXMin, state.gridXMax, state.gridYMin, state.gridYMax],
    t: compactTeams,
    p: compactPlacements,
  }

  const json = JSON.stringify(compact)
  return '2:' + LZString.compressToEncodedURIComponent(json)
}

export function decodeLayoutV2(param: string): Partial<GridState> | null {
  try {
    const compressed = param.startsWith('2:') ? param.slice(2) : param
    const json = LZString.decompressFromEncodedURIComponent(compressed)
    if (!json) return null
    const parsed = JSON.parse(json)
    if (!parsed || parsed.v !== 2) return null
    if (!Array.isArray(parsed.g) || parsed.g.length < 4) return null
    if (!Array.isArray(parsed.t) || !Array.isArray(parsed.p)) return null

    const [xMin, xMax, yMin, yMax] = parsed.g as number[]

    const teams: Team[] = (parsed.t as [string, string, number][]).map((t, i) => ({
      id: `team-v2-${i}`,
      name: t[0],
      color: t[1],
    }))

    const placements: Placement[] = []
    for (const cp of parsed.p as CompactPlacement[]) {
      const [col, row, typeCode, teamIdx] = cp
      if (
        typeof col !== 'number' || col < 0 || col > 999 ||
        typeof row !== 'number' || row < 0 || row > 999 ||
        typeof typeCode !== 'number' || !CODE_TO_TYPE[typeCode]
      ) continue

      const placement: Placement = {
        id: `p-v2-${placements.length}`,
        type: CODE_TO_TYPE[typeCode],
        col,
        row,
        teamId: teamIdx >= 0 && teamIdx < teams.length ? teams[teamIdx].id : '',
        label: cp[5] as string | undefined,
      }
      placements.push(placement)
    }

    // marchTargetId を placement ID に復元
    const teamsWithTarget: Team[] = (parsed.t as [string, string, number][]).map((t, i) => {
      const targetIdx = t[2]
      return {
        ...teams[i],
        marchTargetId: targetIdx >= 0 && targetIdx < placements.length ? placements[targetIdx].id : undefined,
      }
    })

    return {
      gridXMin: xMin,
      gridXMax: xMax,
      gridYMin: yMin,
      gridYMax: yMax,
      gridWidth: yMax - yMin + 1,
      gridHeight: xMax - xMin + 1,
      placements,
      teams: teamsWithTarget,
      members: [],
    }
  } catch {
    return null
  }
}

// バージョンを判別してデコード
export function decodeLayoutAny(param: string): Partial<GridState> | null {
  if (param.startsWith('2:')) return decodeLayoutV2(param)
  return decodeLayout(param)
}
