import { useEffect, useRef, useState } from 'react'
import type React from 'react'
import { useGridStore } from '../../store/useGridStore'
import { useUIStore } from '../../store/useUIStore'
import { OBJECT_DEFINITIONS } from '../../constants/objectDefinitions'
import { toGameCoordFromState, getExclusionZone, getAllianceArea, getAreaOwnerAtCell, isAllianceNetworkConnected } from '../../utils/gameCoords'
import { calcMarchTime, formatMarchTime } from '../../utils/marchTime'
import type { ObjectType, Placement } from '../../types'

export function ActionPopup() {
  const popup = useUIStore(s => s.popup)
  const setPopup = useUIStore(s => s.setPopup)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!popup) return
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setPopup(null)
      }
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [popup, setPopup])

  if (!popup) return null

  const W = 240
  const margin = 8
  const left = popup.screenX + margin + W > window.innerWidth
    ? popup.screenX - W - margin
    : popup.screenX + margin
  const top = Math.min(popup.screenY + margin, window.innerHeight - 400)

  const style: React.CSSProperties = {
    position: 'fixed',
    left,
    top,
    width: W,
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 10,
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    zIndex: 200,
    userSelect: 'none',
    overflow: 'hidden',
    maxHeight: '80vh',
    overflowY: 'auto',
  }

  if (popup.type === 'cell' && popup.col !== undefined && popup.row !== undefined) {
    return <CellPopup col={popup.col} row={popup.row} style={style} divRef={ref} />
  }
  if (popup.type === 'placement' && popup.placementId) {
    return <PlacementPopup placementId={popup.placementId} style={style} divRef={ref} />
  }
  return null
}

