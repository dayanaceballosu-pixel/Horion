import type { Account, DisplayCurrency } from '@/data/types'
import { Icon } from '@shared/icons/Icon'
import { formatMoneyRound } from '@shared/utils/format'
import { ACCOUNT_KIND_META } from './accountKinds'

interface Props {
  account: Account
  hidePrivate?: boolean
  onClick?: () => void
  /** "compact" is used in the horizontal carousel above Finanzas — fixed
   *  width, smaller type. "full" is the wide row used inside CuentasScreen. */
  variant?: 'compact' | 'full'
}

export function AccountCard({ account, hidePrivate, onClick, variant = 'compact' }: Props) {
  const meta = ACCOUNT_KIND_META[account.kind]
  const bg = account.color ?? meta.bg
  const fg = meta.fg
  const display: DisplayCurrency =
    account.currency === 'USD' || account.currency === 'EUR' ? account.currency : 'COP'

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          flex: '0 0 auto',
          width: 168,
          height: 108,
          borderRadius: 18,
          background: bg,
          color: fg,
          padding: '14px 16px',
          border: '0.5px solid rgba(255,255,255,0.06)',
          cursor: onClick ? 'pointer' : 'default',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          textAlign: 'left',
          transition: 'transform 200ms ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name={meta.icon} size={14} color={fg} />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              opacity: 0.75,
            }}
          >
            {meta.short}
          </span>
        </div>
        <div>
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              opacity: 0.8,
              marginBottom: 4,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {account.name}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: -0.4,
              wordBreak: 'break-all',
            }}
          >
            {hidePrivate ? '••••' : formatMoneyRound(account.balance, display)}
          </div>
        </div>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        background: bg,
        color: fg,
        borderRadius: 22,
        border: '0.5px solid rgba(255,255,255,0.06)',
        padding: '18px 20px',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        textAlign: 'left',
      }}
    >
      <div
        style={{
          width: 44, height: 44, borderRadius: 14,
          background: 'rgba(255,255,255,0.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon name={meta.icon} size={20} color={fg} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            opacity: 0.7,
          }}
        >
          {meta.short} · {display}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 15,
            fontWeight: 500,
            marginTop: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {account.name}
        </div>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: -0.4,
          textAlign: 'right',
          whiteSpace: 'nowrap',
        }}
      >
        {hidePrivate ? '••••' : formatMoneyRound(account.balance, display)}
      </div>
    </button>
  )
}
