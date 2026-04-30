import { useLiveQuery } from 'dexie-react-hooks'
import { useLocation } from 'wouter'
import { useMemo } from 'react'
import { Card, Pill, Progress, RoundIcon, SectionTitle } from '@shared/components/primitives'
import { Icon, type IconName } from '@shared/icons/Icon'
import { HorionMark, HorionWordmark } from '@shared/icons/HorionMark'
import { transactionsForMonthQuery, walletsQuery } from '@/data/repositories/wallets'
import { inventoryQuery, isLow } from '@/data/repositories/inventory'
import { tripBreakeven, tripsQuery, tripTotalCost } from '@/data/repositories/trips'
import {
  billUrgency,
  debtUrgency,
  debtsQuery,
  fixedBillsQuery,
} from '@/data/repositories/debts'
import { completionsByDateQuery, tasksQuery } from '@/data/repositories/bienestar'
import { listPortfolio } from '@/data/repositories/portfolio'
import { settingsRef } from '@/data/repositories/settings'
import { useCollection, useDoc } from '@shared/hooks/useFirestore'
import { useDisplayCurrency } from '@shared/hooks/useDisplayCurrency'
import type { Debt, DisplayCurrency, FixedBill, InventoryItem, Settings, Task, TaskCompletion, Transaction, Trip, Wallet } from '@/data/types'
import { useThemeStore } from '@shared/theme/useTheme'
import { todayIso, isoMonth, CURRENCY_SYMBOLS, formatMoneyRound, formatDateLong } from '@shared/utils/format'
import { useOnline } from '@shared/hooks/useOnline'
import { useIsDesktop } from '@shared/hooks/useMediaQuery'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function HomeScreen() {
  const isDesktop = useIsDesktop()
  const [, navigate] = useLocation()
  const settings = useDoc<Settings>(() => settingsRef(), [])
  const wallets = useCollection<Wallet>(() => walletsQuery(), [])
  const trips = useCollection<Trip>(() => tripsQuery(), [])
  const debts = useCollection<Debt>(() => debtsQuery(), [])
  const bills = useCollection<FixedBill>(() => fixedBillsQuery(), [])
  const inventory = useCollection<InventoryItem>(() => inventoryQuery(), [])
  const lowItems = inventory.filter(isLow)
  const tasks = useCollection<Task>(() => tasksQuery(), [])
  const completionsList = useCollection<TaskCompletion>(() => completionsByDateQuery(todayIso()), [])
  const completions = new Map<string, boolean>()
  for (const c of completionsList) completions.set(c.taskId, c.done)
  const portfolio = useLiveQuery(() => listPortfolio(isoMonth()), [], [])
  const hidePrivate = useThemeStore((s) => s.hidePrivate)
  const toggleHide = useThemeStore((s) => s.toggleHidePrivate)
  const online = useOnline()

  const { currency } = useDisplayCurrency()
  const monthTxs = useCollection<Transaction>(() => transactionsForMonthQuery(isoMonth()), [isoMonth()])
  const { total, perWalletNet } = useMemo(() => computeMonthTotals(monthTxs, currency), [monthTxs, currency])
  const todayDone = tasks.filter((t) => completions.get(t.id) === true).length
  const activeTrip = trips.find((t) => t.status === 'active') ?? trips.find((t) => t.status === 'planning')
  const nextTripCost = activeTrip ? tripTotalCost(activeTrip.cost) : 0
  const nextTripBreakeven = activeTrip ? tripBreakeven(activeTrip.cost, activeTrip.avgPrice) : 0
  const debtsCount = debts.filter((d) => d.total - d.paid > 0).length
  /* Count debts/bills urgent or overdue — surfaced as a small alert on the
   *  Deudas bento card so the user notices from Inicio. */
  const today = todayIso()
  const urgentCount = useMemo(() => {
    const debtsUrgent = debts.filter(
      (d) => d.paid < d.total && (debtUrgency(d, today) === 'urgent' || debtUrgency(d, today) === 'overdue'),
    ).length
    const billsUrgent = bills.filter((b) => {
      if (!b.dueDate) return false
      if (b.lastPaidMonth === today.slice(0, 7)) return false
      const ur = billUrgency(b, today)
      return ur === 'urgent' || ur === 'overdue'
    }).length
    return debtsUrgent + billsUrgent
  }, [debts, bills, today])
  const selectedPortfolio = portfolio.filter((p) => p.selected).length

  if (isDesktop) {
    return <HomeDesktop {...{ navigate, settings, wallets, trips, debts, inventory, lowItems, tasks, completions, portfolio, hidePrivate, toggleHide, online, total, perWalletNet, currency, todayDone, activeTrip, nextTripCost, nextTripBreakeven, debtsCount, urgentCount, selectedPortfolio }} />
  }

  return <HomeMobile {...{ navigate, settings, wallets, trips, debts, inventory, lowItems, tasks, completions, portfolio, hidePrivate, toggleHide, online, total, perWalletNet, currency, todayDone, activeTrip, nextTripCost, nextTripBreakeven, debtsCount, urgentCount, selectedPortfolio }} />
}

