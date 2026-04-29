import { useState } from 'react'
import { useLocation } from 'wouter'
import { Card, ModuleHeading, Pill, PrimaryButton, Progress, SectionTitle } from '@shared/components/primitives'
import { Modal } from '@shared/components/Modal'
import { TextField, SelectField } from '@shared/components/TextField'
import {
  createTrip,
  tripBreakeven,
  tripsQuery,
  tripTotalCost,
} from '@/data/repositories/trips'
import { useCollection, useDoc } from '@shared/hooks/useFirestore'
import { settingsRef } from '@/data/repositories/settings'
import type { Settings, Trip, TripStatus } from '@/data/types'

const STATUS_LABEL: Record<TripStatus, string> = {
  active: 'En curso',
  planning: 'Planeando',
  idea: 'Idea',
  archived: 'Archivado',
}

export function ViajesScreen() {
  const [, navigate] = useLocation()
  const trips = useCollection<Trip>(() => tripsQuery(), [])
  const [newOpen, setNewOpen] = useState(false)

  const totalCities = trips.length
  const totalTarget = trips.reduce((s, t) => s + t.target, 0)
  const yearLabel = new Date().getFullYear()

  return (
    <div>
      <ModuleHeading
        kicker="Módulo 03"
        title="Tour Europa"
        subtitle="Cada ciudad es un proyecto. Cada cita, una línea."
      />

      <div style={{ padding: '20px 20px 0' }}>
        <div
          style={{
            background: 'var(--accent)',
            color: 'var(--on-accent)',
            borderRadius: 24,
            padding: 20,
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
            {yearLabel} · Itinerario
          </div>
          <div
            style={{
              marginTop: 8,
              display: 'flex',
              alignItems: 'baseline',
              gap: 18,
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
            }}
          >
            <span style={{ fontSize: 36, lineHeight: 1 }}>{totalCities}</span>
            <span style={{ fontSize: 14, opacity: 0.8 }}>ciudades</span>
            <span style={{ fontSize: 36, lineHeight: 1 }}>{totalTarget}</span>
            <span style={{ fontSize: 14, opacity: 0.8 }}>citas meta</span>
          </div>
          <div
            style={{
              position: 'absolute',
              right: -20,
              top: 16,
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 90,
              opacity: 0.18,
              lineHeight: 1,
            }}
          >
            EU
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 20px 0' }}>
        <SectionTitle kicker="Proyectos de viaje" title="Guest spots" action="+ Nuevo" onAction={() => setNewOpen(true)} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {trips.length === 0 ? (
            <Card padding={24}>
              <div style={{ textAlign: 'center', color: 'var(--ink-mute)', fontSize: 13 }}>
                Aún no tienes viajes registrados.
              </div>
            </Card>
          ) : (
            trips.map((t) => {
              const total = tripTotalCost(t.cost)
              const breakeven = tripBreakeven(t.cost, t.avgPrice)
              return (
                <Card key={t.id} padding={0} onClick={() => navigate(`/viaje/${t.id}`)}>
                  <div style={{ padding: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: 14,
                            background: 'var(--bg-inset)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 28,
                          }}
                        >
                          {t.flag}
                        </div>
                        <div>
                          <div
                            style={{
                              fontFamily: 'var(--font-display)',
                              fontStyle: 'italic',
                              fontSize: 24,
                              color: 'var(--ink)',
                              lineHeight: 1,
                            }}
                          >
                            {t.city}
                          </div>
                          <div
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 10,
                              color: 'var(--ink-mute)',
                              marginTop: 4,
                              textTransform: 'uppercase',
                              letterSpacing: 1,
                            }}
                          >
                            {t.country} · {t.when}
                          </div>
                        </div>
                      </div>
                      <Pill
                        bg={
                          t.status === 'active'
                            ? 'var(--accent)'
                            : t.status === 'planning'
                            ? 'var(--ink)'
                            : 'transparent'
                        }
                        color={t.status === 'idea' || t.status === 'archived' ? 'var(--ink)' : '#FFF'}
                      >
                        {STATUS_LABEL[t.status]}
                      </Pill>
                    </div>
                  </div>
                  <div style={{ borderTop: '0.5px solid var(--hairline)', padding: 14, display: 'flex' }}>
                    <MiniStat label="Costo" value={`${currencySym(t.currency)}${new Intl.NumberFormat('es-CO').format(total)}`} />
                    <Divider />
                    <MiniStat label="Break-even" value={`${breakeven} tat`} accent />
                    <Divider />
                    <MiniStat label="Confirmados" value={`${t.sold}/${t.target}`} />
                  </div>
                  {t.target > 0 && t.status !== 'idea' && (
                    <div style={{ padding: '0 14px 14px' }}>
                      <Progress value={t.sold} max={t.target} height={4} />
                    </div>
                  )}
                </Card>
              )
            })
          )}
        </div>
      </div>

      <NewTripModal open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  )
}

function currencySym(c: 'COP' | 'EUR' | 'USD' | 'PLN'): string {
  return ({ COP: '$', EUR: '€', USD: 'US$', PLN: 'zł' } as const)[c] ?? '$'
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ flex: 1, padding: '4px 8px' }}>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--ink-mute)',
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 14,
          color: accent ? 'var(--accent)' : 'var(--ink)',
          marginTop: 2,
        }}
      >
        {value}
      </div>
    </div>
  )
}

function Divider() {
  return <div style={{ width: 0.5, alignSelf: 'stretch', background: 'var(--hairline)' }} />
}

function NewTripModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useDoc<Settings>(() => settingsRef(), [])
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [flag, setFlag] = useState('🌍')
  const [when, setWhen] = useState('')
  const [avg, setAvg] = useState('200')
  const [target, setTarget] = useState('10')
  const [status, setStatus] = useState<TripStatus>('planning')
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setError(null)
    if (!city.trim() || !country.trim()) return setError('Ciudad y país son requeridos')
    const a = Number(avg)
    const t = Number(target)
    if (!Number.isFinite(a) || a <= 0) return setError('Precio promedio inválido')
    if (!Number.isFinite(t) || t < 0) return setError('Meta inválida')
    try {
      await createTrip({
        city,
        country,
        flag: flag || '🌍',
        when: when || 'Pendiente',
        avgPrice: a,
        target: t,
        status,
        currency: settings?.defaultCurrency ?? 'COP',
      })
      setCity('')
      setCountry('')
      setFlag('🌍')
      setWhen('')
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo viaje"
      footer={<PrimaryButton onClick={handleSave}>Crear viaje</PrimaryButton>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <TextField label="Ciudad" value={city} onChange={setCity} placeholder="Ej: Berlín" />
        <TextField label="País" value={country} onChange={setCountry} placeholder="Ej: Alemania" />
        <TextField label="Bandera (emoji)" value={flag} onChange={setFlag} placeholder="🇩🇪" />
        <TextField label="Fechas" value={when} onChange={setWhen} placeholder="Ej: 12 — 22 may" />
        <TextField label="Precio promedio por tatuaje" value={avg} onChange={setAvg} inputMode="decimal" />
        <TextField label="Citas meta" value={target} onChange={setTarget} type="number" inputMode="numeric" />
        <SelectField
          label="Estado"
          value={status}
          onChange={(v) => setStatus(v as TripStatus)}
          options={[
            { value: 'idea', label: 'Idea' },
            { value: 'planning', label: 'Planeando' },
            { value: 'active', label: 'En curso' },
          ]}
        />
        {error && (
          <Pill bg="var(--accent-pale)" color="var(--accent)">
            {error}
          </Pill>
        )}
      </div>
    </Modal>
  )
}
