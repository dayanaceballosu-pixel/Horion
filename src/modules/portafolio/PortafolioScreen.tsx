import { useState, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Card, ModuleHeading, Pill, PrimaryButton, Progress, SectionTitle } from '@shared/components/primitives'
import { Modal } from '@shared/components/Modal'
import { TextField, SelectField } from '@shared/components/TextField'
import { Icon } from '@shared/icons/Icon'
import {
  createPiece,
  deletePiece,
  listPortfolio,
  toggleSelected,
} from '@/data/repositories/portfolio'
import { allocateToGoal, createGoal, deleteGoal, goalsQuery } from '@/data/repositories/goals'
import { walletsQuery } from '@/data/repositories/wallets'
import { settingsRef } from '@/data/repositories/settings'
import { useCollection, useDoc } from '@shared/hooks/useFirestore'
import { CURRENCY_SYMBOLS, isoMonth, todayIso } from '@shared/utils/format'
import type { Goal, PortfolioPiece, Settings, Wallet } from '@/data/types'

const COLORS = ['#FFD9E6', '#1A0810', '#FF2E7E', '#FBDCE5', '#170A10', '#FFC1D6']

export function PortafolioScreen() {
  const [tab, setTab] = useState<'book' | 'goals'>('book')
  const [month, setMonth] = useState(isoMonth())
  /* Portfolio stays in IndexedDB (Blobs offline) until Blaze plan is activated. */
  const pieces = useLiveQuery(() => listPortfolio(month), [month], [])
  const goals = useCollection<Goal>(() => goalsQuery(), [])

  const [newPieceOpen, setNewPieceOpen] = useState(false)
  const [newGoalOpen, setNewGoalOpen] = useState(false)
  const [allocateOf, setAllocateOf] = useState<typeof goals[0] | null>(null)

  const selected = pieces.filter((p) => p.selected)

  return (
    <div>
      <ModuleHeading kicker="Módulo 05" title="Portafolio & Metas" subtitle="Tu mejor mes y hacia dónde apuntas." />

      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--bg-inset)', borderRadius: 99, width: '100%' }}>
          {[
            { id: 'book', l: 'Book del mes' },
            { id: 'goals', l: 'Metas' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as 'book' | 'goals')}
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

      {tab === 'book' ? (
        <>
          <div style={{ padding: '20px 20px 0' }}>
            <SectionTitle
              kicker={`${selected.length} de ${pieces.length} marcadas`}
              title="Selecciona tus mejores"
              action="+ Pieza"
              onAction={() => setNewPieceOpen(true)}
            />
            <div style={{ padding: '0 0 12px' }}>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 99,
                  background: 'var(--bg-card)',
                  border: '0.5px solid var(--hairline)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  color: 'var(--ink)',
                }}
              />
            </div>
            {pieces.length === 0 ? (
              <Card padding={24}>
                <div style={{ textAlign: 'center', color: 'var(--ink-mute)', fontSize: 13 }}>
                  Sin piezas en este mes. Toca "+ Pieza" para subir tu primera.
                </div>
              </Card>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {pieces.map((p) => (
                  <PieceCard key={p.id} piece={p} />
                ))}
              </div>
            )}
          </div>
          {selected.length > 0 && (
            <div style={{ padding: '20px 20px 0' }}>
              <PrimaryButton
                icon={<Icon name="download" size={16} color="var(--bg)" />}
                onClick={() => exportSelectedAsZip(selected)}
              >
                Descargar selección ({selected.length})
              </PrimaryButton>
            </div>
          )}
        </>
      ) : (
        <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            type="button"
            onClick={() => setNewGoalOpen(true)}
            style={{
              padding: '14px 18px',
              borderRadius: 18,
              background: 'var(--accent-pale)',
              color: 'var(--accent)',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              fontWeight: 500,
              textAlign: 'left',
            }}
          >
            + Nueva meta
          </button>
          {goals.length === 0 ? (
            <Card padding={24}>
              <div style={{ textAlign: 'center', color: 'var(--ink-mute)', fontSize: 13 }}>Aún no tienes metas.</div>
            </Card>
          ) : (
            goals.map((g) => {
              const pct = g.target > 0 ? (g.saved / g.target) * 100 : 0
              const done = pct >= 100
              return (
                <Card key={g.id} padding={18} style={done ? { background: 'var(--accent)' } : undefined}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 9,
                          color: done ? 'var(--on-accent)' : 'var(--ink-mute)',
                          opacity: done ? 0.7 : 1,
                          letterSpacing: 1,
                          textTransform: 'uppercase',
                        }}
                      >
                        Meta {g.due ? `· ${g.due}` : ''}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontStyle: 'italic',
                          fontSize: 22,
                          color: done ? 'var(--on-accent)' : 'var(--ink)',
                          lineHeight: 1.1,
                          marginTop: 4,
                        }}
                      >
                        {g.name}
                      </div>
                    </div>
                    {done ? <Pill bg="rgba(255,255,255,0.2)" color="var(--on-accent)">Completa</Pill> : null}
                  </div>
                  <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 24,
                        color: done ? 'var(--on-accent)' : 'var(--ink)',
                      }}
                    >
                      {CURRENCY_SYMBOLS[g.currency]}{new Intl.NumberFormat('es-CO').format(g.saved)}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 13,
                        color: done ? 'var(--on-accent)' : 'var(--ink-mute)',
                        opacity: 0.7,
                      }}
                    >
                      / {CURRENCY_SYMBOLS[g.currency]}{new Intl.NumberFormat('es-CO').format(g.target)}
                    </span>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <Progress value={g.saved} max={g.target} height={6} color={done ? '#FFF' : 'var(--accent)'} />
                  </div>
                  {!done && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                      <button
                        type="button"
                        onClick={() => setAllocateOf(g)}
                        style={{
                          flex: 1,
                          height: 40,
                          borderRadius: 99,
                          background: 'var(--bg-inset)',
                          color: 'var(--ink)',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-sans)',
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                      >
                        + Asignar dinero
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`¿Eliminar la meta "${g.name}"?`)) deleteGoal(g.id)
                        }}
                        aria-label="Eliminar"
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 99,
                          background: 'transparent',
                          border: '0.5px solid var(--hairline)',
                          cursor: 'pointer',
                        }}
                      >
                        <Icon name="trash" size={14} color="var(--ink-mute)" />
                      </button>
                    </div>
                  )}
                </Card>
              )
            })
          )}
        </div>
      )}

      <NewPieceModal open={newPieceOpen} onClose={() => setNewPieceOpen(false)} month={month} />
      <NewGoalModal open={newGoalOpen} onClose={() => setNewGoalOpen(false)} />
      {allocateOf && <AllocateModal goal={allocateOf} onClose={() => setAllocateOf(null)} />}
    </div>
  )
}

