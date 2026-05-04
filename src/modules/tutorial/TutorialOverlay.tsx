import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { useCollection } from '@shared/hooks/useFirestore'
import { accountsQuery } from '@/data/repositories/accounts'
import { transactionsQuery } from '@/data/repositories/wallets'
import type { Account, Transaction } from '@/data/types'
import { Icon } from '@shared/icons/Icon'
import { TUTORIAL_STEPS, type TutorialStep } from './steps'
import { useTutorialStore } from './useTutorial'

const PADDING_AROUND_TARGET = 8
const TOOLTIP_W = 340
const TOOLTIP_H_ESTIMATE = 220
const TOOLTIP_GAP = 16
const SAFE_MARGIN = 14
const SCRIM = 'rgba(0,0,0,0.62)'
const RING_RADIUS = 14

/**
 * Full-screen interactive tour. Renders a dark scrim with a transparent
 * cutout around the current step's target element, a pulsing ring on the
 * cutout, and a floating tooltip near the target. Steps with `waitFor`
 * advance automatically when the user actually performs the action — they
 * click the spotlighted button, or they create the account / transaction
 * the step is asking them to create.
 *
 * The mounted-but-inactive case is the common one (active === null), so we
 * bail early and stay invisible. When active, we also subscribe to the
 * accounts and transactions collections to drive state-based auto-advance.
 */
