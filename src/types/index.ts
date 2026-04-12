export type ObjectType = 'city' | 'solar_citadel' | 'cannon'

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
  placements: Placement[]
  teams: Team[]
}

export type ToolMode = 'place' | 'select' | 'delete' | 'pan'
