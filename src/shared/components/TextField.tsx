import type { ChangeEvent, InputHTMLAttributes } from 'react'

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label: string
  value: string | number
  onChange: (v: string) => void
  prefix?: string
  hint?: string
}

export function TextField({ label, value, onChange, prefix, hint, type = 'text', ...rest }: TextFieldProps) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: 'var(--ink-mute)',
        }}
      >
        {label}
      </span>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '12px 14px',
          background: 'var(--bg-inset)',
          borderRadius: 14,
          border: '0.5px solid var(--hairline)',
        }}
      >
        {prefix && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink-mute)' }}>{prefix}</span>
        )}
        <input
          {...rest}
          type={type}
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontFamily: type === 'number' ? 'var(--font-mono)' : 'var(--font-sans)',
            fontSize: 15,
            color: 'var(--ink)',
            minWidth: 0,
          }}
        />
      </div>
      {hint && (
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--ink-faint)' }}>{hint}</span>
      )}
    </label>
  )
}

interface SelectFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}
export function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: 'var(--ink-mute)',
        }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '12px 14px',
          background: 'var(--bg-inset)',
          borderRadius: 14,
          border: '0.5px solid var(--hairline)',
          fontFamily: 'var(--font-sans)',
          fontSize: 15,
          color: 'var(--ink)',
          appearance: 'none',
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
