import { useState } from 'react'
import { Card, ModuleHeading, Pill, PrimaryButton, Progress } from '@shared/components/primitives'
import { Modal } from '@shared/components/Modal'
import { TextField, SelectField } from '@shared/components/TextField'
import { Icon } from '@shared/icons/Icon'
import {
  createItem,
  deleteItem,
  inventoryQuery,
  isLow,
  recordMovement,
  updateItem,
} from '@/data/repositories/inventory'
import { useCollection } from '@shared/hooks/useFirestore'
import type { InventoryItem } from '@/data/types'

const DEFAULT_CATEGORIES = ['Agujas', 'Tinta', 'Higiene', 'Papel', 'Otro']

export function InventarioScreen() {
  const items = useCollection<InventoryItem>(() => inventoryQuery(), [])
  const [filter, setFilter] = useState<string>('all')
  const [newOpen, setNewOpen] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | null>(null)

  const allCats = ['all', ...Array.from(new Set([...DEFAULT_CATEGORIES, ...items.map((i) => i.category)]))]
  const filtered = filter === 'all' ? items : items.filter((i) => i.category === filter)
  const lowCount = items.filter(isLow).length

  return (
    <div>
      <ModuleHeading
        kicker="Módulo 04"
        title="Inventario"
        subtitle="Material técnico — antes de salir de viaje."
      />

      {lowCount > 0 && (
        <div style={{ padding: '20px 20px 0' }}>
          <button
            type="button"
            onClick={() => setFilter('all')}
            style={{
              width: '100%',
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              borderRadius: 22,
              padding: 18,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              textAlign: 'left',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 99,
                background: 'rgba(255,255,255,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="bell" size={20} color="var(--on-accent)" />
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  opacity: 0.7,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                }}
              >
                Reabastecer
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 20, lineHeight: 1.1, marginTop: 2 }}>
                {lowCount} insumos en bajo stock
              </div>
            </div>
            <Icon name="chevron-right" size={20} color="var(--on-accent)" />
          </button>
        </div>
      )}

      <div style={{ padding: '20px 20px 0', display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12 }}>
        {allCats.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            style={{
              whiteSpace: 'nowrap',
              padding: '8px 14px',
              borderRadius: 99,
              background: filter === c ? 'var(--ink)' : 'var(--bg-card)',
              color: filter === c ? 'var(--bg)' : 'var(--ink)',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: 500,
              border: filter === c ? 'none' : '0.5px solid var(--hairline)',
              cursor: 'pointer',
            }}
          >
            {c === 'all' ? 'Todo' : c}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setNewOpen(true)}
          style={{
            padding: '8px 14px',
            borderRadius: 99,
            background: 'var(--accent-pale)',
            color: 'var(--accent)',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            fontWeight: 500,
            whiteSpace: 'nowrap',
          }}
        >
          + Nuevo item
        </button>
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 ? (
          <Card padding={24}>
            <div style={{ textAlign: 'center', color: 'var(--ink-mute)', fontSize: 13 }}>
              {items.length === 0 ? 'Aún no tienes items registrados.' : 'Nada en esta categoría.'}
            </div>
          </Card>
        ) : (
          filtered.map((it) => {
            const low = isLow(it)
            return (
              <Card key={it.id} padding={16}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontStyle: 'italic',
                          fontSize: 18,
                          color: 'var(--ink)',
                          lineHeight: 1.1,
                        }}
                      >
                        {it.name}
                      </div>
                      {low && (
                        <Pill bg="var(--accent)" color="#FFF">
                          Bajo
                        </Pill>
                      )}
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
                      {it.category} · mín. {it.min}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 28,
                        color: low ? 'var(--accent)' : 'var(--ink)',
                        lineHeight: 1,
                      }}
                    >
                      {it.stock}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        color: 'var(--ink-mute)',
                        marginTop: 2,
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                      }}
                    >
                      {it.unit}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <Progress
                    value={it.stock}
                    max={Math.max(it.min * 1.5, it.stock, 1)}
                    height={4}
                    color={low ? 'var(--accent)' : 'var(--ink)'}
                  />
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => recordMovement(it.id, -1, 'use')}
                    disabled={it.stock === 0}
                    style={{
                      flex: 1,
                      height: 38,
                      borderRadius: 99,
                      background: 'var(--bg-inset)',
                      border: 'none',
                      cursor: it.stock === 0 ? 'not-allowed' : 'pointer',
                      opacity: it.stock === 0 ? 0.4 : 1,
                      fontFamily: 'var(--font-sans)',
                      fontSize: 13,
                      color: 'var(--ink)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                    }}
                  >
                    <Icon name="arrow-down" size={12} color="var(--ink)" /> Usar
                  </button>
                  <button
                    type="button"
                    onClick={() => recordMovement(it.id, 1, 'restock')}
                    style={{
                      flex: 1,
                      height: 38,
                      borderRadius: 99,
                      background: 'var(--ink)',
                      color: 'var(--bg)',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                    }}
                  >
                    <Icon name="plus" size={12} color="var(--bg)" /> Reponer
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(it)}
                    aria-label="Editar"
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 99,
                      background: 'transparent',
                      border: '0.5px solid var(--hairline)',
                      cursor: 'pointer',
                    }}
                  >
                    <Icon name="edit" size={14} color="var(--ink-mute)" />
                  </button>
                </div>
              </Card>
            )
          })
        )}
      </div>

      <ItemModal open={newOpen} onClose={() => setNewOpen(false)} />
      {editing && <EditItemModal item={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function ItemModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [stock, setStock] = useState('0')
  const [min, setMin] = useState('1')
  const [unit, setUnit] = useState('unid')
  const [category, setCategory] = useState('Agujas')
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setError(null)
    const s = Number(stock)
    const m = Number(min)
    if (!name.trim()) return setError('Ingresa un nombre')
    if (!Number.isFinite(s) || s < 0) return setError('Stock inválido')
    if (!Number.isFinite(m) || m < 0) return setError('Mínimo inválido')
    try {
      await createItem({ name, stock: s, min: m, unit, category })
      setName('')
      setStock('0')
      setMin('1')
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo item" footer={<PrimaryButton onClick={handleSave}>Guardar</PrimaryButton>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <TextField label="Nombre" value={name} onChange={setName} placeholder="Ej: Agujas RL 03" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <TextField label="Stock actual" value={stock} onChange={setStock} type="number" inputMode="numeric" />
          <TextField label="Mínimo" value={min} onChange={setMin} type="number" inputMode="numeric" />
        </div>
        <TextField label="Unidad" value={unit} onChange={setUnit} placeholder="Ej: cajas, frascos" />
        <SelectField
          label="Categoría"
          value={category}
          onChange={setCategory}
          options={DEFAULT_CATEGORIES.map((c) => ({ value: c, label: c }))}
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

function EditItemModal({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const [name, setName] = useState(item.name)
  const [stock, setStock] = useState(String(item.stock))
  const [min, setMin] = useState(String(item.min))
  const [unit, setUnit] = useState(item.unit)
  const [category, setCategory] = useState(item.category)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setError(null)
    const s = Number(stock)
    const m = Number(min)
    if (!name.trim()) return setError('Nombre requerido')
    try {
      await updateItem(item.id, {
        name,
        stock: Number.isFinite(s) ? Math.max(0, s) : item.stock,
        min: Number.isFinite(m) ? Math.max(0, m) : item.min,
        unit,
        category,
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`Editar · ${item.name}`}
      footer={
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => {
              if (confirm(`¿Eliminar "${item.name}"?`)) deleteItem(item.id).then(onClose)
            }}
            style={{
              flex: 1,
              height: 54,
              borderRadius: 99,
              background: 'transparent',
              color: 'var(--accent)',
              border: '0.5px solid var(--accent)',
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Eliminar
          </button>
          <div style={{ flex: 1 }}>
            <PrimaryButton onClick={handleSave}>Guardar</PrimaryButton>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <TextField label="Nombre" value={name} onChange={setName} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <TextField label="Stock" value={stock} onChange={setStock} type="number" inputMode="numeric" />
          <TextField label="Mínimo" value={min} onChange={setMin} type="number" inputMode="numeric" />
        </div>
        <TextField label="Unidad" value={unit} onChange={setUnit} />
        <SelectField
          label="Categoría"
          value={category}
          onChange={setCategory}
          options={DEFAULT_CATEGORIES.map((c) => ({ value: c, label: c }))}
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
