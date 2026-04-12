import { useState } from 'react'
import { useGridStore } from '../../store/useGridStore'
import { useUIStore } from '../../store/useUIStore'
import { TEAM_COLORS } from '../../constants/gridConfig'
import { OBJECT_DEFINITIONS } from '../../constants/objectDefinitions'

export function Sidebar() {
  const { present, updateTeam, addTeam, removeTeam, updatePlacementLabel } = useGridStore()
  const { activeTeamId, setActiveTeamId, selectedPlacementId } = useUIStore()
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null)

  const counts = present.placements.reduce((acc, p) => {
    acc[p.type] = (acc[p.type] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const selectedPlacement = present.placements.find(p => p.id === selectedPlacementId)
  const isCitySelected = selectedPlacement?.type === 'city'

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
      {/* Object counts */}
      <div style={{ padding: '12px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>配置数</div>
        {(['city', 'solar_citadel', 'cannon'] as const).map(type => {
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
      </div>

      {/* 都市名編集（都市選択時のみ表示） */}
      {isCitySelected && selectedPlacement && (
        <div style={{ padding: '12px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
            🏙️ 都市名
          </div>
          <input
            key={selectedPlacementId}
            defaultValue={selectedPlacement.label ?? ''}
            placeholder="都市名を入力..."
            style={{
              width: '100%',
              padding: '6px 8px',
              backgroundColor: '#1e293b',
              border: '1px solid #3b82f6',
              borderRadius: 6,
              color: '#f8fafc',
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onBlur={e => updatePlacementLabel(selectedPlacement.id, e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          />
          <div style={{ color: '#475569', fontSize: 10, marginTop: 4 }}>
            Enterまたはフォーカスを外して確定
          </div>
        </div>
      )}

      {/* Teams */}
      <div style={{ padding: '12px', flex: 1 }}>
        <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>チーム</div>

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
              {/* Color swatch */}
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  backgroundColor: team.color,
                  cursor: 'pointer',
                  flexShrink: 0,
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
                onClick={e => { e.stopPropagation(); setShowColorPicker(showColorPicker === team.id ? null : team.id) }}
              />

              {/* Name */}
              {editingTeamId === team.id ? (
                <input
                  autoFocus
                  defaultValue={team.name}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#f8fafc',
                    fontSize: 13,
                  }}
                  onBlur={e => { updateTeam(team.id, { name: e.target.value }); setEditingTeamId(null) }}
                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span
                  style={{ flex: 1, color: '#f8fafc', fontSize: 13 }}
                  onDoubleClick={e => { e.stopPropagation(); setEditingTeamId(team.id) }}
                >
                  {team.name}
                </span>
              )}

              {/* Count */}
              <span style={{ color: '#64748b', fontSize: 11 }}>
                {present.placements.filter(p => p.teamId === team.id).length}
              </span>

              {/* Delete */}
              {present.teams.length > 1 && (
                <button
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, fontSize: 12 }}
                  onClick={e => { e.stopPropagation(); removeTeam(team.id) }}
                  title="チームを削除"
                >✕</button>
              )}
            </div>

            {/* Color picker */}
            {showColorPicker === team.id && (
              <div
                style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}
                onClick={e => e.stopPropagation()}
              >
                {TEAM_COLORS.map(color => (
                  <div
                    key={color}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      backgroundColor: color,
                      cursor: 'pointer',
                      border: team.color === color ? '2px solid white' : '1px solid rgba(255,255,255,0.2)',
                    }}
                    onClick={() => { updateTeam(team.id, { color }); setShowColorPicker(null) }}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        <button
          style={{
            width: '100%',
            padding: '6px',
            marginTop: 4,
            backgroundColor: '#1e293b',
            border: '1px dashed #334155',
            borderRadius: 6,
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: 12,
          }}
          onClick={addTeam}
        >
          + チームを追加
        </button>
      </div>

      {/* Help */}
      <div style={{ padding: '12px', borderTop: '1px solid #1e293b', fontSize: 11, color: '#475569' }}>
        <div style={{ fontWeight: 600, marginBottom: 6, color: '#64748b' }}>操作方法</div>
        <div>✏️ 配置: クリックして配置</div>
        <div>↕️ 選択: クリック→ドラッグ</div>
        <div>🗑️ 削除: クリックで削除</div>
        <div>🖱️ ホイール: ズーム</div>
        <div>Space+ドラッグ: パン</div>
        <div>Ctrl+Z/Y: Undo/Redo</div>
        <div>Del: 選択中を削除</div>
      </div>
    </div>
  )
}
