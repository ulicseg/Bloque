// Edición de las metas de cada actividad. Todo pasa por acá para que ninguna pantalla pueda guardar un valor
// imposible (una duración de cero, un mínimo mayor que la duración, dos actividades con la misma prioridad).

import { formatearDuracion } from './tiempo'
import type { Actividad, Datos, Franja, IdActividad } from './types'

export const LIMITES = {
  sesiones: { min: 0, max: 14, paso: 1 },
  horas: { min: 0, max: 40, paso: 0.5 },
  duracionMin: { min: 5, max: 480, paso: 5 },
  minimoMin: { paso: 5 },
} as const

export const FRANJAS: readonly { valor: Franja; titulo: string }[] = [
  { valor: 'manana', titulo: 'Mañana' },
  { valor: 'tarde', titulo: 'Tarde' },
  { valor: 'noche', titulo: 'Noche' },
  { valor: 'cualquiera', titulo: 'Cualquiera' },
]

const limitar = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))
const aPaso = (n: number, paso: number) => Math.round(n / paso) * paso

export type Cambio = Partial<Pick<Actividad, 'meta' | 'duracionMin' | 'minimoMin' | 'franja'>>

/** Aplica un cambio a una actividad corrigiéndolo para que siga siendo válido. */
function corregir(a: Actividad, cambio: Cambio): Actividad {
  const l = LIMITES[a.tipoMeta]
  const meta = limitar(aPaso(cambio.meta ?? a.meta, l.paso), l.min, l.max)
  const duracionMin = limitar(
    aPaso(cambio.duracionMin ?? a.duracionMin, LIMITES.duracionMin.paso),
    LIMITES.duracionMin.min,
    LIMITES.duracionMin.max,
  )
  // Un mínimo por debajo del primer paso es "sin mínimo"; nunca puede superar la duración
  const pedido = cambio.minimoMin === undefined ? a.minimoMin : cambio.minimoMin
  const minimoMin =
    pedido === null || pedido < LIMITES.minimoMin.paso ? null : Math.min(aPaso(pedido, LIMITES.minimoMin.paso), duracionMin)
  return { ...a, meta, duracionMin, minimoMin, franja: cambio.franja ?? a.franja }
}

/** Cambia meta, duración, mínimo o franja de una actividad. La prioridad va aparte (`moverPrioridad`). */
export function editarActividad(lista: Actividad[], id: IdActividad, cambio: Cambio): Actividad[] {
  return lista.map((a) => (a.id === id ? corregir(a, cambio) : a))
}

/** Por prioridad (1 primero); a igual prioridad, el orden en que vienen. */
export function ordenadas(lista: Actividad[]): Actividad[] {
  return lista
    .map((a, i) => ({ a, i }))
    .sort((x, y) => x.a.prioridad - y.a.prioridad || x.i - y.i)
    .map(({ a }) => a)
}

/** Pone una actividad en la prioridad pedida y la que la tenía pasa al lugar que quedó libre (un intercambio,
 *  como se espera de un contador de 1 a N): así los números siguen siendo 1..N sin repetirse.
 *  Con prioridades repetidas (datos de afuera) las vuelve a numerar. */
export function moverPrioridad(lista: Actividad[], id: IdActividad, nueva: number): Actividad[] {
  const orden = ordenadas(lista)
  const desde = orden.findIndex((a) => a.id === id)
  if (desde === -1) return lista
  const hasta = limitar(Math.round(nueva), 1, lista.length) - 1
  ;[orden[desde], orden[hasta]] = [orden[hasta], orden[desde]]
  const numero = new Map(orden.map((a, i) => [a.id, i + 1]))
  return lista.map((a) => ({ ...a, prioridad: numero.get(a.id) ?? a.prioridad }))
}

export function conActividades(datos: Datos, actividades: Actividad[]): Datos {
  return { ...datos, actividades }
}

// ---------- Textos ----------

/** 6 → "6 h", 6.5 → "6,5 h": coma decimal, como se escribe acá. */
const horas = (h: number) => `${String(h).replace('.', ',')} h`

export function textoMeta(a: Actividad): string {
  if (a.tipoMeta === 'horas') return horas(a.meta)
  return a.meta === 1 ? '1 sesión' : `${a.meta} sesiones`
}

export const textoMinimo = (a: Actividad): string => (a.minimoMin === null ? 'Sin mínimo' : formatearDuracion(a.minimoMin))

export const textoFranja = (f: Franja): string => FRANJAS.find((x) => x.valor === f)?.titulo ?? f

/** Línea de resumen de la lista: "4 sesiones por semana · 1 h 15 min · tarde". */
export function resumen(a: Actividad): string {
  if (a.meta === 0) return 'Desactivada'
  const partes = [`${textoMeta(a)} por semana`, formatearDuracion(a.duracionMin)]
  if (!a.fija && a.franja !== 'cualquiera') partes.push(textoFranja(a.franja).toLowerCase())
  return partes.join(' · ')
}

// ---------- Contadores (+ / −) ----------

export type Campo = 'meta' | 'duracionMin' | 'minimoMin'

/** El cambio que produce un toque en + (dir 1) o − (dir −1) del contador de `campo`. */
export function siguiente(a: Actividad, campo: Campo, dir: 1 | -1): Cambio {
  if (campo === 'meta') return { meta: a.meta + dir * LIMITES[a.tipoMeta].paso }
  if (campo === 'duracionMin') return { duracionMin: a.duracionMin + dir * LIMITES.duracionMin.paso }
  // Sin mínimo equivale a 0: el primer + lo lleva al primer paso y el último − lo vuelve a "sin mínimo"
  return { minimoMin: (a.minimoMin ?? 0) + dir * LIMITES.minimoMin.paso }
}

/** false cuando el contador ya está en su tope en esa dirección. */
export function puede(a: Actividad, campo: Campo, dir: 1 | -1): boolean {
  const antes = a[campo] ?? 0
  const despues = corregir(a, siguiente(a, campo, dir))[campo] ?? 0
  return despues !== antes
}
