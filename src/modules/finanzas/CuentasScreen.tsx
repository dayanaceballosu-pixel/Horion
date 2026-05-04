import { useMemo, useState } from 'react'
import { useLocation } from 'wouter'
import { useCollection } from '@shared/hooks/useFirestore'
import { accountsQuery } from '@/data/repositories/accounts'
import type { Account, DisplayCurrency } from '@/data/types'
import {
  ActionChip,
  BackBar,
  Card,
  ModuleHeading,
  SectionTitle,
} from '@shared/components/primitives'
import { Icon } from '@shared/icons/Icon'
import { useThemeStore } from '@shared/theme/useTheme'
import { useDisplayCurrency } from '@shared/hooks/useDisplayCurrency'
import { CurrencyToggle } from '@shared/components/CurrencyToggle'
import { formatMoneyRound } from '@shared/utils/format'
import { getRate } from '@/data/repositories/fx'
import { useEffect } from 'react'
import { AccountCard } from './AccountCard'
import { CuentaEditModal } from './CuentaEditModal'
import { TransferModal } from './TransferModal'

function asDisplay(c: Account['currency']): DisplayCurrency {
  return c === 'USD' || c === 'EUR' ? c : 'COP'
}

export function CuentasScreen() {
  const [, navigate] = useLocation()
  const accounts = useCollection<Account>(() => accountsQuery(), [])
  const hidePrivate = useThemeStore((s) => s.hidePrivate)
  const { currency: displayCurrency } = useDisplayCurrency()

  const [showCreate, setShowCreate] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)

  /* Convert each account's balance into the currently selected display
     currency so the "total" is meaningful even when the user has accounts
     in mixed currencies. Cached per (account.id, displayCurrency). */
  const [convertedTotals, setConvertedTotals] = useState<Record<string, number>>({})
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const next: Record<string, number> = {}
      for (const a of accounts) {
        const native = asDisplay(a.currency)
        if (native === displayCurrency) {
          next[a.id] = a.balance
          continue
        }
        const rate = await getRate(native, displayCurrency)
        next[a.id] = a.balance * rate
      }
      if (!cancelled) setConvertedTotals(next)
    })()
    return () => {
      cancelled = true
    }
  }, [accounts, displayCurrency])

  const total = useMemo(
    () => accounts.reduce((s, a) => s + (convertedTotals[a.id] ?? a.balance), 0),
    [accounts, convertedTotals],
  )

  /* Keep the visible list ordered by their `order` field, falling back to
     creation order. Archived ones are already filtered upstream. */
  const ordered = useMemo(
    () =>
      [...accounts].sort((a, b) => {
        const ao = a.order ?? Number.MAX_SAFE_INTEGER
        const bo = b.order ?? Number.MAX_SAFE_INTEGER
        if (ao !== bo) return ao - bo
        return a.createdAt - b.createdAt
      }),
    [accounts],
  )

  return (
    <div>
      <BackBar label="Finanzas" onBack={() => navigate('/finanzas')} />
      <ModuleHeading
        kicker="Cuentas"
        title="Tu plata"
        subtitle="Cada billetera, banco o efectivo en su lugar."
      />

      {/* Total + currency toggle */}
      <div style={{ padding: '20px 20px 0' }}>
        <div
          style={{
            background: 'var(--ink)',
            color: 'var(--bg)',
            borderRadius: 26,
            padding: 22,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                opacity: 0.6,
              }}
            >
              Total disponible
            </span>
            <CurrencyToggle size="sm" />
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 40,
              fontWeight: 600,
              letterSpacing: -1,
              marginTop: 8,
              wordBreak: 'break-all',
            }}
          >
            {hidePrivate ? '••••' : formatMoneyRound(total, displayCurrency)}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              opacity: 0.6,
              marginTop: 6,
              letterSpacing: 0.4,
            }}
          >
            Suma de {accounts.length} cuenta{accounts.length === 1 ? '' : 's'} · convertido a {displayCurrency}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ padding: '20px 20px 0', display: 'flex', gap: 8 }}>
        <ActionChip icon="plus" label="Nueva cuenta" primary onClick={() => setShowCreate(true)} />
        <ActionChip
          icon="arrow-right"
          label="Transferir"
          onClick={() => setShowTransfer(true)}
        />
      </div>

      {/* Accounts list */}
      <div style={{ padding: '24px 20px 0' }}>
        <SectionTitle kicker={`${ordered.length}`} title="Mis cuentas" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ordered.map((a) => (
            <AccountCard
              key={a.id}
              account={a}
              hidePrivate={hidePrivate}
              variant="full"
              onClick={() => navigate(`/cuenta/${a.id}`)}
            />
          ))}
          {ordered.length === 0 && (
            <Card padding={18}>
              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  color: 'var(--ink-mute)',
                  textAlign: 'center',
                  lineHeight: 1.5,
                }}
              >
                Aún no tienes cuentas registradas.
                <br />
                Crea la primera para empezar a llevar saldos.
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Tip */}
      <div style={{ padding: '24px 20px 0' }}>
        <Card padding={16}>
          <div
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
            }}
          >
            <Icon name="sparkle" size={16} color="var(--accent)" />
            <div
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                color: 'var(--ink-mute)',
                lineHeight: 1.5,
              }}
            >
              <strong style={{ color: 'var(--ink)' }}>Tip:</strong> el saldo se calcula con
              cada movimiento que registras. Si lo que ves no coincide con la realidad,
              entra a la cuenta y usa <em>Ajustar saldo</em>.
            </div>
          </div>
        </Card>
      </div>

      <CuentaEditModal open={showCreate} onClose={() => setShowCreate(false)} />
      <TransferModal
        open={showTransfer}
        accounts={accounts}
        onClose={() => setShowTransfer(false)}
      />
    </div>
  )
}
