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
      {(['city', 'solar_citadel', 'cannon', 'alliance_hq', 'flag', 'bear_trap', 'fortress'] as const).map(type => {
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

const inputStyle: React.CSSProperties = {
  width: 56,
  padding: '4px 6px',
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 4,
  color: '#f8fafc',
  fontSize: 12,
  textAlign: 'right',
}

function MarchSettingsPanel() {
  const { marchSettings, setMarchSettings } = useUIStore()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#94a3b8', fontSize: 12, width: 90 }}>速度(パッシブ)</span>
        <input type="number" min={0} max={200} step={1}
          value={Math.round(marchSettings.passiveBonus * 100)}
          onChange={e => setMarchSettings({ passiveBonus: Number(e.target.value) / 100 })}
          style={inputStyle} />
        <span style={{ color: '#64748b', fontSize: 11 }}>%</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#94a3b8', fontSize: 12, width: 90 }}>速度(ペット)</span>
        <input type="number" min={0} max={200} step={1}
          value={Math.round(marchSettings.petBonus * 100)}
          onChange={e => setMarchSettings({ petBonus: Number(e.target.value) / 100 })}
          style={inputStyle} />
        <span style={{ color: '#64748b', fontSize: 11 }}>%</span>
      </div>
    </div>
  )
}

export function MembersPanel() {
  const { present, addMember, removeMember, updateMember, assignMembersToCity } = useGridStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<'name' | 'score' | null>(null)

  const members = present.members

  const handleAssignAll = () => {
    for (const t of present.teams) {
      assignMembersToCity(t.id)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* ヘッダー行: [参加] [名前] [地底] [チーム] [削除] */}
      <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr 56px 64px 18px', gap: 4, paddingBottom: 2, borderBottom: '1px solid #1e293b' }}>
        <span style={{ color: '#475569', fontSize: 10, textAlign: 'center' }}>参</span>
        <span style={{ color: '#475569', fontSize: 10 }}>名前</span>
        <span style={{ color: '#475569', fontSize: 10, textAlign: 'right' }}>地底</span>
        <span style={{ color: '#475569', fontSize: 10 }}>チーム</span>
        <span />
      </div>

      {members.length === 0 && (
        <div style={{ color: '#475569', fontSize: 11, padding: '4px 0' }}>メンバーを追加してください</div>
      )}

      {members.map(m => (
        <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '20px 1fr 56px 64px 18px', gap: 4, alignItems: 'center', opacity: m.active === false ? 0.45 : 1 }}>
          {/* 参加/不参加トグル */}
          <button
            onClick={() => updateMember(m.id, { active: m.active === false ? true : false })}
            title={m.active === false ? '不参加（クリックで参加に変更）' : '参加（クリックで不参加に変更）'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 13, lineHeight: 1, textAlign: 'center', color: m.active === false ? '#475569' : '#22c55e' }}
          >{m.active === false ? '✗' : '✓'}</button>

          {/* 名前 */}
          {editingId === m.id && editingField === 'name' ? (
            <input
              autoFocus
              defaultValue={m.name}
              style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 3, color: '#f8fafc', fontSize: 11, padding: '2px 4px' }}
              onBlur={e => { updateMember(m.id, { name: e.target.value }); setEditingId(null); setEditingField(null) }}
              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
            />
          ) : (
            <span
              style={{ color: '#cbd5e1', fontSize: 11, cursor: 'text', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              onDoubleClick={() => { setEditingId(m.id); setEditingField('name') }}
              title={m.name}
            >{m.name}</span>
          )}

          {/* スコア */}
          {editingId === m.id && editingField === 'score' ? (
            <input
              autoFocus
              type="number"
              defaultValue={m.score}
              style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 3, color: '#f8fafc', fontSize: 11, padding: '2px 4px', textAlign: 'right' }}
              onBlur={e => { updateMember(m.id, { score: Number(e.target.value) }); setEditingId(null); setEditingField(null) }}
              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
            />
          ) : (
            <span
              style={{ color: '#94a3b8', fontSize: 11, textAlign: 'right', cursor: 'text', fontFamily: 'monospace' }}
              onDoubleClick={() => { setEditingId(m.id); setEditingField('score') }}
            >{m.score.toLocaleString()}</span>
          )}

          {/* チーム選択 */}
          <select
            value={m.teamId}
            onChange={e => updateMember(m.id, { teamId: e.target.value })}
            style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 3, color: '#f8fafc', fontSize: 10, padding: '2px 2px', width: '100%' }}
          >
            <option value="">未割当</option>
            {present.teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* 削除 */}
          <button
            onClick={() => removeMember(m.id)}
            style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 0, fontSize: 12, lineHeight: 1 }}
          >✕</button>
        </div>
      ))}

      <button
        onClick={addMember}
        style={{ marginTop: 4, padding: '4px', backgroundColor: '#1e293b', border: '1px dashed #334155', borderRadius: 4, color: '#94a3b8', cursor: 'pointer', fontSize: 11 }}
      >+ メンバーを追加</button>

      {/* 一括割り振りボタン */}
      <button
        onClick={handleAssignAll}
        style={{
          marginTop: 4, padding: '5px 8px', fontSize: 11, borderRadius: 4, cursor: 'pointer',
          backgroundColor: '#1e3a5f', border: '1px solid #3b82f6',
          color: '#93c5fd', fontWeight: 600,
        }}
      >都市へ自動割り振り ▶</button>
    </div>
  )
}