function computeMonthTotals(txs: Transaction[], currency: DisplayCurrency): { total: number; perWalletNet: Record<string, number> } {
  let total = 0
  const perWalletNet: Record<string, number> = {}
  for (const t of txs) {
    const v = t.snapshot?.[currency] ?? 0
    const signed = t.type === 'in' ? v : -v
    total += signed
    perWalletNet[t.walletId] = (perWalletNet[t.walletId] ?? 0) + signed
  }
  return { total, perWalletNet }
}

/* ─────────── shared props type ─────────── */
interface HomeProps {
  navigate: (to: string) => void
  settings: Settings | undefined
  wallets: Wallet[]
  trips: Trip[]
  debts: Debt[]
  inventory: InventoryItem[]
  lowItems: InventoryItem[]
  tasks: Task[]
  completions: Map<string, boolean>
  portfolio: { selected: boolean }[]
  hidePrivate: boolean
  toggleHide: () => void
  online: boolean
  /** Net flow this month (ingresos − egresos) in the current display currency. */
  total: number
  /** Map of categoryId → net flow this month, in the current display currency. */
  perWalletNet: Record<string, number>
  /** User's current display currency (COP, USD or EUR). */
  currency: DisplayCurrency
  todayDone: number
  activeTrip: Trip | undefined
  nextTripCost: number
  nextTripBreakeven: number
  debtsCount: number
  /** Count of debts + fixed bills that are urgent (≤1d) or already overdue. */
  urgentCount: number
  selectedPortfolio: number
}

/** Hide-aware signed-money formatter used across the home cards. */
function homeSignedMoney(n: number, currency: DisplayCurrency, hide: boolean): string {
  if (hide) return '••••'
  if (n === 0) return formatMoneyRound(0, currency)
  return `${n > 0 ? '+' : '−'}${formatMoneyRound(Math.abs(n), currency)}`
}

