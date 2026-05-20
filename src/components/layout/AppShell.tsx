import { useState, useEffect } from 'react'
import { Toolbar } from './Toolbar'
import { Sidebar, BottomPanel } from './Sidebar'
import { GridCanvas } from '../grid/GridCanvas'
import { ShareModal } from '../ui/ShareModal'
import { SaveSlotsModal } from '../ui/SaveSlotsModal'
import { AutoPlaceModal } from '../ui/AutoPlaceModal'
import { MembersPanelFloat } from '../ui/MembersPanelFloat'
import { ActionPopup } from '../ui/ActionPopup'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useShareURL } from '../../hooks/useShareURL'
import { useExport } from '../../hooks/useExport'
import { isURLTooLong } from '../../utils/serialization'
import { useUIStore } from '../../store/useUIStore'

export function AppShell() {
  const [shareInfo, setShareInfo] = useState<{ url: string; tooLong: boolean } | null>(null)
  const [showSaveSlots, setShowSaveSlots] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [membersOpen, setMembersOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const { pendingAutoPlaceRect, setPendingAutoPlaceRect } = useUIStore()

  useKeyboardShortcuts()
  const { generateShareURL } = useShareURL()
  const { exportPng } = useExport()

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const handleShare = () => {
    const { url, encoded } = generateShareURL()
    window.history.replaceState(null, '', url)
    setShareInfo({ url, tooLong: isURLTooLong(encoded) })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Toolbar
        onExportPng={exportPng}
        onShare={handleShare}
        onSave={() => setShowSaveSlots(true)}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(v => !v)}
        membersOpen={membersOpen}
        onToggleMembers={() => setMembersOpen(v => !v)}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <GridCanvas />
        {!isMobile && sidebarOpen && <Sidebar />}
        {!isMobile && membersOpen && <MembersPanelFloat onClose={() => setMembersOpen(false)} />}
      </div>
      {isMobile && <BottomPanel />}
      <ActionPopup />
      {shareInfo && (
        <ShareModal url={shareInfo.url} tooLong={shareInfo.tooLong} onClose={() => setShareInfo(null)} />
      )}
      {showSaveSlots && <SaveSlotsModal onClose={() => setShowSaveSlots(false)} />}
      {pendingAutoPlaceRect && (
        <AutoPlaceModal rect={pendingAutoPlaceRect} onClose={() => setPendingAutoPlaceRect(null)} />
      )}
    </div>
  )
}
