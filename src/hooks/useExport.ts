import html2canvas from 'html2canvas'
import { useUIStore } from '../store/useUIStore'

export function useExport() {
  const { zoom, setZoom } = useUIStore()

  const exportPng = async () => {
    // グリッドボードのDOM要素をIDで取得
    const boardEl = document.getElementById('iso-grid-board')
    if (!boardEl) return

    const prevZoom = zoom
    setZoom(1)
    await new Promise(resolve => requestAnimationFrame(resolve))

    try {
      const canvas = await html2canvas(boardEl as HTMLElement, {
        backgroundColor: '#0a0f1e',
        scale: 2,
        useCORS: true,
        logging: false,
      })

      const link = document.createElement('a')
      const date = new Date().toISOString().slice(0, 10)
      link.download = `solar-citadel-layout-${date}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally {
      setZoom(prevZoom)
    }
  }

  return { exportPng }
}
