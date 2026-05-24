import { useEffect } from 'react'
import { useGridStore } from '../store/useGridStore'
import { decodeLayoutAny } from '../utils/serialization'
import { supabase } from '../lib/supabase'

function generateRoomId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export function useShareURL() {
  const { loadState, getPresentState } = useGridStore()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    const roomId = params.get('room')
    if (roomId) {
      ;(async () => {
        try {
          const { data, error } = await supabase.from('rooms').select('state').eq('id', roomId).single()
          if (!error && data?.state) {
            loadState(data.state)
          } else if (error) {
            console.error('共有データの読み込みに失敗しました:', error.message)
          }
        } catch (err) {
          console.error('Supabase接続エラー:', err)
        }
      })()
      return
    }

    // 旧来のlayoutパラメータにフォールバック
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
      if (saved) loadState(JSON.parse(saved))
    } catch { /* 無視 */ }
  }, [loadState])

  const generateShareURL = async (): Promise<{ url: string; error?: string }> => {
    const state = getPresentState()
    const id = generateRoomId()

    const { error } = await supabase.from('rooms').insert({ id, state })
    if (error) return { url: '', error: '保存に失敗しました: ' + error.message }

    const url = new URL(window.location.href)
    url.search = ''
    url.searchParams.set('room', id)
    return { url: url.toString() }
  }

  return { generateShareURL }
}
