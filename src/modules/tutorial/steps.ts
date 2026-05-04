import type { IconName } from '@shared/icons/Icon'

/** What kind of user action makes a step auto-advance.
 *  - `click` — wait until the user clicks (or taps inside) the spotlighted target
 *  - `accounts-grew` — wait until the user's accounts collection grows past
 *    the baseline captured when the step became active
 *  - `transactions-grew` — same, for transactions
 *  When `waitFor` is unset the step shows a primary CTA instead. */
export type WaitForKind =
  | { type: 'click' }
  | { type: 'accounts-grew' }
  | { type: 'transactions-grew' }

export interface TutorialStep {
  id: string
  /** `center` is a modal-like card with no target. `spotlight` cuts a hole
   *  in the backdrop around the target element and floats a tooltip near it. */
  kind: 'center' | 'spotlight'
  /** data-tutorial value of the target. Required when kind === 'spotlight'. */
  target?: string
  /** Where to anchor the tooltip relative to the target. `auto` flips based
   *  on which half of the viewport the target falls in. */
  placement?: 'auto' | 'top' | 'bottom'
  kicker: string
  title: string
  body: string
  /** CTA shown on info steps; for waitFor steps the button area shows a
   *  "Esperando…" pill plus a "Saltar paso" link. */
  primary?: string
  /** Optional copy shown next to the loader on waitFor steps. */
  waiting?: string
  waitFor?: WaitForKind
  /** Icon next to the kicker. */
  icon?: IconName
}

/**
 * Finanzas-only first-run tour.
 *
 * The flow is hands-on: the user actually creates an account and registers
 * a real transaction during the tour. Steps are sequenced so each one builds
 * the next — clicking the spotlighted button opens the modal, whose own
 * fields become the targets of the following steps.
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    kind: 'center',
    icon: 'sparkle',
    kicker: 'Tutorial · Finanzas',
    title: 'Tu plata, paso a paso',
    body:
      'Te muestro Finanzas haciéndolo de verdad. En 2 minutos vas a crear una cuenta, registrar un ingreso y ver el saldo cambiar en vivo. Puedes saltar cuando quieras.',
    primary: 'Empezar',
  },
  {
    id: 'accounts-strip',
    kind: 'spotlight',
    target: 'accounts-strip',
    placement: 'bottom',
    kicker: 'Tus cuentas',
    title: 'El strip de cuentas',
    body:
      'Estas son tus cuentas: Efectivo, Nequi y Daviplata vienen por defecto. Cada una guarda saldo de un sitio real. Deslízalas con el dedo.',
    primary: 'Siguiente',
  },
  {
    id: 'total',
    kind: 'spotlight',
    target: 'total-disponible',
    placement: 'bottom',
    kicker: 'Total disponible',
    title: 'Tu plata sumada',
    body:
      'Aquí está la suma de todas tus cuentas, convertida a tu moneda principal. Cambia con cada movimiento que registres.',
    primary: 'Siguiente',
  },
  {
    id: 'new-account-cta',
    kind: 'spotlight',
    target: 'new-account',
    placement: 'top',
    icon: 'plus',
    kicker: 'Crear cuenta',
    title: 'Vamos a crear una nueva',
    body:
      'Toca el botón "Nueva cuenta" para abrir el formulario. Esperando que toques.',
    waiting: 'Esperando que toques "Nueva cuenta"',
    waitFor: { type: 'click' },
  },
  {
    id: 'account-form',
    kind: 'spotlight',
    target: 'account-form',
    placement: 'top',
    kicker: 'Formulario',
    title: 'Tipo, nombre y saldo',
    body:
      'Elige el tipo (Nequi, efectivo, banco…), ponle un nombre y escribe el saldo que tienes hoy. Si no sabes el monto exacto, déjalo en 0 — luego ajustas.',
    primary: 'Entendido',
  },
  {
    id: 'account-save',
    kind: 'spotlight',
    target: 'account-save',
    placement: 'top',
    icon: 'check',
    kicker: 'Guardar',
    title: 'Crea la cuenta',
    body:
      'Cuando llenes el formulario, toca "Crear cuenta". El modal se cerrará y verás la nueva cuenta en el strip de arriba.',
    waiting: 'Esperando a que crees la cuenta',
    waitFor: { type: 'accounts-grew' },
  },
  {
    id: 'created',
    kind: 'center',
    icon: 'check-circle',
    kicker: '¡Bien!',
    title: 'Cuenta creada',
    body:
      'Ahora vamos a registrar un ingreso para que veas el saldo actualizarse al instante.',
    primary: 'Siguiente',
  },
  {
    id: 'action-income',
    kind: 'spotlight',
    target: 'action-income',
    placement: 'top',
    icon: 'arrow-down',
    kicker: 'Ingreso',
    title: 'Toca "+ Ingreso"',
    body:
      'Para registrar plata que entró, toca "+ Ingreso". Se abrirá un formulario corto.',
    waiting: 'Esperando que toques "+ Ingreso"',
    waitFor: { type: 'click' },
  },
  {
    id: 'tx-form',
    kind: 'spotlight',
    target: 'tx-form',
    placement: 'top',
    kicker: 'Movimiento',
    title: 'Tres campos clave',
    body:
      'Elige la cuenta donde entró la plata, su categoría (Tattoo, Nómina…) y el monto. Si lo escribes en otra moneda, la app guarda el equivalente en las tres.',
    primary: 'Entendido',
  },
  {
    id: 'tx-save',
    kind: 'spotlight',
    target: 'tx-save',
    placement: 'top',
    icon: 'check',
    kicker: 'Registrar',
    title: 'Guarda el movimiento',
    body:
      'Toca "Registrar ingreso". El saldo de la cuenta se actualiza al instante.',
    waiting: 'Esperando a que registres el ingreso',
    waitFor: { type: 'transactions-grew' },
  },
  {
    id: 'balance-updated',
    kind: 'spotlight',
    target: 'accounts-strip',
    placement: 'bottom',
    icon: 'sparkle',
    kicker: 'Saldo en vivo',
    title: 'Mira el cambio',
    body:
      'Tu cuenta ya muestra el ingreso. Cualquier movimiento que registres se refleja aquí inmediatamente — sin recargar.',
    primary: 'Siguiente',
  },
  {
    id: 'action-transfer',
    kind: 'spotlight',
    target: 'action-transfer',
    placement: 'top',
    icon: 'arrow-right',
    kicker: 'Transferencias',
    title: 'Pasar plata entre cuentas',
    body:
      'Si sacaste del cajero o moviste de Nequi a efectivo, usa "Transferir". Se registra como dos movimientos atados — al borrar uno se borra el par.',
    primary: 'Siguiente',
  },
  {
    id: 'categories',
    kind: 'spotlight',
    target: 'categories-section',
    placement: 'top',
    icon: 'wallet',
    kicker: 'Categorías',
    title: 'De dónde viene tu plata',
    body:
      'Aquí abajo ves cómo se reparte el dinero por origen del mes: Tattoo, Nómina, Freelance, Estética. Útil para saber cuánto te dejó cada cosa.',
    primary: 'Siguiente',
  },
  {
    id: 'closing',
    kind: 'center',
    icon: 'check-circle',
    kicker: 'Listo',
    title: 'Ya manejas Finanzas',
    body:
      'Tienes lo esencial: cuentas con saldo en vivo, movimientos, transferencias y categorías. Para opciones avanzadas (ajustar saldo, ver historial), toca cualquier cuenta. Si quieres repasarlo, está en Perfil.',
    primary: 'Empezar a usar',
  },
]
