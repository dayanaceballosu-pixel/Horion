/* Domain types — single source of truth for entities synced via Firestore
   (or stored locally in IndexedDB for portfolio/fxRates). */

export type CurrencyCode = 'COP' | 'EUR' | 'USD' | 'PLN'

/** Currencies user can pick to register a transaction or to display totals. PLN
 *  is intentionally excluded (it's reserved for the trips module). */
export type DisplayCurrency = 'COP' | 'USD' | 'EUR'

export type WalletTone = 'pinkSoft' | 'pink' | 'ink' | 'pinkDark'

/** A "category" of money flow (Nómina, Tattoo, Freelance, Estética). It only
 *  groups transactions — there is no balance and no fixed currency. The legacy
 *  type name `Wallet` is kept to minimize churn. */
export interface Wallet {
  id: string
  name: string
  sub: string
  tone: WalletTone
  createdAt: number
  archived?: boolean
}

export type TxType = 'in' | 'out'

/** Snapshot of an amount expressed in the three display currencies, computed
 *  using the live FX rates at the moment the transaction was registered. This
 *  freezes history: a March transaction always shows the same COP/USD/EUR
 *  values regardless of when it's viewed. */
export interface MoneySnapshot {
  COP: number
  USD: number
  EUR: number
}

export interface Transaction {
  id: string
  walletId: string
  type: TxType
  /** Amount as the user typed it, in `currency`. */
  amount: number
  /** Currency the user chose at registration time. */
  currency: CurrencyCode
  /** Frozen-at-registration values in the three display currencies. */
  snapshot: MoneySnapshot
  title: string
  /** ISO date 'YYYY-MM-DD' */
  date: string
  /** epoch ms */
  createdAt: number
  notes?: string
  /** When this tx is the result of an action elsewhere (debt payment, goal allocation). */
  source?: 'manual' | 'debt' | 'goal' | 'fixedBill' | 'trip'
  sourceId?: string
}

export type DebtDirection = 'owedToMe' | 'iOwe'

export interface Debt {
  id: string
  person: string
  direction: DebtDirection
  total: number
  paid: number
  currency: CurrencyCode
  /** ISO date string for due date */
  due?: string
  notes?: string
  createdAt: number
  closedAt?: number
}

export interface DebtPayment {
  id: string
  debtId: string
  amount: number
  /** ISO date 'YYYY-MM-DD' */
  date: string
  walletId?: string
  notes?: string
  createdAt: number
}

export interface FixedBill {
  id: string
  name: string
  amount: number
  currency: CurrencyCode
  /** day of month (1-31) */
  dueDay: number
  walletId?: string
  active: boolean
  /** YYYY-MM marking the most recent month it was marked paid */
  lastPaidMonth?: string
  createdAt: number
}

export type TripStatus = 'idea' | 'planning' | 'active' | 'archived'

export interface TripCost {
  flight: number
  stay: number
  food: number
  transport: number
  materials: number
  other: number
}

export interface Trip {
  id: string
  city: string
  country: string
  flag: string
  /** Human-readable date range */
  when: string
  /** ISO 'YYYY-MM-DD' */
  startDate?: string
  endDate?: string
  status: TripStatus
  cost: TripCost
  currency: CurrencyCode
  avgPrice: number
  target: number
  sold: number
  notes?: string
  createdAt: number
}

export type StudioStatus = 'pending' | 'contacted' | 'confirmed'

export interface Studio {
  id: string
  tripId: string
  name: string
  status: StudioStatus
  contact?: string
  instagram?: string
  email?: string
  notes?: string
  createdAt: number
}

export interface InventoryItem {
  id: string
  name: string
  stock: number
  min: number
  unit: string
  category: string
  notes?: string
  lastRestockAt?: number
  createdAt: number
}

export interface InventoryMovement {
  id: string
  itemId: string
  delta: number /** + replenish, - use */
  reason: 'use' | 'restock' | 'adjust'
  cost?: number
  date: string
  createdAt: number
}

export interface PortfolioPiece {
  id: string
  title: string
  client?: string
  /** YYYY-MM */
  monthYear: string
  selected: boolean
  /** Stored as Blob in IndexedDB (image binaries — works offline) */
  image?: Blob
  imageType?: string
  color?: string
  notes?: string
  createdAt: number
}

export interface Goal {
  id: string
  name: string
  target: number
  saved: number
  currency: CurrencyCode
  /** ISO 'YYYY-MM-DD' or human-readable like 'jun' */
  due?: string
  /** When 100% reached */
  completedAt?: number
  createdAt: number
}

export interface GoalAllocation {
  id: string
  goalId: string
  amount: number
  date: string
  walletId?: string
  createdAt: number
}

export interface CycleEntry {
  id: string
  /** ISO 'YYYY-MM-DD' — first day of period */
  startDate: string
  /** Length of the period (days) */
  periodLength: number
  notes?: string
  symptoms?: string[]
  createdAt: number
}

export type TaskCategory = string

export interface Task {
  id: string
  text: string
  category: TaskCategory
  /** Recurrence: null for one-off, 'daily' for every day */
  recurrence: 'daily' | 'weekly' | null
  /** Days of week for weekly: 0=Sunday */
  weekDays?: number[]
  active: boolean
  createdAt: number
  order: number
}

export interface TaskCompletion {
  id: string
  taskId: string
  /** ISO 'YYYY-MM-DD' */
  date: string
  done: boolean
  createdAt: number
}

export interface Settings {
  id: 'main'
  userName: string
  userCity: string
  defaultCurrency: CurrencyCode
  enabledCurrencies: CurrencyCode[]
  /** Currency used for the "totals" view across Finanzas, category detail and
   *  Estadísticas. The user can flip it via the in-screen toggle. */
  displayCurrency: DisplayCurrency
  /** PIN hash (PBKDF2-derived) — empty means no PIN. */
  pinHash?: string
  pinSalt?: string
  pinScope: 'none' | 'app' | 'cycle' | 'both'
  notificationsEnabled: boolean
  reminderHour: number
  installedAt: number
  onboardingCompleted: boolean
}

export interface FxRate {
  id: string /** "EUR-USD" */
  base: CurrencyCode
  quote: CurrencyCode
  rate: number
  fetchedAt: number
}
