import { useState } from 'react'
import { useGridStore } from '../../store/useGridStore'
import { useUIStore } from '../../store/useUIStore'
import { MIN_ZOOM, MAX_ZOOM } from '../../constants/gridConfig'

interface Props {
  onExportPng: () => void
  onShare: () => void
}

function GridRangeModal({ onClose }: { onClose: () => void }) {
  const { present, setGridRange } = useGridStore()
  const [xMin, setXMin] = useState(present.gridXMin)
  const [xMax, setXMax] = useState(present.gridXMax)
  const [yMin, setYMin] = useState(present.gridYMin)
  const [yMax, setYMax] = useState(present.gridYMax)

  const inputStyle: React.CSSProperties = {
    width: 64, padding: '4px 6px', backgroundColor: '#1e293b',
    border: '1px solid #334155', borderRadius: 4, color: '#f8fafc',
    fontSize: 13, textAlign: 'center',
  }

  const handleApply = () => {
    if (xMin >= xMax || yMin >= yMax) return
    setGridRange(xMin, xMax, yMin, yMax)
    onClose()
  }

  // x=gridXMax-row → gridHeight=xMax-xMin+1 rows
  // y=gridYMax-col → gridWidth=yMax-yMin+1 cols
  const rows = xMax - xMin + 1
  const cols = yMax - yMin + 1

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
    }} onPointerDown={onClose}>
      <div style={{
        backgroundColor: '#0f172a', border: '1px solid #334155',
        borderRadius: 12, padding: '20px 24px', minWidth: 280,
        boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
      }} onPointerDown={e => e.stopPropagation()}>
        <div style={{ color: '#f8fafc', fontSize: 15, fontWeight: 700, marginBottom: 16 }}>グリッド範囲設定</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#60a5fa', fontSize: 12, width: 40 }}>X軸</span>
            <input type="number" style={inputStyle} value={xMin} onChange={e => setXMin(Number(e.target.value))} />
            <span style={{ color: '#64748b', fontSize: 12 }}>〜</span>
            <input type="number" style={inputStyle} value={xMax} onChange={e => setXMax(Number(e.target.value))} />
            <span style={{ color: '#475569', fontSize: 11 }}>{rows}マス</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#fbbf24', fontSize: 12, width: 40 }}>Y軸</span>
            <input type="number" style={inputStyle} value={yMin} onChange={e => setYMin(Number(e.target.value))} />
            <span style={{ color: '#64748b', fontSize: 12 }}>〜</span>
            <input type="number" style={inputStyle} value={yMax} onChange={e => setYMax(Number(e.target.value))} />
            <span style={{ color: '#475569', fontSize: 11 }}>{cols}マス</span>
          </div>
          <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
            グリッド: {cols} × {rows} マス（x方向×y方向）
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #334155', backgroundColor: 'transparent', color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>キャンセル</button>
          <button onClick={handleApply} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', backgroundColor: '#3b82f6', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>適用</button>
        </div>
      </div>
    </div>
  )
}

export function Toolbar({ onExportPng, onShare }: Props) {
  const { undo, redo, canUndo, canRedo, clearAll, resetToSolarCitadelTemplate, resetToFreeMode } = useGridStore()
  const { zoom, setZoom, resetView, appMode, setAppMode } = useUIStore()
  const [showRangeModal, setShowRangeModal] = useState(false)

  const btnBase: React.CSSProperties = {
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid #334155',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    backgroundColor: '#1e293b',
    color: '#94a3b8',
  }

  const handleModeSwitch = (mode: typeof appMode) => {
    if (mode === appMode) return
    const label = mode === 'solar_citadel' ? '太陽城モード' : '自由モード'
    if (!confirm(`${label}に切り替えます。現在の配置はリセットされます。`)) return
    setAppMode(mode)
    if (mode === 'solar_citadel') {
      resetToSolarCitadelTemplate()
    } else {
      resetToFreeMode()
    }
    resetView()
  }

  return (
    <>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        backgroundColor: '#0f172a',
        borderBottom: '1px solid #1e293b',
        flexWrap: 'wrap',
        userSelect: 'none',
      }}>
        {/* Title */}
        <span style={{
          fontFamily: "'Cinzel', serif",
          fontWeight: 600,
          fontSize: 14,
          letterSpacing: '0.06em',
          color: '#c9a84c',
          marginRight: 6,
        }}>
          海賊星図
        </span>

        {/* Mode switcher */}
        <div style={{ display: 'flex', border: '1px solid #334155', borderRadius: 6, overflow: 'hidden', marginRight: 4 }}>
          <button
            onClick={() => handleModeSwitch('solar_citadel')}
            style={{
              padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
              backgroundColor: appMode === 'solar_citadel' ? '#854d0e' : '#1e293b',
              color: appMode === 'solar_citadel' ? '#fde68a' : '#64748b',
            }}
          >
            太陽城
          </button>
          <button
            onClick={() => handleModeSwitch('free')}
            style={{
              padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
              borderLeft: '1px solid #334155',
              backgroundColor: appMode === 'free' ? '#1e3a5f' : '#1e293b',
              color: appMode === 'free' ? '#93c5fd' : '#64748b',
            }}
          >
            自由
          </button>
        </div>

        <div style={{ width: 1, height: 20, backgroundColor: '#1e293b' }} />

        {/* Undo/Redo */}
        <button title="元に戻す (Ctrl+Z)" style={canUndo() ? btnBase : { ...btnBase, opacity: 0.4 }} onClick={undo} disabled={!canUndo()}>↩</button>
        <button title="やり直す (Ctrl+Y)" style={canRedo() ? btnBase : { ...btnBase, opacity: 0.4 }} onClick={redo} disabled={!canRedo()}>↪</button>

        <div style={{ width: 1, height: 20, backgroundColor: '#1e293b' }} />

        {/* Zoom */}
        <button style={btnBase} onClick={() => setZoom(Math.max(MIN_ZOOM, zoom * 0.9))}>−</button>
        <span style={{ color: '#94a3b8', fontSize: 12, minWidth: 40, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
        <button style={btnBase} onClick={() => setZoom(Math.min(MAX_ZOOM, zoom * 1.1))}>+</button>
        <button style={btnBase} onClick={resetView} title="ビューリセット">↺</button>

        {appMode === 'free' && (
          <>
            <div style={{ width: 1, height: 20, backgroundColor: '#1e293b' }} />
            <button style={{ ...btnBase, color: '#94a3b8' }} onClick={() => setShowRangeModal(true)}>⊞ 範囲</button>
          </>
        )}

        <div style={{ flex: 1 }} />

        {/* Actions */}
        <button style={{ ...btnBase, color: '#f87171' }} onClick={() => { if (confirm('全てのオブジェクトを削除しますか？')) clearAll() }}>全削除</button>
        <button style={{ ...btnBase, backgroundColor: '#0f4c81', color: '#7dd3fc' }} onClick={onExportPng}>PNG</button>
        <button style={{ ...btnBase, backgroundColor: '#14532d', color: '#86efac' }} onClick={onShare}>共有</button>
      </div>

      {showRangeModal && <GridRangeModal onClose={() => setShowRangeModal(false)} />}
    </>
  )
}
