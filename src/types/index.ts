export type ObjectType = 'city' | 'solar_citadel' | 'cannon' | 'alliance_hq' | 'flag' | 'bear_trap' | 'fortress'

export interface TeamMember {
  id: string
  name: string
  score: number   // 地底探検の数値
  teamId: string  // 所属チームID（''=未割り当て）
}

export interface Team {
  id: string
  name: string
  color: string
  marchTargetId?: string  // 行軍目標建造物のplacementId
}

export interface Placement {
  id: string
  type: ObjectType
  col: number
  row: number
  teamId: string
  label?: string
  assignedMemberId?: string  // 割り振られたメンバーID
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
  members: TeamMember[]
}

export type ToolMode = 'pan' | 'area_select'
export type AppMode = 'solar_citadel' | 'free'
