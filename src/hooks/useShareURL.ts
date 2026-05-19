import { useEffect } from 'react'
import { useGridStore } from '../store/useGridStore'
import { encodeLayoutV2, decodeLayoutAny } from '../utils/serialization'

export function useShareURL() {
  const { loadState, getPresentState } = useGridStore()

  // Load from URL on mount, fallback to localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const layoutParam = params.get('layout')
    if (layoutParam) {
      const state = decodeLayoutAny(layoutParam)
      if (state) {
        loadState(state)
        return
      }
    }
    try {
      const saved = localStorage.getItem('grid-state')
      if (saved) {
        loadState(JSON.parse(saved))
      }
    } catch { /* 無視 */ }
  }, [loadState])

  const generateShareURL = (): { url: string; encoded: string } => {
    const state = getPresentState()
    const encoded = encodeLayoutV2(state)
    const url = new URL(window.location.href)
    url.search = ''
    url.searchParams.set('layout', encoded)
    return { url: url.toString(), encoded }
  }

  return { generateShareURL }
}
