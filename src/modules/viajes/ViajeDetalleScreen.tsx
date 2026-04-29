import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'wouter'
import { BackBar, Card, Pill, PrimaryButton, SectionTitle } from '@shared/components/primitives'
import { Modal } from '@shared/components/Modal'
import { TextField, SelectField } from '@shared/components/TextField'
import { Icon } from '@shared/icons/Icon'
import {
  createStudio,
  deleteStudio,
  deleteTrip,
  incrementSold,
  studiosQuery,
  tripBreakeven,
  tripProfitAtTarget,
  tripTotalCost,
  updateStudio,
  updateTrip,
} from '@/data/repositories/trips'
import { useCollection, useDoc } from '@shared/hooks/useFirestore'
import { userSubDoc } from '@/data/firebase'
import { useAuthStore } from '@/data/auth'
import { CURRENCY_SYMBOLS } from '@shared/utils/format'
import type { Studio, StudioStatus, Trip, TripCost } from '@/data/types'

const COST_LABELS: Record<keyof TripCost, string> = {
  flight: 'Pasajes',
  stay: 'Estadía',
  food: 'Comida',
  transport: 'Transporte local',
  materials: 'Materiales',
  other: 'Otros',
}
const COST_ICONS: Record<keyof TripCost, 'plane' | 'pin' | 'sparkle' | 'arrow-right' | 'box' | 'dots'> = {
  flight: 'plane',
  stay: 'pin',
  food: 'sparkle',
  transport: 'arrow-right',
  materials: 'box',
  other: 'dots',
}

const STUDIO_META: Record<StudioStatus, { label: string; bg: string; fg: string }> = {
  confirmed: { label: 'Confirmado', bg: 'var(--accent)', fg: '#FFF' },
  contacted: { label: 'Contactado', bg: 'var(--bg-inset)', fg: 'var(--ink)' },
  pending: { label: 'Por contactar', bg: 'transparent', fg: 'var(--ink-mute)' },
}

