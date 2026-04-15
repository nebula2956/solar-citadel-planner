export type ObjectType = 'city' | 'solar_citadel' | 'cannon' | 'alliance_hq' | 'flag' | 'bear_trap'

export interface Team {
  id: string
  name: string
  color: string
}

export interface Placement {
  id: string
  type: ObjectType
  col: number
  row: number
  teamId: string
  label?: string
}

export interface GridState {
  gridWidth: number
  gridHeight: number
  gridXMin: number
  gridXMax: number
  gridYMin: number
  gridYMax: number
  placements: Placement[]
  teams: Team[]
}

export type ToolMode = 'pan'
export type AppMode = 'solar_citadel' | 'free'
