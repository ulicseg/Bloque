// Resortes centralizados (apple-design §4). Se piensa en amortiguación y respuesta, no en masa/rigidez.
// Motion pide rigidez y amortiguamiento físicos; con masa 1:
//   rigidez = (2π / respuesta)²        amortiguamiento = 4π · amortiguación / respuesta

export interface ParametrosResorte {
  amortiguacion: number
  respuesta: number
}

/** Por defecto: críticamente amortiguado, sin rebote. */
export const RESORTE_DEFECTO: ParametrosResorte = { amortiguacion: 1, respuesta: 0.35 }
/** Solo para gestos que traían impulso (un lanzamiento): rebote leve. */
export const RESORTE_IMPULSO: ParametrosResorte = { amortiguacion: 0.8, respuesta: 0.3 }

export function aFisica({ amortiguacion, respuesta }: ParametrosResorte) {
  return {
    type: 'spring' as const,
    mass: 1,
    stiffness: (2 * Math.PI / respuesta) ** 2,
    damping: (4 * Math.PI * amortiguacion) / respuesta,
  }
}

/** Con movimiento reducido no hay desplazamientos ni resortes: solo un fundido corto. */
export function transicion(p: ParametrosResorte, movimientoReducido: boolean) {
  return movimientoReducido ? { type: 'tween' as const, duration: 0.18, ease: 'easeOut' as const } : aFisica(p)
}