export function TutorialOverlay() {
  const active = useTutorialStore((s) => s.active)
  const next = useTutorialStore((s) => s.next)
  const skip = useTutorialStore((s) => s.skip)
  const [location, navigate] = useLocation()

  /* Always keep the user inside Finanzas while the tour runs — every step
     references something on that screen or in a modal opened from it. */
  useEffect(() => {
    if (active === null) return
    if (location !== '/finanzas') navigate('/finanzas')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  /* Subscribe to live data so we can auto-advance state-based steps. We
     subscribe unconditionally while the tour is active — the alternative
     would be to subscribe only on the matching step, but the listeners are
     cheap (Firestore caches) and this avoids subtle race conditions where
     the count snapshot lands a render after the step changed. */
  const tutorialActive = active !== null
  const accounts = useCollection<Account>(
    () => (tutorialActive ? accountsQuery() : null),
    [tutorialActive],
  )
  const transactions = useCollection<Transaction>(
    () => (tutorialActive ? transactionsQuery({ limit: 100 }) : null),
    [tutorialActive],
  )

  /* Capture baseline counts the moment a step becomes active. The waitFor
     predicate then advances when the live count exceeds it. */
  const [baseline, setBaseline] = useState({ accounts: 0, transactions: 0 })
  useEffect(() => {
    if (active === null) return
    setBaseline({ accounts: accounts.length, transactions: transactions.length })
    // We intentionally only re-baseline on step change, not on count change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  /* State-based auto-advance with a small delay so the user sees the
     transition before the tutorial moves on. */
  useEffect(() => {
    if (active === null) return
    const step = TUTORIAL_STEPS[active]
    if (!step?.waitFor) return
    if (step.waitFor.type === 'accounts-grew' && accounts.length > baseline.accounts) {
      const t = setTimeout(() => next(), 450)
      return () => clearTimeout(t)
    }
    if (step.waitFor.type === 'transactions-grew' && transactions.length > baseline.transactions) {
      const t = setTimeout(() => next(), 450)
      return () => clearTimeout(t)
    }
  }, [active, accounts.length, transactions.length, baseline, next])

  /* Click-based auto-advance. Listen in the capture phase so we fire before
     the click bubbles to the target's own handler — that way the modal
     opens and the next step's target (inside the modal) is already in the
     DOM by the time we re-render. */
  useEffect(() => {
    if (active === null) return
    const step = TUTORIAL_STEPS[active]
    if (step?.waitFor?.type !== 'click' || !step.target) return
    const handler = (e: MouseEvent) => {
      const targetEl = document.querySelector<HTMLElement>(`[data-tutorial="${step.target}"]`)
      if (!targetEl) return
      const path = e.target as Node | null
      if (!path) return
      if (targetEl === path || targetEl.contains(path)) {
        /* Slight delay so the user's click finishes its job (opening the
           modal) before we move on. */
        setTimeout(() => next(), 220)
      }
    }
    document.addEventListener('click', handler, true)
    return () => document.removeEventListener('click', handler, true)
  }, [active, next])

  /* Track target rect — re-measures every 200ms (cheap, robust against
     modals opening/closing) plus on resize/scroll. */
  const step = active === null ? null : TUTORIAL_STEPS[active]
  const targetSel =
    step?.kind === 'spotlight' && step.target ? `[data-tutorial="${step.target}"]` : null
  const rect = useTargetRect(targetSel)

  /* Scroll the target into view when a new step starts so the spotlight is
     visible without the user having to hunt. */
  useEffect(() => {
    if (!targetSel) return
    const el = document.querySelector(targetSel)
    if (el) (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [targetSel])

  if (active === null || !step) return null

  if (step.kind === 'center') {
    return <CenterCard step={step} active={active} onNext={next} onSkip={skip} />
  }

  return (
    <SpotlightOverlay
      step={step}
      rect={rect}
      active={active}
      onNext={next}
      onSkip={skip}
    />
  )
}

/* ─────────────────────────── center variant ─────────────────────────── */

function CenterCard({
  step,
  active,
  onNext,
  onSkip,
}: {
  step: TutorialStep
  active: number
  onNext: () => void
  onSkip: () => void
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: SCRIM,
        zIndex: 95,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        animation: 'horion-fade 200ms ease',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          background: 'var(--ink)',
          color: 'var(--bg)',
          borderRadius: 22,
          padding: '22px 22px 18px',
          boxShadow: '0 24px 64px -16px rgba(0,0,0,0.7)',
          animation: 'horion-pop 280ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        <ProgressDots active={active} />
        <Header step={step} onSkip={onSkip} />
        <Body step={step} />
        <Actions step={step} onNext={onNext} />
      </div>
    </div>
  )
}

/* ─────────────────────────── spotlight variant ─────────────────────────── */

function SpotlightOverlay({
  step,
  rect,
  active,
  onNext,
  onSkip,
}: {
  step: TutorialStep
  rect: DOMRect | null
  active: number
  onNext: () => void
  onSkip: () => void
}) {
  /* If the target hasn't appeared yet (e.g. modal still opening), render
     a minimal "buscando…" tooltip in the center so the user isn't stuck
     staring at the wrong screen. */
  if (!rect) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: SCRIM,
          zIndex: 95,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          padding: 'calc(24px + env(safe-area-inset-bottom)) 16px 24px',
          pointerEvents: 'auto',
        }}
      >
        <Tooltip step={step} active={active} onNext={onNext} onSkip={onSkip} />
      </div>
    )
  }

  /* Compute cutout region. Pad it slightly so the ring sits comfortably
     around the element and feels intentional, not cramped. */
  const cx = Math.max(0, rect.left - PADDING_AROUND_TARGET)
  const cy = Math.max(0, rect.top - PADDING_AROUND_TARGET)
  const cw = rect.width + PADDING_AROUND_TARGET * 2
  const ch = rect.height + PADDING_AROUND_TARGET * 2

  /* Tooltip placement. We auto-flip when the target is in the lower half. */
  const placement =
    step.placement && step.placement !== 'auto'
      ? step.placement
      : rect.top + rect.height / 2 < window.innerHeight / 2
        ? 'bottom'
        : 'top'

  const targetCenterX = rect.left + rect.width / 2
  let tooltipTop =
    placement === 'bottom' ? rect.bottom + TOOLTIP_GAP : rect.top - TOOLTIP_H_ESTIMATE - TOOLTIP_GAP
  tooltipTop = Math.max(
    SAFE_MARGIN,
    Math.min(window.innerHeight - TOOLTIP_H_ESTIMATE - SAFE_MARGIN, tooltipTop),
  )
  let tooltipLeft = targetCenterX - TOOLTIP_W / 2
  tooltipLeft = Math.max(
    SAFE_MARGIN,
    Math.min(window.innerWidth - TOOLTIP_W - SAFE_MARGIN, tooltipLeft),
  )

  return (
    <>
      {/* Four scrim panels around the target. Together they dim everything
          *except* the cutout, while keeping the cutout itself click-through
          so the user can interact with the spotlighted element. */}
      <Scrim top={0} left={0} right={0} height={cy} />
      <Scrim top={cy + ch} left={0} right={0} bottom={0} />
      <Scrim top={cy} left={0} width={cx} height={ch} />
      <Scrim top={cy} left={cx + cw} right={0} height={ch} />

      {/* Pulsing ring on the cutout edges. pointer-events:none so it never
          blocks the actual click. */}
      <div
        style={{
          position: 'fixed',
          top: cy,
          left: cx,
          width: cw,
          height: ch,
          borderRadius: RING_RADIUS,
          boxShadow:
            '0 0 0 2px var(--accent), 0 0 0 8px rgba(232,119,154,0.30), 0 12px 32px -10px rgba(232,119,154,0.4)',
          pointerEvents: 'none',
          animation: 'horion-tut-pulse 1.8s ease-in-out infinite',
          zIndex: 96,
        }}
      />

      {/* Tooltip */}
      <div
        style={{
          position: 'fixed',
          top: tooltipTop,
          left: tooltipLeft,
          width: TOOLTIP_W,
          maxWidth: `calc(100vw - ${SAFE_MARGIN * 2}px)`,
          zIndex: 100,
          pointerEvents: 'auto',
        }}
      >
        <Tooltip step={step} active={active} onNext={onNext} onSkip={onSkip} />
      </div>

      <KeyframeStyles />
    </>
  )
}

function Scrim({
  top, left, right, bottom, width, height,
}: {
  top?: number
  left?: number
  right?: number
  bottom?: number
  width?: number
  height?: number
}) {
  return (
    <div
      style={{
        position: 'fixed',
        top, left, right, bottom, width, height,
        background: SCRIM,
        zIndex: 95,
        pointerEvents: 'auto',
        animation: 'horion-fade 220ms ease',
      }}
    />
  )
}

/* ─────────────────────────── tooltip ─────────────────────────── */

function Tooltip({
  step,
  active,
  onNext,
  onSkip,
}: {
  step: TutorialStep
  active: number
  onNext: () => void
  onSkip: () => void
}) {
  return (
    <div
      style={{
        background: 'var(--ink)',
        color: 'var(--bg)',
        borderRadius: 18,
        padding: '16px 18px 14px',
        boxShadow: '0 24px 64px -16px rgba(0,0,0,0.7)',
        border: '0.5px solid rgba(255,255,255,0.06)',
        animation: 'horion-pop 240ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}
    >
      <ProgressDots active={active} />
      <Header step={step} onSkip={onSkip} />
      <Body step={step} />
      <Actions step={step} onNext={onNext} />
    </div>
  )
}

function ProgressDots({ active }: { active: number }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
      {TUTORIAL_STEPS.map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 3,
            borderRadius: 99,
            background:
              i < active
                ? 'rgba(252,232,238,0.85)'
                : i === active
                  ? 'var(--accent)'
                  : 'rgba(252,232,238,0.18)',
            transition: 'background 200ms ease',
          }}
        />
      ))}
    </div>
  )
}

