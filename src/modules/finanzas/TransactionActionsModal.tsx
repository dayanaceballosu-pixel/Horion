import { useState } from 'react'
import { Modal } from '@shared/components/Modal'
import { Icon } from '@shared/icons/Icon'
import { deleteTransaction } from '@/data/repositories/wallets'
import type { DisplayCurrency, Transaction, Wallet } from '@/data/types'
import { CURRENCY_SYMBOLS, formatMoneyRound } from '@shared/utils/format'

interface Props {
  tx: Transaction | null
  wallets: Wallet[]
  currency: DisplayCurrency
  onClose: () => void
}

const SOURCE_LABELS: Record<NonNullable<Transaction['source']>, string> = {
  manual: 'Manual',
  debt: 'Pago/cobro de deuda',
  goal: 'Aporte a una meta',
  fixedBill: 'Gasto fijo',
  trip: 'Viaje',
}

/**
 * Action sheet that opens when a transaction row is tapped. Shows the full
 * detail (original amount + currency, snapshot in display currency, date,
 * category, optional notes) and exposes the destructive Eliminar action.
 *
 * Auto-created transactions (debt, goal, fixedBill, trip sources) get a
 * warning banner because deleting them only removes the registry entry —
 * the underlying debt payment / goal allocation / etc. stays in place.
 */
export function TransactionActionsModal({ tx, wallets, currency, onClose }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!tx) return null

  const wallet = wallets.find((w) => w.id === tx.walletId)
  const sourceLabel = tx.source && tx.source !== 'manual' ? SOURCE_LABELS[tx.source] : null
  const isAutoCreated = sourceLabel !== null
  const originalSym = CURRENCY_SYMBOLS[tx.currency] ?? '$'

  const handleDelete = async () => {
    setError(null)
    setBusy(true)
    try {
      await deleteTransaction(tx.id)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar')
      setBusy(false)
    }
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={tx.type === 'in' ? 'Ingreso' : 'Egreso'}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Amount hero */}
        <div
          style={{
            background: tx.type === 'in' ? 'var(--accent-pale)' : 'var(--bg-inset)',
            borderRadius: 16,
            padding: '18px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--ink-mute)',
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            Original
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 24,
              fontWeight: 600,
              color: tx.type === 'in' ? 'var(--accent)' : 'var(--ink)',
              letterSpacing: -0.6,
            }}
          >
            {tx.type === 'in' ? '+' : '−'}
            {originalSym}
            {new Intl.NumberFormat('es-ES', {
              maximumFractionDigits: tx.currency === 'COP' || tx.currency === 'PLN' ? 0 : 2,
            }).format(tx.amount)}{' '}
            <span style={{ fontSize: 14, color: 'var(--ink-mute)', fontWeight: 500 }}>{tx.currency}</span>
          </div>
          {tx.currency !== currency && tx.snapshot && (
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--ink-mute)',
              }}
            >
              ≈ {formatMoneyRound(tx.snapshot[currency], currency)} {currency} (al momento de registrar)
            </div>
          )}
        </div>

        <DetailRow label="Detalle" value={tx.title} />
        {wallet && <DetailRow label="Categoría" value={wallet.name} />}
        <DetailRow label="Fecha" value={tx.date} />
        {sourceLabel && <DetailRow label="Origen" value={sourceLabel} />}
        {tx.notes && <DetailRow label="Notas" value={tx.notes} />}

        {/* Auto-created warning */}
        {isAutoCreated && !confirming && (
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              background: 'var(--bg-card)',
              border: '0.5px solid var(--hairline)',
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              color: 'var(--ink-mute)',
              lineHeight: 1.5,
            }}
          >
            ⚠️ Este movimiento se creó automáticamente desde {sourceLabel.toLowerCase()}. Borrarlo aquí solo elimina el
            registro — no revierte la deuda/meta/gasto original.
          </div>
        )}

        {/* Action buttons */}
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            style={{
              marginTop: 4,
              height: 48,
              borderRadius: 99,
              background: 'transparent',
              color: 'var(--accent)',
              border: '0.5px solid var(--accent)',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Icon name="trash" size={15} color="var(--accent)" />
            Eliminar movimiento
          </button>
        ) : (
          <div
            style={{
              padding: 14,
              borderRadius: 14,
              background: 'var(--accent-pale)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                color: 'var(--accent)',
                lineHeight: 1.4,
                textAlign: 'center',
              }}
            >
              ¿Eliminar este movimiento? No se puede deshacer.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={busy}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 99,
                  background: 'var(--bg-card)',
                  color: 'var(--ink)',
                  border: '0.5px solid var(--hairline)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  cursor: busy ? 'wait' : 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 99,
                  background: 'var(--accent)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: busy ? 'wait' : 'pointer',
                  opacity: busy ? 0.7 : 1,
                }}
              >
                {busy ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--accent)',
              padding: 10,
              borderRadius: 12,
              background: 'var(--accent-pale)',
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}
      </div>
    </Modal>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
        padding: '6px 2px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--ink-mute)',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          minWidth: 90,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          color: 'var(--ink)',
          textAlign: 'right',
          flex: 1,
          wordBreak: 'break-word',
        }}
      >
        {value}
      </div>
    </div>
  )
}