/* ═══════════════════════════════════════
   DESKTOP LAYOUT
═══════════════════════════════════════ */
function HomeDesktop({ navigate, settings, wallets, tasks, completions, hidePrivate, toggleHide, online, total, perWalletNet, currency, todayDone, activeTrip, nextTripCost, nextTripBreakeven, debtsCount, urgentCount, lowItems, selectedPortfolio, portfolio }: HomeProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Offline banner */}
      {!online && (
        <div style={{
          background: 'var(--ink)', color: 'var(--bg)',
          padding: '10px 0', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 8,
          fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1.5,
          textTransform: 'uppercase', borderRadius: 14, marginBottom: 24,
        }}>
          <Icon name="wifi-off" size={13} color="var(--bg)" stroke={2} />
          Modo offline · todo se guarda local
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-mute)',
            letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6,
          }}>
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
            {settings?.userCity ? ` · ${settings.userCity}` : ''}
          </div>
          <div style={{
            fontFamily: 'var(--font-display)', fontStyle: 'italic',
            fontSize: 52, fontWeight: 400, color: 'var(--ink)',
            letterSpacing: -2, lineHeight: 1,
          }}>
            Hola{settings?.userName ? `, ${settings.userName}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, paddingTop: 6 }}>
          <RoundIcon icon={hidePrivate ? 'eye-off' : 'eye'} onClick={toggleHide} ariaLabel="Mostrar/ocultar montos" />
        </div>
      </div>

      {/* 2-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 24, alignItems: 'start' }}>

        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Hero balance */}
          <div style={{
            background: 'var(--ink)', color: 'var(--bg)',
            borderRadius: 28, padding: 28, position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: -50, right: -50,
              width: 220, height: 220, borderRadius: '50%',
              background: 'var(--accent)', opacity: 0.5, filter: 'blur(50px)',
            }} />
            <div style={{ position: 'relative' }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 10,
                letterSpacing: 1.5, opacity: 0.6, textTransform: 'uppercase',
              }}>
                Neto del mes · {wallets.length} categorías
              </div>
              <div style={{
                marginTop: 8, fontFamily: 'var(--font-mono)',
                fontSize: 52, fontWeight: 500, letterSpacing: -2, lineHeight: 1,
              }}>
                {homeSignedMoney(total, currency, hidePrivate)}
              </div>
              <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
                {wallets.slice(0, 3).map((w) => (
                  <div key={w.id} style={{
                    flex: 1, padding: '12px 14px', borderRadius: 16,
                    background: 'rgba(255,255,255,0.08)',
                    border: '0.5px solid rgba(255,255,255,0.12)',
                  }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 9,
                      opacity: 0.6, textTransform: 'uppercase', letterSpacing: 1,
                    }}>
                      {w.name}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, marginTop: 4 }}>
                      {homeSignedMoney(perWalletNet[w.id] ?? 0, currency, hidePrivate)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Active trip */}
          {activeTrip && (
            <Card padding={22} onClick={() => navigate(`/viaje/${activeTrip.id}`)} style={{ cursor: 'pointer' }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)',
                letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14,
              }}>
                Tour activo · {activeTrip.city}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: 36, fontStyle: 'italic',
                    color: 'var(--ink)', lineHeight: 1,
                  }}>
                    {nextTripBreakeven} tatuajes
                  </div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-mute)', marginTop: 6 }}>
                    break-even · {CURRENCY_SYMBOLS[activeTrip.currency]}{new Intl.NumberFormat('es-CO').format(nextTripCost)}
                  </div>
                </div>
                <span style={{ fontSize: 40 }}>{activeTrip.flag}</span>
              </div>
              {activeTrip.target > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-mute)' }}>
                      {activeTrip.sold} / {activeTrip.target} confirmados
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)' }}>
                      {Math.round((activeTrip.sold / activeTrip.target) * 100)}%
                    </span>
                  </div>
                  <Progress value={activeTrip.sold} max={activeTrip.target} height={6} />
                </div>
              )}
            </Card>
          )}

          {/* Footer date */}
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: 'var(--ink-faint)', letterSpacing: 2, textTransform: 'uppercase',
          }}>
            {formatDateLong(todayIso())}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Bento modules */}
          <div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-mute)',
              letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14,
            }}>
              Módulos
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <BentoCard kicker="01" title="Finanzas" stat={homeSignedMoney(total, currency, hidePrivate)} icon="wallet" onClick={() => navigate('/finanzas')} />
              <BentoCard kicker="02" title="Viajes" stat={activeTrip ? `${activeTrip.sold}/${activeTrip.target} citas` : 'Sin viaje activo'} icon="plane" onClick={() => navigate('/viajes')} />
              <BentoCard
                kicker="03"
                title="Deudas"
                stat={
                  urgentCount > 0
                    ? `${urgentCount} ${urgentCount === 1 ? 'urgente' : 'urgentes'}`
                    : `${debtsCount} ${debtsCount === 1 ? 'persona' : 'personas'}`
                }
                alert={urgentCount > 0}
                icon="arrow-up"
                onClick={() => navigate('/deudas')}
              />
              <BentoCard kicker="04" title="Inventario" alert={lowItems.length > 0} stat={lowItems.length > 0 ? `${lowItems.length} bajos` : 'Todo OK'} icon="box" onClick={() => navigate('/inventario')} />
              <BentoCard kicker="05" title="Portafolio" stat={`${selectedPortfolio} / ${portfolio.length} sel.`} icon="image" onClick={() => navigate('/portafolio')} />
              <BentoCard kicker="06" title="Bienestar" stat={`${todayDone}/${tasks.length} hoy`} icon="heart" onClick={() => navigate('/bienestar')} />
            </div>
          </div>

          {/* Daily checklist */}
          <div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
            }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-mute)',
                letterSpacing: 1.5, textTransform: 'uppercase',
              }}>
                Daily checklist · hoy
              </div>
              <button type="button" onClick={() => navigate('/bienestar')} style={{
                border: 'none', background: 'transparent', cursor: 'pointer',
                fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
                color: 'var(--accent)', padding: 0,
              }}>
                Ver todas
              </button>
            </div>
            <Card padding={6}>
              {tasks.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-mute)', fontSize: 13 }}>
                  Sin tareas. Agrega la primera en Bienestar.
                </div>
              ) : (
                tasks.slice(0, 6).map((t, i) => {
                  const done = completions.get(t.id) === true
                  return (
                    <div key={t.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 16px',
                      borderBottom: i < Math.min(5, tasks.length - 1) ? '0.5px solid var(--hairline)' : 'none',
                    }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: 99, flexShrink: 0,
                        background: done ? 'var(--accent)' : 'transparent',
                        border: `1.5px solid ${done ? 'var(--accent)' : 'var(--ink-faint)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {done && <Icon name="check" size={12} color="var(--on-accent)" stroke={3} />}
                      </div>
                      <div style={{
                        flex: 1, fontFamily: 'var(--font-sans)', fontSize: 14,
                        color: done ? 'var(--ink-mute)' : 'var(--ink)',
                        textDecoration: done ? 'line-through' : 'none',
                      }}>
                        {t.text}
                      </div>
                      <Pill>{t.category}</Pill>
                    </div>
                  )
                })
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   MOBILE LAYOUT (sin cambios)
═══════════════════════════════════════ */
function HomeMobile({ navigate, settings, wallets, tasks, completions, hidePrivate, toggleHide, online, total, perWalletNet, currency, todayDone, activeTrip, nextTripCost, nextTripBreakeven, debtsCount, urgentCount, lowItems, selectedPortfolio, portfolio }: HomeProps) {
  return (
    <div>
      <div style={{ padding: '12px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <HorionMark size={26} color="var(--accent)" />
          <HorionWordmark size={14} color="var(--ink)" />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <RoundIcon icon={hidePrivate ? 'eye-off' : 'eye'} onClick={toggleHide} ariaLabel="Mostrar/ocultar montos" />
          <RoundIcon icon="user" onClick={() => navigate('/perfil')} ariaLabel="Perfil" />
        </div>
      </div>

      <div style={{ padding: '14px 20px 4px' }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-mute)',
          letterSpacing: 1, textTransform: 'uppercase',
        }}>
          {format(new Date(), "EEE, d MMM", { locale: es })}
          {settings?.userCity ? ` · ${settings.userCity}` : ''}
        </div>
        <div style={{
          fontFamily: 'var(--font-display)', fontStyle: 'italic',
          fontSize: 36, fontWeight: 400, color: 'var(--ink)',
          letterSpacing: -1, marginTop: 4, lineHeight: 1,
        }}>
          Hola{settings?.userName ? `, ${settings.userName}` : ''}
        </div>
      </div>

      {/* Hero balance */}
      <div style={{ padding: '20px 20px 8px' }}>
        <div style={{
          background: 'var(--ink)', color: 'var(--bg)',
          borderRadius: 28, padding: 24, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -40, right: -40,
            width: 180, height: 180, borderRadius: '50%',
            background: 'var(--accent)', opacity: 0.55, filter: 'blur(40px)',
          }} />
          <div style={{ position: 'relative' }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10,
              letterSpacing: 1.5, opacity: 0.6, textTransform: 'uppercase',
            }}>
              Neto del mes · {wallets.length} categorías
            </div>
            <div style={{
              marginTop: 6, fontFamily: 'var(--font-mono)',
              fontSize: 44, fontWeight: 500, letterSpacing: -1.5,
            }}>
              {homeSignedMoney(total, currency, hidePrivate)}
            </div>
            <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
              {wallets.slice(0, 3).map((w) => (
                <div key={w.id} style={{
                  flex: 1, padding: '10px 12px', borderRadius: 14,
                  background: 'rgba(255,255,255,0.08)',
                  border: '0.5px solid rgba(255,255,255,0.12)',
                }}>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 9,
                    opacity: 0.6, textTransform: 'uppercase', letterSpacing: 1,
                  }}>
                    {w.name}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, marginTop: 3 }}>
                    {homeSignedMoney(perWalletNet[w.id] ?? 0, currency, hidePrivate)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Module grid */}
      <div style={{ padding: '20px 20px 0' }}>
        <SectionTitle kicker="Módulos" title="Todo en un lugar" />
        <div className="horion-bento" style={{ display: 'grid', gap: 10 }}>
          <BentoCard kicker="01 · Finanzas" title="Registro mensual" stat={homeSignedMoney(total, currency, hidePrivate)} icon="wallet" big onClick={() => navigate('/finanzas')} />
          <BentoCard kicker="02 · Próximo viaje" title={activeTrip ? activeTrip.city : 'Sin viaje'} stat={activeTrip ? `${activeTrip.sold}/${activeTrip.target} citas` : 'Crea uno'} icon="plane" onClick={() => navigate(activeTrip ? `/viaje/${activeTrip.id}` : '/viajes')} />
          <BentoCard
            kicker="03 · Deudas"
            title={urgentCount > 0 ? '⚠ Próximas a vencer' : 'Por cobrar / pagar'}
            stat={
              urgentCount > 0
                ? `${urgentCount} ${urgentCount === 1 ? 'urgente' : 'urgentes'}`
                : `${debtsCount} ${debtsCount === 1 ? 'persona' : 'personas'}`
            }
            alert={urgentCount > 0}
            icon="arrow-up"
            onClick={() => navigate('/deudas')}
          />
          <BentoCard kicker="04 · Inventario" title="Material" alert={lowItems.length > 0} stat={lowItems.length > 0 ? `${lowItems.length} bajos` : 'Todo OK'} icon="box" onClick={() => navigate('/inventario')} />
          <BentoCard kicker="05 · Portafolio" title="Book del mes" stat={`${selectedPortfolio} / ${portfolio.length} sel.`} icon="image" onClick={() => navigate('/portafolio')} />
          <BentoCard kicker="06 · Bienestar" title="Ciclo + tareas" stat={`${todayDone}/${tasks.length}`} icon="heart" onClick={() => navigate('/bienestar')} />
        </div>
      </div>

      {/* Active trip */}
      {activeTrip && (
        <div style={{ padding: '24px 20px 0' }}>
          <SectionTitle kicker="Tour activo" title={`${activeTrip.city} · ${activeTrip.when}`} action="Abrir" onAction={() => navigate(`/viaje/${activeTrip.id}`)} />
          <Card padding={16}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: 1 }}>Break-even</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontStyle: 'italic', color: 'var(--ink)', lineHeight: 1, marginTop: 4 }}>
                  {nextTripBreakeven} tatuajes
                </div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-mute)', marginTop: 6 }}>
                  para cubrir {CURRENCY_SYMBOLS[activeTrip.currency]}{new Intl.NumberFormat('es-CO').format(nextTripCost)}
                </div>
              </div>
              <div style={{
                width: 64, height: 64, borderRadius: 14,
                background: 'var(--accent-pale)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '0.5px solid var(--hairline)',
              }}>
                <span style={{ fontSize: 32 }}>{activeTrip.flag}</span>
              </div>
            </div>
            {activeTrip.target > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-mute)' }}>
                    {activeTrip.sold} de {activeTrip.target} confirmados
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)' }}>
                    {Math.round((activeTrip.sold / activeTrip.target) * 100)}%
                  </span>
                </div>
                <Progress value={activeTrip.sold} max={activeTrip.target} height={6} />
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Daily checklist */}
      <div style={{ padding: '24px 20px 0' }}>
        <SectionTitle kicker="Hoy" title="Daily checklist" action="Ver todas" onAction={() => navigate('/bienestar')} />
        <Card padding={6}>
          {tasks.length === 0 ? (
            <div style={{ padding: 18, textAlign: 'center', color: 'var(--ink-mute)', fontSize: 13 }}>
              Sin tareas. Agrega la primera en Bienestar.
            </div>
          ) : (
            tasks.slice(0, 4).map((t, i) => {
              const done = completions.get(t.id) === true
              return (
                <div key={t.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  borderBottom: i < Math.min(3, tasks.length - 1) ? '0.5px solid var(--hairline)' : 'none',
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 99,
                    background: done ? 'var(--accent)' : 'transparent',
                    border: `1.5px solid ${done ? 'var(--accent)' : 'var(--ink-faint)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {done && <Icon name="check" size={12} color="var(--on-accent)" stroke={3} />}
                  </div>
                  <div style={{
                    flex: 1, fontFamily: 'var(--font-sans)', fontSize: 14,
                    color: done ? 'var(--ink-mute)' : 'var(--ink)',
                    textDecoration: done ? 'line-through' : 'none',
                  }}>
                    {t.text}
                  </div>
                  <Pill>{t.category}</Pill>
                </div>
              )
            })
          )}
        </Card>
      </div>

      {/* Offline */}
      {!online && (
        <div style={{ padding: '32px 20px 0' }}>
          <div style={{
            padding: 18, borderRadius: 22,
            background: 'var(--accent)', color: 'var(--on-accent)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', opacity: 0.7 }}>
              Modo offline activo
            </div>
            <div style={{ marginTop: 8, fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22, lineHeight: 1.1 }}>
              Sigue registrando — todo se queda guardado local.
            </div>
            <div style={{ position: 'absolute', right: -8, top: -8, opacity: 0.25 }}>
              <Icon name="wifi-off" size={80} color="var(--on-accent)" stroke={1.2} />
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '24px 20px 0' }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)',
          textAlign: 'center', letterSpacing: 2, textTransform: 'uppercase',
        }}>
          {formatDateLong(todayIso())}
        </div>
      </div>
    </div>
  )
}

/* ─────────── BentoCard (shared) ─────────── */
function BentoCard({
  kicker, title, stat, icon, onClick, alert, big,
}: {
  kicker: string
  title: string
  stat: string
  icon: IconName
  onClick?: () => void
  alert?: boolean
  big?: boolean
}) {
  return (
    <div onClick={onClick} style={{
      gridColumn: big ? 'span 2' : 'auto',
      background: big ? 'var(--accent-pale)' : 'var(--bg-card)',
      borderRadius: 22, padding: 16,
      border: '0.5px solid var(--hairline)',
      cursor: 'pointer',
      minHeight: big ? 96 : 116,
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-mute)',
          letterSpacing: 1, textTransform: 'uppercase',
        }}>
          {kicker}
        </div>
        <div style={{
          width: 28, height: 28, borderRadius: 99,
          background: alert ? 'var(--accent)' : 'transparent',
          border: '0.5px solid var(--hairline)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={icon} size={14} color={alert ? 'var(--on-accent)' : 'var(--ink)'} />
        </div>
      </div>
      <div>
        <div style={{
          fontFamily: 'var(--font-display)', fontStyle: 'italic',
          fontSize: big ? 26 : 20, color: 'var(--ink)', lineHeight: 1, marginBottom: 4,
        }}>
          {title}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: alert ? 'var(--accent)' : 'var(--ink-mute)' }}>
          {stat}
        </div>
      </div>
    </div>
  )
}
