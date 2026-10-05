// Sugerencia de la semana. Función pura: mismos datos, misma sugerencia (no hay azar ni reloj, y todos los
// empates se resuelven por el horario más temprano).
//
// Idea general: se recorren las actividades por prioridad y, de a un bloque por vez, se generan todos los
// lugares válidos (dentro de una ventana, sin pisar nada, respetando las reglas de la actividad y los topes de
// uso). De esos se elige el de mejor puntaje. Si no hay ninguno, el bloque no se fuerza: queda en el informe
// con el motivo. Los bloques fijos (el psicólogo) se descuentan de las ventanas antes de empezar.

import { AJUSTES_POR_DEFECTO } from './defaults'
import { MIN_DIA, MIN_SEMANA, formatearDuracion } from './tiempo'
import { restar, unir, type DiaCalculado, type Intervalo } from './windows'
import type { Actividad, Ajustes, Bloque, IdActividad } from './types'

/** Tope de lo que se asigna de las ventanas de cada día y de toda la semana: el resto es aire para imprevistos. */
export const TOPE_DIA = 0.85
export const TOPE_SEMANA = 0.7

export const TRASLADO_GIMNASIO_MIN = 15
export const MARGEN_SUENO_GIMNASIO_MIN = 120
export const VENTANA_MIN_PROGRAMACION = 120
export const VENTANA_MIN_LIBRE = 180

// Franja por el punto medio del bloque: así un 17:30–20:30 cuenta como noche y un 13:45–15:00 como tarde.
const TARDE_DESDE = 12 * 60
const NOCHE_DESDE = 18 * 60

/** Las que exigen concentración: no van en una ventana "foco: no" (cerca de la hora de dormir). */
const FOCO: ReadonlySet<IdActividad> = new Set(['ingles', 'programacion'])

/** Inglés admite dos por día; el resto, uno (caminata es diaria, no varias por día). */
const MAXIMO_POR_DIA: Record<IdActividad, number> = {
  ingles: 2,
  gimnasio: 1,
  programacion: 1,
  psicologo: 1,
  caminata: 1,
  libre: 1,
}

export type MotivoFalta =
  | 'tope-semana'
  | 'tope-dia'
  | 'maximo-dia'
  | 'foco'
  | 'ventana-corta'
  | 'noche-libre'
  | 'sueno'
  | 'sin-espacio'
  | 'dias-no'
  | 'fija'

const pct = (x: number) => `${Math.round(x * 100)} %`

const TEXTO_MOTIVO: Record<MotivoFalta, string> = {
  'tope-semana': `ya se asignó el ${pct(TOPE_SEMANA)} de las ventanas de la semana`,
  'tope-dia': `los días con lugar ya están al ${pct(TOPE_DIA)} de sus ventanas`,
  'maximo-dia': 'ya hay el máximo de bloques por día',
  foco: 'las ventanas que quedan son «foco: no»',
  'ventana-corta': `no hay ventanas de ${VENTANA_MIN_PROGRAMACION / 60} h o más`,
  'noche-libre': `no hay una noche sin turno con una ventana de ${VENTANA_MIN_LIBRE / 60} h o más`,
  sueno: `lo que queda cae en las ${MARGEN_SUENO_GIMNASIO_MIN / 60} h previas a dormir`,
  'sin-espacio': 'no queda lugar en las ventanas libres',
  'dias-no': 'los días en que sí se puede ya no tienen lugar',
  fija: 'es un bloque fijo: ubicalo a mano',
}

export interface Faltante {
  actividad: IdActividad
  nombre: string
  /** Meta en minutos y lo que ya hay (bloques fijos + sugeridos). */
  metaMin: number
  colocadoMin: number
  bloquesFaltantes: number
  faltanMin: number
  motivo: MotivoFalta
  /** Frase lista para mostrar. */
  detalle: string
}

export interface Uso {
  /** Suma de las ventanas libres. */
  ventanasMin: number
  /** Lo asignado por la sugerencia (el gimnasio cuenta sus traslados). Los bloques fijos no entran. */
  asignadoMin: number
  topeMin: number
}

export interface Sugerencia {
  /** Solo los bloques propuestos, ordenados por horario; los fijos no se repiten acá. */
  bloques: Bloque[]
  faltantes: Faltante[]
  usoSemana: Uso
  usoDias: Uso[]
}

interface Candidato {
  dia: number
  inicio: number
  fin: number
  /** Posición de la ventana dentro del día. */
  ventana: number
  /** Largo del tramo libre donde cae. */
  pieza: number
}

