// Tipos del dominio. Todos los tiempos son minutos desde el lunes a las 00:00 (hora de Argentina):
// así un turno que cruza la medianoche (22–6) es un solo intervalo [inicio, fin) sin ambigüedad,
// y puede pasar de 10080 (el fin de la semana) cuando arranca el domingo.

/** Fecha calendario AAAA-MM-DD. Argentina no tiene horario de verano, así que no hay días de 23 o 25 h. */
export type FechaISO = string

export type IdActividad = 'ingles' | 'gimnasio' | 'programacion' | 'psicologo' | 'caminata' | 'libre' | 'revision'

export type EstadoBloque = 'planificado' | 'hecho' | 'minimo' | 'salteado'
export const ESTADOS_BLOQUE: readonly EstadoBloque[] = ['planificado', 'hecho', 'minimo', 'salteado']

export type TipoMeta = 'sesiones' | 'horas'
export type Franja = 'manana' | 'tarde' | 'noche' | 'cualquiera'

/** Comida diaria que no se puede pisar con un bloque. `inicio` son minutos desde las 00:00 del día. */
export interface Comida {
  nombre: string
  inicio: number
  duracionMin: number
}

export interface Ajustes {
  trasladoMin: number
  /** Sueño que se descuenta por defecto entre un turno y el siguiente bloque libre. */
  suenoMin: number
  comidas: Comida[]
}

export interface Actividad {
  id: IdActividad
  nombre: string
  /** Clave de la paleta de design/actividades.ts. */
  color: IdActividad
  tipoMeta: TipoMeta
  /** En la unidad de `tipoMeta`: cantidad de sesiones o cantidad de horas por semana. */
  meta: number
  duracionMin: number
  /** null = no hay versión mínima (el bloque se hace entero o se saltea). */
  minimoMin: number | null
  franja: Franja
  /** 1 = la que se ubica primero cuando falta lugar. */
  prioridad: number
  /** Siempre va en el mismo horario (psicólogo): se ubica a mano, no se sugiere. */
  fija: boolean
}

/** Intervalo [inicio, fin) en minutos desde el lunes 00:00. `fin` puede superar el fin de la semana. */
export interface Turno {
  inicio: number
  fin: number
}

export interface Bloque {
  id: string
  actividad: IdActividad
  inicio: number
  fin: number
  estado: EstadoBloque
  /** Marcado a mano: la sugerencia automática no lo mueve. */
  fijo: boolean
}

/** Identificada por la fecha de su lunes. */
export interface Semana {
  lunes: FechaISO
  turnos: Turno[]
  bloques: Bloque[]
}

export interface Datos {
  pestaña: string
  /** Clave = lunes de la semana (AAAA-MM-DD). */
  semanas: Record<FechaISO, Semana>
  /** Agregado en v3. */
  ajustes: Ajustes
  actividades: Actividad[]
}
