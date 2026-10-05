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
]

/** Ordenadas como van en el día: así la lista guardada y el texto siempre salen en el mismo orden. */
const ORDEN_FRANJAS: Franja[] = FRANJAS.map((f) => f.valor)

/** Una actividad sin ninguna franja marcada (o con las tres) puede ir en cualquier momento del día. */
export const esCualquierFranja = (franjas: Franja[]): boolean => franjas.length === 0 || franjas.length === ORDEN_FRANJAS.length

/** Valida y ordena una lista de franjas. Si no queda ninguna válida, vuelve a "todas": nunca se queda sin lugar. */
export function normalizarFranjas(franjas: readonly string[]): Franja[] {
  const validas = ORDEN_FRANJAS.filter((f) => franjas.includes(f))
  return validas.length === 0 ? [...ORDEN_FRANJAS] : validas
}

/** Marca o desmarca una franja. No deja desmarcar la última: sin ninguna, la actividad no tendría preferencia. */
export function alternarFranja(franjas: Franja[], f: Franja): Franja[] {
  if (!franjas.includes(f)) return normalizarFranjas([...franjas, f])
  return franjas.length === 1 ? franjas : franjas.filter((x) => x !== f)
}

const limitar = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))
const aPaso = (n: number, paso: number) => Math.round(n / paso) * paso

export type Cambio = Partial<Pick<Actividad, 'meta' | 'duracionMin' | 'minimoMin' | 'franjas' | 'diasNo'>>

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
  const diasNo = cambio.diasNo === undefined ? a.diasNo : [...new Set(cambio.diasNo.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort((x, y) => x - y)
  return { ...a, meta, duracionMin, minimoMin, franjas: cambio.franjas ? normalizarFranjas(cambio.franjas) : a.franjas, ...(diasNo === undefined ? {} : { diasNo }) }
}

/** Cambia meta, duración, mínimo, franjas o días de una actividad. La prioridad va aparte (`moverPrioridad`). */
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

/** Aplica el orden de una lista acomodada a mano: `ids` va de la que se ubica primero a la última. Las que no vienen
 *  en `ids` (las fijas) quedan después, en el orden que ya tenían. Siempre da prioridades 1..N sin repetirse. */
export function reordenar(lista: Actividad[], ids: IdActividad[]): Actividad[] {
  const conocidas = new Set(lista.map((a) => a.id))
  const orden = [...new Set(ids)].filter((id) => conocidas.has(id))
  for (const a of ordenadas(lista)) if (!orden.includes(a.id)) orden.push(a.id)
  const numero = new Map(orden.map((id, k) => [id, k + 1]))
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

/** "mañana", "tarde o noche"; las tres juntas no dicen nada (es "cualquiera"). */
export function textoFranjas(franjas: Franja[]): string {
  const nombres = franjas.map((f) => FRANJAS.find((x) => x.valor === f)?.titulo.toLowerCase() ?? f)
  return nombres.length > 1 ? `${nombres.slice(0, -1).join(', ')} o ${nombres[nombres.length - 1]}` : (nombres[0] ?? '')
}

/** Línea de resumen de la lista: "4 sesiones por semana · 1 h 15 min · tarde". */
export function resumen(a: Actividad): string {
  if (a.meta === 0) return 'Desactivada'
  const partes = [`${textoMeta(a)} por semana`, formatearDuracion(a.duracionMin)]
  if (!a.fija && !esCualquierFranja(a.franjas)) partes.push(textoFranjas(a.franjas))
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
