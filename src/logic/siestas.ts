// La siesta se arma con bloques de 35 minutos: una rápida es uno solo y una larga son tres seguidos (1 h 45 min).
// Es un solo bloque en la semana (no tres), porque así se marca de una vez como hecha o salteada.

import { MIN_DIA, horaCampo, leerHoraCampo } from './tiempo'

export const BLOQUE_SIESTA_MIN = 35

export const SIESTAS = [
  { id: 'rapida', titulo: 'Rápida', bloques: 1 },
  { id: 'larga', titulo: 'Larga', bloques: 3 },
] as const

export const minutosDeSiesta = (bloques: number) => bloques * BLOQUE_SIESTA_MIN

/** Hora de fin (HH:MM) de una siesta que arranca en `desde`; null si no se entiende la hora o se pasa de medianoche. */
export function finDeSiesta(desde: string, bloques: number): string | null {
  const d = leerHoraCampo(desde)
  if (d === null) return null
  const fin = d + minutosDeSiesta(bloques)
  return fin > MIN_DIA ? null : horaCampo(fin === MIN_DIA ? 0 : fin)
}