interface Contexto {
  dias: DiaCalculado[]
  ocupados: Intervalo[][]
  asignadoDia: number[]
  asignado: number
  capDia: number[]
  capSemana: number
  cuentas: Map<IdActividad, number[]>
  /** Inicios de cada sueño (ya unidos entre días). */
  suenos: number[]
  conTurno: boolean[]
  bloques: Bloque[]
}

interface Relajar {
  topes?: boolean
  maxDia?: boolean
  foco?: boolean
  especial?: boolean
  /** Ignora los días en que la actividad no se puede hacer. */
  dias?: boolean
}

const trasladoDe = (a: Actividad) => (a.id === 'gimnasio' ? TRASLADO_GIMNASIO_MIN : 0)
const cuenta = (c: Contexto, id: IdActividad, dia: number) => c.cuentas.get(id)?.[dia] ?? 0

/** Cuándo empieza cada sueño. Un sueño cortado por la medianoche son dos tramos: acá se vuelven uno solo.
 *  La noche del domingo no se ve (depende de la semana siguiente): se supone el sueño por defecto. */
function iniciosDeSueno(dias: DiaCalculado[], ajustes: Ajustes): number[] {
  const tramos = dias.flatMap((d) => d.tramos.filter((t) => t.tipo === 'sueno'))
  const unidos = unir(tramos.map((t): Intervalo => [t.inicio, t.fin]))
  const supuesto = ajustes.suenoInicio < ajustes.suenoFin ? MIN_SEMANA + ajustes.suenoInicio : 6 * MIN_DIA + ajustes.suenoInicio
  return [...new Set([...unidos.map(([inicio]) => inicio), supuesto])].sort((x, y) => x - y)
}

function armarContexto(dias: DiaCalculado[], fijos: Bloque[], ajustes: Ajustes): Contexto {
  const ocupados: Intervalo[][] = dias.map(() => [])
  for (const b of fijos) {
    if (b.fin <= b.inicio) continue
    dias.forEach((_, d) => {
      const desde = Math.max(b.inicio, d * MIN_DIA)
      const hasta = Math.min(b.fin, (d + 1) * MIN_DIA)
      if (hasta > desde) ocupados[d].push([desde, hasta])
    })
  }
  const ventanasDia = dias.map((d) => d.ventanas.reduce((n, v) => n + (v.fin - v.inicio), 0))
  return {
    dias,
    ocupados: ocupados.map(unir),
    asignadoDia: dias.map(() => 0),
    asignado: 0,
    capDia: ventanasDia.map((m) => Math.floor(m * TOPE_DIA)),
    capSemana: Math.floor(ventanasDia.reduce((n, m) => n + m, 0) * TOPE_SEMANA),
    cuentas: new Map(),
    suenos: iniciosDeSueno(dias, ajustes),
    conTurno: dias.map((d) => d.tramos.some((t) => t.tipo === 'turno')),
    bloques: [],
  }
}

/** Todos los lugares donde cabe un bloque de `dur` minutos. `relajar` apaga reglas de a una: sirve para
 *  averiguar cuál fue la que dejó a la actividad sin lugar. */
function candidatos(ctx: Contexto, a: Actividad, dur: number, relajar: Relajar = {}): Candidato[] {
  const traslado = trasladoDe(a)
  const costo = dur + 2 * traslado
  const salida: Candidato[] = []
  ctx.dias.forEach((d, dia) => {
    if (!relajar.dias && a.diasNo?.includes(dia)) return
    if (!relajar.maxDia && cuenta(ctx, a.id, dia) >= MAXIMO_POR_DIA[a.id]) return
    if (!relajar.topes && (ctx.asignadoDia[dia] + costo > ctx.capDia[dia] || ctx.asignado + costo > ctx.capSemana)) return
    d.ventanas.forEach((w, idx) => {
      if (!relajar.foco && FOCO.has(a.id) && !w.foco) return
      const largo = w.fin - w.inicio
      if (!relajar.especial) {
        if (a.id === 'programacion' && largo < VENTANA_MIN_PROGRAMACION) return
        if (a.id === 'libre' && (ctx.conTurno[dia] || largo < VENTANA_MIN_LIBRE)) return
      }
      // El gimnasio tiene que terminar 2 h antes del próximo sueño
      const limite =
        a.id === 'gimnasio' && !relajar.especial
          ? (ctx.suenos.find((s) => s >= w.fin) ?? Infinity) - MARGEN_SUENO_GIMNASIO_MIN
          : Infinity
      for (const [pa, pb] of restar(w.inicio, w.fin, ctx.ocupados[dia])) {
        const desde = pa + traslado
        const hasta = Math.min(pb - traslado, limite)
        if (hasta - desde < dur) continue
        // Pegado al principio o al final del tramo: así los bloques se juntan y no dejan huecos inútiles
        for (const inicio of new Set([desde, hasta - dur])) {
          if (!relajar.especial && a.id === 'libre' && inicio + dur / 2 - dia * MIN_DIA < NOCHE_DESDE) continue
          salida.push({ dia, inicio, fin: inicio + dur, ventana: idx, pieza: pb - pa })
        }
      }
    })
  })
  return salida
}