function CellPopup({ col, row, style, divRef }: {
  col: number
  row: number
  style: React.CSSProperties
  divRef: React.RefObject<HTMLDivElement | null>
}) {
  const setPopup = useUIStore(s => s.setPopup)
  const activeTeamId = useUIStore(s => s.activeTeamId)
  const setActiveTeamId = useUIStore(s => s.setActiveTeamId)
  const { present, addPlacement } = useGridStore()
  const { x, y } = toGameCoordFromState(col, row, present)

  const counts = present.placements.reduce((acc: Record<string, number>, p) => {
    acc[p.type] = (acc[p.type] ?? 0) + 1
    return acc
  }, {})

  const sc = present.placements.find(p => p.type === 'solar_citadel')
  const zone = sc ? getExclusionZone(sc) : null

  const getBlockReason = (type: ObjectType): string | null => {
    const def = OBJECT_DEFINITIONS[type]
    if (def.maxCount !== undefined && (counts[type] ?? 0) >= def.maxCount) return '上限'

    const anchorCol = col - (def.cellSpan - 1)
    const anchorRow = row - (def.cellSpan - 1)

    if (type === 'city' && zone) {
      for (let dr = 0; dr < def.cellSpan; dr++) for (let dc = 0; dc < def.cellSpan; dc++) {
        const cc = anchorCol + dc
        const rr = anchorRow + dr
        if (cc >= zone.colMin && cc < zone.colMax && rr >= zone.rowMin && rr < zone.rowMax) return '設置不可'
      }
    }

    if (type === 'flag') {
      const hypotheticalFlag: Placement = {
        id: '__hypothetical__',
        type: 'flag',
        col: anchorCol,
        row: anchorRow,
        teamId: activeTeamId,
      }
      if (!isAllianceNetworkConnected(activeTeamId, [...present.placements, hypotheticalFlag], OBJECT_DEFINITIONS)) {
        return 'エリア外'
      }
    }

    if (type === 'bear_trap') {
      const allies = present.placements.filter(p =>
        p.teamId === activeTeamId && (p.type === 'alliance_hq' || p.type === 'flag')
      )
      const inside = allies.some(a => {
        const aDef = OBJECT_DEFINITIONS[a.type]
        if (aDef.areaRadius === undefined) return false
        const area = getAllianceArea(a, aDef.cellSpan, aDef.areaRadius)
        for (let dr = 0; dr < def.cellSpan; dr++) {
          for (let dc = 0; dc < def.cellSpan; dc++) {
            const cc = anchorCol + dc
            const rr = anchorRow + dr
            if (cc < area.colMin || cc >= area.colMax || rr < area.rowMin || rr >= area.rowMax) return false
          }
        }
        return true
      })
      if (!inside) return 'エリア外'
    }

    const effectiveTeamId = type === 'solar_citadel' ? '' : activeTeamId
    if (effectiveTeamId !== '') {
      const areaBuildings = present.placements.filter(p => p.teamId !== '' && (p.type === 'alliance_hq' || p.type === 'flag'))
      for (let dr = 0; dr < def.cellSpan; dr++) {
        for (let dc = 0; dc < def.cellSpan; dc++) {
          const cc = anchorCol + dc
          const rr = anchorRow + dr
          const owner = getAreaOwnerAtCell(cc, rr, areaBuildings, OBJECT_DEFINITIONS)
          if (owner !== null && owner !== effectiveTeamId) return '敵エリア'
        }
      }
    }

    return null
  }

  const handlePlace = (type: ObjectType) => {
    const def = OBJECT_DEFINITIONS[type]
    const needsTeam = type !== 'solar_citadel'
    addPlacement(col - (def.cellSpan - 1), row - (def.cellSpan - 1), type, needsTeam ? activeTeamId : '')
    setPopup(null)
  }

  const objects: ObjectType[] = ['city', 'cannon', 'solar_citadel', 'alliance_hq', 'flag', 'bear_trap', 'fortress']

  return (
    <div ref={divRef as React.RefObject<HTMLDivElement>} style={style} onPointerDown={e => e.stopPropagation()}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}>x{x}, y{y}</span>
        <button onClick={() => setPopup(null)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 14, padding: 0 }}>✕</button>
      </div>

      <div style={{ padding: '10px 12px' }}>
        <div style={{ color: '#64748b', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>配置</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {objects.map(type => {
            const def = OBJECT_DEFINITIONS[type]
            const reason = getBlockReason(type)
            const disabled = reason !== null
            return (
              <button key={type} disabled={disabled} onClick={() => handlePlace(type)} style={{
                padding: '8px 10px', borderRadius: 6,
                border: `1px solid ${disabled ? '#1e293b' : def.borderColor}`,
                backgroundColor: disabled ? '#0a0f1e' : `${def.bgColor}22`,
                color: disabled ? '#334155' : '#f8fafc',
                fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer',
                textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                {def.emoji && <span>{def.emoji}</span>}
                <span>{def.label}</span>
                {reason && <span style={{ fontSize: 10, color: (reason === '設置不可' || reason === '敵エリア') ? '#ef4444' : '#475569', marginLeft: 'auto' }}>{reason}</span>}
              </button>
            )
          })}
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={{ color: '#64748b', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>チーム</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {present.teams.map(team => (
              <button key={team.id} onClick={() => setActiveTeamId(team.id)} style={{
                padding: '4px 8px', borderRadius: 4,
                border: `1px solid ${activeTeamId === team.id ? team.color : '#1e293b'}`,
                backgroundColor: activeTeamId === team.id ? `${team.color}33` : 'transparent',
                color: activeTeamId === team.id ? '#f8fafc' : '#64748b',
                fontSize: 11, cursor: 'pointer',
              }}>
                {team.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const sectionLabel: React.CSSProperties = {
  color: '#64748b', fontSize: 10, fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6,
}

function PlacementPopup({ placementId, style, divRef }: {
  placementId: string
  style: React.CSSProperties
  divRef: React.RefObject<HTMLDivElement | null>
}) {
  const setPopup = useUIStore(s => s.setPopup)
  const { present, removePlacement, updatePlacementLabel, updatePlacement, updateTeam } = useGridStore()
  const placement = present.placements.find(p => p.id === placementId)

  const [labelValue, setLabelValue] = useState(placement?.label ?? '')
  useEffect(() => { setLabelValue(placement?.label ?? '') }, [placementId, placement?.label])

  if (!placement) return null

  const def = OBJECT_DEFINITIONS[placement.type]
  const span = def.cellSpan
  const { x, y } = toGameCoordFromState(placement.col + span - 1, placement.row + span - 1, present)
  const team = present.teams.find(t => t.id === placement.teamId)
  const hasLabel = placement.type === 'city' || placement.type === 'alliance_hq' || placement.type === 'flag'
  const hasTeam = placement.type !== 'solar_citadel'
  const isTargetCandidate = placement.type !== 'city'

  return (
    <div ref={divRef as React.RefObject<HTMLDivElement>} style={style} onPointerDown={e => e.stopPropagation()}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {def.emoji && <span>{def.emoji}</span>}
          <span style={{ color: '#f8fafc', fontSize: 13, fontWeight: 600 }}>{def.label}</span>
          {team && <span style={{ fontSize: 10, color: team.color }}>● {team.name}</span>}
        </div>
        <button onClick={() => setPopup(null)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 14, padding: 0 }}>✕</button>
      </div>

      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}>x{x}, y{y}</div>

        {hasLabel && (
          <div>
            <div style={sectionLabel}>名前</div>
            <input
              value={labelValue}
              placeholder="名前を入力..."
              style={{
                width: '100%', padding: '6px 8px',
                backgroundColor: '#1e293b', border: '1px solid #3b82f6',
                borderRadius: 6, color: '#f8fafc', fontSize: 13,
                outline: 'none', boxSizing: 'border-box',
              }}
              onChange={e => setLabelValue(e.target.value)}
              onBlur={() => {
                if (labelValue !== (placement.label ?? '')) {
                  updatePlacementLabel(placement.id, labelValue)
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  ;(e.target as HTMLInputElement).blur()
                }
              }}
            />
          </div>
        )}

        {hasTeam && (
          <div>
            <div style={sectionLabel}>チーム</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {present.teams.map(t => (
                <button key={t.id} onClick={() => updatePlacement(placement.id, { teamId: t.id })} style={{
                  padding: '4px 8px', borderRadius: 4,
                  border: `1px solid ${placement.teamId === t.id ? t.color : '#1e293b'}`,
                  backgroundColor: placement.teamId === t.id ? `${t.color}33` : 'transparent',
                  color: placement.teamId === t.id ? '#f8fafc' : '#64748b',
                  fontSize: 11, cursor: 'pointer',
                }}>
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {isTargetCandidate && (
          <div>
            <div style={sectionLabel}>行軍目標に設定</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {present.teams.map(t => {
                const isTarget = t.marchTargetId === placement.id
                return (
                  <button
                    key={t.id}
                    onClick={() => updateTeam(t.id, { marchTargetId: isTarget ? undefined : placement.id })}
                    style={{
                      padding: '4px 8px', borderRadius: 4,
                      border: `1px solid ${isTarget ? t.color : '#1e293b'}`,
                      backgroundColor: isTarget ? `${t.color}33` : 'transparent',
                      color: isTarget ? '#f8fafc' : '#64748b',
                      fontSize: 11, cursor: 'pointer',
                    }}
                  >
                    {isTarget ? '★' : '☆'} {t.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {placement.type === 'city' && (
          <MarchTimeSection sourceCol={placement.col} sourceRow={placement.row} />
        )}

        <button
          onClick={() => { removePlacement(placement.id); setPopup(null) }}
          style={{
            padding: '8px', borderRadius: 6,
            border: '1px solid #7f1d1d', backgroundColor: '#450a0a',
            color: '#f87171', fontSize: 13, cursor: 'pointer',
          }}
        >
          🗑 削除
        </button>
      </div>
    </div>
  )
}

function MarchTimeSection({ sourceCol, sourceRow }: { sourceCol: number; sourceRow: number }) {
  const { present } = useGridStore()
  const { marchSettings } = useUIStore()

  const srcSpan = OBJECT_DEFINITIONS['city'].cellSpan
  const sourceGameXY = toGameCoordFromState(sourceCol + srcSpan - 1, sourceRow + srcSpan - 1, present)

  // チームごとの目標一覧（marchTargetId が設定されているチームのみ）
  const teamTargets = present.teams
    .filter(t => t.marchTargetId)
    .map(t => {
      const target = present.placements.find(p => p.id === t.marchTargetId)
      return target ? { team: t, target } : null
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  if (teamTargets.length === 0) {
    return (
      <div>
        <div style={sectionLabel}>行軍時間</div>
        <div style={{ color: '#475569', fontSize: 11 }}>建造物をタップして行軍目標を設定してください</div>
      </div>
    )
  }

  return (
    <div>
      <div style={sectionLabel}>行軍時間</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {teamTargets.map(({ team, target }) => {
          const def = OBJECT_DEFINITIONS[target.type]
          const span = def.cellSpan
          const { x, y } = toGameCoordFromState(target.col + span - 1, target.row + span - 1, present)
          const label = target.label ? `${target.label} (${def.label})` : def.label

          if (target.type === 'fortress') {
            return (
              <div key={team.id} style={{ borderTop: '1px solid #1e293b', paddingTop: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <span style={{ color: team.color, fontSize: 11, fontWeight: 600 }}>● {team.name}</span>
                  <span style={{ color: '#cbd5e1', fontSize: 10 }}>{label}</span>
                </div>
                <div style={{ color: '#475569', fontSize: 10 }}>x{x},y{y} — 計算対応予定</div>
              </div>
            )
          }

          const isSC = target.type === 'solar_citadel'
          const secsNoPet = calcMarchTime(
            [sourceGameXY.x, sourceGameXY.y], srcSpan,
            [x, y], span,
            marchSettings.passiveBonus, 0, isSC
          )
          const secsPet = marchSettings.petBonus > 0
            ? calcMarchTime(
                [sourceGameXY.x, sourceGameXY.y], srcSpan,
                [x, y], span,
                marchSettings.passiveBonus, marchSettings.petBonus, isSC
              )
            : null

          return (
            <div key={team.id} style={{ borderTop: '1px solid #1e293b', paddingTop: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <span style={{ color: team.color, fontSize: 11, fontWeight: 600 }}>● {team.name}</span>
                <span style={{ color: '#94a3b8', fontSize: 10 }}>{label} x{x},y{y}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <div style={{ flex: 1, backgroundColor: '#1e293b', borderRadius: 4, padding: '4px 6px', textAlign: 'center' }}>
                  <div style={{ color: '#64748b', fontSize: 9 }}>ペット無</div>
                  <div style={{ color: '#fbbf24', fontSize: 14, fontWeight: 700 }}>{formatMarchTime(secsNoPet)}</div>
                </div>
                {secsPet !== null && (
                  <div style={{ flex: 1, backgroundColor: '#1e293b', borderRadius: 4, padding: '4px 6px', textAlign: 'center' }}>
                    <div style={{ color: '#64748b', fontSize: 9 }}>ペット有</div>
                    <div style={{ color: '#fb923c', fontSize: 14, fontWeight: 700 }}>{formatMarchTime(secsPet)}</div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
