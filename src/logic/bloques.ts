// Los bloques de una semana: guardar la sugerencia, editarlos a mano y marcarlos como hechos.
// Todo son funciones puras sobre `Semana`; devuelven una semana nueva y nunca modifican la que reciben.

import { MIN_DIA, MIN_SEMANA, leerHoraCampo } from './tiempo'
import type { DiaCalculado } from './windows'
import type { Bloque, EstadoBloque, IdActividad, Semana } from './types'

/** Menos que esto no es un bloque, es un error de tipeo. */
export const DURACION_MIN_BLOQUE = 5

export const superponen = (a: Pick<Bloque, 'inicio' | 'fin'>, b: Pick<Bloque, 'inicio' | 'fin'>) => a.inicio < b.fin && b.inicio < a.fin

export const diaDeBloque = (b: Pick<Bloque, 'inicio'>): number => Math.min(6, Math.max(0, Math.floor(b.inicio / MIN_DIA)))

/** Los que se tienen en cuenta al volver a sugerir: lo fijo y lo que ya se hizo (aunque sea el mínimo) no se mueve ni se repite. */
export const bloquesQueCuentan = (s: Semana): Bloque[] => s.bloques.filter((b) => b.fijo || b.estado === 'hecho' || b.estado === 'minimo')

/** Guarda la sugerencia en la semana. Reemplaza lo que estaba solo planificado (o salteado) y no era fijo;
 *  lo fijo y lo ya hecho se conservan tal cual. */
export function aceptarSugerencia(semana: Semana, sugeridos: Bloque[]): Semana {
  const quedan = bloquesQueCuentan(semana)
  const nuevos = sugeridos.filter((n) => !quedan.some((q) => superponen(q, n)))
  return { ...semana, bloques: ordenar([...quedan, ...nuevos]) }
}

const ordenar = (bs: Bloque[]) => [...bs].sort((a, b) => a.inicio - b.inicio || a.id.localeCompare(b.id))

export const bloquesDelDia = (s: Semana, dia: number): Bloque[] => ordenar(s.bloques.filter((b) => diaDeBloque(b) === dia))

/** Un id que no usa ningún bloque de la semana. */
export function idNuevo(s: Semana, actividad: IdActividad, inicio: number): string {
  const usados = new Set(s.bloques.map((b) => b.id))
  let n = 0
  while (usados.has(`${actividad}-${inicio}-${n}`)) n++
  return `${actividad}-${inicio}-${n}`
}

export type ResultadoBloque =
  | { ok: true; semana: Semana }
  | { ok: false; motivo: 'invalido' }
  | { ok: false; motivo: 'superpuesto'; con: Bloque }

/** Agrega el bloque, o reemplaza el que tenga el mismo id. Nunca deja dos bloques superpuestos. */
export function guardarBloque(s: Semana, bloque: Bloque): ResultadoBloque {
  const bien =
    Number.isInteger(bloque.inicio) &&
    Number.isInteger(bloque.fin) &&
    bloque.inicio >= 0 &&
    bloque.fin <= MIN_SEMANA &&
    bloque.fin - bloque.inicio >= DURACION_MIN_BLOQUE &&
    // un bloque vive dentro de un solo día: así "el día del bloque" nunca es ambiguo
    Math.floor(bloque.inicio / MIN_DIA) === Math.floor((bloque.fin - 1) / MIN_DIA)
  if (!bien) return { ok: false, motivo: 'invalido' }
  const otros = s.bloques.filter((b) => b.id !== bloque.id)
  const con = otros.find((b) => superponen(b, bloque))
  if (con) return { ok: false, motivo: 'superpuesto', con }
  return { ok: true, semana: { ...s, bloques: ordenar([...otros, bloque]) } }
}

export const quitarBloque = (s: Semana, id: string): Semana => ({ ...s, bloques: s.bloques.filter((b) => b.id !== id) })

export const cambiarEstado = (s: Semana, id: string, estado: EstadoBloque): Semana => ({
  ...s,
  bloques: s.bloques.map((b) => (b.id === id ? { ...b, estado } : b)),
})

/** Arma un bloque desde lo que se escribe en la pantalla: día (0 = lunes) y dos horas "HH:MM".
 *  "Hasta" 00:00 significa la medianoche del final del día. null si las horas no sirven. */
export function bloqueDesdeCampos(
  base: Pick<Bloque, 'id' | 'actividad' | 'estado' | 'fijo'>,
  dia: number,
  desde: string,
  hasta: string,
): Bloque | null {
  const d = leerHoraCampo(desde)
  let h = leerHoraCampo(hasta)
  if (d === null || h === null || !Number.isInteger(dia) || dia < 0 || dia > 6) return null
  if (h === 0) h = MIN_DIA
  if (h - d < DURACION_MIN_BLOQUE) return null
  return { ...base, inicio: dia * MIN_DIA + d, fin: dia * MIN_DIA + h }
}

/** true si el bloque no cae entero dentro de una ventana libre: se puede guardar igual, pero se avisa. */
export const fueraDeVentanas = (b: Pick<Bloque, 'inicio' | 'fin'>, dias: DiaCalculado[]): boolean =>
  !dias.some((d) => d.ventanas.some((w) => b.inicio >= w.inicio && b.fin <= w.fin))