function HelpPanel() {
  const section = (title: string) => (
    <div style={{ color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginTop: 10, marginBottom: 3, borderBottom: '1px solid #1e293b', paddingBottom: 2 }}>
      {title}
    </div>
  )
  const row = (icon: string, label: string, desc: string) => (
    <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 3 }}>
      <span style={{ fontSize: 12, minWidth: 18 }}>{icon}</span>
      <span style={{ color: '#94a3b8', fontWeight: 600, minWidth: 72 }}>{label}</span>
      <span style={{ color: '#475569' }}>{desc}</span>
    </div>
  )
  return (
    <div style={{ fontSize: 11 }}>
      {section('マップ操作')}
      {row('🖐️', 'パン', 'ドラッグ / 右クリックドラッグ')}
      {row('🖱️', 'ズーム', 'ホイール')}
      {row('↺', 'ビューリセット', 'ツールバーの ↺ ボタン')}

      {section('建物配置')}
      {row('✏️', '配置', 'サイドバーで種類を選びクリック')}
      {row('🏠', '移動', '建物を長押し→ドラッグ')}
      {row('🗑️', '削除', '建物をタップ→ポップアップで削除')}
      {row('⬡', '自動配置', 'ツールバー「⬡ 自動配置」→範囲をドラッグ')}

      {section('行軍目標')}
      {row('★', '目標設定', '建物をタップ→ポップアップで各チームの★を押す')}
      {row('⏱', '行軍時間', '都市タップで目標までの時間を表示')}

      {section('メンバー管理')}
      {row('👥', 'パネル開閉', 'ツールバー右端の 👥 ボタン')}
      {row('✏️', '名前/地底編集', 'ダブルクリックで編集')}
      {row('✓/✗', '参加切替', '先頭のチェックマークをクリック')}
      {row('▶', '自動割り振り', 'パネル下部のボタン（行軍時間順）')}

      {section('データ管理')}
      {row('💾', 'セーブ', 'ツールバーの 💾 → スロットに保存')}
      {row('🔗', '共有', 'ツールバーの「共有」→ URLをコピー')}
      {row('🖼', 'PNG出力', 'ツールバーの「PNG」')}

      {section('キーボード')}
      {row('⌨️', 'Ctrl+Z / Y', 'Undo / Redo')}
      {row('⌨️', 'Del', '選択中の建物を削除')}
      {row('⌨️', 'Space+ドラッグ', 'パン')}
    </div>
  )
}

// PCサイドバー
export function Sidebar() {
  const [countsOpen, setCountsOpen] = useState(true)
  const [marchOpen, setMarchOpen] = useState(true)
  const [teamsOpen, setTeamsOpen] = useState(true)
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

      <div style={{ padding: '12px', borderBottom: '1px solid #1e293b' }}>
        {sectionTitle('行軍速度', marchOpen, () => setMarchOpen(v => !v))}
        {marchOpen && <MarchSettingsPanel />}
      </div>

      <div style={{ padding: '12px', borderBottom: '1px solid #1e293b' }}>
        {sectionTitle('チーム', teamsOpen, () => setTeamsOpen(v => !v))}
        {teamsOpen && <TeamsPanel />}
      </div>

      <div style={{ padding: '12px', borderTop: '1px solid #1e293b' }}>
        {sectionTitle('操作方法', helpOpen, () => setHelpOpen(v => !v))}
        {helpOpen && <HelpPanel />}
      </div>
    </div>
  )
}

// スマホ用ボトムパネル
type BottomTab = 'counts' | 'teams' | 'march' | 'members' | 'help'

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
        <button style={tabStyle('march')} onClick={() => { setActiveTab('march'); setOpen(true) }}>行軍</button>
        <button style={tabStyle('members')} onClick={() => { setActiveTab('members'); setOpen(true) }}>メンバー</button>
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
          {activeTab === 'march' && <MarchSettingsPanel />}
          {activeTab === 'members' && <MembersPanel />}
          {activeTab === 'help' && <HelpPanel />}
        </div>
      )}
    </div>
  )
}
