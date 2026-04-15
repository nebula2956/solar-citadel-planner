import { useState, useEffect } from 'react'
import { Toolbar } from './Toolbar'
import { Sidebar, BottomPanel } from './Sidebar'
import { GridCanvas } from '../grid/GridCanvas'
import { ShareModal } from '../ui/ShareModal'
import { ActionPopup } from '../ui/ActionPopup'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useShareURL } from '../../hooks/useShareURL'
import { useExport } from '../../hooks/useExport'

export function AppShell() {
  const [shareURL, setShareURL] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useKeyboardShortcuts()
  const { generateShareURL } = useShareURL()
  const { exportPng } = useExport()

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const handleShare = () => {
    const url = generateShareURL()
    setShareURL(url)
    window.history.replaceState(null, '', url)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Toolbar onExportPng={exportPng} onShare={handleShare} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <GridCanvas />
        {!isMobile && <Sidebar />}
      </div>
      {isMobile && <BottomPanel />}
      <ActionPopup />
      {shareURL && (
        <ShareModal url={shareURL} onClose={() => setShareURL(null)} />
      )}
    </div>
  )
}
