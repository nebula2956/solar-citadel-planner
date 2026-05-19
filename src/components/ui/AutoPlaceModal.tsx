import { useState } from 'react'
import { useGridStore } from '../../store/useGridStore'
import { useUIStore } from '../../store/useUIStore'
import type { AreaSelectRect } from '../../store/useUIStore'

interface Props {
  rect: AreaSelectRect
  onClose: () => void
}

export function AutoPlaceModal({ rect, onClose }: Props) {
  const { present, autoPlaceCities } = useGridStore()
  const { setActiveTool, setAreaSelectRect } = useUIStore()
  const [selectedTeamId, setSelectedTeamId] = useState(present.teams[0]?.id ?? '')

  const { colMin, colMax, rowMin, rowMax } = rect
  const cols = colMax - colMin + 1
  const rows = rowMax - rowMin + 1

  const selectedTeam = present.teams.find(t => t.id === selectedTeamId)
  const hasTarget = !!selectedTeam?.marchTargetId

  const handleExecute = () => {
    autoPlaceCities(selectedTeamId, colMin, colMax, rowMin, rowMax)
    setAreaSelectRect(null)
    setActiveTool('pan')
    onClose()
  }

  const handleCancel = () => {
    setAreaSelectRect(null)
    setActiveTool('pan')
    onClose()
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 400,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  }

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 12,
    padding: '20px 24px',
    minWidth: 280,
    boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
  }

  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '6px 8px',
    backgroundColor: '#1e293b', border: '1px solid #334155',
    borderRadius: 6, color: '#f8fafc', fontSize: 13, cursor: 'pointer',
  }

  return (
    <div style={overlayStyle} onPointerDown={handleCancel}>
      <div style={cardStyle} onPointerDown={e => e.stopPropagation()}>
        <div style={{ color: '#f8fafc', fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
          都市を自動配置
        </div>

        <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>
          選択範囲: {cols} × {rows} マス
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ color: '#64748b', fontSize: 11, marginBottom: 6 }}>配置チーム</div>
          <select
            value={selectedTeamId}
            onChange={e => setSelectedTeamId(e.target.value)}
            style={selectStyle}
          >
            {present.teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {!hasTarget && (
          <div style={{
            color: '#fbbf24', fontSize: 12, marginBottom: 12,
            padding: '6px 10px', backgroundColor: 'rgba(251,191,36,0.1)',
            borderRadius: 6, border: '1px solid rgba(251,191,36,0.3)',
          }}>
            ⚠ このチームには行軍目標が設定されていません
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={handleCancel}
            style={{
              padding: '6px 14px', borderRadius: 6,
              border: '1px solid #334155', backgroundColor: 'transparent',
              color: '#94a3b8', fontSize: 13, cursor: 'pointer',
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleExecute}
            disabled={!hasTarget}
            style={{
              padding: '6px 14px', borderRadius: 6, border: 'none',
              backgroundColor: hasTarget ? '#6366f1' : '#334155',
              color: hasTarget ? '#fff' : '#64748b',
              fontSize: 13, cursor: hasTarget ? 'pointer' : 'not-allowed',
              fontWeight: 600,
            }}
          >
            配置実行 ▶
          </button>
        </div>
      </div>
    </div>
  )
}
