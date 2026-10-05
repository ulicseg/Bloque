// Avance de la semana contra las metas. Funciones puras: la pantalla solo muestra lo que devuelven.
//
// Qué cuenta: un bloque "hecho" cuenta entero; uno "mínimo" cuenta como la versión corta (el mínimo de la
// actividad) y, en metas por sesiones, como una sesión: hacer lo mínimo mantiene la racha. Lo salteado y lo
// que sigue planificado no suma, pero se informa aparte.

import { formatearDuracion } from './tiempo'
import type { Actividad, Bloque, IdActividad, Semana } from './types'

export interface Avance {
  actividad: IdActividad
  nombre: string
  /** Meta en sus propias unidades: sesiones u horas. */
  tipoMeta: Actividad['tipoMeta']
  meta: number
  hechos: number
  minimos: number
  salteados: number
  planificados: number
  /** Minutos que cuentan (hecho entero + mínimo reducido). */
  minutos: number
  /** Entre 0 y 1; 1 = meta cumplida. */
  fraccion: number
  cumplida: boolean
  /** "2 de 4 sesiones · 1 mínimo" / "3 h 30 min de 10 h". */
  texto: string
}

const duracion = (b: Bloque) => b.fin - b.inicio

/** Lo que vale un bloque en minutos: el mínimo vale lo que dice el mínimo de la actividad (nunca más que el bloque). */
export function minutosEfectivos(b: Bloque, a: Actividad): number {
  if (b.estado === 'hecho') return duracion(b)
  if (b.estado === 'minimo') return Math.min(duracion(b), a.minimoMin ?? duracion(b))
  return 0
}

export function avanceSemana(semana: Semana, actividades: Actividad[]): Avance[] {
  return actividades
    .filter((a) => a.meta > 0)
    .map((a): Avance => {
      const mios = semana.bloques.filter((b) => b.actividad === a.id)
      const cuenta = (estado: Bloque['estado']) => mios.filter((b) => b.estado === estado).length
      const hechos = cuenta('hecho')
      const minimos = cuenta('minimo')
      const minutos = mios.reduce((n, b) => n + minutosEfectivos(b, a), 0)
      const lograda = a.tipoMeta === 'sesiones' ? hechos + minimos : minutos
      const objetivo = a.tipoMeta === 'sesiones' ? Math.ceil(a.meta) : Math.round(a.meta * 60)
      const fraccion = Math.min(1, lograda / objetivo)
      const resto = minimos > 0 ? ` · ${minimos === 1 ? '1 mínimo' : `${minimos} mínimos`}` : ''
      const texto =
        a.tipoMeta === 'sesiones'
          ? `${lograda} de ${objetivo} ${objetivo === 1 ? 'sesión' : 'sesiones'}${resto}`
          : `${formatearDuracion(minutos)} de ${formatearDuracion(objetivo)}${resto}`
      return {
        actividad: a.id,
        nombre: a.nombre,
        tipoMeta: a.tipoMeta,
        meta: a.meta,
        hechos,
        minimos,
        salteados: cuenta('salteado'),
        planificados: cuenta('planificado'),
        minutos,
        fraccion,
        cumplida: lograda >= objetivo,
        texto,
      }
    })
}

/** El mínimo solo se ofrece si la actividad tiene versión mínima. */
export const admiteMinimo = (a: Actividad | undefined): boolean => a?.minimoMin != null
