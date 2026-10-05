import { MIN_DIA, MIN_HORA, MIN_SEMANA, formatearDuracion, horaCorta, leerHoraCampo, nombreDia, sumarDias } from './tiempo'
import type { Datos, FechaISO, Semana, Turno } from './types'

/** Semanas contiguas: un turno del domingo puede seguir en la siguiente, y el de la siguiente
 *  puede empezar apenas pasada la medianoche. Se necesitan para validar sin perder nada. */
export interface Vecinas {
  anterior?: Semana
  siguiente?: Semana
}

export const semanaVacia = (lunes: FechaISO): Semana => ({ lunes, turnos: [], bloques: [] })

export interface TurnoFijo {
  id: '6-14' | '14-22' | '22-6' | '6-10' | '10-14' | '14-18' | '18-22' | '22-2'
  etiqueta: string
  /** Minutos desde las 00:00 del día. */
  desde: number
  hasta: number
}

export const TURNOS_FIJOS: readonly TurnoFijo[] = [
  { id: '6-14', etiqueta: '6–14', desde: 6 * MIN_HORA, hasta: 14 * MIN_HORA },
  { id: '14-22', etiqueta: '14–22', desde: 14 * MIN_HORA, hasta: 22 * MIN_HORA },
  { id: '22-6', etiqueta: '22–6', desde: 22 * MIN_HORA, hasta: 6 * MIN_HORA },
]

/** Turnos de 4 h: los mismos tramos de 8 h partidos a la mitad, más el de las 18 que cierra el día. */
export const TURNOS_CORTOS: readonly TurnoFijo[] = [
  { id: '6-10', etiqueta: '6–10', desde: 6 * MIN_HORA, hasta: 10 * MIN_HORA },
  { id: '10-14', etiqueta: '10–14', desde: 10 * MIN_HORA, hasta: 14 * MIN_HORA },
  { id: '14-18', etiqueta: '14–18', desde: 14 * MIN_HORA, hasta: 18 * MIN_HORA },
  { id: '18-22', etiqueta: '18–22', desde: 18 * MIN_HORA, hasta: 22 * MIN_HORA },
  { id: '22-2', etiqueta: '22–2', desde: 22 * MIN_HORA, hasta: 2 * MIN_HORA },
]

const enteroEn = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max

/** Arma el turno que arranca `dia` (0 = lunes) a `desde` y termina a `hasta` (minutos del día).
 *  Si `hasta` es menor o igual que `desde`, termina al día siguiente. Duración cero no existe: null. */
export function crearTurno(dia: number, desde: number, hasta: number): Turno | null {
  if (!enteroEn(dia, 0, 6) || !enteroEn(desde, 0, MIN_DIA - 1) || !enteroEn(hasta, 0, MIN_DIA - 1)) return null
  const duracion = (((hasta - desde) % MIN_DIA) + MIN_DIA) % MIN_DIA
  if (duracion === 0) return null
  const inicio = dia * MIN_DIA + desde
  return { inicio, fin: inicio + duracion }
}

/** Lo mismo que crearTurno, pero desde el texto de dos <input type="time"> ("06:00"). */
export function turnoDesdeCampos(dia: number, desde: string, hasta: string): Turno | null {
  const d = leerHoraCampo(desde)
  const h = leerHoraCampo(hasta)
  return d === null || h === null ? null : crearTurno(dia, d, h)
}

export const diaDeInicio = (t: Turno): number => Math.floor(t.inicio / MIN_DIA)
export const duracionTurno = (t: Turno): number => t.fin - t.inicio

/** El turno termina después de la medianoche del día en que empezó. Terminar justo a las 24:00 no cuenta. */
export const terminaAlDiaSiguiente = (t: Turno): boolean => t.fin > (diaDeInicio(t) + 1) * MIN_DIA

export function tipoDeTurno(t: Turno): TurnoFijo['id'] | 'otro' {
  const desde = t.inicio % MIN_DIA
  const fijo =
    TURNOS_FIJOS.find((f) => f.desde === desde && duracionTurno(t) === 8 * MIN_HORA) ??
    TURNOS_CORTOS.find((f) => f.desde === desde && duracionTurno(t) === 4 * MIN_HORA)
  return fijo ? fijo.id : 'otro'
}

/** Largo del turno para elegir en la pantalla: 4 h, 8 h u otro horario. */
export function largoDeTurno(t: Turno): '4' | '8' | 'otro' {
  const tipo = tipoDeTurno(t)
  if (tipo === 'otro') return 'otro'
  return duracionTurno(t) === 4 * MIN_HORA ? '4' : '8'
}

export const etiquetaTurno = (t: Turno): string => `${horaCorta(t.inicio)}–${horaCorta(t.fin)}`

/** "Termina al día siguiente (martes 6)". Null si termina el mismo día. */
export function descripcionFin(t: Turno): string | null {
  if (!terminaAlDiaSiguiente(t)) return null
  const dia = diaDeInicio(t)
  const siguiente = nombreDia((dia + 1) % 7).toLowerCase()
  const cuando = dia === 6 ? `${siguiente} de la semana siguiente` : siguiente
  return `Termina al día siguiente (${cuando} ${horaCorta(t.fin)})`
}

