import { useState } from 'react'

interface Props {
  url: string
  tooLong?: boolean
  onClose: () => void
}

export function ShareModal({ url, tooLong, onClose }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: 12,
          padding: 24,
          width: 480,
          maxWidth: '90vw',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ color: '#f8fafc', margin: '0 0 16px', fontSize: 18 }}>🔗 レイアウトをシェア</h3>

        <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 12px' }}>
          以下のURLをコピーして共有できます。配置・チーム情報が含まれます（メンバーデータは含まれません）。
        </p>

        {tooLong && (
          <div style={{
            background: '#431407', border: '1px solid #f97316', borderRadius: 6,
            padding: '8px 12px', marginBottom: 12, color: '#fdba74', fontSize: 12,
          }}>
            ⚠️ URLが長くなっています。一部のブラウザやサービスで共有できない場合があります。💾 セーブ機能またはJSONエクスポートの使用をお勧めします。
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            readOnly
            value={url}
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: '#1e293b',
              border: `1px solid ${tooLong ? '#f97316' : '#334155'}`,
              borderRadius: 6,
              color: '#cbd5e1',
              fontSize: 12,
              fontFamily: 'monospace',
            }}
            onFocus={e => e.target.select()}
          />
          <button
            onClick={handleCopy}
            style={{
              padding: '8px 16px',
              backgroundColor: copied ? '#22c55e' : '#3b82f6',
              border: 'none',
              borderRadius: 6,
              color: '#fff',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              minWidth: 80,
            }}
          >
            {copied ? '✓ コピー済' : 'コピー'}
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <span style={{ color: '#475569', fontSize: 11, fontFamily: 'monospace' }}>
            {url.length} 文字
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 6,
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
