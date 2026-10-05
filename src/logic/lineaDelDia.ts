// Cómo se ve un día de punta a punta: lo ocupado, los bloques ya puestos y los huecos donde todavía entra algo.
// Función pura. Todos los tiempos de salida son minutos dentro del día (0–1440), no desde el lunes.

import { restar, type DiaCalculado, type Intervalo, type TipoTramo } from './windows'
import { MIN_DIA } from './tiempo'
import type { Bloque } from './types'

export type Segmento =
  | { tipo: 'ocupado'; que: TipoTramo; inicio: number; fin: number }
  | { tipo: 'bloque'; bloque: Bloque; inicio: number; fin: number }
  /** `foco` es false si el hueco termina muy cerca de la hora de dormir. */
  | { tipo: 'libre'; inicio: number; fin: number; foco: boolean }

export interface LineaDelDia {
  segmentos: Segmento[]
  /** Minutos que siguen libres una vez descontados los bloques ya puestos. */
  libreMin: number
}

/**
 * Los huecos libres son las ventanas menos los bloques ya puestos: así lo que se ve libre es justo lo que se puede
 * llenar. Un hueco que queda más corto que `minimoMin` no se muestra (no entra nada útil).
 */
export function lineaDelDia(calculado: DiaCalculado, bloques: Bloque[], minimoMin: number): LineaDelDia {
  const base = calculado.dia * MIN_DIA
  const propios = bloques
    .map((b) => ({ bloque: b, inicio: Math.max(0, b.inicio - base), fin: Math.min(MIN_DIA, b.fin - base) }))
    .filter((x) => x.fin > x.inicio)
    .sort((a, b) => a.inicio - b.inicio)
  const tapados: Intervalo[] = propios.map((x) => [x.inicio, x.fin])

  const segmentos: Segmento[] = [
    ...calculado.tramos.map((t): Segmento => ({ tipo: 'ocupado', que: t.tipo, inicio: t.inicio, fin: t.fin })),
    ...propios.map((x): Segmento => ({ tipo: 'bloque', bloque: x.bloque, inicio: x.inicio, fin: x.fin })),
    ...calculado.ventanas.flatMap((v) =>
      restar(v.inicio, v.fin, tapados)
        .filter(([a, b]) => b - a >= minimoMin)
        // Si el bloque ya puesto se come el final de la ventana, el hueco que queda ya no está pegado al sueño
        .map(([a, b]): Segmento => ({ tipo: 'libre', inicio: a, fin: b, foco: v.foco || b < v.fin })),
    ),
  ]
  // A igual inicio, lo ocupado primero y el hueco al final
  const orden = { ocupado: 0, bloque: 1, libre: 2 }
  segmentos.sort((a, b) => a.inicio - b.inicio || orden[a.tipo] - orden[b.tipo])

  const libreMin = segmentos.reduce((n, s) => (s.tipo === 'libre' ? n + s.fin - s.inicio : n), 0)
  return { segmentos, libreMin }
}