/** Por qué no entró un bloque. Se van apagando las reglas de la menos a la más de fondo (topes, máximo por día,
 *  foco, reglas propias de la actividad): la primera que hace aparecer un lugar es la que lo estaba impidiendo. */
function motivoDe(ctx: Contexto, a: Actividad, dur: number): MotivoFalta {
  const hay = (r: Relajar) => candidatos(ctx, a, dur, r).length > 0
  if (hay({ topes: true })) return ctx.asignado + dur + 2 * trasladoDe(a) > ctx.capSemana ? 'tope-semana' : 'tope-dia'
  if (hay({ topes: true, maxDia: true })) return 'maximo-dia'
  if (hay({ topes: true, maxDia: true, foco: true })) return 'foco'
  if (hay({ topes: true, maxDia: true, foco: true, especial: true })) {
    return a.id === 'gimnasio' ? 'sueno' : a.id === 'programacion' ? 'ventana-corta' : 'noche-libre'
  }
  if (hay({ topes: true, maxDia: true, foco: true, especial: true, dias: true })) return 'dias-no'
  return 'sin-espacio'
}

function franjaDe(c: Candidato): Actividad['franja'] {
  const m = (c.inicio + c.fin) / 2 - c.dia * MIN_DIA
  return m < TARDE_DESDE ? 'manana' : m < NOCHE_DESDE ? 'tarde' : 'noche'
}

/** Menor es mejor; se compara de izquierda a derecha. Lo último siempre es el horario, para desempatar. */
function puntaje(ctx: Contexto, a: Actividad, c: Candidato): number[] {
  const desajuste = a.franja === 'cualquiera' || a.franja === franjaDe(c) ? 0 : 1
  const vecino = cuenta(ctx, a.id, c.dia - 1) + cuenta(ctx, a.id, c.dia + 1) > 0 ? 1 : 0
  const horario = c.inicio
  switch (a.id) {
    // Repartido en la semana (menos bloques ese día primero) y en las primeras ventanas del día
    case 'ingles':
      return [desajuste, cuenta(ctx, a.id, c.dia), c.ventana, c.dia, horario]
    // Un hueco justo para la caminata, en el día menos cargado: deja los tramos grandes para lo demás
    case 'caminata':
      return [desajuste, ctx.asignadoDia[c.dia], c.pieza, c.dia, horario]
    // Gimnasio, programación y libre: no en días seguidos y en el día más liviano
    default:
      return [desajuste, vecino, ctx.asignadoDia[c.dia], c.dia, horario]
  }
}

function comparar(x: number[], y: number[]): number {
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i]
  return 0
}

function confirmar(ctx: Contexto, a: Actividad, c: Candidato) {
  const traslado = trasladoDe(a)
  ctx.ocupados[c.dia] = unir([...ctx.ocupados[c.dia], [c.inicio - traslado, c.fin + traslado]])
  const costo = c.fin - c.inicio + 2 * traslado
  ctx.asignadoDia[c.dia] += costo
  ctx.asignado += costo
  const porDia = ctx.cuentas.get(a.id) ?? ctx.dias.map(() => 0)
  porDia[c.dia]++
  ctx.cuentas.set(a.id, porDia)
  ctx.bloques.push({ id: `sug-${a.id}-${c.inicio}`, actividad: a.id, inicio: c.inicio, fin: c.fin, estado: 'planificado', fijo: false })
}

/** Duraciones de los bloques que faltan para llegar a la meta, descontando lo que ya hay fijo. En metas por
 *  horas, lo que sobra después de los bloques enteros va en uno más corto (nunca menor que el mínimo). */
function bloquesPorColocar(a: Actividad, fijosDeLaActividad: Bloque[]): number[] {
  if (a.tipoMeta === 'sesiones') {
    return Array.from({ length: Math.max(0, Math.ceil(a.meta) - fijosDeLaActividad.length) }, () => a.duracionMin)
  }
  let resto = Math.round(a.meta * 60) - fijosDeLaActividad.reduce((n, b) => n + (b.fin - b.inicio), 0)
  const salida: number[] = []
  while (resto >= a.duracionMin && a.duracionMin > 0) {
    salida.push(a.duracionMin)
    resto -= a.duracionMin
  }
  if (resto > 0) salida.push(Math.min(a.duracionMin, Math.max(resto, a.minimoMin ?? 15)))
  return salida
}

