// Edición de las reglas del cálculo de ventanas. Cada cambio se corrige para que el cálculo nunca reciba algo
// imposible (un sueño que empieza y termina a la misma hora, una comida de duración cero).

import { MIN_DIA, MIN_HORA, leerHoraCampo } from './tiempo'
import type { Ajustes, Comida } from './types'

export type CampoMinutos = 'trasladoMin' | 'despertarMin' | 'recuperacionMin' | 'focoMargenMin' | 'ventanaMinimaMin'

export const LIMITES_MINUTOS: Record<CampoMinutos, { min: number; max: number; paso: number }> = {
  trasladoMin: { min: 0, max: 120, paso: 5 },
  despertarMin: { min: 0, max: 120, paso: 5 },
  recuperacionMin: { min: 0, max: 240, paso: 15 },
  focoMargenMin: { min: 0, max: 240, paso: 15 },
  ventanaMinimaMin: { min: 5, max: 120, paso: 5 },
}

export type CampoHora =
  | 'suenoInicio'
  | 'suenoFin'
  | 'turnoTardeDesde'
  | 'suenoTrasTardeInicio'
  | 'turnoTempranoHasta'
  | 'suenoPreTempranoInicio'
  | 'suenoTrasNocheHasta'

export const COMIDAS_MAX = 8
export const DURACION_COMIDA = { min: 5, max: 180, paso: 5 }

const limitar = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

/** Un toque en + (dir 1) o − (dir −1) del contador de `campo`. */
export function pasoMinutos(a: Ajustes, campo: CampoMinutos, dir: 1 | -1): Ajustes {
  const l = LIMITES_MINUTOS[campo]
  return { ...a, [campo]: limitar(a[campo] + dir * l.paso, l.min, l.max) }
}

export const puedeMinutos = (a: Ajustes, campo: CampoMinutos, dir: 1 | -1): boolean => pasoMinutos(a, campo, dir)[campo] !== a[campo]

/** Pone una hora ("HH:MM", como la da <input type="time">). Si el texto no es una hora, o el sueño quedaría
 *  con el mismo inicio y fin, no cambia nada. */
export function fijarHora(a: Ajustes, campo: CampoHora, texto: string): Ajustes {
  const min = leerHoraCampo(texto)
  if (min === null) return a
  const nuevo = { ...a, [campo]: min }
  return nuevo.suenoInicio === nuevo.suenoFin ? a : nuevo
}

export function editarComida(a: Ajustes, indice: number, parche: Partial<Comida>): Ajustes {
  if (indice < 0 || indice >= a.comidas.length) return a
  const comidas = a.comidas.map((c, i): Comida => {
    if (i !== indice) return c
    const inicio = parche.inicio === undefined ? c.inicio : limitar(Math.round(parche.inicio), 0, MIN_DIA - 1)
    const pedida = parche.duracionMin === undefined ? c.duracionMin : parche.duracionMin
    const duracionMin = limitar(Math.round(pedida), DURACION_COMIDA.min, DURACION_COMIDA.max)
    return { nombre: parche.nombre ?? c.nombre, inicio, duracionMin: Math.min(duracionMin, MIN_DIA - inicio) }
  })
  return { ...a, comidas }
}

export function pasoComida(a: Ajustes, indice: number, dir: 1 | -1): Ajustes {
  const c = a.comidas[indice]
  return c ? editarComida(a, indice, { duracionMin: c.duracionMin + dir * DURACION_COMIDA.paso }) : a
}

export function agregarComida(a: Ajustes): Ajustes {
  if (a.comidas.length >= COMIDAS_MAX) return a
  return { ...a, comidas: [...a.comidas, { nombre: 'Comida', inicio: 17 * MIN_HORA, duracionMin: 30 }] }
}

export const quitarComida = (a: Ajustes, indice: number): Ajustes => ({ ...a, comidas: a.comidas.filter((_, i) => i !== indice) })

/** Las comidas por hora de inicio, para mostrarlas en orden aunque se hayan cargado desordenadas.
 *  Devuelve también el índice original, que es el que usan las funciones de edición. */
export const comidasOrdenadas = (a: Ajustes): { comida: Comida; indice: number }[] =>
  a.comidas.map((comida, indice) => ({ comida, indice })).sort((x, y) => x.comida.inicio - y.comida.inicio || x.indice - y.indice)
