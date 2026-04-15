import { create } from 'zustand'
import type { ObjectType, ToolMode, AppMode } from '../types'

export interface PopupState {
  type: 'cell' | 'placement'
  col?: number
  row?: number
  placementId?: string
  screenX: number
  screenY: number
}

interface UIStore {
  appMode: AppMode
  activeTool: ToolMode
  activeObjectType: ObjectType
  activeTeamId: string
  selectedPlacementId: string | null
  zoom: number
  panX: number
  panY: number
  popup: PopupState | null
  isDraggingObject: boolean
  isPendingDrag: boolean

  setAppMode: (mode: AppMode) => void
  setActiveTool: (tool: ToolMode) => void
  setActiveObjectType: (type: ObjectType) => void
  setActiveTeamId: (id: string) => void
  setSelectedPlacementId: (id: string | null) => void
  setZoom: (zoom: number) => void
  setPan: (x: number, y: number) => void
  resetView: () => void
  setPopup: (popup: PopupState | null) => void
  setIsDraggingObject: (v: boolean) => void
  setIsPendingDrag: (v: boolean) => void
}

export const useUIStore = create<UIStore>((set) => ({
  appMode: 'solar_citadel',
  activeTool: 'pan',
  activeObjectType: 'city',
  activeTeamId: 'team-1',
  selectedPlacementId: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  popup: null,
  isDraggingObject: false,
  isPendingDrag: false,

  setAppMode: (mode) => set({ appMode: mode }),
  setActiveTool: (tool) => set({ activeTool: tool, selectedPlacementId: null }),
  setActiveObjectType: (type) => set({ activeObjectType: type }),
  setActiveTeamId: (id) => set({ activeTeamId: id }),
  setSelectedPlacementId: (id) => set({ selectedPlacementId: id }),
  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(3, zoom)) }),
  setPan: (x, y) => set({ panX: x, panY: y }),
  resetView: () => set({ zoom: 1, panX: 0, panY: 0 }),
  setPopup: (popup) => set({ popup }),
  setIsDraggingObject: (v) => set({ isDraggingObject: v }),
  setIsPendingDrag: (v) => set({ isPendingDrag: v }),
})
)
