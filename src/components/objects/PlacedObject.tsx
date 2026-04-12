import { useDraggable } from '@dnd-kit/core'
import type { Placement } from '../../types'
import { OBJECT_DEFINITIONS } from '../../constants/objectDefinitions'
import { useUIStore } from '../../store/useUIStore'
import { useGridStore } from '../../store/useGridStore'
import { toIso, toGameCoord, TILE_W, TILE_H } from '../../utils/gameCoords'

interface Props {
  placement: Placement
  originX: number
}

export function PlacedObject({ placement, originX }: Props) {
  const { activeTool, selectedPlacementId, setSelectedPlacementId } = useUIStore()
  const { removePlacement } = useGridStore()
  const teams = useGridStore(s => s.present.teams)
  const def = OBJECT_DEFINITIONS[placement.type]
  const team = teams.find(t => t.id === placement.teamId)
  const isSelected = selectedPlacementId === placement.id
  const span = def.cellSpan

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: placement.id,
    disabled: activeTool !== 'select',
  })

  // バウンディングボックス計算
  // top-left cell: (col, row)、bottom-right cell: (col+span-1, row+span-1)
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

  // ひし形ポリゴン頂点（BB相対）
  const polyPoints = [
    `${topX - bbLeft},${topY - bbTop}`,
    `${rightX - bbLeft},${topY + bbHeight / 2 - bbTop}`,
    `${topX - bbLeft},${bottomY - bbTop}`,
    `${leftX - bbLeft},${topY + bbHeight / 2 - bbTop}`,
  ].join(' ')

  const color = team?.color ?? def.bgColor
  const useImage = placement.type === 'solar_citadel' || placement.type === 'cannon'
  // 都市の座標：右下セル(col+span-1, row+span-1)のゲーム座標
  const { x: gameX, y: gameY } = toGameCoord(placement.col + span - 1, placement.row + span - 1)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (activeTool === 'delete') {
      removePlacement(placement.id)
    } else if (activeTool === 'select') {
      setSelectedPlacementId(isSelected ? null : placement.id)
    }
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      style={{
        position: 'absolute',
        left: bbLeft,
        top: bbTop,
        width: bbWidth,
        height: bbHeight,
        opacity: isDragging ? 0.35 : 1,
        cursor: activeTool === 'select' ? 'grab' : activeTool === 'delete' ? 'pointer' : 'default',
        zIndex: isSelected ? 20 : 5,
        pointerEvents: 'auto',
      }}
    >
      {useImage ? (
        /* 太陽城・砲台：実際の画像で表示 */
        <>
          {/* 選択時のハイライトリング（SVG） */}
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
                filter="drop-shadow(0 0 8px rgba(255,255,255,0.8))"
              />
            </svg>
          )}
          {/* 画像：BBサイズにぴったり合わせる */}
          <img
            src={`/${placement.type === 'solar_citadel' ? 'solar_citadel' : 'cannon'}.png`}
            alt={def.label}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: bbWidth,
              height: bbHeight,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />
        </>
      ) : (
        /* 都市：チームカラーのひし形 */
        <svg
          viewBox={`0 0 ${bbWidth} ${bbHeight}`}
          style={{ position: 'absolute', top: 0, left: 0, width: bbWidth, height: bbHeight, overflow: 'visible' }}
        >
          <polygon
            points={polyPoints}
            fill={color}
            opacity={0.88}
            stroke={isSelected ? '#ffffff' : color}
            strokeWidth={isSelected ? 3 : 1.5}
            filter={isSelected ? 'drop-shadow(0 0 6px rgba(255,255,255,0.6))' : undefined}
          />
        </svg>
      )}

      {/* テキストラベル（都市のみ、または画像の上に重ねる） */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: bbWidth,
          height: bbHeight,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          userSelect: 'none',
          gap: 1,
          // 太陽城・砲台は画像の上にラベルのみ（絵文字なし）
          paddingTop: useImage ? bbHeight * 0.55 : 0,
        }}
      >
        {!useImage && (
          <span style={{ fontSize: span >= 4 ? 22 : 16, lineHeight: 1 }}>
            {def.emoji}
          </span>
        )}
        <span style={{
          fontSize: useImage ? 9 : (span >= 4 ? 12 : 10),
          color: '#fff',
          fontWeight: 700,
          textShadow: '0 1px 3px rgba(0,0,0,0.95)',
          textAlign: 'center',
          maxWidth: bbWidth * 0.8,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          background: useImage ? 'rgba(0,0,0,0.45)' : 'transparent',
          padding: useImage ? '1px 4px' : '0',
          borderRadius: useImage ? 3 : 0,
        }}>
          {placement.label ?? def.label}
        </span>
        {/* 都市のみチーム名・座標表示 */}
        {!useImage && team && (
          <span style={{
            fontSize: 8,
            color: 'rgba(255,255,255,0.8)',
            textShadow: '0 1px 2px rgba(0,0,0,0.9)',
          }}>
            {team.name}
          </span>
        )}
        {!useImage && (
          <span style={{
            fontSize: 8,
            color: 'rgba(255,255,255,0.65)',
            textShadow: '0 1px 2px rgba(0,0,0,0.9)',
            fontFamily: 'monospace',
          }}>
            {gameX},{gameY}
          </span>
        )}
      </div>
    </div>
  )
}
