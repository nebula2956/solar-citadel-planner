import { useEffect } from 'react'
import { useGridStore } from '../store/useGridStore'
import { encodeLayout, decodeLayout } from '../utils/serialization'

export function useShareURL() {
  const { loadState, getPresentState } = useGridStore()

  // Load from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const layoutParam = params.get('layout')
    if (layoutParam) {
      const state = decodeLayout(layoutParam)
      if (state) {
        loadState(state)
      }
    }
  }, [loadState])

  const generateShareURL = (): string => {
    const state = getPresentState()
    const encoded = encodeLayout(state)
    const url = new URL(window.location.href)
    url.search = ''
    url.searchParams.set('layout', encoded)
    return url.toString()
  }

  return { generateShareURL }
}
