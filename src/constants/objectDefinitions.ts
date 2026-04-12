import type { ObjectType } from '../types'

export interface ObjectDefinition {
  label: string
  cellSpan: number
  maxCount?: number
  bgColor: string
  borderColor: string
  emoji: string
}

export const OBJECT_DEFINITIONS: Record<ObjectType, ObjectDefinition> = {
  city: {
    label: '都市',
    cellSpan: 2,
    bgColor: '#3b82f6',
    borderColor: '#1d4ed8',
    emoji: '🏙️',
  },
  solar_citadel: {
    label: '太陽城',
    cellSpan: 6,
    maxCount: 1,
    bgColor: '#f59e0b',
    borderColor: '#b45309',
    emoji: '🏯',
  },
  cannon: {
    label: '砲台',
    cellSpan: 2,
    bgColor: '#ef4444',
    borderColor: '#b91c1c',
    emoji: '💣',
  },
}
