import { useRef, useCallback, useState, useEffect, useMemo, memo } from 'react'

import { useGridStore } from '../../store/useGridStore'
import { useUIStore } from '../../store/useUIStore'
import { OBJECT_DEFINITIONS } from '../../constants/objectDefinitions'
import { cellKey } from '../../utils/serialization'
import { toIso, fromIso, toGameCoordFromState, getExclusionZone, getAllianceArea, getAreaOwnerAtCell, isAllianceNetworkConnected, TILE_W, TILE_H } from '../../utils/gameCoords'
import { PlacedObject } from '../objects/PlacedObject'
import type { Placement } from '../../types'

const LONG_PRESS_DELAY = 300

function getOriginX(gridHeight: number) {
  return gridHeight * (TILE_W / 2)
}

interface GridBoardProps {
  visibleColMin?: number
  visibleColMax?: number
  visibleRowMin?: number
  visibleRowMax?: number
}

export function GridBoard({ visibleColMin, visibleColMax, visibleRowMin, visibleRowMax }: GridBoardProps = {}) {
  const boardRef = useRef<HTMLDivElement>(null)
  const { present, movePlacement, getCellMap } = useGridStore()
  const { setPopup, zoom, setIsDraggingObject, setIsPendingDrag, areaSelectRect } = useUIStore()
  const { gridWidth, gridHeight, placements } = present

  // 可視範囲（マージン付き）。指定がなければグリッド全体
  const MARGIN = 2
  const vcMin = Math.max(0, (visibleColMin ?? 0) - MARGIN)
  const vcMax = Math.min(gridWidth, (visibleColMax ?? gridWidth) + MARGIN)
  const vrMin = Math.max(0, (visibleRowMin ?? 0) - MARGIN)
  const vrMax = Math.min(gridHeight, (visibleRowMax ?? gridHeight) + MARGIN)

  const originX = getOriginX(gridHeight)
  const isoWidth = (gridWidth + gridHeight) * (TILE_W / 2)
  const isoHeight = (gridWidth + gridHeight) * (TILE_H / 2)

  // ドラッグ状態
  const [dragState, setDragState] = useState<{
    placementId: string
    overCol: number | null
    overRow: number | null
  } | null>(null)

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingPlacementId = useRef<string | null>(null)
  const isDraggingRef = useRef(false)
  const dragStateRef = useRef<{ placementId: string; overCol: number | null; overRow: number | null } | null>(null)
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null)
  const zoomRef = useRef(zoom)
  useEffect(() => { zoomRef.current = zoom }, [zoom])

  const getIsoCell = useCallback((clientX: number, clientY: number) => {
    if (!boardRef.current) return null
    const rect = boardRef.current.getBoundingClientRect()
    const px = (clientX - rect.left) / zoomRef.current
    const py = (clientY - rect.top) / zoomRef.current
    const relX = px - originX
    const { col, row } = fromIso(relX, py)
    if (col < 0 || row < 0 || col >= gridWidth || row >= gridHeight) return null
    return { col, row }
  }, [originX, gridWidth, gridHeight])

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    pendingPlacementId.current = null
    pointerDownPos.current = null
    setIsPendingDrag(false)
  }, [setIsPendingDrag])

  const endDrag = useCallback((clientX?: number, clientY?: number) => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    setIsDraggingObject(false)
    const ds = dragStateRef.current
    if (ds && clientX !== undefined && clientY !== undefined) {
      const cell = getIsoCell(clientX, clientY)
      if (cell) {
        // placements は最新をstoreから直接取得
        const { placements: latestPlacements } = useGridStore.getState().present
        const placement = latestPlacements.find(p => p.id === ds.placementId)
        if (placement) {
          const span = OBJECT_DEFINITIONS[placement.type].cellSpan
          movePlacement(ds.placementId, cell.col - (span - 1), cell.row - (span - 1))
        }
      }
    }
    dragStateRef.current = null
    setDragState(null)
  }, [getIsoCell, movePlacement, setIsDraggingObject])

  // windowレベルでpointerイベントを監視
  useEffect(() => {
    const onWindowPointerMove = (e: PointerEvent) => {
      // 長押し待機中に大きく動いたらキャンセル
      if (pendingPlacementId.current && pointerDownPos.current) {
        const dx = e.clientX - pointerDownPos.current.x
        const dy = e.clientY - pointerDownPos.current.y
        if (Math.hypot(dx, dy) > 10) {
          cancelLongPress()
          return
        }
      }
      if (!isDraggingRef.current || !dragStateRef.current) return
      const cell = getIsoCell(e.clientX, e.clientY)
      const next = { ...dragStateRef.current, overCol: cell?.col ?? null, overRow: cell?.row ?? null }
      dragStateRef.current = next
      setDragState({ ...next })
    }

    const onWindowPointerUp = (e: PointerEvent) => {
      cancelLongPress()
      endDrag(e.clientX, e.clientY)
    }

    const onWindowPointerCancel = () => {
      cancelLongPress()
      endDrag()
    }

    window.addEventListener('pointermove', onWindowPointerMove)
    window.addEventListener('pointerup', onWindowPointerUp)
    window.addEventListener('pointercancel', onWindowPointerCancel)
    return () => {
      window.removeEventListener('pointermove', onWindowPointerMove)
      window.removeEventListener('pointerup', onWindowPointerUp)
      window.removeEventListener('pointercancel', onWindowPointerCancel)
    }
  }, [cancelLongPress, endDrag, getIsoCell])

  const handleObjectPointerDown = useCallback((placementId: string, e: React.PointerEvent) => {
    e.stopPropagation()
    if (e.button !== 0) return
    pendingPlacementId.current = placementId
    pointerDownPos.current = { x: e.clientX, y: e.clientY }
    setIsPendingDrag(true)
    longPressTimer.current = setTimeout(() => {
      if (!pendingPlacementId.current) return
      isDraggingRef.current = true
      setIsDraggingObject(true)
      setIsPendingDrag(false)
      const state = { placementId, overCol: null, overRow: null }
      dragStateRef.current = state
      setDragState(state)
      longPressTimer.current = null
    }, LONG_PRESS_DELAY)
  }, [setIsDraggingObject, setIsPendingDrag])

  const handleCellClick = useCallback((col: number, row: number, screenX: number, screenY: number) => {
    setPopup({ type: 'cell', col, row, screenX, screenY })
  }, [setPopup])


  const cellMap = getCellMap()

  const anchorPlacements = placements.filter(p =>
    cellMap.get(cellKey(p.col, p.row))?.id === p.id
  )

  const solarCitadel = placements.find(p => p.type === 'solar_citadel')
  const exclusionZone = solarCitadel ? getExclusionZone(solarCitadel) : null

  function cellDiamond(col: number, row: number) {
    const { sx, sy } = toIso(col, row)
    const cx = originX + sx + TILE_W / 2
    const cy = sy + TILE_H / 2
    return `${cx},${cy - TILE_H / 2} ${cx + TILE_W / 2},${cy} ${cx},${cy + TILE_H / 2} ${cx - TILE_W / 2},${cy}`
  }

  function zonePoly(colMin: number, rowMin: number, colMax: number, rowMax: number) {
    const corner = (col: number, row: number, c: 'top' | 'right' | 'bottom' | 'left') => {
      const { sx, sy } = toIso(col, row)
      const cx = originX + sx + TILE_W / 2
      const cy = sy + TILE_H / 2
      switch (c) {
        case 'top':    return { x: cx, y: cy - TILE_H / 2 }
        case 'right':  return { x: cx + TILE_W / 2, y: cy }
        case 'bottom': return { x: cx, y: cy + TILE_H / 2 }
        case 'left':   return { x: cx - TILE_W / 2, y: cy }
      }
    }
    const tl = corner(colMin, rowMin, 'top')
    const tr = corner(colMax - 1, rowMin, 'right')
    const br = corner(colMax - 1, rowMax - 1, 'bottom')
    const bl = corner(colMin, rowMax - 1, 'left')
    return `${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}`
  }

  // ドラッグプレビューのセル計算
  let previewPts: string | null = null
  if (dragState && dragState.overCol !== null && dragState.overRow !== null) {
    const placement = placements.find(p => p.id === dragState.placementId)
    if (placement) {
      const span = OBJECT_DEFINITIONS[placement.type].cellSpan
      const anchorCol = dragState.overCol - (span - 1)
      const anchorRow = dragState.overRow - (span - 1)
      if (anchorCol >= 0 && anchorRow >= 0) {
        previewPts = zonePoly(anchorCol, anchorRow, anchorCol + span, anchorRow + span)
      }
    }
  }

  const showTick = (i: number) => zoom >= 0.5 || i % 2 === 0

  // ドラッグ中: 移動可否マップを事前計算
  const dragPlacementInfo = useMemo(() => {
    if (!dragState) return null
    const placement = placements.find(p => p.id === dragState.placementId)
    if (!placement) return null
    const def = OBJECT_DEFINITIONS[placement.type]
    const span = def.cellSpan
    // 移動元を除いた他の配置
    const otherPlacements = placements.filter(p => p.id !== dragState.placementId)
    // 他の配置の占有マップ
    const occupied = new Set<string>()
    for (const p of otherPlacements) {
      const s = OBJECT_DEFINITIONS[p.type].cellSpan
      for (let r = p.row; r < p.row + s; r++)
        for (let c = p.col; c < p.col + s; c++)
          occupied.add(`${c},${r}`)
    }
    // 太陽城の排除ゾーン
    const sc = otherPlacements.find(p => p.type === 'solar_citadel')
    const zone = sc ? getExclusionZone(sc) : null
    const areaBuildings = otherPlacements.filter(p => p.teamId !== '' && (p.type === 'alliance_hq' || p.type === 'flag'))

    // 各アンカー位置の可否を計算（anchorCol = 左上セル）
    const canPlace = new Map<string, boolean>()
    for (let row = 0; row < gridHeight - span + 1; row++) {
      for (let col = 0; col < gridWidth - span + 1; col++) {
        let ok = true
        // 占有チェック
        for (let dr = 0; dr < span && ok; dr++)
          for (let dc = 0; dc < span && ok; dc++)
            if (occupied.has(`${col + dc},${row + dr}`)) ok = false
        // 排除ゾーン（都市のみ）
        if (ok && placement.type === 'city' && zone) {
          for (let dr = 0; dr < span && ok; dr++)
            for (let dc = 0; dc < span && ok; dc++)
              if (col+dc >= zone.colMin && col+dc < zone.colMax && row+dr >= zone.rowMin && row+dr < zone.rowMax) ok = false
        }
        // 旗: 接続チェック
        if (ok && placement.type === 'flag') {
          const hypo: Placement = { id: '__hypo__', type: 'flag', col, row, teamId: placement.teamId }
          if (!isAllianceNetworkConnected(placement.teamId, [...otherPlacements, hypo], OBJECT_DEFINITIONS)) ok = false
        }
        // クマ罠: エリア内包チェック
        if (ok && placement.type === 'bear_trap') {
          const allies = otherPlacements.filter(p => p.teamId === placement.teamId && (p.type === 'alliance_hq' || p.type === 'flag'))
          const inside = allies.some(a => {
            const aDef = OBJECT_DEFINITIONS[a.type]
            if (!aDef.areaRadius) return false
            const area = getAllianceArea(a, aDef.cellSpan, aDef.areaRadius)
            for (let dr = 0; dr < span; dr++)
              for (let dc = 0; dc < span; dc++)
                if (col+dc < area.colMin || col+dc >= area.colMax || row+dr < area.rowMin || row+dr >= area.rowMax) return false
            return true
          })
          if (!inside) ok = false
        }
        // 敵エリアチェック（teamIdが空でない場合）
        if (ok && placement.teamId !== '') {
          for (let dr = 0; dr < span && ok; dr++) {
            for (let dc = 0; dc < span && ok; dc++) {
              const owner = getAreaOwnerAtCell(col+dc, row+dr, areaBuildings, OBJECT_DEFINITIONS)
              if (owner !== null && owner !== placement.teamId) ok = false
            }
          }
        }
        canPlace.set(`${col},${row}`, ok)
      }
    }
    return { span, canPlace, teamId: placement.teamId }
  }, [dragState, placements, gridWidth, gridHeight])

  // グリッドSVGセルをメモ化（可視範囲内のみ描画）
  const gridCellPolygons = useMemo(() => {
    const result = []
    for (let row = vrMin; row < vrMax; row++) {
      for (let col = vcMin; col < vcMax; col++) {
        result.push(
          <polygon
            key={`grid-${col}-${row}`}
            points={cellDiamond(col, row)}
            fill="none"
            stroke="#1e293b"
            strokeWidth="0.5"
          />
        )
      }
    }
    return result
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vcMin, vcMax, vrMin, vrMax, gridWidth, gridHeight])

  // エリアセルをメモ化
  const areaCellPolygons = useMemo(() => {
    const areaBuildings = placements.filter(p => p.teamId !== '' && (p.type === 'alliance_hq' || p.type === 'flag'))
    if (areaBuildings.length === 0) return null
    const teamColorMap = new Map<string, string>()
    for (const t of present.teams) teamColorMap.set(t.id, t.color)
    const cells: Array<{ col: number; row: number; teamId: string }> = []
    for (const p of areaBuildings) {
      const def = OBJECT_DEFINITIONS[p.type]
      if (def.areaRadius === undefined) continue
      const area = getAllianceArea(p, def.cellSpan, def.areaRadius)
      const cColMin = Math.max(0, area.colMin)
      const cRowMin = Math.max(0, area.rowMin)
      const cColMax = Math.min(gridWidth, area.colMax)
      const cRowMax = Math.min(gridHeight, area.rowMax)
      for (let r = cRowMin; r < cRowMax; r++) {
        for (let c = cColMin; c < cColMax; c++) {
          cells.push({ col: c, row: r, teamId: p.teamId })
        }
      }
    }
    const rendered = new Set<string>()
    return cells.map(({ col, row }) => {
      const key = `${col},${row}`
      if (rendered.has(key)) return null
      rendered.add(key)
      const ownerId = getAreaOwnerAtCell(col, row, areaBuildings, OBJECT_DEFINITIONS)
      if (!ownerId) return null
      const color = teamColorMap.get(ownerId) ?? '#888'
      return (
        <polygon
          key={`area-cell-${key}`}
          points={cellDiamond(col, row)}
          fill={`${color}28`}
          stroke={`${color}55`}
          strokeWidth="0.5"
        />
      )
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placements, present.teams, gridWidth, gridHeight])

  // エリア外枠をメモ化
  const areaBorderPolygons = useMemo(() =>
    placements.filter(p => p.type === 'alliance_hq' || p.type === 'flag').map(p => {
      const def = OBJECT_DEFINITIONS[p.type]
      if (def.areaRadius === undefined) return null
      const area = getAllianceArea(p, def.cellSpan, def.areaRadius)
      const cColMin = Math.max(0, area.colMin)
      const cRowMin = Math.max(0, area.rowMin)
      const cColMax = Math.min(gridWidth, area.colMax)
      const cRowMax = Math.min(gridHeight, area.rowMax)
      if (cColMax <= cColMin || cRowMax <= cRowMin) return null
      const pts = zonePoly(cColMin, cRowMin, cColMax, cRowMax)
      const team = present.teams.find(t => t.id === p.teamId)
      const color = team?.color ?? def.bgColor
      return (
        <polygon
          key={`area-border-${p.id}`}
          points={pts}
          fill="none"
          stroke={`${color}99`}
          strokeWidth="1.5"
          strokeDasharray="5,3"
        />
      )
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [placements, present.teams, gridWidth, gridHeight])

  return (
    <div
      ref={boardRef}
      style={{
        position: 'relative',
        width: isoWidth,
        height: isoHeight,
        overflow: 'visible',
        touchAction: dragState ? 'none' : 'auto',
      }}
      onClick={() => setPopup(null)}
    >
      <svg
        style={{ position: 'absolute', top: 0, left: 0, width: isoWidth, height: isoHeight, pointerEvents: 'none', zIndex: 0 }}
        viewBox={`0 0 ${isoWidth} ${isoHeight}`}
      >
        {/* グリッドセル */}
        {gridCellPolygons}

        {/* 排除ゾーン */}
        {exclusionZone && (() => {
          const z = exclusionZone
          const cColMin = Math.max(0, z.colMin)
          const cRowMin = Math.max(0, z.rowMin)
          const cColMax = Math.min(gridWidth, z.colMax)
          const cRowMax = Math.min(gridHeight, z.rowMax)
          if (cColMax <= cColMin || cRowMax <= cRowMin) return null
          const pts = zonePoly(cColMin, cRowMin, cColMax, cRowMax)
          const centerCol = (cColMin + cColMax) / 2
          const centerRow = (cRowMin + cRowMax) / 2
          const { sx: csx, sy: csy } = toIso(Math.floor(centerCol), Math.floor(centerRow))
          const labelX = originX + csx + TILE_W / 2
          const labelY = csy + TILE_H / 2
          return (
            <g key="exclusion-zone">
              <polygon points={pts} fill="rgba(239,68,68,0.08)" stroke="rgba(239,68,68,0.5)" strokeWidth="1.5" strokeDasharray="6,4" />
              <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="rgba(239,68,68,0.7)" fontWeight="600" style={{ userSelect: 'none' }}>
                都市設置不可
              </text>
            </g>
          )
        })()}

        {/* X軸目盛り */}
        {Array.from({ length: vrMax - vrMin }, (_, i) => {
          const row = vrMin + i
          if (!showTick(row)) return null
          const { sx, sy } = toIso(0, row)
          const tx = originX + sx
          const ty = sy + TILE_H / 2
          const { x } = toGameCoordFromState(0, row, present)
          return (
            <text key={`x-tick-${row}`} x={tx - 4} y={ty} fontSize="8" fill="rgba(96,165,250,0.7)" dominantBaseline="middle" textAnchor="end" style={{ userSelect: 'none' }}>
              x{x}
            </text>
          )
        })}

        {/* Y軸目盛り */}
        {Array.from({ length: vcMax - vcMin }, (_, i) => {
          const col = vcMin + i
          if (!showTick(col)) return null
          const { sx, sy } = toIso(col, 0)
          const tx = originX + sx + TILE_W / 2
          const ty = sy
          const { y } = toGameCoordFromState(col, 0, present)
          return (
            <text key={`y-tick-${col}`} x={tx} y={ty - 4} fontSize="8" fill="rgba(251,191,36,0.7)" dominantBaseline="auto" textAnchor="middle" style={{ userSelect: 'none' }}>
              y{y}
            </text>
          )
        })}

        {/* 同盟エリア: セル単位で先置き優先の色を塗る */}
        {areaCellPolygons}

        {/* 同盟本部・旗エリアの外枠 */}
        {areaBorderPolygons}

        {/* ドラッグ中: 移動可否オーバーレイ */}
        {dragPlacementInfo && (() => {
          const { span, canPlace } = dragPlacementInfo
          const curAnchorCol = dragState && dragState.overCol !== null ? dragState.overCol - (span - 1) : null
          const curAnchorRow = dragState && dragState.overRow !== null ? dragState.overRow - (span - 1) : null
          return Array.from(canPlace.entries()).map(([key, ok]) => {
            const [col, row] = key.split(',').map(Number)
            const isCurrent = col === curAnchorCol && row === curAnchorRow
            if (!isCurrent && !ok) return null  // 不可かつカーソル外は表示しない
            const pts = zonePoly(col, row, col + span, row + span)
            if (ok) {
              return (
                <polygon
                  key={`drop-ok-${key}`}
                  points={pts}
                  fill={isCurrent ? 'rgba(34,197,94,0.35)' : 'rgba(34,197,94,0.10)'}
                  stroke={isCurrent ? 'rgba(34,197,94,0.95)' : 'rgba(34,197,94,0.35)'}
                  strokeWidth={isCurrent ? 2 : 0.8}
                />
              )
            } else {
              // 現在カーソルが不可位置の場合のみ赤表示
              return (
                <polygon
                  key={`drop-ng-${key}`}
                  points={pts}
                  fill="rgba(239,68,68,0.30)"
                  stroke="rgba(239,68,68,0.85)"
                  strokeWidth={2}
                />
              )
            }
          })
        })()}

        {/* ドラッグプレビュー（カーソル位置の枠）*/}
        {previewPts && !dragPlacementInfo && (
          <polygon
            points={previewPts}
            fill="rgba(96,165,250,0.25)"
            stroke="rgba(96,165,250,0.8)"
            strokeWidth="2"
            strokeDasharray="6,3"
          />
        )}

        {/* 自動配置: 選択矩形オーバーレイ */}
        {areaSelectRect && (() => {
          const { colMin, colMax, rowMin, rowMax } = areaSelectRect
          const pts = zonePoly(colMin, rowMin, colMax + 1, rowMax + 1)
          return (
            <polygon
              points={pts}
              fill="rgba(99,102,241,0.2)"
              stroke="rgba(129,140,248,0.9)"
              strokeWidth="2"
              strokeDasharray="8,4"
            />
          )
        })()}
      </svg>

      {(() => {
        const cells = []
        for (let row = vrMin; row < vrMax; row++) {
          for (let col = vcMin; col < vcMax; col++) {
            cells.push(
              <GridCell
                key={cellKey(col, row)}
                col={col}
                row={row}
                originX={originX}
                onCellClick={handleCellClick}
              />
            )
          }
        }
        return cells
      })()}

      {anchorPlacements.map(p => (
        <PlacedObject
          key={p.id}
          placement={p}
          originX={originX}
          isDragging={dragState?.placementId === p.id}
          onPointerDown={(e) => handleObjectPointerDown(p.id, e)}
        />
      ))}
    </div>
  )
}

interface GridCellProps {
  col: number
  row: number
  originX: number
  onCellClick: (col: number, row: number, screenX: number, screenY: number) => void
}

const GridCell = memo(function GridCell({ col, row, originX, onCellClick }: GridCellProps) {
  const { sx, sy } = toIso(col, row)
  const cellLeft = originX + sx
  const cellTop = sy

  return (
    <div
      onClick={e => { e.stopPropagation(); onCellClick(col, row, e.clientX, e.clientY) }}
      style={{
        position: 'absolute',
        left: cellLeft,
        top: cellTop,
        width: TILE_W,
        height: TILE_H,
        clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
        backgroundColor: 'transparent',
        cursor: 'pointer',
        zIndex: 1,
      }}
    />
  )
})