export function ViajeDetalleScreen() {
  const params = useParams<{ id: string }>()
  const [, navigate] = useLocation()
  const uid = useAuthStore((s) => s.user?.uid)
  const trip = useDoc<Trip>(
    () => (uid && params.id ? userSubDoc(uid, 'trips', params.id) : null),
    [uid, params.id]
  )
  const studios = useCollection<Studio>(
    () => (params.id ? studiosQuery(params.id) : null),
    [params.id]
  )
  const [avgPrice, setAvgPrice] = useState(0)
  const [editCost, setEditCost] = useState(false)
  const [newStudio, setNewStudio] = useState(false)

  useEffect(() => {
    if (trip) setAvgPrice(trip.avgPrice)
  }, [trip])

  if (!trip) {
    return (
      <div>
        <BackBar label="Viajes" onBack={() => navigate('/viajes')} />
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-mute)' }}>Viaje no encontrado</div>
      </div>
    )
  }

  const totalCost = tripTotalCost(trip.cost)
  const breakeven = tripBreakeven(trip.cost, avgPrice)
  const profit = tripProfitAtTarget(trip.cost, avgPrice, trip.target)
  const remaining = Math.max(0, breakeven - trip.sold)
  const sym = CURRENCY_SYMBOLS[trip.currency]
  const fmt = (n: number) => `${sym}${new Intl.NumberFormat('es-CO').format(Math.abs(n))}`

  const handleAvgChange = (v: number) => {
    setAvgPrice(v)
    /* persist after a beat — trivial debounce via animation frame */
    requestAnimationFrame(() => {
      updateTrip(trip.id, { avgPrice: v })
    })
  }

  return (
    <div>
      <BackBar label="Tour Europa" onBack={() => navigate('/viajes')} />
      <div style={{ padding: '8px 20px 0', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background: 'var(--bg-inset)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 36,
          }}
        >
          {trip.flag}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--accent)',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}
          >
            Guest Spot
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 40,
              color: 'var(--ink)',
              letterSpacing: -1,
              lineHeight: 1,
              marginTop: 2,
            }}
          >
            {trip.city}
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-mute)', marginTop: 4 }}>
            {trip.country} · {trip.when}
          </div>
        </div>
      </div>

      {/* Calculadora */}
      <div style={{ padding: '24px 20px 0' }}>
        <SectionTitle kicker="Rentabilidad" title="¿Cuántos tatuajes necesito?" />
        <div
          style={{
            background: 'var(--ink)',
            color: 'var(--bg)',
            borderRadius: 26,
            padding: 22,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              opacity: 0.6,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}
          >
            Break-even
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 64,
                fontWeight: 500,
                letterSpacing: -2,
                lineHeight: 1,
                color: 'var(--accent)',
              }}
            >
              {breakeven}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22 }}>tatuajes</div>
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, opacity: 0.7, marginTop: 8 }}>
            para cubrir {fmt(totalCost)} de costos.
          </div>
          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  opacity: 0.6,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                }}
              >
                Precio promedio
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--accent)' }}>{fmt(avgPrice)}</span>
            </div>
            <input
              type="range"
              min={trip.currency === 'COP' ? 20_000 : 20}
              max={trip.currency === 'COP' ? 2_000_000 : 1500}
              step={trip.currency === 'COP' ? 5_000 : 10}
              value={avgPrice}
              onChange={(e) => handleAvgChange(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
          </div>

          <div
            style={{
              marginTop: 18,
              paddingTop: 16,
              borderTop: '0.5px solid rgba(255,255,255,0.15)',
              display: 'flex',
              gap: 16,
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  opacity: 0.5,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                }}
              >
                Si vendo {trip.target}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 18,
                  marginTop: 2,
                  color: profit > 0 ? 'var(--accent)' : 'var(--bg)',
                }}
              >
                {profit > 0 ? '+' : '−'}{fmt(profit)} {profit > 0 ? 'ganancia' : 'pérdida'}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  opacity: 0.5,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                }}
              >
                Faltan
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, marginTop: 2 }}>{remaining} para cubrir</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sold tracker */}
      <div style={{ padding: '20px 20px 0' }}>
        <Card padding={16}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--ink-mute)',
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                }}
              >
                Citas confirmadas
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 28, lineHeight: 1, marginTop: 4 }}>
                {trip.sold} / {trip.target}
              </div>
            </div>
            <button
              type="button"
              onClick={() => incrementSold(trip.id, -1)}
              disabled={trip.sold === 0}
              style={{
                width: 44,
                height: 44,
                borderRadius: 99,
                background: 'var(--bg-inset)',
                border: 'none',
                cursor: trip.sold === 0 ? 'not-allowed' : 'pointer',
                opacity: trip.sold === 0 ? 0.3 : 1,
              }}
              aria-label="Quitar cita"
            >
              <Icon name="arrow-down" size={16} color="var(--ink)" />
            </button>
            <button
              type="button"
              onClick={() => incrementSold(trip.id, 1)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 99,
                background: 'var(--accent)',
                border: 'none',
                cursor: 'pointer',
              }}
              aria-label="Sumar cita"
            >
              <Icon name="plus" size={16} color="var(--on-accent)" />
            </button>
          </div>
        </Card>
      </div>

      {/* Costs */}
      <div style={{ padding: '24px 20px 0' }}>
        <SectionTitle kicker="Desglose" title="Costos del viaje" action="Editar" onAction={() => setEditCost(true)} />
        <Card padding={6}>
          {(Object.keys(COST_LABELS) as Array<keyof TripCost>).map((k, i, arr) => (
            <div
              key={k}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderBottom: i < arr.length - 1 ? '0.5px solid var(--hairline)' : 'none',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: 'var(--bg-inset)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={COST_ICONS[k]} size={14} color="var(--ink)" />
              </div>
              <div style={{ flex: 1, fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink)' }}>
                {COST_LABELS[k]}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)' }}>{fmt(trip.cost[k])}</div>
            </div>
          ))}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 14,
              background: 'var(--bg-inset)',
              borderRadius: 16,
              margin: 4,
            }}
          >
            <div style={{ flex: 1, fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18 }}>Total</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20 }}>{fmt(totalCost)}</div>
          </div>
        </Card>
      </div>

      {/* Studios */}
      <div style={{ padding: '24px 20px 0' }}>
        <SectionTitle kicker="CRM Estudios" title={`${studios.length} en agenda`} action="+ Estudio" onAction={() => setNewStudio(true)} />
        <Card padding={6}>
          {studios.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-mute)' }}>
              Aún no hay estudios contactados.
            </div>
          ) : (
            studios.map((s, i) => {
              const meta = STUDIO_META[s.status]
              const next: StudioStatus = s.status === 'pending' ? 'contacted' : s.status === 'contacted' ? 'confirmed' : 'pending'
              return (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 14,
                    borderBottom: i < studios.length - 1 ? '0.5px solid var(--hairline)' : 'none',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => updateStudio(s.id, { status: next })}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 99,
                      background: s.status === 'confirmed' ? 'var(--accent)' : 'transparent',
                      border: `1.5px solid ${s.status === 'confirmed' ? 'var(--accent)' : 'var(--ink-faint)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    aria-label="Cambiar estado"
                  >
                    {s.status === 'confirmed' && <Icon name="check" size={12} color="var(--on-accent)" stroke={3} />}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink)' }}>{s.name}</div>
                    {(s.contact || s.instagram) && (
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
                        {s.instagram ? `@${s.instagram.replace(/^@/, '')}` : s.contact}
                      </div>
                    )}
                  </div>
                  <Pill bg={meta.bg} color={meta.fg}>{meta.label}</Pill>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`¿Eliminar estudio "${s.name}"?`)) deleteStudio(s.id)
                    }}
                    aria-label="Eliminar"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}
                  >
                    <Icon name="x" size={14} color="var(--ink-faint)" />
                  </button>
                </div>
              )
            })
          )}
        </Card>
      </div>

      {/* Danger zone */}
      <div style={{ padding: '24px 20px 0' }}>
        <button
          type="button"
          onClick={() => {
            if (confirm(`¿Eliminar el viaje a ${trip.city}? Se borran también sus estudios.`)) {
              deleteTrip(trip.id).then(() => navigate('/viajes'))
            }
          }}
          style={{
            width: '100%',
            height: 44,
            borderRadius: 99,
            background: 'transparent',
            color: 'var(--accent)',
            border: '0.5px solid var(--accent)',
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Eliminar viaje
        </button>
      </div>

      <EditCostModal
        open={editCost}
        onClose={() => setEditCost(false)}
        cost={trip.cost}
        onSave={(c) => updateTrip(trip.id, { cost: c })}
        prefix={sym}
      />
      <NewStudioModal open={newStudio} onClose={() => setNewStudio(false)} tripId={trip.id} />
    </div>
  )
}

function EditCostModal({
  open,
  onClose,
  cost,
  onSave,
  prefix,
}: {
  open: boolean
  onClose: () => void
  cost: TripCost
  onSave: (c: TripCost) => void
  prefix: string
}) {
  const [draft, setDraft] = useState<TripCost>(cost)
  useEffect(() => setDraft(cost), [cost, open])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar costos"
      footer={
        <PrimaryButton
          onClick={() => {
            onSave(draft)
            onClose()
          }}
        >
          Guardar
        </PrimaryButton>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {(Object.keys(COST_LABELS) as Array<keyof TripCost>).map((k) => (
          <TextField
            key={k}
            label={COST_LABELS[k]}
            value={String(draft[k])}
            onChange={(v) => {
              const n = Number(v.replace(',', '.'))
              setDraft((d) => ({ ...d, [k]: Number.isFinite(n) ? Math.max(0, n) : 0 }))
            }}
            inputMode="decimal"
            prefix={prefix}
          />
        ))}
      </div>
    </Modal>
  )
}

function NewStudioModal({ open, onClose, tripId }: { open: boolean; onClose: () => void; tripId: string }) {
  const [name, setName] = useState('')
  const [status, setStatus] = useState<StudioStatus>('pending')
  const [instagram, setInstagram] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setError(null)
    if (!name.trim()) return setError('Ingresa el nombre del estudio')
    try {
      await createStudio({ tripId, name, status, instagram: instagram || undefined, email: email || undefined })
      setName('')
      setInstagram('')
      setEmail('')
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo estudio" footer={<PrimaryButton onClick={handleSave}>Guardar</PrimaryButton>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <TextField label="Nombre" value={name} onChange={setName} placeholder="Ej: La Mujer Barbuda" />
        <SelectField
          label="Estado"
          value={status}
          onChange={(v) => setStatus(v as StudioStatus)}
          options={[
            { value: 'pending', label: 'Por contactar' },
            { value: 'contacted', label: 'Contactado' },
            { value: 'confirmed', label: 'Confirmado' },
          ]}
        />
        <TextField label="Instagram (opcional)" value={instagram} onChange={setInstagram} placeholder="@estudio" />
        <TextField label="Email (opcional)" value={email} onChange={setEmail} type="email" />
        {error && (
          <Pill bg="var(--accent-pale)" color="var(--accent)">
            {error}
          </Pill>
        )}
      </div>
    </Modal>
  )
}
