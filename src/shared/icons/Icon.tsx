import type { SVGProps } from 'react'

export type IconName =
  | 'home' | 'wallet' | 'plane' | 'box' | 'user'
  | 'plus' | 'arrow-up' | 'arrow-down' | 'arrow-right' | 'arrow-left'
  | 'chevron-right' | 'chevron-left' | 'chevron-down'
  | 'check' | 'circle' | 'check-circle' | 'lock' | 'bell' | 'calendar'
  | 'target' | 'heart' | 'sparkle' | 'pin' | 'search' | 'edit' | 'menu'
  | 'eye' | 'eye-off' | 'flame' | 'star' | 'tattoo-machine' | 'droplet'
  | 'flag' | 'image' | 'share' | 'dots' | 'globe' | 'wifi-off'
  | 'download' | 'trash' | 'x' | 'settings' | 'bar-chart'

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name' | 'stroke'> {
  name: IconName
  size?: number
  color?: string
  stroke?: number
}

export function Icon({ name, size = 20, color = 'currentColor', stroke = 1.6, ...rest }: IconProps) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...rest,
  }
  switch (name) {
    case 'home':
      return <svg {...props}><path d="M3 11l9-7 9 7v9a2 2 0 01-2 2h-4v-7h-6v7H5a2 2 0 01-2-2v-9z" /></svg>
    case 'wallet':
      return <svg {...props}><rect x="3" y="6" width="18" height="14" rx="3" /><path d="M3 10h18M16 15h2" /></svg>
    case 'plane':
      return <svg {...props}><path d="M2 16l8-3 4 7 2-1-1-7 7-3a2 2 0 000-3 2 2 0 00-3 0l-3 7-7-1-1 2 7 4-3 8z" /></svg>
    case 'box':
      return <svg {...props}><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 7v10l9 4M21 7v10l-9 4M12 11v10" /></svg>
    case 'user':
      return <svg {...props}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></svg>
    case 'plus':
      return <svg {...props}><path d="M12 5v14M5 12h14" /></svg>
    case 'arrow-up':
      return <svg {...props}><path d="M12 19V5M5 12l7-7 7 7" /></svg>
    case 'arrow-down':
      return <svg {...props}><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
    case 'arrow-right':
      return <svg {...props}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
    case 'arrow-left':
      return <svg {...props}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
    case 'chevron-right':
      return <svg {...props}><path d="M9 6l6 6-6 6" /></svg>
    case 'chevron-left':
      return <svg {...props}><path d="M15 6l-6 6 6 6" /></svg>
    case 'chevron-down':
      return <svg {...props}><path d="M6 9l6 6 6-6" /></svg>
    case 'check':
      return <svg {...props}><path d="M4 12l5 5L20 6" /></svg>
    case 'circle':
      return <svg {...props}><circle cx="12" cy="12" r="9" /></svg>
    case 'check-circle':
      return <svg {...props}><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></svg>
    case 'lock':
      return <svg {...props}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>
    case 'bell':
      return <svg {...props}><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9z" /><path d="M10 21a2 2 0 004 0" /></svg>
    case 'calendar':
      return <svg {...props}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
    case 'target':
      return <svg {...props}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill={color} /></svg>
    case 'heart':
      return <svg {...props}><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0112 6a5.5 5.5 0 019.5 6c-2.5 4.5-9.5 9-9.5 9z" /></svg>
    case 'sparkle':
      return <svg {...props}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" /></svg>
    case 'pin':
      return <svg {...props}><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z" /><circle cx="12" cy="9" r="2.5" /></svg>
    case 'search':
      return <svg {...props}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
    case 'edit':
      return <svg {...props}><path d="M12 20h9M16.5 3.5a2 2 0 113 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
    case 'menu':
      return <svg {...props}><path d="M3 6h18M3 12h18M3 18h18" /></svg>
    case 'eye':
      return <svg {...props}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
    case 'eye-off':
      return <svg {...props}><path d="M2 2l20 20M6.7 6.7C3.6 8.5 2 12 2 12s4 7 10 7c2 0 3.7-.6 5.2-1.5M10 5.1A9.4 9.4 0 0112 5c6 0 10 7 10 7-.7 1.3-1.6 2.5-2.7 3.5" /></svg>
    case 'flame':
      return <svg {...props}><path d="M12 2s5 5 5 10a5 5 0 11-10 0c0-2 1-3 1-3s2 2 2 4c0-3 2-7 2-11z" /></svg>
    case 'star':
      return <svg {...props}><path d="M12 2l3 7 7 .5-5.5 5L18 22l-6-4-6 4 1.5-7.5L2 9.5 9 9l3-7z" /></svg>
    case 'tattoo-machine':
      return <svg {...props}><rect x="4" y="8" width="10" height="6" rx="1" /><path d="M14 11h4M18 9v4M6 14v4M8 14v4" /></svg>
    case 'droplet':
      return <svg {...props}><path d="M12 2s7 8 7 13a7 7 0 11-14 0c0-5 7-13 7-13z" /></svg>
    case 'flag':
      return <svg {...props}><path d="M5 22V4M5 4h13l-3 5 3 5H5" /></svg>
    case 'image':
      return <svg {...props}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-5-5L5 21" /></svg>
    case 'share':
      return <svg {...props}><path d="M12 3v13M7 8l5-5 5 5M5 21h14" /></svg>
    case 'dots':
      return <svg {...props}><circle cx="6" cy="12" r="1.5" fill={color} /><circle cx="12" cy="12" r="1.5" fill={color} /><circle cx="18" cy="12" r="1.5" fill={color} /></svg>
    case 'globe':
      return <svg {...props}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" /></svg>
    case 'wifi-off':
      return <svg {...props}><path d="M2 2l20 20M8.5 16.5a5 5 0 017 0M5 12.5a10 10 0 0114 0M2 8.5a15 15 0 015-3M22 8.5a15 15 0 00-9-3" /></svg>
    case 'download':
      return <svg {...props}><path d="M12 3v13M7 12l5 5 5-5M5 21h14" /></svg>
    case 'trash':
      return <svg {...props}><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M6 6v14a2 2 0 002 2h8a2 2 0 002-2V6M10 11v6M14 11v6" /></svg>
    case 'x':
      return <svg {...props}><path d="M6 6l12 12M18 6L6 18" /></svg>
    case 'settings':
      return <svg {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 01-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3 1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8 1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></svg>
    case 'bar-chart':
      return <svg {...props}><path d="M3 21V3M3 21h18M7 17v-7M12 17v-12M17 17v-4" /></svg>
    default:
      return null
  }
}
