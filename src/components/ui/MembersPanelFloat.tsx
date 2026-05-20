import { MembersPanel } from '../layout/Sidebar'

interface Props {
  onClose: () => void
}

export function MembersPanelFloat({ onClose }: Props) {
  return (
    <div style={{
      width: 300,
      backgroundColor: '#0f172a',
      borderLeft: '1px solid #1e293b',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      userSelect: 'none',
      flexShrink: 0,
    }}>
      {/* ヘッダー */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', borderBottom: '1px solid #1e293b', flexShrink: 0,
      }}>
        <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
          メンバー
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}
        >✕</button>
      </div>

      {/* パネル本体 */}
      <div style={{ padding: '12px', flex: 1, overflowY: 'auto' }}>
        <MembersPanel />
      </div>
    </div>
  )
}
