import { useState } from 'react'
import { useGridStore } from '../../store/useGridStore'
import { useUIStore } from '../../store/useUIStore'
import { TEAM_COLORS } from '../../constants/gridConfig'
import { OBJECT_DEFINITIONS } from '../../constants/objectDefinitions'
import type React from 'react'

// PCサイドバー・スマホボトムパネル共通のコンテンツ
function CountsPanel() {
  const { present } = useGridStore()
  const counts = present.placements.reduce((acc, p) => {
    acc[p.type] = (acc[p.type] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <>
      {(['city', 'solar_citadel', 'cannon', 'alliance_hq', 'flag', 'bear_trap'] as const).map(type => {
        const def = OBJECT_DEFINITIONS[type]
        return (
          <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
            <span style={{ color: '#cbd5e1', fontSize: 13 }}>{def.emoji} {def.label}</span>
            <span style={{ color: '#f8fafc', fontSize: 13, fontWeight: 700 }}>
              {counts[type] ?? 0}
              {def.maxCount ? `/${def.maxCount}` : ''}
            </span>
          </div>
        )
      })}
    </>
  )
}

function TeamsPanel() {
  const { present, updateTeam, addTeam, removeTeam } = useGridStore()
  const { activeTeamId, setActiveTeamId } = useUIStore()
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null)

  return (
    <>
      {present.teams.map(team => (
        <div key={team.id} style={{
          padding: '6px 8px',
          marginBottom: 4,
          borderRadius: 6,
          border: `1px solid ${activeTeamId === team.id ? team.color : '#1e293b'}`,
          backgroundColor: activeTeamId === team.id ? `${team.color}22` : '#0a0f1e',
          cursor: 'pointer',
        }}
          onClick={() => setActiveTeamId(team.id)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: team.color, cursor: 'pointer', flexShrink: 0, border: '1px solid rgba(255,255,255,0.2)' }}
              onClick={e => { e.stopPropagation(); setShowColorPicker(showColorPicker === team.id ? null : team.id) }}
            />
            {editingTeamId === team.id ? (
              <input
                autoFocus
                defaultValue={team.name}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#f8fafc', fontSize: 13 }}
                onBlur={e => { updateTeam(team.id, { name: e.target.value }); setEditingTeamId(null) }}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span style={{ flex: 1, color: '#f8fafc', fontSize: 13 }} onDoubleClick={e => { e.stopPropagation(); setEditingTeamId(team.id) }}>
                {team.name}
              </span>
            )}
            <span style={{ color: '#64748b', fontSize: 11 }}>
              {present.placements.filter(p => p.teamId === team.id).length}
            </span>
            {present.teams.length > 1 && (
              <button
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, fontSize: 12 }}
                onClick={e => { e.stopPropagation(); removeTeam(team.id) }}
                title="チームを削除"
              >✕</button>
            )}
          </div>
          {showColorPicker === team.id && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }} onClick={e => e.stopPropagation()}>
              {TEAM_COLORS.map(color => (
                <div
                  key={color}
                  style={{ width: 18, height: 18, borderRadius: 4, backgroundColor: color, cursor: 'pointer', border: team.color === color ? '2px solid white' : '1px solid rgba(255,255,255,0.2)' }}
                  onClick={() => { updateTeam(team.id, { color }); setShowColorPicker(null) }}
                />
              ))}
            </div>
          )}
        </div>
      ))}

      <button
        style={{ width: '100%', padding: '6px', marginTop: 4, backgroundColor: '#1e293b', border: '1px dashed #334155', borderRadius: 6, color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}
        onClick={addTeam}
      >
        + チームを追加
      </button>
    </>
  )
}

function HelpPanel() {
  return (
    <div style={{ fontSize: 11, color: '#475569' }}>
      <div>✏️ 配置: クリックして配置</div>
      <div>↕️ 選択: クリック→ドラッグ</div>
      <div>🗑️ 削除: クリックで削除</div>
      <div>🖐️ 移動: ドラッグで画面移動</div>
      <div>🖱️ ホイール: ズーム</div>
      <div>右クリックドラッグ: パン</div>
      <div>Ctrl+Z/Y: Undo/Redo</div>
      <div>Del: 選択中を削除</div>
    </div>
  )
}

// PCサイドバー
export function Sidebar() {
  const [countsOpen, setCountsOpen] = useState(true)
  const [helpOpen, setHelpOpen] = useState(false)

  const sectionTitle = (label: string, open: boolean, toggle: () => void) => (
    <div
      style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: open ? 8 : 0 }}
      onClick={toggle}
    >
      {label} <span style={{ fontSize: 10 }}>{open ? '▲' : '▼'}</span>
    </div>
  )

  return (
    <div style={{
      width: 220,
      backgroundColor: '#0f172a',
      borderLeft: '1px solid #1e293b',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      userSelect: 'none',
    }}>
      <div style={{ padding: '12px', borderBottom: '1px solid #1e293b' }}>
        {sectionTitle('配置数', countsOpen, () => setCountsOpen(v => !v))}
        {countsOpen && <CountsPanel />}
      </div>

      <div style={{ padding: '12px', flex: 1 }}>
        <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>チーム</div>
        <TeamsPanel />
      </div>

      <div style={{ padding: '12px', borderTop: '1px solid #1e293b' }}>
        {sectionTitle('操作方法', helpOpen, () => setHelpOpen(v => !v))}
        {helpOpen && <HelpPanel />}
      </div>
    </div>
  )
}

// スマホ用ボトムパネル
type BottomTab = 'counts' | 'teams' | 'help'

export function BottomPanel() {
  const [activeTab, setActiveTab] = useState<BottomTab>('teams')
  const [open, setOpen] = useState(true)

  const tabStyle = (tab: BottomTab): React.CSSProperties => ({
    flex: 1,
    padding: '8px 4px',
    background: activeTab === tab ? '#1e293b' : 'transparent',
    border: 'none',
    borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
    color: activeTab === tab ? '#f8fafc' : '#64748b',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  })

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#0f172a',
      borderTop: '1px solid #1e293b',
      zIndex: 100,
      userSelect: 'none',
    }}>
      {/* タブバー */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1e293b' }}>
        <button style={tabStyle('counts')} onClick={() => { setActiveTab('counts'); setOpen(true) }}>配置数</button>
        <button style={tabStyle('teams')} onClick={() => { setActiveTab('teams'); setOpen(true) }}>チーム</button>
        <button style={tabStyle('help')} onClick={() => { setActiveTab('help'); setOpen(true) }}>操作</button>
        <button
          style={{ padding: '8px 12px', background: 'transparent', border: 'none', color: '#64748b', fontSize: 14, cursor: 'pointer' }}
          onClick={() => setOpen(v => !v)}
        >
          {open ? '▼' : '▲'}
        </button>
      </div>

      {/* パネル内容 */}
      {open && (
        <div style={{ padding: '10px 12px', maxHeight: '35vh', overflowY: 'auto' }}>
          {activeTab === 'counts' && <CountsPanel />}
          {activeTab === 'teams' && <TeamsPanel />}
          {activeTab === 'help' && <HelpPanel />}
        </div>
      )}
    </div>
  )
}
