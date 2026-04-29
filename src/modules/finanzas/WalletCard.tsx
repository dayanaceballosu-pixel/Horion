import { Icon } from '@shared/icons/Icon'
import type { DisplayCurrency, Wallet } from '@/data/types'
import { formatMoneyRound } from '@shared/utils/format'

interface Props {
  wallet: Wallet
  index: number
  hidePrivate: boolean
  ingresos: number
  egresos: number
  currency: DisplayCurrency
  onClick?: () => void
}

/**
 * Category card showing this month's flow (in/out/net) for the given category,
 * expressed in the user's chosen display currency. Replaces the old "wallet
 * with a balance" UI.
 */
export function WalletCard({ wallet, index, hidePrivate, ingresos, egresos, currency, onClick }: Props) {
  const isAccent = wallet.tone === 'pink'
  const isInk = wallet.tone === 'ink'
  const bg = isAccent ? 'var(--accent)' : isInk ? 'var(--ink)' : 'var(--accent-pale)'
  const fg = isAccent || isInk ? '#FFF' : 'var(--ink)'
  const muted = isAccent || isInk ? 'rgba(255,255,255,0.65)' : 'var(--ink-mute)'
  const neto = ingresos - egresos
  const sign = neto > 0 ? '+' : neto < 0 ? '−' : ''

  const masked = (n: number) => (hidePrivate ? '••••' : formatMoneyRound(n, currency))

  return (
    <div
      onClick={onClick}
      style={{
        background: bg,
        color: fg,
        borderRadius: 24,
        padding: '18px 20px',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        border: '0.5px solid var(--hairline)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              opacity: 0.65,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}
          >
            0{index + 1} · Categoría
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 26, marginTop: 2, lineHeight: 1 }}>
            {wallet.name}
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, opacity: 0.65, marginTop: 4 }}>{wallet.sub}</div>
        </div>
        <Icon name="chevron-right" size={20} color={fg} />
      </div>

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Line label="Ingresos" value={`+${masked(ingresos)}`} color={fg} muted={muted} />
        <Line label="Egresos" value={`−${masked(egresos)}`} color={fg} muted={muted} />
        <div style={{ height: 1, background: muted, opacity: 0.25, margin: '4px 0' }} />
        <Line
          label="Neto del mes"
          value={hidePrivate ? '••••' : `${sign}${formatMoneyRound(Math.abs(neto), currency)}`}
          color={fg}
          muted={muted}
          big
        />
      </div>
    </div>
  )
}

function Line({
  label,
  value,
  color,
  muted,
  big,
}: {
  label: string
  value: string
  color: string
  muted: string
  big?: boolean
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: big ? 11 : 10,
          color: muted,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: big ? 18 : 13,
          fontWeight: big ? 600 : 500,
          color,
          letterSpacing: -0.3,
        }}
      >
        {value}
      </div>
    </div>
  )
}
