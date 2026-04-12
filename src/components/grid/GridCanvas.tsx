import { useRef, useCallback, useEffect } from 'react'
import { useUIStore } from '../../store/useUIStore'
import { MIN_ZOOM, MAX_ZOOM } from '../../constants/gridConfig'
import { TILE_W, TILE_H } from '../../utils/gameCoords'
import { GridBoard } from './GridBoard'
import { useGridStore } from '../../store/useGridStore'

export function GridCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { zoom, panX, panY, setZoom, setPan, activeTool } = useUIStore()
  const { gridWidth, gridHeight } = useGridStore(s => s.present)

  // アイソメトリックグリッドのバウンディングボックス
  const isoWidth = (gridWidth + gridHeight) * (TILE_W / 2)
  const isoHeight = (gridWidth + gridHeight) * (TILE_H / 2)

  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })
  const panOrigin = useRef({ x: 0, y: 0 })
  const spaceHeld = useRef(false)

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

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 1.1 : 0.9
    setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * delta)))
  }, [zoom, setZoom])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 2 || spaceHeld.current || activeTool === 'pan') {
      e.preventDefault()
      isPanning.current = true
      panStart.current = { x: e.clientX, y: e.clientY }
      panOrigin.current = { x: panX, y: panY }
      if (containerRef.current) containerRef.current.style.cursor = 'grabbing'
    }
  }, [panX, panY, activeTool])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return
    const dx = e.clientX - panStart.current.x
    const dy = e.clientY - panStart.current.y
    setPan(panOrigin.current.x + dx, panOrigin.current.y + dy)
  }, [setPan])

  const onMouseUp = useCallback(() => {
    if (isPanning.current) {
      isPanning.current = false
      if (containerRef.current) {
        containerRef.current.style.cursor = (spaceHeld.current || activeTool === 'pan') ? 'grab' : ''
      }
    }
  }, [activeTool])

  const lastTouchDist = useRef<number | null>(null)
  const touchPanStart = useRef<{ x: number; y: number } | null>(null)
  const touchPanOrigin = useRef({ x: 0, y: 0 })

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      touchPanStart.current = null
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastTouchDist.current = Math.hypot(dx, dy)
    } else if (e.touches.length === 1) {
      lastTouchDist.current = null
      touchPanStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      touchPanOrigin.current = { x: panX, y: panY }
    }
  }, [panX, panY])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDist.current !== null) {
      e.preventDefault()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      const ratio = dist / lastTouchDist.current
      setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * ratio)))
      lastTouchDist.current = dist
    } else if (e.touches.length === 1 && touchPanStart.current !== null) {
      e.preventDefault()
      const dx = e.touches[0].clientX - touchPanStart.current.x
      const dy = e.touches[0].clientY - touchPanStart.current.y
      setPan(touchPanOrigin.current.x + dx, touchPanOrigin.current.y + dy)
    }
  }, [zoom, setZoom, setPan])

  const onTouchEnd = useCallback(() => {
    lastTouchDist.current = null
    touchPanStart.current = null
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#0a0f1e',
        cursor: activeTool === 'pan' ? 'grab' : undefined,
      }}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onContextMenu={e => e.preventDefault()}
    >
      {/* ズーム・パン適用ラッパー（アイソメトリックバウンディングボックスサイズ） */}
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
