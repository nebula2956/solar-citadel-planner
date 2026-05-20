import { useState } from 'react'
import { useGridStore } from '../../store/useGridStore'
import { useUIStore } from '../../store/useUIStore'
import { MIN_ZOOM, MAX_ZOOM } from '../../constants/gridConfig'

interface Props {
  onExportPng: () => void
  onShare: () => void
  onSave: () => void
  sidebarOpen: boolean
  onToggleSidebar: () => void
  membersOpen: boolean
  onToggleMembers: () => void
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

export function Toolbar({ onExportPng, onShare, onSave, sidebarOpen, onToggleSidebar, membersOpen, onToggleMembers }: Props) {
  const { undo, redo, canUndo, canRedo, clearAll, resetToSolarCitadelTemplate, resetToFreeMode } = useGridStore()
  const { zoom, setZoom, resetView, appMode, setAppMode, activeTool, setActiveTool } = useUIStore()
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
        padding: '0 12px',
        backgroundColor: '#0f172a',
        borderBottom: '1px solid #1e293b',
        flexWrap: 'wrap',
        userSelect: 'none',
        minHeight: 56,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 8 }}>
          <svg width="240" height="66" viewBox="0 0 160 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="globeGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#2563eb"/>
                <stop offset="100%" stopColor="#1e40af"/>
              </linearGradient>
              <linearGradient id="arrowGrad" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="#3b82f6"/>
                <stop offset="100%" stopColor="#60a5fa"/>
              </linearGradient>
              <linearGradient id="silverGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e2e8f0"/>
                <stop offset="50%" stopColor="#94a3b8"/>
                <stop offset="100%" stopColor="#cbd5e1"/>
              </linearGradient>
              <linearGradient id="pinGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e2e8f0"/>
                <stop offset="100%" stopColor="#94a3b8"/>
              </linearGradient>
            </defs>

            {/* Globe circle */}
            <circle cx="22" cy="24" r="14" stroke="url(#globeGrad)" strokeWidth="2" fill="none"/>
            {/* Globe horizontal lines */}
            <ellipse cx="22" cy="24" rx="7" ry="14" stroke="url(#globeGrad)" strokeWidth="1.5" fill="none"/>
            <line x1="8" y1="24" x2="36" y2="24" stroke="url(#globeGrad)" strokeWidth="1.5"/>
            <line x1="10" y1="17" x2="34" y2="17" stroke="url(#globeGrad)" strokeWidth="1.2"/>
            <line x1="10" y1="31" x2="34" y2="31" stroke="url(#globeGrad)" strokeWidth="1.2"/>

            {/* Arrow + wave */}
            <polyline points="10,34 16,28 21,31 30,20 36,20" stroke="url(#arrowGrad)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <polygon points="34,16 38,21 33,21" fill="url(#arrowGrad)"/>

            {/* Pin */}
            <path d="M26 4 C26 4 20 9 20 13 C20 16.3 22.7 19 26 19 C29.3 19 32 16.3 32 13 C32 9 26 4 26 4Z" fill="url(#pinGrad)"/>
            <circle cx="26" cy="13" r="3" fill="#0f172a"/>

            {/* WOS */}
            <text x="46" y="26" fontFamily="'Arial Black', sans-serif" fontWeight="900" fontSize="22" fill="url(#silverGrad)" letterSpacing="1">WOS</text>
            {/* MAP planner */}
            <text x="47" y="40" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="11" fill="#3b82f6" letterSpacing="0.5">MAP</text>
            <text x="75" y="40" fontFamily="Arial, sans-serif" fontWeight="400" fontSize="11" fill="#94a3b8" letterSpacing="0.5"> planner</text>
          </svg>
          <span style={{ fontSize: 10, color: '#334155', fontWeight: 500, letterSpacing: '0.05em' }}>
            v{__APP_VERSION__}
          </span>
        </div>

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

        <>
          <div style={{ width: 1, height: 20, backgroundColor: '#1e293b' }} />
          <button style={{ ...btnBase, color: '#94a3b8' }} onClick={() => setShowRangeModal(true)}>⊞ 範囲</button>
        </>

        <div style={{ width: 1, height: 20, backgroundColor: '#1e293b' }} />

        {/* Auto place */}
        <button
          title="範囲を選択して都市を自動配置"
          onClick={() => setActiveTool(activeTool === 'area_select' ? 'pan' : 'area_select')}
          style={{
            ...btnBase,
            backgroundColor: activeTool === 'area_select' ? '#1e3a5f' : '#1e293b',
            color: activeTool === 'area_select' ? '#93c5fd' : '#94a3b8',
            border: activeTool === 'area_select' ? '1px solid #3b82f6' : '1px solid #334155',
          }}
        >
          ⬡ 自動配置
        </button>

        <div style={{ flex: 1 }} />

        {/* Actions */}
        <button style={{ ...btnBase, color: '#f87171' }} onClick={() => { if (confirm('全てのオブジェクトを削除しますか？')) clearAll() }}>全削除</button>
        <button style={{ ...btnBase, backgroundColor: '#0f4c81', color: '#7dd3fc' }} onClick={onExportPng}>PNG</button>
        <button style={{ ...btnBase, backgroundColor: '#1e3a5f', color: '#93c5fd' }} onClick={onSave}>💾</button>
        <button style={{ ...btnBase, backgroundColor: '#14532d', color: '#86efac' }} onClick={onShare}>共有</button>

        <div style={{ width: 1, height: 20, backgroundColor: '#334155' }} />

        {/* サイドバー開閉 */}
        <button
          title="サイドバーを開閉"
          onClick={onToggleSidebar}
          style={{ ...btnBase, backgroundColor: sidebarOpen ? '#1e3a5f' : '#1e293b', color: sidebarOpen ? '#93c5fd' : '#94a3b8', border: sidebarOpen ? '1px solid #3b82f6' : '1px solid #334155' }}
        >≡</button>

        {/* メンバーパネル開閉 */}
        <button
          title="メンバーリストを開閉"
          onClick={onToggleMembers}
          style={{ ...btnBase, backgroundColor: membersOpen ? '#14532d' : '#1e293b', color: membersOpen ? '#86efac' : '#94a3b8', border: membersOpen ? '1px solid #22c55e' : '1px solid #334155' }}
        >👥</button>
      </div>

      {showRangeModal && <GridRangeModal onClose={() => setShowRangeModal(false)} />}
    </>
  )
}
