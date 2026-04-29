import { db, uid } from '../db'
import type { PortfolioPiece } from '../types'

export async function listPortfolio(monthYear?: string): Promise<PortfolioPiece[]> {
  const all = await db.portfolio.orderBy('createdAt').reverse().toArray()
  return monthYear ? all.filter((p) => p.monthYear === monthYear) : all
}

export interface CreatePieceInput {
  title: string
  client?: string
  monthYear: string
  image?: Blob
  imageType?: string
  color?: string
  notes?: string
  selected?: boolean
}
export async function createPiece(input: CreatePieceInput): Promise<PortfolioPiece> {
  const piece: PortfolioPiece = {
    id: uid(),
    title: input.title.trim(),
    client: input.client?.trim(),
    monthYear: input.monthYear,
    selected: input.selected ?? false,
    image: input.image,
    imageType: input.imageType,
    color: input.color ?? '#FFD9E6',
    notes: input.notes,
    createdAt: Date.now(),
  }
  await db.portfolio.put(piece)
  return piece
}

export async function updatePiece(id: string, patch: Partial<PortfolioPiece>): Promise<void> {
  await db.portfolio.update(id, patch)
}

export async function deletePiece(id: string): Promise<void> {
  await db.portfolio.delete(id)
}

export async function toggleSelected(id: string): Promise<void> {
  const piece = await db.portfolio.get(id)
  if (piece) await db.portfolio.update(id, { selected: !piece.selected })
}
