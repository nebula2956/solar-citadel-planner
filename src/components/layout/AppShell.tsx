import { useState } from 'react'
import { Toolbar } from './Toolbar'
import { Sidebar } from './Sidebar'
import { GridCanvas } from '../grid/GridCanvas'
import { ShareModal } from '../ui/ShareModal'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useShareURL } from '../../hooks/useShareURL'
import { useExport } from '../../hooks/useExport'

export function AppShell() {
  const [shareURL, setShareURL] = useState<string | null>(null)

  useKeyboardShortcuts()
  const { generateShareURL } = useShareURL()
  const { exportPng } = useExport()

  const handleShare = () => {
    const url = generateShareURL()
    setShareURL(url)
    window.history.replaceState(null, '', url)
  }

  const handleExportPng = () => {
    exportPng()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Toolbar onExportPng={handleExportPng} onShare={handleShare} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <GridCanvas />
        <Sidebar />
      </div>
      {shareURL && (
        <ShareModal url={shareURL} onClose={() => setShareURL(null)} />
      )}
    </div>
  )
}
