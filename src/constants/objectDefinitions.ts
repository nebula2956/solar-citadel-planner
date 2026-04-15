import type { ObjectType } from '../types'

export interface ObjectDefinition {
  label: string
  cellSpan: number
  maxCount?: number
  bgColor: string
  borderColor: string
  emoji: string
  areaRadius?: number  // エリア半径（マス数）: 同盟本部=6(15×15), 旗=3(7×7)
}

export const OBJECT_DEFINITIONS: Record<ObjectType, ObjectDefinition> = {
  city: {
    label: '都市',
    cellSpan: 2,
    bgColor: '#3b82f6',
    borderColor: '#1d4ed8',
    emoji: '',
  },
  solar_citadel: {
    label: '太陽城',
    cellSpan: 6,
    maxCount: 1,
    bgColor: '#f59e0b',
    borderColor: '#b45309',
    emoji: '',
  },
  cannon: {
    label: '砲台',
    cellSpan: 2,
    bgColor: '#ef4444',
    borderColor: '#b91c1c',
    emoji: '',
  },
  alliance_hq: {
    label: '同盟本部',
    cellSpan: 3,
    bgColor: '#a855f7',
    borderColor: '#7e22ce',
    emoji: '',
    areaRadius: 6,
  },
  flag: {
    label: '旗',
    cellSpan: 1,
    bgColor: '#f97316',
    borderColor: '#c2410c',
    emoji: '',
    areaRadius: 3,
  },
  bear_trap: {
    label: 'クマ罠',
    cellSpan: 3,
    bgColor: '#64748b',
    borderColor: '#475569',
    emoji: '',
  },
}