/** Parte de un turno del domingo que cae en la semana siguiente, ya en minutos de esa semana. */
export function continuaciones(anterior?: Semana): Turno[] {
  if (!anterior) return []
  return anterior.turnos
    .filter((t) => t.fin > MIN_SEMANA)
    .map((t) => ({ inicio: Math.max(0, t.inicio - MIN_SEMANA), fin: t.fin - MIN_SEMANA }))
}

export const turnoDelDia = (sem: Semana, dia: number): Turno | undefined => sem.turnos.find((t) => diaDeInicio(t) === dia)

/** Los turnos cuentan en la semana donde empiezan (así se lee un rol de turnos): un 22–6 del domingo
 *  suma sus 8 h a esa semana, aunque 6 h caigan después del lunes 00:00. */
export const minutosDeTurnos = (sem: Semana): number => sem.turnos.reduce((n, t) => n + duracionTurno(t), 0)

export const textoTotal = (sem: Semana): string => (sem.turnos.length === 0 ? '0 h' : formatearDuracion(minutosDeTurnos(sem)))

export const seSuperponen = (a: Turno, b: Turno): boolean => a.inicio < b.fin && b.inicio < a.fin

export type Origen = 'esta' | 'anterior' | 'siguiente'

export interface Conflicto {
  /** Turno con el que choca, tal como está guardado en su propia semana. */
  con: Turno
  de: Origen
}

/** Todo lo que ocupa tiempo en esta semana, expresado en sus minutos. */
function ocupados(sem: Semana, v: Vecinas): { t: Turno; original: Turno; de: Origen }[] {
  const lista: { t: Turno; original: Turno; de: Origen }[] = sem.turnos.map((t) => ({ t, original: t, de: 'esta' }))
  for (const o of v.anterior?.turnos ?? []) {
    if (o.fin > MIN_SEMANA) lista.push({ t: { inicio: o.inicio - MIN_SEMANA, fin: o.fin - MIN_SEMANA }, original: o, de: 'anterior' })
  }
  for (const o of v.siguiente?.turnos ?? []) {
    lista.push({ t: { inicio: o.inicio + MIN_SEMANA, fin: o.fin + MIN_SEMANA }, original: o, de: 'siguiente' })
  }
  return lista
}

export function buscarConflicto(sem: Semana, nuevo: Turno, v: Vecinas = {}): Conflicto | null {
  const choque = ocupados(sem, v).find((o) => seSuperponen(o.t, nuevo))
  return choque ? { con: choque.original, de: choque.de } : null
}

export function textoConflicto({ con, de }: Conflicto): string {
  const dia = nombreDia(diaDeInicio(con)).toLowerCase()
  const donde = de === 'esta' ? '' : de === 'anterior' ? ' de la semana anterior' : ' de la semana siguiente'
  return `Se superpone con el turno ${etiquetaTurno(con)} del ${dia}${donde}`
}

export type ResultadoTurno =
  | { ok: true; semana: Semana }
  | { ok: false; motivo: 'superpuesto'; conflicto: Conflicto }
  | { ok: false; motivo: 'invalido' }

const porInicio = (a: Turno, b: Turno) => a.inicio - b.inicio

/** Pone el turno de un día (reemplazando el que hubiera) o lo deja libre con `null`.
 *  Nunca modifica la semana recibida; si hay superposición devuelve el error y no cambia nada. */
export function fijarTurnoDelDia(sem: Semana, dia: number, turno: Turno | null, v: Vecinas = {}): ResultadoTurno {
  const resto = sem.turnos.filter((t) => diaDeInicio(t) !== dia)
  if (turno === null) return { ok: true, semana: { ...sem, turnos: resto } }
  if (diaDeInicio(turno) !== dia || turno.fin <= turno.inicio) return { ok: false, motivo: 'invalido' }
  const conflicto = buscarConflicto({ ...sem, turnos: resto }, turno, v)
  if (conflicto) return { ok: false, motivo: 'superpuesto', conflicto }
  return { ok: true, semana: { ...sem, turnos: [...resto, { ...turno }].sort(porInicio) } }
}

/** Copia los turnos de `origen` a `destino` (que conserva sus bloques). Los que chocan con lo que viene de
 *  las semanas vecinas se omiten y se devuelven, para poder avisarlo en vez de perderlos en silencio. */
export function copiarTurnos(origen: Semana, destino: Semana, v: Vecinas = {}): { semana: Semana; omitidos: Turno[] } {
  let semana: Semana = { ...destino, turnos: [] }
  const omitidos: Turno[] = []
  for (const t of origen.turnos) {
    const r = fijarTurnoDelDia(semana, diaDeInicio(t), t, v)
    if (r.ok) semana = r.semana
    else omitidos.push({ ...t })
  }
  return { semana, omitidos }
}

/** Guarda la semana en los datos. Una semana sin turnos ni bloques no ocupa lugar. */
export function conSemana(datos: Datos, sem: Semana): Datos {
  const semanas = { ...datos.semanas }
  if (sem.turnos.length === 0 && sem.bloques.length === 0) delete semanas[sem.lunes]
  else semanas[sem.lunes] = sem
  return { ...datos, semanas }
}

export function vecinasDe(datos: Datos, lunes: FechaISO): Vecinas {
  return { anterior: datos.semanas[sumarDias(lunes, -7)], siguiente: datos.semanas[sumarDias(lunes, 7)] }
}
