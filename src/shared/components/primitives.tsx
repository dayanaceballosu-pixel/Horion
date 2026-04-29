import type { CSSProperties, ReactNode, MouseEventHandler } from 'react'
import { Icon, type IconName } from '../icons/Icon'

/* ─────────────── Card ─────────────── */
interface CardProps {
  children: ReactNode
  style?: CSSProperties
  padding?: number
  onClick?: MouseEventHandler<HTMLDivElement>
}
export function Card({ children, style, padding = 18, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        borderRadius: 22,
        padding,
        border: '0.5px solid var(--hairline)',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/* ─────────────── Section title ─────────────── */
interface SectionTitleProps {
  kicker?: string
  title: string
  action?: string
  onAction?: () => void
}
export function SectionTitle({ kicker, title, action, onAction }: SectionTitleProps) {
  return (
    <div style={{ padding: '0 20px', marginBottom: 12 }}>
      {kicker && (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: 'var(--accent)',
            marginBottom: 6,
          }}
        >
          {kicker}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 26,
            fontWeight: 400,
            letterSpacing: -0.6,
            color: 'var(--ink)',
            fontStyle: 'italic',
            lineHeight: 1.05,
          }}
        >
          {title}
        </div>
        {action && (
          <button
            type="button"
            onClick={onAction}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--accent)',
              padding: 0,
            }}
          >
            {action}
          </button>
        )}
      </div>
    </div>
  )
}

/* ─────────────── Money ─────────────── */
type CurrencyCode = 'EUR' | 'USD' | 'COP' | 'PLN' | 'GBP'
const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  EUR: '€',
  USD: '$',
  COP: '$',
  PLN: 'zł',
  GBP: '£',
}

interface MoneyProps {
  value: number
  currency?: CurrencyCode
  size?: number
  mute?: boolean
  weight?: number
  hide?: boolean
}
export function Money({
  value,
  currency = 'EUR',
  size = 28,
  mute = false,
  weight = 500,
  hide = false,
}: MoneyProps) {
  const sym = CURRENCY_SYMBOLS[currency] ?? '€'
  const fmt = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(Math.abs(value))
  if (hide) {
    return (
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: size, color: mute ? 'var(--ink-mute)' : 'var(--ink)' }}>
        <span style={{ fontSize: size * 0.62, marginRight: 2, opacity: 0.7 }}>{sym}</span>
        • • • •
      </span>
    )
  }
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: size,
        fontWeight: weight,
        color: mute ? 'var(--ink-mute)' : 'var(--ink)',
        letterSpacing: -0.5,
        fontFeatureSettings: '"tnum"',
      }}
    >
      {value < 0 && '−'}
      <span style={{ fontSize: size * 0.62, marginRight: 2, opacity: 0.7 }}>{sym}</span>
      {fmt}
    </span>
  )
}

/* ─────────────── Pill ─────────────── */
interface PillProps {
  children: ReactNode
  color?: string
  bg?: string
  style?: CSSProperties
}
export function Pill({ children, color, bg, style }: PillProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 9px',
        borderRadius: 99,
        background: bg ?? 'var(--bg-inset)',
        color: color ?? 'var(--ink-mute)',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        ...style,
      }}
    >
      {children}
    </span>
  )
}

/* ─────────────── Progress ─────────────── */
interface ProgressProps {
  value: number
  max?: number
  color?: string
  height?: number
}
export function Progress({ value, max = 100, color, height = 4 }: ProgressProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div
      style={{
        height,
        borderRadius: 99,
        overflow: 'hidden',
        background: 'rgba(127,127,127,0.14)',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${pct}%`,
          background: color ?? 'var(--accent)',
          borderRadius: 99,
          transition: 'width 240ms ease',
        }}
      />
    </div>
  )
}

/* ─────────────── Buttons ─────────────── */
interface BtnProps {
  children: ReactNode
  onClick?: () => void
  style?: CSSProperties
  icon?: ReactNode
  type?: 'button' | 'submit'
  disabled?: boolean
}
export function PrimaryButton({ children, onClick, style, icon, type = 'button', disabled }: BtnProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        height: 54,
        borderRadius: 99,
        background: disabled ? 'var(--ink-faint)' : 'var(--ink)',
        color: 'var(--bg)',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--font-sans)',
        fontSize: 15,
        fontWeight: 600,
        letterSpacing: -0.2,
        ...style,
      }}
    >
      {icon}
      {children}
    </button>
  )
}

export function SecondaryButton({ children, onClick, style, type = 'button' }: BtnProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        height: 44,
        borderRadius: 99,
        padding: '0 18px',
        background: 'transparent',
        color: 'var(--ink)',
        border: '1px solid var(--ink)',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        fontSize: 14,
        fontWeight: 500,
        ...style,
      }}
    >
      {children}
    </button>
  )
}

/* ─────────────── Action chip ─────────────── */
interface ActionChipProps {
  icon: IconName
  label: string
  primary?: boolean
  onClick?: () => void
}
export function ActionChip({ icon, label, primary, onClick }: ActionChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        height: 48,
        borderRadius: 99,
        background: primary ? 'var(--ink)' : 'var(--bg-card)',
        color: primary ? 'var(--bg)' : 'var(--ink)',
        border: primary ? 'none' : '0.5px solid var(--hairline)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        fontFamily: 'var(--font-sans)',
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      <Icon name={icon} size={14} color={primary ? 'var(--bg)' : 'var(--ink)'} />
      {label}
    </button>
  )
}

/* ─────────────── Round icon button ─────────────── */
interface RoundIconProps {
  icon: IconName
  onClick?: () => void
  ariaLabel?: string
}
export function RoundIcon({ icon, onClick, ariaLabel }: RoundIconProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? icon}
      style={{
        width: 40,
        height: 40,
        borderRadius: 99,
        background: 'var(--bg-card)',
        border: '0.5px solid var(--hairline)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      <Icon name={icon} size={18} color="var(--ink)" />
    </button>
  )
}

/* ─────────────── Back bar ─────────────── */
interface BackBarProps {
  label: string
  onBack: () => void
}
export function BackBar({ label, onBack }: BackBarProps) {
  return (
    <div style={{ padding: '12px 20px 0', display: 'flex', alignItems: 'center' }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--ink)',
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          fontWeight: 500,
          padding: 0,
        }}
      >
        <Icon name="chevron-left" size={18} color="var(--ink)" stroke={2} />
        <span>{label}</span>
      </button>
    </div>
  )
}

/* ─────────────── Module heading ─────────────── */
interface ModuleHeadingProps {
  kicker: string
  title: string
  subtitle?: string
}
export function ModuleHeading({ kicker, title, subtitle }: ModuleHeadingProps) {
  return (
    <div style={{ padding: '8px 20px 0' }}>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--accent)',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        }}
      >
        {kicker}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 38,
          color: 'var(--ink)',
          letterSpacing: -1,
          lineHeight: 1,
          marginTop: 4,
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-mute)', marginTop: 6 }}>
          {subtitle}
        </div>
      )}
    </div>
  )
}