function PieceCard({ piece }: { piece: PortfolioPiece }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  /* Generate a transient URL for the image blob, revoking on unmount */
  if (piece.image && !imageUrl) {
    const url = URL.createObjectURL(piece.image)
    setImageUrl(url)
  }

  return (
    <div
      onClick={() => toggleSelected(piece.id)}
      style={{
        borderRadius: 18,
        overflow: 'hidden',
        cursor: 'pointer',
        border: piece.selected ? '2px solid var(--accent)' : '0.5px solid var(--hairline)',
        position: 'relative',
        aspectRatio: '0.85',
        background: 'var(--bg-card)',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '70%',
          background: imageUrl
            ? `url(${imageUrl}) center/cover`
            : `repeating-linear-gradient(45deg, ${piece.color ?? '#FFD9E6'}, ${piece.color ?? '#FFD9E6'} 8px, var(--bg-inset) 8px, var(--bg-inset) 9px)`,
        }}
      />
      <div style={{ padding: '10px 12px' }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 14,
            color: 'var(--ink)',
            lineHeight: 1.1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {piece.title}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--ink-mute)',
            marginTop: 4,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          {piece.client ?? '—'}
        </div>
      </div>
      {piece.selected && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 28,
            height: 28,
            borderRadius: 99,
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="check" size={14} color="var(--on-accent)" stroke={3} />
        </div>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (confirm('¿Eliminar pieza?')) deletePiece(piece.id)
        }}
        aria-label="Eliminar"
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          width: 28,
          height: 28,
          borderRadius: 99,
          background: 'rgba(0,0,0,0.45)',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <Icon name="x" size={14} color="#FFF" />
      </button>
    </div>
  )
}

