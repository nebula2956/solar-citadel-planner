import { useState, useRef } from 'react'
import { useGridStore } from '../../store/useGridStore'
import type { GridState } from '../../types'

const SAVES_KEY = 'solar-planner-saves'
const MAX_SLOTS = 10

interface SlotEntry {
  id: string
  name: string
  savedAt: string  // ISO 8601
  state: GridState
}

function loadSlots(): SlotEntry[] {
  try {
    const raw = localStorage.getItem(SAVES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as SlotEntry[]
  } catch {
    return []
  }
}

function saveSlots(slots: SlotEntry[]): void {
  localStorage.setItem(SAVES_KEY, JSON.stringify(slots))
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return iso
  }
}

interface Props {
  onClose: () => void
}

export function SaveSlotsModal({ onClose }: Props) {
  const { getPresentState, loadState } = useGridStore()
  const [slots, setSlots] = useState<SlotEntry[]>(loadSlots)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showFeedback = (msg: string) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 2000)
  }

  const handleSaveNew = () => {
    if (slots.length >= MAX_SLOTS) {
      showFeedback('スロットが満杯です（最大10件）')
      return
    }
    const name = newName.trim() || `セーブ${slots.length + 1}`
    const entry: SlotEntry = {
      id: crypto.randomUUID(),
      name,
      savedAt: new Date().toISOString(),
      state: getPresentState(),
    }
    const updated = [...slots, entry]
    saveSlots(updated)
    setSlots(updated)
    setNewName('')
    showFeedback('保存しました')
  }

  const handleOverwrite = (id: string) => {
    const updated = slots.map(s =>
      s.id === id ? { ...s, savedAt: new Date().toISOString(), state: getPresentState() } : s
    )
    saveSlots(updated)
    setSlots(updated)
    showFeedback('上書き保存しました')
  }

  const handleLoad = (slot: SlotEntry) => {
    loadState(slot.state)
    onClose()
  }

  const handleDelete = (id: string) => {
    if (!confirm('このセーブデータを削除しますか？')) return
    const updated = slots.filter(s => s.id !== id)
    saveSlots(updated)
    setSlots(updated)
  }

  const handleRename = (id: string, name: string) => {
    const updated = slots.map(s => s.id === id ? { ...s, name } : s)
    saveSlots(updated)
    setSlots(updated)
    setEditingId(null)
  }

  // JSONファイルに書き出し
  const handleExportJSON = () => {
    const state = getPresentState()
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `solar-planner-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // JSONファイルから読み込み
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string)
        if (typeof parsed !== 'object' || !Array.isArray(parsed.placements)) {
          showFeedback('無効なJSONファイルです')
          return
        }
        loadState(parsed)
        onClose()
      } catch {
        showFeedback('JSONの読み込みに失敗しました')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const modalStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  }

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 12,
    padding: 24,
    width: 480,
    maxWidth: '90vw',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  }

  const btnStyle = (color: string): React.CSSProperties => ({
    padding: '4px 10px', fontSize: 12, borderRadius: 5, cursor: 'pointer',
    border: `1px solid ${color}44`, backgroundColor: `${color}22`, color,
    fontWeight: 500,
  })

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={cardStyle} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: '#f8fafc', margin: 0, fontSize: 17 }}>💾 セーブデータ</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        {feedback && (
          <div style={{ background: '#1e3a2a', border: '1px solid #22c55e', borderRadius: 6, padding: '6px 12px', color: '#86efac', fontSize: 13 }}>
            {feedback}
          </div>
        )}

        {/* スロット一覧 */}
        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {slots.length === 0 && (
            <div style={{ color: '#475569', fontSize: 13, padding: '8px 0' }}>保存データがありません</div>
          )}
          {slots.map(slot => (
            <div key={slot.id} style={{
              backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8,
              padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {editingId === slot.id ? (
                  <input
                    autoFocus
                    defaultValue={slot.name}
                    style={{ flex: 1, background: '#0f172a', border: '1px solid #3b82f6', borderRadius: 4, color: '#f8fafc', fontSize: 13, padding: '2px 6px' }}
                    onBlur={e => handleRename(slot.id, e.target.value || slot.name)}
                    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                  />
                ) : (
                  <span
                    style={{ flex: 1, color: '#f8fafc', fontSize: 13, fontWeight: 600, cursor: 'text' }}
                    onDoubleClick={() => setEditingId(slot.id)}
                    title="ダブルクリックで名前変更"
                  >{slot.name}</span>
                )}
                <span style={{ color: '#475569', fontSize: 11, flexShrink: 0 }}>{formatDate(slot.savedAt)}</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={btnStyle('#fbbf24')} onClick={() => handleOverwrite(slot.id)}>上書き保存</button>
                <button style={btnStyle('#60a5fa')} onClick={() => handleLoad(slot)}>読み込み</button>
                <button style={{ ...btnStyle('#f87171'), marginLeft: 'auto' }} onClick={() => handleDelete(slot.id)}>削除</button>
              </div>
            </div>
          ))}
        </div>

        {/* 新規保存 */}
        {slots.length < MAX_SLOTS && (
          <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #1e293b', paddingTop: 12 }}>
            <input
              placeholder={`セーブ${slots.length + 1}`}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveNew() }}
              style={{ flex: 1, background: '#1e293b', border: '1px solid #334155', borderRadius: 6, color: '#f8fafc', fontSize: 13, padding: '6px 10px' }}
            />
            <button
              onClick={handleSaveNew}
              style={{ padding: '6px 14px', backgroundColor: '#1e3a5f', border: '1px solid #3b82f6', borderRadius: 6, color: '#93c5fd', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >新規保存</button>
          </div>
        )}
        {slots.length >= MAX_SLOTS && (
          <div style={{ color: '#64748b', fontSize: 12, borderTop: '1px solid #1e293b', paddingTop: 8 }}>
            スロット上限（{MAX_SLOTS}件）に達しました。不要なデータを削除してください。
          </div>
        )}

        {/* ファイル操作 */}
        <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #1e293b', paddingTop: 12 }}>
          <button
            onClick={handleExportJSON}
            style={{ flex: 1, padding: '6px 10px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 6, color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}
          >↓ JSONに書き出し</button>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{ flex: 1, padding: '6px 10px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 6, color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}
          >↑ JSONから読み込み</button>
          <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportJSON} />
        </div>
      </div>
    </div>
  )
}
