import { useRef, useCallback, useEffect } from 'react'
import { useUIStore } from '../../store/useUIStore'
import { MIN_ZOOM, MAX_ZOOM } from '../../constants/gridConfig'
import { TILE_W, TILE_H, fromIso } from '../../utils/gameCoords'
import { GridBoard } from './GridBoard'
import { useGridStore } from '../../store/useGridStore'


export function GridCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { zoom, panX, panY, setZoom, setPan, activeTool, isDraggingObject, isPendingDrag, setAreaSelectRect, setPendingAutoPlaceRect } = useUIStore()
  const { gridWidth, gridHeight } = useGridStore(s => s.present)

  const isoWidth = (gridWidth + gridHeight) * (TILE_W / 2)
  const isoHeight = (gridWidth + gridHeight) * (TILE_H / 2)

  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })
  const panOrigin = useRef({ x: 0, y: 0 })
  const spaceHeld = useRef(false)

  // area_select drag
  const areaSelectStart = useRef<{ col: number; row: number } | null>(null)

  // 最新の値をrefで保持（イベントリスナーのクロージャ問題回避）
  const panXRef = useRef(panX)
  const panYRef = useRef(panY)
  const zoomRef = useRef(zoom)
  const isDraggingRef = useRef(isDraggingObject)
  const isPendingDragRef = useRef(isPendingDrag)
  useEffect(() => { panXRef.current = panX }, [panX])
  useEffect(() => { panYRef.current = panY }, [panY])
  useEffect(() => { zoomRef.current = zoom }, [zoom])
  useEffect(() => { isDraggingRef.current = isDraggingObject }, [isDraggingObject])
  useEffect(() => { isPendingDragRef.current = isPendingDrag }, [isPendingDrag])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault()
        spaceHeld.current = true
        if (containerRef.current) containerRef.current.style.cursor = 'grab'
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceHeld.current = false
        if (containerRef.current) containerRef.current.style.cursor = ''
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const getCell = useCallback((clientX: number, clientY: number) => {
    const board = document.getElementById('iso-grid-board')
    if (!board) return null
    const rect = board.getBoundingClientRect()
    const z = zoomRef.current
    const px = (clientX - rect.left) / z
    const py = (clientY - rect.top) / z
    const originX = gridHeight * (TILE_W / 2)
    const relX = px - originX
    const { col, row } = fromIso(relX, py)
    if (col < 0 || row < 0 || col >= gridWidth || row >= gridHeight) return null
    return { col, row }
  }, [gridWidth, gridHeight])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 1.1 : 0.9
    setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomRef.current * delta)))
  }, [setZoom])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (isDraggingRef.current || isPendingDragRef.current) return

    if (activeTool === 'area_select' && e.button === 0 && !spaceHeld.current) {
      const cell = getCell(e.clientX, e.clientY)
      if (cell) {
        areaSelectStart.current = cell
        setAreaSelectRect({ colMin: cell.col, colMax: cell.col, rowMin: cell.row, rowMax: cell.row })
      }
      return
    }

    if (e.button === 1 || e.button === 2 || spaceHeld.current || activeTool === 'pan') {
      e.preventDefault()
      isPanning.current = true
      panStart.current = { x: e.clientX, y: e.clientY }
      panOrigin.current = { x: panXRef.current, y: panYRef.current }
      if (containerRef.current) containerRef.current.style.cursor = 'grabbing'
    }
  }, [activeTool, getCell, setAreaSelectRect])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (activeTool === 'area_select' && areaSelectStart.current) {
      const cell = getCell(e.clientX, e.clientY)
      if (cell) {
        const start = areaSelectStart.current
        setAreaSelectRect({
          colMin: Math.min(start.col, cell.col),
          colMax: Math.max(start.col, cell.col),
          rowMin: Math.min(start.row, cell.row),
          rowMax: Math.max(start.row, cell.row),
        })
      }
      return
    }
    if (!isPanning.current) return
    const dx = e.clientX - panStart.current.x
    const dy = e.clientY - panStart.current.y
    setPan(panOrigin.current.x + dx, panOrigin.current.y + dy)
  }, [activeTool, getCell, setAreaSelectRect, setPan])

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    if (activeTool === 'area_select' && areaSelectStart.current) {
      const cell = getCell(e.clientX, e.clientY)
      const start = areaSelectStart.current
      areaSelectStart.current = null
      const finalRect = cell ? {
        colMin: Math.min(start.col, cell.col),
        colMax: Math.max(start.col, cell.col),
        rowMin: Math.min(start.row, cell.row),
        rowMax: Math.max(start.row, cell.row),
      } : {
        colMin: start.col, colMax: start.col,
        rowMin: start.row, rowMax: start.row,
      }
      setAreaSelectRect(null)
      setPendingAutoPlaceRect(finalRect)
      return
    }
    if (isPanning.current) {
      isPanning.current = false
      if (containerRef.current) {
        containerRef.current.style.cursor = (spaceHeld.current || activeTool === 'pan') ? 'grab' : ''
      }
    }
  }, [activeTool, getCell, setAreaSelectRect, setPendingAutoPlaceRect])

  // タッチ処理をネイティブイベント({ passive: false })で登録
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const lastTouchDist = { current: null as number | null }
    const touchPanStart = { current: null as { x: number; y: number } | null }
    const touchPanOrigin = { current: { x: 0, y: 0 } }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        touchPanStart.current = null
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        lastTouchDist.current = Math.hypot(dx, dy)
      } else if (e.touches.length === 1) {
        // 長押し待機中またはドラッグ中はパン開始しない
        if (isDraggingRef.current || isPendingDragRef.current) return
        lastTouchDist.current = null
        touchPanStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        touchPanOrigin.current = { x: panXRef.current, y: panYRef.current }
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && lastTouchDist.current !== null) {
        e.preventDefault()
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.hypot(dx, dy)
        const ratio = dist / lastTouchDist.current
        setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomRef.current * ratio)))
        lastTouchDist.current = dist
      } else if (e.touches.length === 1 && touchPanStart.current !== null) {
        // 長押し待機中またはドラッグ中はパンしない
        if (isDraggingRef.current || isPendingDragRef.current) {
          e.preventDefault()
          return
        }
        e.preventDefault()
        const dx = e.touches[0].clientX - touchPanStart.current.x
        const dy = e.touches[0].clientY - touchPanStart.current.y
        setPan(touchPanOrigin.current.x + dx, touchPanOrigin.current.y + dy)
      }
    }

    const onTouchEnd = () => {
      lastTouchDist.current = null
      touchPanStart.current = null
    }

    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [setZoom, setPan])

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#0a0f1e',
        cursor: activeTool === 'pan' ? 'grab' : activeTool === 'area_select' ? 'crosshair' : undefined,
      }}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onContextMenu={e => e.preventDefault()}
    >
      <div
        id="iso-grid-board"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: 'center center',
          width: isoWidth,
          height: isoHeight,
        }}
      >
        <GridBoard />
      </div>
    </div>
  )
}
