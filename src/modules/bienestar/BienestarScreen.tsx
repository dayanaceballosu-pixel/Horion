import { useEffect, useState } from 'react'
import { addDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, ModuleHeading, Pill, PrimaryButton, SectionTitle } from '@shared/components/primitives'
import { Modal } from '@shared/components/Modal'
import { TextField } from '@shared/components/TextField'
import { Icon } from '@shared/icons/Icon'
import {
  completionsByDateQuery,
  createTask,
  cycleQuery,
  dailyStreak,
  deleteTask,
  getCyclePrediction,
  logPeriod,
  tasksQuery,
  toggleCompletion,
  type CyclePrediction,
} from '@/data/repositories/bienestar'
import { useCollection } from '@shared/hooks/useFirestore'
import type { CycleEntry, Task, TaskCompletion } from '@/data/types'
import { todayIso } from '@shared/utils/format'

export function BienestarScreen() {
  const [tab, setTab] = useState<'cycle' | 'checklist'>('cycle')
  return (
    <div>
      <ModuleHeading kicker="Módulo 06" title="Bienestar" subtitle="Ciclo y rutinas — el cuerpo y la mente al día." />

      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--bg-inset)', borderRadius: 99, width: '100%' }}>
          {[
            { id: 'cycle', l: 'Ciclo' },
            { id: 'checklist', l: 'Daily checklist' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as 'cycle' | 'checklist')}
              style={{
                flex: 1,
                height: 38,
                borderRadius: 99,
                border: 'none',
                cursor: 'pointer',
                background: tab === t.id ? 'var(--bg-card)' : 'transparent',
                color: 'var(--ink)',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: 500,
                boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {tab === 'cycle' ? <CycleTab /> : <ChecklistTab />}
    </div>
  )
}

function CycleTab() {
  const entries = useCollection<CycleEntry>(() => cycleQuery(), [])
  const [cycle, setCycle] = useState<CyclePrediction>({
    avgCycle: 26,
    avgPeriod: 4,
    lastStart: null,
    nextStart: null,
    inDays: null,
    phase: null,
    dayInCycle: null,
    fertileDayNumbers: [],
    periodDayNumbers: [],
  })
  /* Recompute prediction whenever the cycle entries collection updates. */
  useEffect(() => {
    let mounted = true
    void getCyclePrediction().then((c) => {
      if (mounted) setCycle(c)
    })
    return () => {
      mounted = false
    }
  }, [entries.length])
  const [logOpen, setLogOpen] = useState(false)

  const today = new Date()
  const monthLabel = format(today, "MMMM yyyy", { locale: es })
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const startWeekday = (firstOfMonth.getDay() + 6) % 7 /* Monday=0 */
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const todayDay = today.getDate()

  return (
    <>
      <div style={{ padding: '20px 20px 0' }}>
        <div
          style={{
            background: 'var(--accent)',
            color: 'var(--on-accent)',
            borderRadius: 28,
            padding: 24,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              opacity: 0.7,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}
          >
            {cycle.lastStart ? 'Próximo periodo' : 'Aún sin datos'}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 56,
              lineHeight: 1,
              marginTop: 6,
              letterSpacing: -1.5,
            }}
          >
            {cycle.inDays === null ? '—' : cycle.inDays >= 0 ? `${cycle.inDays} días` : `Hace ${-cycle.inDays}d`}
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, opacity: 0.85, marginTop: 6 }}>
            {cycle.nextStart ? `Estimado · ${format(addDays(today, cycle.inDays ?? 0), 'd MMM', { locale: es })}` : 'Registra tu primer periodo'}
          </div>
          <div
            style={{
              marginTop: 18,
              paddingTop: 16,
              borderTop: '0.5px solid rgba(255,255,255,0.2)',
              display: 'flex',
              gap: 16,
            }}
          >
            <Stat label="Fase" value={cycle.phase ?? '—'} />
            <Stat label="Ciclo prom." value={`${cycle.avgCycle} días`} />
            <Stat label="Periodo" value={`${cycle.avgPeriod} días`} />
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        <PrimaryButton icon={<Icon name="droplet" size={16} color="var(--bg)" />} onClick={() => setLogOpen(true)}>
          Registrar inicio de periodo
        </PrimaryButton>
      </div>

      {/* Calendar */}
      <div style={{ padding: '24px 20px 0' }}>
        <SectionTitle kicker={monthLabel} title="Calendario" />
        <Card padding={14}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
              <div
                key={d}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: 'var(--ink-mute)',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                {d}
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {Array.from({ length: startWeekday }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
              const isPeriod = cycle.periodDayNumbers.includes(d)
              const isFertile = cycle.fertileDayNumbers.includes(d) && !isPeriod
              const isToday = d === todayDay
              return (
                <div
                  key={d}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 99,
                    background: isPeriod ? 'var(--accent)' : isFertile ? 'var(--accent-pale)' : 'transparent',
                    color: isPeriod ? 'var(--on-accent)' : 'var(--ink)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    border: isToday ? '1.5px solid var(--ink)' : 'none',
                    fontWeight: isToday ? 600 : 400,
                  }}
                >
                  {d}
                </div>
              )
            })}
          </div>
          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: '0.5px solid var(--hairline)',
              display: 'flex',
              gap: 14,
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--ink-mute)',
            }}
          >
            <Legend color="var(--accent)" label="Periodo" />
            <Legend color="var(--accent-pale)" label="Fértil" />
            <Legend color="transparent" border="var(--ink)" label="Hoy" />
          </div>
        </Card>
      </div>

      {/* History */}
      {entries.length > 0 && (
        <div style={{ padding: '24px 20px 0' }}>
          <SectionTitle kicker="Histórico" title="Periodos registrados" />
          <Card padding={6}>
            {entries.map((e, i) => (
              <div
                key={e.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderBottom: i < entries.length - 1 ? '0.5px solid var(--hairline)' : 'none',
                }}
              >
                <Icon name="droplet" size={16} color="var(--accent)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink)' }}>
                    {format(new Date(e.startDate), "d 'de' MMM yyyy", { locale: es })}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      color: 'var(--ink-mute)',
                      marginTop: 2,
                      textTransform: 'uppercase',
                      letterSpacing: 0.6,
                    }}
                  >
                    {e.periodLength} días
                  </div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      <LogPeriodModal open={logOpen} onClose={() => setLogOpen(false)} />
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          opacity: 0.6,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, marginTop: 2 }}>{value}</div>
    </div>
  )
}

