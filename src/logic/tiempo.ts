import type { FechaISO } from './types'

export const MIN_HORA = 60
export const MIN_DIA = 24 * MIN_HORA
export const MIN_SEMANA = 7 * MIN_DIA
const MS_DIA = MIN_DIA * 60_000

/** Argentina es UTC-3 todo el año (sin horario de verano desde 2009). */
const OFFSET_ARGENTINA_MIN = -180

export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// Todo el cálculo de fechas va en UTC sobre fechas "AAAA-MM-DD": la zona horaria del teléfono no influye.
const aMs = (f: FechaISO) => {
  const [a, m, d] = f.split('-').map(Number)
  return Date.UTC(a, m - 1, d)
}
const deMs = (ms: number): FechaISO => new Date(ms).toISOString().slice(0, 10)

export function sumarDias(f: FechaISO, n: number): FechaISO {
  return deMs(aMs(f) + n * MS_DIA)
}

/** Lunes de la semana que contiene la fecha. */
export function lunesDe(f: FechaISO): FechaISO {
  const diaSemana = (new Date(aMs(f)).getUTCDay() + 6) % 7 // 0 = lunes
  return sumarDias(f, -diaSemana)
}

export function esLunes(f: FechaISO): boolean {
  return new Date(aMs(f)).getUTCDay() === 1
}

/** Fecha calendario en Argentina para un instante (ms desde 1970). */
export function fechaEnArgentina(ms: number): FechaISO {
  return deMs(ms + OFFSET_ARGENTINA_MIN * 60_000)
}

export const lunesActual = (ms: number): FechaISO => lunesDe(fechaEnArgentina(ms))

export const nombreDia = (dia: number): string => DIAS[dia]

export const numeroDelDia = (lunes: FechaISO, dia: number): number => Number(sumarDias(lunes, dia).slice(8))

/** "5–11 oct" o "28 sep – 4 oct" cuando la semana cruza de mes. */
export function rangoSemana(lunes: FechaISO): string {
  const domingo = sumarDias(lunes, 6)
  const [d1, m1] = [Number(lunes.slice(8)), Number(lunes.slice(5, 7)) - 1]
  const [d2, m2] = [Number(domingo.slice(8)), Number(domingo.slice(5, 7)) - 1]
  return m1 === m2 ? `${d1}–${d2} ${MESES[m2]}` : `${d1} ${MESES[m1]} – ${d2} ${MESES[m2]}`
}

/** Minutos desde las 00:00 del día → "6", "6:30". Sin ceros a la izquierda: así se dice un turno. */
export function horaCorta(min: number): string {
  const m = ((min % MIN_DIA) + MIN_DIA) % MIN_DIA
  const h = Math.floor(m / MIN_HORA)
  const r = m % MIN_HORA
  return r === 0 ? `${h}` : `${h}:${String(r).padStart(2, '0')}`
}

/** "06:00", el formato de <input type="time">. */
export function horaCampo(min: number): string {
  const m = ((min % MIN_DIA) + MIN_DIA) % MIN_DIA
  return `${String(Math.floor(m / MIN_HORA)).padStart(2, '0')}:${String(m % MIN_HORA).padStart(2, '0')}`
}

/** Lo inverso de horaCampo. null si el texto no es una hora válida. */
export function leerHoraCampo(texto: string): number | null {
  const r = /^(\d{1,2}):(\d{2})$/.exec(texto)
  if (!r) return null
  const [h, m] = [Number(r[1]), Number(r[2])]
  return h < 24 && m < 60 ? h * MIN_HORA + m : null
}

/** 480 → "8 h", 510 → "8 h 30 min", 45 → "45 min". */
export function formatearDuracion(min: number): string {
  const h = Math.floor(min / MIN_HORA)
  const m = min % MIN_HORA
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

/** Como horaCampo, pero un fin a medianoche se lee "24:00" y no "00:00": "21:30–24:00". */
export function horaDeFin(min: number): string {
  return min > 0 && min % MIN_DIA === 0 ? '24:00' : horaCampo(min)
}
