import { useEffect } from 'react'
import { useGridStore } from '../store/useGridStore'
import { useUIStore } from '../store/useUIStore'

export function useKeyboardShortcuts() {
  const { undo, redo, removePlacement, canUndo, canRedo } = useGridStore()
  const { selectedPlacementId, setSelectedPlacementId } = useUIStore()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (canUndo()) undo()
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        if (canRedo()) redo()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedPlacementId) {
          removePlacement(selectedPlacementId)
          setSelectedPlacementId(null)
        }
      } else if (e.key === 'Escape') {
        setSelectedPlacementId(null)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo, canUndo, canRedo, removePlacement, selectedPlacementId, setSelectedPlacementId])
}
