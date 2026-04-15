import type { Placement } from '../../types'
import { OBJECT_DEFINITIONS } from '../../constants/objectDefinitions'
import { useUIStore } from '../../store/useUIStore'
import { useGridStore } from '../../store/useGridStore'
import { toIso, toGameCoordFromState, TILE_W, TILE_H } from '../../utils/gameCoords'

interface Props {
  placement: Placement
  originX: number
  isDragging: boolean
  onPointerDown: (e: React.PointerEvent) => void
}

export function PlacedObject({ placement, originX, isDragging, onPointerDown }: Props) {
  const { setPopup, popup } = useUIStore()
  const present = useGridStore(s => s.present)
  const def = OBJECT_DEFINITIONS[placement.type]
  const team = present.teams.find(t => t.id === placement.teamId)
  const span = def.cellSpan

  const isSelected = popup?.type === 'placement' && popup.placementId === placement.id

  // バウンディングボックス計算
  const { sx: sxTL, sy: syTL } = toIso(placement.col, placement.row)
  const { sy: syBR } = toIso(placement.col + span - 1, placement.row + span - 1)
  const topX = originX + sxTL + TILE_W / 2
  const topY = syTL
  const bottomY = syBR + TILE_H
  const { sx: sxBL } = toIso(placement.col, placement.row + span - 1)
  const leftX = originX + sxBL
  const { sx: sxTR } = toIso(placement.col + span - 1, placement.row)
  const rightX = originX + sxTR + TILE_W

  const bbLeft = leftX
  const bbTop = topY
  const bbWidth = rightX - leftX
  const bbHeight = bottomY - topY

  const polyPoints = [
    `${topX - bbLeft},${topY - bbTop}`,
    `${rightX - bbLeft},${topY + bbHeight / 2 - bbTop}`,
    `${topX - bbLeft},${bottomY - bbTop}`,
    `${leftX - bbLeft},${topY + bbHeight / 2 - bbTop}`,
  ].join(' ')

  const color = team?.color ?? def.bgColor
  const useImage = placement.type === 'solar_citadel' || placement.type === 'cannon'
  const { x: gameX, y: gameY } = toGameCoordFromState(placement.col + span - 1, placement.row + span - 1, present)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isDragging) return
    setPopup({ type: 'placement', placementId: placement.id, screenX: e.clientX, screenY: e.clientY })
  }

  return (
    <div
      onPointerDown={onPointerDown}
      onClick={handleClick}
      data-placed-object="true"
      style={{
        position: 'absolute',
        left: bbLeft,
        top: bbTop,
        width: bbWidth,
        height: bbHeight,
        opacity: isDragging ? 0.35 : 1,
        cursor: isDragging ? 'grabbing' : 'pointer',
        zIndex: isSelected ? 20 : 5,
        pointerEvents: 'auto',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      {/* 選択時のグロー */}
      {isSelected && (
        <svg
          style={{ position: 'absolute', top: 0, left: 0, width: bbWidth, height: bbHeight, overflow: 'visible', pointerEvents: 'none' }}
          viewBox={`0 0 ${bbWidth} ${bbHeight}`}
        >
          <polygon
            points={polyPoints}
            fill="none"
            stroke="#ffffff"
            strokeWidth={3}
            filter="drop-shadow(0 0 10px rgba(255,255,255,0.9)) drop-shadow(0 0 20px rgba(255,255,255,0.5))"
          />
        </svg>
      )}

      {useImage ? (
        <>
          <svg
            style={{ position: 'absolute', top: 0, left: 0, width: bbWidth, height: bbHeight, overflow: 'visible', pointerEvents: 'none' }}
            viewBox={`0 0 ${bbWidth} ${bbHeight}`}
          >
            <polygon points={polyPoints} fill="#0a0f1e" />
          </svg>
          <img
            src={`/${placement.type === 'solar_citadel' ? 'solar_citadel' : 'cannon'}.png`}
            alt={def.label}
            draggable={false}
            style={{
              position: 'absolute', top: 0, left: 0,
              width: bbWidth, height: bbHeight,
              clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
              pointerEvents: 'none', userSelect: 'none',
            }}
          />
        </>
      ) : (
        <svg
          viewBox={`0 0 ${bbWidth} ${bbHeight}`}
          style={{ position: 'absolute', top: 0, left: 0, width: bbWidth, height: bbHeight, overflow: 'visible' }}
        >
          <polygon
            points={polyPoints}
            fill={color}
            opacity={0.88}
            stroke={isSelected ? '#ffffff' : color}
            strokeWidth={isSelected ? 2 : 1.5}
          />
        </svg>
      )}

      {/* テキストラベル */}
      <div style={{
        position: 'absolute', top: 0, left: 0,
        width: bbWidth, height: bbHeight,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', userSelect: 'none', gap: 1,
        paddingTop: useImage ? bbHeight * 0.55 : 0,
      }}>
        <span style={{
          fontSize: useImage ? 9 : (span >= 4 ? 12 : 9),
          color: '#fff', fontWeight: 700,
          textShadow: '0 1px 3px rgba(0,0,0,0.95)',
          textAlign: 'center',
          maxWidth: Math.max(bbWidth * 0.8, 80),
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          background: span === 1 ? 'rgba(0,0,0,0.55)' : (useImage ? 'rgba(0,0,0,0.45)' : 'transparent'),
          padding: span === 1 ? '1px 4px' : (useImage ? '1px 4px' : '0'),
          borderRadius: span === 1 ? 3 : (useImage ? 3 : 0),
        }}>
          {placement.label || def.label}
        </span>
        {!useImage && span > 1 && team && (
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.8)', textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
            {team.name}
          </span>
        )}
        {!useImage && span > 1 && (
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.65)', textShadow: '0 1px 2px rgba(0,0,0,0.9)', fontFamily: 'monospace' }}>
            x{gameX},y{gameY}
          </span>
        )}
      </div>
    </div>
  )
}