const metaEnMinutos = (a: Actividad) => (a.tipoMeta === 'sesiones' ? Math.ceil(a.meta) * a.duracionMin : Math.round(a.meta * 60))

function frase(a: Actividad, bloques: number, min: number, motivo: MotivoFalta): string {
  const cuantos = bloques === 1 ? 'falta 1 bloque' : `faltan ${bloques} bloques`
  return `${a.nombre}: ${cuantos} (${formatearDuracion(min)}); ${TEXTO_MOTIVO[motivo]}.`
}

/** Propone dónde ubicar los bloques de la semana.
 *  `dias` sale de computeWindows; `metas` son las actividades con su meta, duración, franja y prioridad;
 *  `fijos` son los bloques que no se mueven (el psicólogo): cuentan para la meta y no se pisan. */
export function suggest(
  dias: DiaCalculado[],
  metas: Actividad[],
  fijos: Bloque[] = [],
  ajustes: Ajustes = AJUSTES_POR_DEFECTO,
): Sugerencia {
  const ctx = armarContexto(dias, fijos, ajustes)
  const faltantes: { prioridad: number; orden: number; f: Faltante }[] = []
  const hechosPor = (a: Actividad) => fijos.filter((b) => b.actividad === a.id && b.fin > b.inicio)

  const lista = metas.map((a, orden) => ({ a, orden })).filter(({ a }) => a.meta > 0)
  lista.sort((x, y) => x.a.prioridad - y.a.prioridad || x.orden - y.orden)

  for (const { a, orden } of lista) {
    const fijosDeLaActividad = hechosPor(a)
    const pendientes = bloquesPorColocar(a, fijosDeLaActividad)
    const sinLugar: number[] = []
    let motivo: MotivoFalta | undefined = a.fija ? 'fija' : undefined

    if (a.fija) {
      sinLugar.push(...pendientes)
    } else {
      for (const dur of pendientes) {
        const posibles = candidatos(ctx, a, dur)
        if (posibles.length === 0) {
          sinLugar.push(dur)
          motivo ??= motivoDe(ctx, a, dur)
          continue
        }
        let mejor = posibles[0]
        let mejorPuntaje = puntaje(ctx, a, mejor)
        for (const c of posibles) {
          const p = puntaje(ctx, a, c)
          if (comparar(p, mejorPuntaje) < 0) [mejor, mejorPuntaje] = [c, p]
        }
        confirmar(ctx, a, mejor)
      }
    }

    if (sinLugar.length > 0 && motivo) {
      const faltanMin = sinLugar.reduce((n, m) => n + m, 0)
      const colocadoMin =
        fijosDeLaActividad.reduce((n, b) => n + (b.fin - b.inicio), 0) +
        ctx.bloques.filter((b) => b.actividad === a.id).reduce((n, b) => n + (b.fin - b.inicio), 0)
      faltantes.push({
        prioridad: a.prioridad,
        orden,
        f: {
          actividad: a.id,
          nombre: a.nombre,
          metaMin: metaEnMinutos(a),
          colocadoMin,
          bloquesFaltantes: sinLugar.length,
          faltanMin,
          motivo,
          detalle: frase(a, sinLugar.length, faltanMin, motivo),
        },
      })
    }
  }

  const ventanasDia = dias.map((d) => d.ventanas.reduce((n, v) => n + (v.fin - v.inicio), 0))
  return {
    bloques: [...ctx.bloques].sort((x, y) => x.inicio - y.inicio),
    faltantes: faltantes.sort((x, y) => x.prioridad - y.prioridad || x.orden - y.orden).map(({ f }) => f),
    usoSemana: { ventanasMin: ventanasDia.reduce((n, m) => n + m, 0), asignadoMin: ctx.asignado, topeMin: ctx.capSemana },
    usoDias: dias.map((_, d) => ({ ventanasMin: ventanasDia[d], asignadoMin: ctx.asignadoDia[d], topeMin: ctx.capDia[d] })),
  }
}

/** Los bloques separados por día (0 = lunes), para mostrarlos en lista sin que la pantalla calcule. */
export function bloquesPorDia(bloques: Bloque[]): Bloque[][] {
  const dias: Bloque[][] = Array.from({ length: 7 }, () => [])
  for (const b of bloques) dias[Math.min(6, Math.max(0, Math.floor(b.inicio / MIN_DIA)))].push(b)
  return dias.map((d) => d.sort((x, y) => x.inicio - y.inicio))
}