function Header({ step, onSkip }: { step: TutorialStep; onSkip: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {step.icon && <Icon name={step.icon} size={13} color="var(--accent)" />}
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: 1.6,
            textTransform: 'uppercase',
            color: 'var(--accent)',
          }}
        >
          {step.kicker}
        </span>
      </div>
      <button
        type="button"
        onClick={onSkip}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'rgba(252,232,238,0.55)',
          fontFamily: 'var(--font-sans)',
          fontSize: 11,
          cursor: 'pointer',
          padding: '4px 6px',
        }}
      >
        Saltar tutorial
      </button>
    </div>
  )
}

function Body({ step }: { step: TutorialStep }) {
  return (
    <>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 22,
          letterSpacing: -0.5,
          lineHeight: 1.1,
          marginBottom: 8,
        }}
      >
        {step.title}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          lineHeight: 1.5,
          color: 'rgba(252,232,238,0.78)',
          marginBottom: 14,
        }}
      >
        {step.body}
      </div>
    </>
  )
}

function Actions({
  step,
  onNext,
}: {
  step: TutorialStep
  onNext: () => void
}) {
  if (step.waitFor) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 12px',
          borderRadius: 12,
          background: 'rgba(252,232,238,0.08)',
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 99,
            background: 'var(--accent)',
            animation: 'horion-tut-blink 1.2s ease-in-out infinite',
            flexShrink: 0,
          }}
        />
        <span
          style={{
            flex: 1,
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
            color: 'rgba(252,232,238,0.85)',
          }}
        >
          {step.waiting ?? 'Esperando…'}
        </span>
        <button
          type="button"
          onClick={onNext}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--accent)',
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          Saltar paso →
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onNext}
      style={{
        width: '100%',
        height: 44,
        borderRadius: 99,
        background: 'var(--accent)',
        color: 'var(--on-accent, #FFFFFF)',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        fontSize: 13,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
    >
      {step.primary ?? 'Siguiente'}
      <Icon name="arrow-right" size={14} color="var(--on-accent, #FFFFFF)" />
    </button>
  )
}

/* ─────────────────────────── helpers ─────────────────────────── */

/**
 * Tracks the bounding rect of an element matching `selector`. Polls every
 * 200ms because the targets can pop in and out of the DOM (modal contents),
 * and ResizeObserver doesn't observe elements that don't yet exist. Polling
 * is cheap at this scale (a single getBoundingClientRect call).
 */
function useTargetRect(selector: string | null): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null)
  useEffect(() => {
    if (!selector) {
      setRect(null)
      return
    }
    let last = ''
    const update = () => {
      const el = document.querySelector(selector)
      if (!el) {
        if (last !== '') setRect(null)
        last = ''
        return
      }
      const r = el.getBoundingClientRect()
      const sig = `${r.top}|${r.left}|${r.width}|${r.height}`
      if (sig !== last) {
        setRect(r)
        last = sig
      }
    }
    update()
    const interval = setInterval(update, 200)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      clearInterval(interval)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [selector])
  return rect
}

function KeyframeStyles() {
  return (
    <style>{`
      @keyframes horion-tut-pulse {
        0%, 100% { box-shadow: 0 0 0 2px var(--accent), 0 0 0 8px rgba(232,119,154,0.30), 0 12px 32px -10px rgba(232,119,154,0.4); }
        50%      { box-shadow: 0 0 0 2px var(--accent), 0 0 0 14px rgba(232,119,154,0.12), 0 12px 32px -10px rgba(232,119,154,0.5); }
      }
      @keyframes horion-tut-blink {
        0%, 100% { opacity: 1; }
        50%      { opacity: 0.35; }
      }
    `}</style>
  )
}