function Legend({ color, label, border }: { color: string; label: string; border?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: 99,
          background: color,
          border: border ? `1.5px solid ${border}` : 'none',
        }}
      />
      {label}
    </div>
  )
}

function LogPeriodModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [date, setDate] = useState(todayIso())
  const [length, setLength] = useState('5')
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setError(null)
    const l = Number(length)
    if (!date) return setError('Selecciona fecha')
    if (!Number.isFinite(l) || l < 1 || l > 14) return setError('Duración entre 1 y 14 días')
    try {
      await logPeriod(date, l)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar periodo"
      footer={<PrimaryButton onClick={handleSave}>Guardar</PrimaryButton>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <TextField label="Primer día" value={date} onChange={setDate} type="date" />
        <TextField label="Duración (días)" value={length} onChange={setLength} type="number" inputMode="numeric" />
        {error && (
          <Pill bg="var(--accent-pale)" color="var(--accent)">
            {error}
          </Pill>
        )}
      </div>
    </Modal>
  )
}

function ChecklistTab() {
  const today = todayIso()
  const tasks = useCollection<Task>(() => tasksQuery(), [])
  const completionsList = useCollection<TaskCompletion>(() => completionsByDateQuery(today), [today])
  const completions = new Map<string, boolean>()
  for (const c of completionsList) completions.set(c.taskId, c.done)
  const [streak, setStreak] = useState(0)
  useEffect(() => {
    let mounted = true
    void dailyStreak().then((s) => {
      if (mounted) setStreak(s)
    })
    return () => {
      mounted = false
    }
  }, [tasks.length, completionsList.length])
  const [newOpen, setNewOpen] = useState(false)

  const doneCount = tasks.filter((t) => completions.get(t.id) === true).length

  return (
    <>
      <div style={{ padding: '20px 20px 0' }}>
        <div
          style={{
            background: 'var(--ink)',
            color: 'var(--bg)',
            borderRadius: 24,
            padding: 20,
            display: 'flex',
            gap: 16,
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 99,
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="flame" size={28} color="var(--on-accent)" />
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                opacity: 0.6,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
              }}
            >
              Racha
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22, marginTop: 2 }}>
              {streak} {streak === 1 ? 'día' : 'días'} seguidos
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, color: 'var(--accent)' }}>
              {doneCount}/{tasks.length}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                opacity: 0.6,
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              Hoy
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 20px 0' }}>
        <SectionTitle
          kicker={format(new Date(), "EEEE d MMM", { locale: es })}
          title="Tareas de hoy"
          action="+ Tarea"
          onAction={() => setNewOpen(true)}
        />
        <Card padding={6}>
          {tasks.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-mute)', fontSize: 13 }}>
              Aún no tienes tareas.
            </div>
          ) : (
            tasks.map((t, i) => {
              const done = completions.get(t.id) === true
              return (
                <div
                  key={t.id}
                  onClick={() => toggleCompletion(t.id, today)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 14,
                    borderBottom: i < tasks.length - 1 ? '0.5px solid var(--hairline)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 99,
                      background: done ? 'var(--accent)' : 'transparent',
                      border: `1.5px solid ${done ? 'var(--accent)' : 'var(--ink-faint)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {done && <Icon name="check" size={12} color="var(--on-accent)" stroke={3} />}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      fontFamily: 'var(--font-sans)',
                      fontSize: 14,
                      color: done ? 'var(--ink-mute)' : 'var(--ink)',
                      textDecoration: done ? 'line-through' : 'none',
                    }}
                  >
                    {t.text}
                  </div>
                  <Pill>{t.category}</Pill>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`¿Eliminar "${t.text}"?`)) deleteTask(t.id)
                    }}
                    aria-label="Eliminar tarea"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}
                  >
                    <Icon name="x" size={12} color="var(--ink-faint)" />
                  </button>
                </div>
              )
            })
          )}
        </Card>
      </div>

      <NewTaskModal open={newOpen} onClose={() => setNewOpen(false)} />
    </>
  )
}

function NewTaskModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [text, setText] = useState('')
  const [category, setCategory] = useState('General')
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setError(null)
    if (!text.trim()) return setError('Escribe la tarea')
    try {
      await createTask({ text, category, recurrence: 'daily' })
      setText('')
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva tarea" footer={<PrimaryButton onClick={handleSave}>Crear</PrimaryButton>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <TextField label="Tarea" value={text} onChange={setText} placeholder="Ej: Estudiar polaco — 30 min" />
        <TextField label="Categoría" value={category} onChange={setCategory} placeholder="Ej: Idioma, Tattoo, Redes" />
        {error && (
          <Pill bg="var(--accent-pale)" color="var(--accent)">
            {error}
          </Pill>
        )}
      </div>
    </Modal>
  )
}
