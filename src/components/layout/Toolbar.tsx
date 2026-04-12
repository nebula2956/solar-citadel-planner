import { useGridStore } from '../../store/useGridStore'
import { useUIStore } from '../../store/useUIStore'
import { OBJECT_DEFINITIONS } from '../../constants/objectDefinitions'
import type { ObjectType, ToolMode } from '../../types'

interface Props {
  onExportPng: () => void
  onShare: () => void
}

export function Toolbar({ onExportPng, onShare }: Props) {
  const { undo, redo, canUndo, canRedo, clearAll } = useGridStore()
  const { activeTool, setActiveTool, activeObjectType, setActiveObjectType, zoom, setZoom, resetView } = useUIStore()

  const tools: { mode: ToolMode; label: string; title: string }[] = [
    { mode: 'place', label: '✏️', title: '配置' },
    { mode: 'select', label: '↕️', title: '選択/移動' },
    { mode: 'delete', label: '🗑️', title: '削除' },
    { mode: 'pan', label: '🖐️', title: '移動' },
  ]

  const objects: ObjectType[] = ['city', 'solar_citadel', 'cannon']

  const btnBase: React.CSSProperties = {
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid #334155',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    transition: 'all 0.1s',
  }

  const activeBtn: React.CSSProperties = {
    ...btnBase,
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: '1px solid #2563eb',
  }

  const inactiveBtn: React.CSSProperties = {
    ...btnBase,
    backgroundColor: '#1e293b',
    color: '#94a3b8',
  }

  const iconBtn: React.CSSProperties = {
    ...inactiveBtn,
    padding: '6px 8px',
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 12px',
      backgroundColor: '#0f172a',
      borderBottom: '1px solid #1e293b',
      flexWrap: 'wrap',
      userSelect: 'none',
    }}>
      {/* Title */}
      <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 15, marginRight: 4 }}>
        ☀️ 太陽城戦プランナー
      </span>

      <div style={{ width: 1, height: 24, backgroundColor: '#1e293b' }} />

      {/* Tool mode */}
      <div style={{ display: 'flex', gap: 4 }}>
        {tools.map(t => (
          <button
            key={t.mode}
            title={t.title}
            style={activeTool === t.mode ? activeBtn : inactiveBtn}
            onClick={() => setActiveTool(t.mode)}
          >
            {t.label} {t.title}
          </button>
        ))}
      </div>

      <div style={{ width: 1, height: 24, backgroundColor: '#1e293b' }} />

      {/* Object type (only shown in place mode) */}
      <div style={{ display: 'flex', gap: 4 }}>
        {objects.map(type => {
          const def = OBJECT_DEFINITIONS[type]
          return (
            <button
              key={type}
              title={def.label}
              style={activeObjectType === type && activeTool === 'place' ? activeBtn : inactiveBtn}
              onClick={() => { setActiveTool('place'); setActiveObjectType(type) }}
            >
              {def.emoji} {def.label}
            </button>
          )
        })}
      </div>

      <div style={{ width: 1, height: 24, backgroundColor: '#1e293b' }} />

      {/* Undo/Redo */}
      <button title="元に戻す (Ctrl+Z)" style={canUndo() ? iconBtn : { ...iconBtn, opacity: 0.4 }} onClick={undo} disabled={!canUndo()}>↩ 戻す</button>
      <button title="やり直す (Ctrl+Y)" style={canRedo() ? iconBtn : { ...iconBtn, opacity: 0.4 }} onClick={redo} disabled={!canRedo()}>↪ 進む</button>

      <div style={{ width: 1, height: 24, backgroundColor: '#1e293b' }} />

      {/* Zoom */}
      <button style={iconBtn} onClick={() => setZoom(zoom * 0.9)}>🔍−</button>
      <span style={{ color: '#94a3b8', fontSize: 13, minWidth: 44, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
      <button style={iconBtn} onClick={() => setZoom(zoom * 1.1)}>🔍+</button>
      <button style={iconBtn} onClick={resetView}>↺ リセット</button>

      <div style={{ flex: 1 }} />

      {/* Actions */}
      <button style={{ ...iconBtn, color: '#f87171' }} onClick={() => { if (confirm('全てのオブジェクトを削除しますか？')) clearAll() }}>🗑 全削除</button>
      <button style={{ ...iconBtn, backgroundColor: '#0f4c81', color: '#7dd3fc' }} onClick={onExportPng}>📷 PNG保存</button>
      <button style={{ ...iconBtn, backgroundColor: '#14532d', color: '#86efac' }} onClick={onShare}>🔗 URLシェア</button>
    </div>
  )
}
