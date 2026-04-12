import { create } from 'zustand'
import type { ObjectType, ToolMode } from '../types'

interface UIStore {
  activeTool: ToolMode
  activeObjectType: ObjectType
  activeTeamId: string
  selectedPlacementId: string | null
  zoom: number
  panX: number
  panY: number

  setActiveTool: (tool: ToolMode) => void
  setActiveObjectType: (type: ObjectType) => void
  setActiveTeamId: (id: string) => void
  setSelectedPlacementId: (id: string | null) => void
  setZoom: (zoom: number) => void
  setPan: (x: number, y: number) => void
  resetView: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  activeTool: 'place',
  activeObjectType: 'city',
  activeTeamId: 'team-1',
  selectedPlacementId: null,
  zoom: 1,
  panX: 0,
  panY: 0,

  setActiveTool: (tool) => set({ activeTool: tool, selectedPlacementId: null }),
  setActiveObjectType: (type) => set({ activeObjectType: type }),
  setActiveTeamId: (id) => set({ activeTeamId: id }),
  setSelectedPlacementId: (id) => set({ selectedPlacementId: id }),
  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(3, zoom)) }),
  setPan: (x, y) => set({ panX: x, panY: y }),
  resetView: () => set({ zoom: 1, panX: 0, panY: 0 }),
}))
