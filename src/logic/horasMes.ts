// Control propio de horas trabajadas por mes. Se calcula siempre a partir de los turnos guardados:
// no hay nada más que sincronizar ni migrar, y corregir un turno corrige el contador.

import { MIN_HORA, diasDelMes, formatearDuracion, lunesDe, mesDe, rangoSemana, sumarDias } from './tiempo'
import { diaDeInicio, duracionTurno } from './turnos'
import type { Datos, FechaISO } from './types'

/** Lo que se espera trabajar por semana (4 h × 6 días); el franco semanal no suma ni resta. */
export const MIN_BASE_SEMANA = 24 * MIN_HORA

export interface SemanaDelMes {
  lunes: FechaISO
  rango: string
  /** Días de esa semana que caen dentro del mes (en las semanas de borde son menos de 7). */
  diasEnMes: number
  /** Solo los turnos que EMPIEZAN dentro del mes: un 22–6 del último día del mes cuenta entero en ese mes. */
  minutos: number
  /** Proporcional a los días del mes; 0 si la semana todavía no tiene turnos cargados. */
  esperadoMin: number
  /** Una semana sin turnos cargados no se compara: no sería un faltante sino un dato que todavía no está. */
  cargada: boolean
}

export interface HorasMes {
  mes: string
  semanas: SemanaDelMes[]
  totalMin: number
  /** Suma del esperado de las semanas cargadas. */
  esperadoMin: number
  /** Positivo = horas de más sobre la base. */
  diferenciaMin: number
}

export function horasDelMes(datos: Pick<Datos, 'semanas'>, mes: string): HorasMes {
  const ultimo = `${mes}-${String(diasDelMes(mes)).padStart(2, '0')}`
  const semanas: SemanaDelMes[] = []
  for (let lunes = lunesDe(`${mes}-01`); lunes <= ultimo; lunes = sumarDias(lunes, 7)) {
    const sem = datos.semanas[lunes]
    const diasEnMes = Array.from({ length: 7 }, (_, d) => mesDe(sumarDias(lunes, d))).filter((m) => m === mes).length
    const minutos = (sem?.turnos ?? [])
      .filter((t) => mesDe(sumarDias(lunes, diaDeInicio(t))) === mes)
      .reduce((suma, t) => suma + duracionTurno(t), 0)
    const cargada = (sem?.turnos.length ?? 0) > 0
    semanas.push({
      lunes,
      rango: rangoSemana(lunes),
      diasEnMes,
      minutos,
      esperadoMin: cargada ? Math.round((MIN_BASE_SEMANA * diasEnMes) / 7) : 0,
      cargada,
    })
  }
  const totalMin = semanas.reduce((s, x) => s + x.minutos, 0)
  const esperadoMin = semanas.reduce((s, x) => s + x.esperadoMin, 0)
  // Solo se compara lo cargado: horas de semanas sin base no deben inflar la diferencia
  const comparable = semanas.reduce((s, x) => s + (x.cargada ? x.minutos : 0), 0)
  return { mes, semanas, totalMin, esperadoMin, diferenciaMin: comparable - esperadoMin }
}

/** "+3 h 30 min", "−2 h", "Justo". */
export function textoDiferencia(min: number): string {
  if (min === 0) return 'Justo'
  return `${min > 0 ? '+' : '−'}${formatearDuracion(Math.abs(min))}`
}
