// Tipos del dominio. Todos los tiempos son minutos desde el lunes a las 00:00 (hora de Argentina):
// así un turno que cruza la medianoche (22–6) es un solo intervalo [inicio, fin) sin ambigüedad,
// y puede pasar de 10080 (el fin de la semana) cuando arranca el domingo.

/** Fecha calendario AAAA-MM-DD. Argentina no tiene horario de verano, así que no hay días de 23 o 25 h. */
export type FechaISO = string

export type IdActividad = 'ingles' | 'gimnasio' | 'programacion' | 'psicologo' | 'caminata' | 'libre' | 'siesta'

export type EstadoBloque = 'planificado' | 'hecho' | 'minimo' | 'salteado'
export const ESTADOS_BLOQUE: readonly EstadoBloque[] = ['planificado', 'hecho', 'minimo', 'salteado']

export type TipoMeta = 'sesiones' | 'horas'
export type Franja = 'manana' | 'tarde' | 'noche'

/** Comida diaria que no se puede pisar con un bloque. `inicio` son minutos desde las 00:00 del día. */
export interface Comida {
  nombre: string
  inicio: number
  duracionMin: number
}

/** Reglas del cálculo de ventanas libres. Los horarios son minutos desde las 00:00 del día. */
export interface Ajustes {
  trasladoMin: number
  /** Los minutos después de levantarse que no se pueden asignar. */
  despertarMin: number
  /** Descanso después de un turno largo (8 h), salvo el nocturno. */
  recuperacionMin: number
  /** Sueño por defecto. Si el inicio es menor que el fin (00:00–08:00) la noche arranca después de medianoche;
   *  si es mayor (23:00–07:00) arranca la noche anterior. */
  suenoInicio: number
  suenoFin: number
  /** Un turno que termina desde esta hora (21:00) hasta la medianoche manda a dormir a `suenoTrasTardeInicio`. */
  turnoTardeDesde: number
  suenoTrasTardeInicio: number
  /** Un turno que empieza a esta hora o antes (07:00) manda a dormir la noche anterior desde `suenoPreTempranoInicio`. */
  turnoTempranoHasta: number
  suenoPreTempranoInicio: number
  /** Tras un turno nocturno se duerme hasta esta hora (14:00). */
  suenoTrasNocheHasta: number
  /** Una ventana que termina menos de estos minutos antes de dormir no sirve para concentrarse. */
  focoMargenMin: number
  /** Las ventanas más cortas que esto se descartan. */
  ventanaMinimaMin: number
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
  /** Franjas del día en que prefiere ubicarse (una o varias). Las tres juntas equivalen a "cualquiera". Reemplaza a `franja` desde la v8. */
  franjas: Franja[]
  /** 1 = la que se ubica primero cuando falta lugar. */
  prioridad: number
  /** Siempre va en el mismo horario (psicólogo): se ubica a mano, no se sugiere. */
  fija: boolean
  /** Días de la semana (0 = lunes … 6 = domingo) en que no se puede hacer, por ejemplo el gimnasio cerrado. Agregado en v6. */
  diasNo?: number[]
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
