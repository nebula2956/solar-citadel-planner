import { useRef, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  useDroppable,
} from '@dnd-kit/core'
import type { DragEndEvent, CollisionDetection, Collision } from '@dnd-kit/core'
import { useGridStore } from '../../store/useGridStore'
import { useUIStore } from '../../store/useUIStore'
import { OBJECT_DEFINITIONS } from '../../constants/objectDefinitions'
import { cellKey } from '../../utils/serialization'
import { toIso, fromIso, toGameCoord, getExclusionZone, TILE_W, TILE_H } from '../../utils/gameCoords'
import { PlacedObject } from '../objects/PlacedObject'

// アイソメトリックグリッドの左上オフセット（グリッドをダイヤ形に描画するためのX原点）
function getOriginX(gridHeight: number) {
  return gridHeight * (TILE_W / 2)
}

export function GridBoard() {
  const boardRef = useRef<HTMLDivElement>(null)
  const { present, addPlacement, movePlacement, getCellMap } = useGridStore()
  const { activeTool, activeObjectType, activeTeamId, setSelectedPlacementId, zoom } = useUIStore()
  const { gridWidth, gridHeight, placements } = present

  const originX = getOriginX(gridHeight)
  const isoWidth = (gridWidth + gridHeight) * (TILE_W / 2)
  const isoHeight = (gridWidth + gridHeight) * (TILE_H / 2)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // カスタムコリジョン検知：アイソメトリック逆変換でポインタ → (col, row) を算出
  const isoCollision: CollisionDetection = useCallback(
    ({ pointerCoordinates, droppableContainers }): Collision[] => {
      if (!boardRef.current || !pointerCoordinates) return []
      const boardRect = boardRef.current.getBoundingClientRect()
      // スクリーン座標 → ボード相対座標（ズーム考慮）
      const px = (pointerCoordinates.x - boardRect.left) / zoom
      const py = (pointerCoordinates.y - boardRect.top) / zoom
      // originX を引いてアイソメトリック原点基準に
      const relX = px - originX
      const { col, row } = fromIso(relX, py)
      if (col < 0 || row < 0 || col >= gridWidth || row >= gridHeight) return []
      const id = cellKey(col, row)
      const container = droppableContainers.find((c: { id: string | number }) => c.id === id)
      if (!container) return []
      return [{ id, data: container }]
    },
    [originX, gridWidth, gridHeight, zoom]
  )

  const handleCellClick = useCallback((col: number, row: number) => {
    if (activeTool === 'pan') return
    if (activeTool === 'place') {
      // 右下マス基準 → top-left アンカーに変換
      const span = OBJECT_DEFINITIONS[activeObjectType].cellSpan
      const anchorCol = col - (span - 1)
      const anchorRow = row - (span - 1)
      // 太陽城・砲台は中立（チームなし）
      const teamId = (activeObjectType === 'city') ? activeTeamId : ''
      addPlacement(anchorCol, anchorRow, activeObjectType, teamId)
    } else if (activeTool === 'select') {
      setSelectedPlacementId(null)
    }
  }, [activeTool, activeObjectType, activeTeamId, addPlacement, setSelectedPlacementId])

  const draggedId = useRef<string | null>(null)

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const id = draggedId.current
    draggedId.current = null
    const { active, over } = event
    if (!over || !id) return
    const [col, row] = (over.id as string).split(',').map(Number)
    // ドロップ先も右下基準 → top-left アンカーに変換
    const placement = placements.find(p => p.id === active.id)
    if (!placement) return
    const span = OBJECT_DEFINITIONS[placement.type].cellSpan
    const anchorCol = col - (span - 1)
    const anchorRow = row - (span - 1)
    movePlacement(active.id as string, anchorCol, anchorRow)
  }, [movePlacement, placements])

  const cellMap = getCellMap()

  // アンカーとなる配置だけを描画（マルチセルオブジェクトのtop-left）
  const anchorPlacements = placements.filter(p =>
    cellMap.get(cellKey(p.col, p.row))?.id === p.id
  )

  // 排除ゾーンの計算
  const solarCitadel = placements.find(p => p.type === 'solar_citadel')
  const exclusionZone = solarCitadel ? getExclusionZone(solarCitadel) : null

  // アイソメトリック座標でSVG polygonの頂点を生成する
  // (col, row) のセルのひし形4頂点（top, right, bottom, left）
  function cellDiamond(col: number, row: number) {
    const { sx, sy } = toIso(col, row)
    const cx = originX + sx + TILE_W / 2   // ひし形中心X
    const cy = sy + TILE_H / 2             // ひし形中心Y
    return `${cx},${cy - TILE_H / 2} ${cx + TILE_W / 2},${cy} ${cx},${cy + TILE_H / 2} ${cx - TILE_W / 2},${cy}`
  }

  // 矩形ゾーンの外形をアイソメトリックポリゴンで描画
  function zonePoly(colMin: number, rowMin: number, colMax: number, rowMax: number) {
    // 4隅の頂点（アイソメトリック変換）
    const corner = (col: number, row: number, corner: 'top' | 'right' | 'bottom' | 'left') => {
      const { sx, sy } = toIso(col, row)
      const cx = originX + sx + TILE_W / 2
      const cy = sy + TILE_H / 2
      switch (corner) {
        case 'top':    return { x: cx, y: cy - TILE_H / 2 }
        case 'right':  return { x: cx + TILE_W / 2, y: cy }
        case 'bottom': return { x: cx, y: cy + TILE_H / 2 }
        case 'left':   return { x: cx - TILE_W / 2, y: cy }
      }
    }
    const topLeft    = corner(colMin, rowMin, 'top')
    const topRight   = corner(colMax - 1, rowMin, 'right')
    const bottomRight = corner(colMax - 1, rowMax - 1, 'bottom')
    const bottomLeft = corner(colMin, rowMax - 1, 'left')
    return `${topLeft.x},${topLeft.y} ${topRight.x},${topRight.y} ${bottomRight.x},${bottomRight.y} ${bottomLeft.x},${bottomLeft.y}`
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={isoCollision}
      onDragStart={e => { draggedId.current = e.active.id as string }}
      onDragEnd={handleDragEnd}
    >
      <div
        ref={boardRef}
        style={{
          position: 'relative',
          width: isoWidth,
          height: isoHeight,
          overflow: 'visible',
        }}
        onClick={() => {
          if (activeTool === 'select') setSelectedPlacementId(null)
        }}
      >
        {/* SVGレイヤー：グリッド線・排除ゾーン */}
        <svg
          style={{ position: 'absolute', top: 0, left: 0, width: isoWidth, height: isoHeight, pointerEvents: 'none', zIndex: 0 }}
          viewBox={`0 0 ${isoWidth} ${isoHeight}`}
        >
          {/* グリッドセル（ひし形） */}
          {Array.from({ length: gridHeight }, (_, row) =>
            Array.from({ length: gridWidth }, (_, col) => (
              <polygon
                key={`grid-${col}-${row}`}
                points={cellDiamond(col, row)}
                fill="none"
                stroke="#1e293b"
                strokeWidth="0.5"
              />
            ))
          )}

          {/* 排除ゾーン（太陽城の12×12範囲） */}
          {exclusionZone && (() => {
            const z = exclusionZone
            const clampedColMin = Math.max(0, z.colMin)
            const clampedRowMin = Math.max(0, z.rowMin)
            const clampedColMax = Math.min(gridWidth, z.colMax)
            const clampedRowMax = Math.min(gridHeight, z.rowMax)
            if (clampedColMax <= clampedColMin || clampedRowMax <= clampedRowMin) return null

            const pts = zonePoly(clampedColMin, clampedRowMin, clampedColMax, clampedRowMax)
            // 排除ゾーン中心のアイソ座標
            const centerCol = (clampedColMin + clampedColMax) / 2
            const centerRow = (clampedRowMin + clampedRowMax) / 2
            const { sx: csx, sy: csy } = toIso(Math.floor(centerCol), Math.floor(centerRow))
            const labelX = originX + csx + TILE_W / 2
            const labelY = csy + TILE_H / 2

            return (
              <g key="exclusion-zone">
                <polygon
                  points={pts}
                  fill="rgba(239,68,68,0.08)"
                  stroke="rgba(239,68,68,0.5)"
                  strokeWidth="1.5"
                  strokeDasharray="6,4"
                />
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="11"
                  fill="rgba(239,68,68,0.7)"
                  fontWeight="600"
                  style={{ userSelect: 'none' }}
                >
                  都市設置不可
                </text>
              </g>
            )
          })()}
        </svg>

        {/* DroppableセルとPlacedObjectを同じ座標系で描画 */}
        {Array.from({ length: gridHeight }, (_, row) =>
          Array.from({ length: gridWidth }, (_, col) => (
            <DroppableCell
              key={cellKey(col, row)}
              col={col}
              row={row}
              originX={originX}
              onClick={() => handleCellClick(col, row)}
              zoom={zoom}
            />
          ))
        )}

        {anchorPlacements.map(p => (
          <PlacedObject key={p.id} placement={p} originX={originX} />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {draggedId.current ? (() => {
          const p = placements.find(pl => pl.id === draggedId.current)
          if (!p) return null
          const def = OBJECT_DEFINITIONS[p.type]
          const span = def.cellSpan
          const w = span * TILE_W
          const h = span * TILE_H
          return (
            <div style={{
              width: w,
              height: h,
              clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
              backgroundColor: 'rgba(96,165,250,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: span > 2 ? 28 : 18,
              border: '2px dashed #60a5fa',
              pointerEvents: 'none',
            }}>
              {def.emoji}
            </div>
          )
        })() : null}
      </DragOverlay>
    </DndContext>
  )
}

interface DroppableCellProps {
  col: number
  row: number
  originX: number
  onClick: () => void
  zoom: number
}

function DroppableCell({ col, row, originX, onClick }: DroppableCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id: cellKey(col, row) })
  const { activeTool } = useUIStore()
  const { x, y } = toGameCoord(col, row)
  const { zoom } = useUIStore()

  const { sx, sy } = toIso(col, row)
  const cellLeft = originX + sx
  const cellTop = sy

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      style={{
        position: 'absolute',
        left: cellLeft,
        top: cellTop,
        width: TILE_W,
        height: TILE_H,
        clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
        backgroundColor: isOver ? 'rgba(96,165,250,0.35)' : 'transparent',
        cursor: activeTool === 'place' ? 'crosshair' : 'default',
        zIndex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* 座標ラベル（ズーム < 0.45 で非表示） */}
      <span style={{
        fontSize: 7,
        color: 'rgba(148,163,184,0.55)',
        pointerEvents: 'none',
        userSelect: 'none',
        lineHeight: 1.1,
        textAlign: 'center',
        opacity: zoom < 0.45 ? 0 : 1,
        transition: 'opacity 0.2s',
        fontFamily: 'monospace',
        whiteSpace: 'nowrap',
        marginTop: 4,
      }}>
        {x},{y}
      </span>
    </div>
  )
}
