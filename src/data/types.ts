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

/** Where the money actually lives. Drives icons, color, and balance display
 *  on the Cuentas screen. Add a new kind by appending it here, then wiring
 *  defaults in `accountKindMeta` and the create-account modal. */
export type AccountKind =
  | 'cash'
  | 'nequi'
  | 'daviplata'
  | 'bancolombia'
  | 'bank'
  | 'savings'
  | 'paypal'
  | 'crypto'
  | 'other'

/** A real-world place where money sits — physical cash, a Nequi wallet, a
 *  bank account, etc. Saldo is denormalized for instant reads and recomputed
 *  from transactions on every mutation. `currency` is the account's native
 *  currency; transactions in other currencies use the snapshot to convert. */
export interface Account {
  id: string
  name: string
  kind: AccountKind
  currency: CurrencyCode
  /** What the user said was already in the account when it was registered. */
  initialBalance: number
  /** Cached current balance in `currency`. Source of truth = initialBalance +
   *  Σ(in - out) of transactions that point here. Recomputed on every mutation. */
  balance: number
  balanceUpdatedAt: number
  /** Optional hex color override. Defaults to the kind's brand color. */
  color?: string
  archived?: boolean
  /** Display order in the Cuentas list (smaller = first). */
  order?: number
  notes?: string
  createdAt: number
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
  /** Category id. Optional for transfer legs (transfers move money between
   *  accounts and are not categorized). */
  walletId?: string
  /** Account where the money lived/lives. Optional only for legacy txs that
   *  have not yet been touched by the v3 migration — new txs always set it. */
  accountId?: string
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
  /** When this tx is the result of an action elsewhere (debt payment, goal
   *  allocation, transfer between accounts, manual balance adjustment). */
  source?: 'manual' | 'debt' | 'goal' | 'fixedBill' | 'trip' | 'transfer' | 'adjustment'
  sourceId?: string
  /** Both legs of a transfer share this id so they can be displayed and
   *  deleted as a single unit. Always paired with source: 'transfer'. */
  transferGroupId?: string
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

/** How often a fixed bill repeats. Drives the auto-advance of `dueDate`
 *  after each payment. */
export type BillFrequency = 'weekly' | 'biweekly' | 'monthly' | 'bimonthly'

export interface FixedBill {
  id: string
  name: string
  amount: number
  currency: CurrencyCode
  /** Next due date as ISO 'YYYY-MM-DD'. Auto-advances every time the bill
   *  is marked paid, by one period of `frequency`. */
  dueDate: string
  /** Recurrence cadence — defaults to 'monthly' for legacy data migrated
   *  from the old `dueDay` schema. */
  frequency: BillFrequency
  walletId?: string
  active: boolean
  /** YYYY-MM marking the most recent month it was marked paid */
  lastPaidMonth?: string
  createdAt: number
  /** @deprecated Legacy v1 field — only present on docs that haven't been
   *  migrated yet. The migration converts this to `dueDate`. */
  dueDay?: number
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

/** Theme palette identifiers. Mirrors `PaletteKey` in shared/theme/palettes
 *  but kept local to the data layer so Settings has no upward dependency on
 *  the UI theme module. Keep these in sync when adding palettes. */
export type ThemePalette = 'horion' | 'hotpink' | 'rose' | 'fuchsia'
export type ThemeModePref = 'light' | 'dark' | 'auto'

export interface Settings {
  id: 'main'
  userName: string
  userCity: string
  defaultCurrency: CurrencyCode
  enabledCurrencies: CurrencyCode[]
  /** Currency used for the "totals" view across Finanzas, category detail and
   *  Estadísticas. The user can flip it via the in-screen toggle. */
  displayCurrency: DisplayCurrency
  /** Visual theme palette synced across devices. Optional for backward
   *  compatibility with users created before sync existed — those clients
   *  push their local preference up the first time they connect. */
  palette?: ThemePalette
  /** Light / dark / auto-by-system preference, also synced. */
  modePref?: ThemeModePref
  /** PIN hash (PBKDF2-derived) — empty means no PIN. */
  pinHash?: string
  pinSalt?: string
  pinScope: 'none' | 'app' | 'cycle' | 'both'
  notificationsEnabled: boolean
  reminderHour: number
  installedAt: number
  onboardingCompleted: boolean
  /** First-run guided tour. `undefined` or `false` triggers the tour the
   *  next time the user lands on a routed screen. Set to true when the user
   *  finishes the tour or skips it; can be reset from Perfil to replay. */
  tutorialCompleted?: boolean
}

export interface FxRate {
  id: string /** "EUR-USD" */
  base: CurrencyCode
  quote: CurrencyCode
  rate: number
  fetchedAt: number
}
