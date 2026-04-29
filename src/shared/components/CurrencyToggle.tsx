import type { DisplayCurrency } from '@/data/types'
import { useDisplayCurrency } from '../hooks/useDisplayCurrency'

const OPTIONS: DisplayCurrency[] = ['COP', 'USD', 'EUR']

interface Props {
  /** Pass-through size variant. `sm` is for inline placement next to numbers. */
  size?: 'sm' | 'md'
}

/**
 * Three-pill segment that flips the global display currency. The choice is
 * persisted on the user's settings doc so every screen subscribed to it
 * re-renders together.
 */
export function CurrencyToggle({ size = 'md' }: Props) {
  const { currency, setCurrency } = useDisplayCurrency()
  const padY = size === 'sm' ? 4 : 6
  const padX = size === 'sm' ? 8 : 12
  const fontSize = size === 'sm' ? 10 : 11

  return (
    <div
      role="group"
      aria-label="Cambiar moneda"
      style={{
        display: 'inline-flex',
        gap: 2,
        padding: 2,
        borderRadius: 999,
        background: 'var(--bg-inset)',
        border: '0.5px solid var(--hairline)',
      }}
    >
      {OPTIONS.map((c) => {
        const active = c === currency
        return (
          <button
            key={c}
            type="button"
            onClick={() => {
              if (!active) void setCurrency(c)
            }}
            style={{
              padding: `${padY}px ${padX}px`,
              borderRadius: 999,
              border: 'none',
              cursor: active ? 'default' : 'pointer',
              background: active ? 'var(--ink)' : 'transparent',
              color: active ? 'var(--bg)' : 'var(--ink-mute)',
              fontFamily: 'var(--font-mono)',
              fontSize,
              letterSpacing: 0.6,
              fontWeight: active ? 600 : 500,
              transition: 'background 160ms ease, color 160ms ease',
            }}
          >
            {c}
          </button>
        )
      })}
    </div>
  )
}
