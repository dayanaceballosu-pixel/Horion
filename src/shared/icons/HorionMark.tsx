interface BrandProps {
  size?: number
  color?: string
}

export function HorionMark({ size = 28, color = 'currentColor' }: BrandProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
      <circle cx="30" cy="30" r="26" stroke={color} strokeWidth="1.2" opacity="0.5" />
      <path d="M30 2 L32 28 L30 30 L28 28 Z" fill={color} opacity="0.7" />
      <path d="M30 58 L32 32 L30 30 L28 32 Z" fill={color} opacity="0.7" />
      <path d="M2 30 L28 32 L30 30 L28 28 Z" fill={color} opacity="0.7" />
      <path d="M58 30 L32 32 L30 30 L32 28 Z" fill={color} opacity="0.7" />
      <path
        d="M14 18 L14 42 L20 42 L20 33 L40 33 L40 42 L46 42 L46 18 L40 18 L40 27 L20 27 L20 18 Z"
        fill={color}
      />
      <path
        d="M30 24 L31.5 29.5 L30 30 L28.5 29.5 Z M30 36 L31.5 30.5 L30 30 L28.5 30.5 Z M24 30 L29.5 31.5 L30 30 L29.5 28.5 Z M36 30 L30.5 31.5 L30 30 L30.5 28.5 Z"
        fill={color}
      />
    </svg>
  )
}

interface WordmarkProps {
  size?: number
  color?: string
  tagline?: boolean
}

export function HorionWordmark({ size = 22, color = 'currentColor', tagline = false }: WordmarkProps) {
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: size,
          color,
          letterSpacing: size * 0.06,
          lineHeight: 1,
          textTransform: 'uppercase',
        }}
      >
        HORIÓN
      </span>
      {tagline && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: size * 0.32,
            color,
            letterSpacing: 2,
            opacity: 0.7,
            textTransform: 'uppercase',
            marginTop: 4,
          }}
        >
          Tu visión · Tu ruta · Tu legado
        </span>
      )}
    </div>
  )
}