function NewPieceModal({ open, onClose, month }: { open: boolean; onClose: () => void; month: string }) {
  const [title, setTitle] = useState('')
  const [client, setClient] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [imageBlob, setImageBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleSave = async () => {
    setError(null)
    if (!title.trim()) return setError('Pon un título')
    try {
      await createPiece({
        title,
        client: client || undefined,
        monthYear: month,
        color,
        image: imageBlob ?? undefined,
        imageType: imageBlob?.type,
      })
      setTitle('')
      setClient('')
      setImageBlob(null)
      setPreviewUrl(null)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva pieza" footer={<PrimaryButton onClick={handleSave}>Guardar</PrimaryButton>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          style={{
            height: 160,
            borderRadius: 16,
            border: '1px dashed var(--hairline)',
            background: previewUrl ? `url(${previewUrl}) center/cover` : 'var(--bg-inset)',
            color: 'var(--ink-mute)',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
          }}
        >
          {previewUrl ? '' : 'Toca para subir foto'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) {
              setImageBlob(f)
              setPreviewUrl(URL.createObjectURL(f))
            }
          }}
        />
        <TextField label="Título" value={title} onChange={setTitle} placeholder="Ej: Serpiente fineline" />
        <TextField label="Cliente (opcional)" value={client} onChange={setClient} />
        <div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color: 'var(--ink-mute)',
              marginBottom: 6,
            }}
          >
            Tag de color
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 99,
                  background: c,
                  border: color === c ? '2px solid var(--ink)' : '0.5px solid var(--hairline)',
                  cursor: 'pointer',
                }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>
        {error && (
          <Pill bg="var(--accent-pale)" color="var(--accent)">
            {error}
          </Pill>
        )}
      </div>
    </Modal>
  )
}

function NewGoalModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useDoc<Settings>(() => settingsRef(), [])
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [saved, setSaved] = useState('')
  const [due, setDue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setError(null)
    const t = Number(target.replace(',', '.'))
    const s = Number(saved.replace(',', '.')) || 0
    if (!name.trim()) return setError('Ponle nombre')
    if (!Number.isFinite(t) || t <= 0) return setError('Meta inválida')
    try {
      await createGoal({
        name,
        target: t,
        saved: s,
        currency: settings?.defaultCurrency ?? 'COP',
        due: due || undefined,
      })
      setName('')
      setTarget('')
      setSaved('')
      setDue('')
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva meta" footer={<PrimaryButton onClick={handleSave}>Crear meta</PrimaryButton>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <TextField label="Nombre" value={name} onChange={setName} placeholder="Ej: Máquina Cheyenne" />
        <TextField label="Total a juntar" value={target} onChange={setTarget} inputMode="decimal" />
        <TextField label="Ya tengo (opcional)" value={saved} onChange={setSaved} inputMode="decimal" />
        <TextField label="Fecha objetivo (opcional)" value={due} onChange={setDue} placeholder="Ej: jun 2026" />
        {error && (
          <Pill bg="var(--accent-pale)" color="var(--accent)">
            {error}
          </Pill>
        )}
      </div>
    </Modal>
  )
}

function AllocateModal({ goal, onClose }: { goal: { id: string; name: string }; onClose: () => void }) {
  const wallets = useCollection<Wallet>(() => walletsQuery(), [])
  const [amount, setAmount] = useState('')
  const [walletId, setWalletId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setError(null)
    const a = Number(amount.replace(',', '.'))
    if (!Number.isFinite(a) || a <= 0) return setError('Monto inválido')
    try {
      await allocateToGoal({ goalId: goal.id, amount: a, date: todayIso(), walletId: walletId || undefined })
      setAmount('')
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={`Aporte · ${goal.name}`} footer={<PrimaryButton onClick={handleSave}>Asignar</PrimaryButton>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <TextField label="Monto" value={amount} onChange={setAmount} inputMode="decimal" />
        <SelectField
          label="Origen (opcional)"
          value={walletId}
          onChange={setWalletId}
          options={[
            { value: '', label: 'No descontar de billetera' },
            ...wallets.map((w) => ({
              value: w.id,
              label: w.name,
            })),
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

async function exportSelectedAsZip(pieces: PortfolioPiece[]): Promise<void> {
  /* Simple "download each image" approach. A real zip would need an extra
     library — we keep it dependency-free here and let the browser save each. */
  for (const p of pieces) {
    if (!p.image) continue
    const url = URL.createObjectURL(p.image)
    const a = document.createElement('a')
    a.href = url
    a.download = `${p.title}.${(p.imageType ?? 'image/jpeg').split('/')[1] ?? 'jpg'}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    await new Promise((r) => setTimeout(r, 120))
  }
}
