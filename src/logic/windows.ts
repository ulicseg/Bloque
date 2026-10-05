// Ventanas libres de la semana. Función pura: no lee el reloj ni el almacenamiento.
//
// Todo se calcula en minutos desde el lunes 00:00 de la semana pedida (como los turnos). Los turnos de la
// semana anterior se corren -10080 para poder ver cómo un 22–6 del domingo se come la mañana del lunes.
// Primero se arma la lista de tramos ocupados de toda la semana (con sus vecinos), se resuelven los choques
// por prioridad y recién después se recorta por día y se miran los huecos.

import { MIN_DIA, MIN_SEMANA, sumarDias } from './tiempo'
import { diaDeInicio, duracionTurno, terminaAlDiaSiguiente } from './turnos'
import type { Ajustes, Semana, Turno } from './types'

export type TipoTramo = 'sueno' | 'despertar' | 'traslado' | 'turno' | 'recuperacion' | 'comida'

/** Minutos desde el lunes 00:00 de la semana pedida. */
export interface Tramo {
  tipo: TipoTramo
  inicio: number
  fin: number
}

export interface Ventana {
  inicio: number
  fin: number
  /** false si termina menos de `focoMargenMin` antes de dormir. */
  foco: boolean
}

export interface DiaCalculado {
  /** 0 = lunes. */
  dia: number
  /** Ocupados, ordenados y sin superponerse; recortados a las 00:00–24:00 del día. */
  tramos: Tramo[]
  ventanas: Ventana[]
}

// Cuando dos tramos chocan manda el de menor número: lo que no se puede mover le gana a lo que sí.
// Las comidas son lo último y, si chocan con algo, no se achican: se descartan enteras (regla 8).
const PRIORIDAD: Record<TipoTramo, number> = {
  turno: 0,
  traslado: 1,
  recuperacion: 2,
  sueno: 3,
  despertar: 4,
  comida: 5,
}

/** Desde esta duración un turno se considera "de 8 h" y lleva recuperación. */
const TURNO_LARGO_MIN = 8 * 60

export type Intervalo = [number, number]

/** Lo que queda de [a, b) al sacarle los intervalos `ocupados` (ordenados y sin superponerse). */
export function restar(a: number, b: number, ocupados: Intervalo[]): Intervalo[] {
  const resto: Intervalo[] = []
  let cursor = a
  for (const [oa, ob] of ocupados) {
    if (ob <= cursor) continue
    if (oa >= b) break
    if (oa > cursor) resto.push([cursor, oa])
    cursor = Math.max(cursor, ob)
  }
  if (cursor < b) resto.push([cursor, b])
  return resto
}

export function unir(intervalos: Intervalo[]): Intervalo[] {
  const orden = [...intervalos].sort((x, y) => x[0] - y[0])
  const salida: Intervalo[] = []
  for (const [a, b] of orden) {
    const ultimo = salida[salida.length - 1]
    if (ultimo && a <= ultimo[1]) ultimo[1] = Math.max(ultimo[1], b)
    else salida.push([a, b])
  }
  return salida
}

const hayChoque = (a: number, b: number, ocupados: Intervalo[]) => ocupados.some(([oa, ob]) => a < ob && oa < b)

/** La semana anterior solo cuenta si es de verdad la contigua: con otra, los minutos no cerrarían. */
function turnosAnteriores(semana: Semana, anterior?: Semana): Turno[] {
  if (!anterior || sumarDias(anterior.lunes, 7) !== semana.lunes) return []
  return anterior.turnos.map((t) => ({ inicio: t.inicio - MIN_SEMANA, fin: t.fin - MIN_SEMANA }))
}

export function computeWindows(semana: Semana, ajustes: Ajustes, semanaAnterior?: Semana): DiaCalculado[] {
  const a = ajustes
  const turnos = [...turnosAnteriores(semana, semanaAnterior), ...semana.turnos].sort((x, y) => x.inicio - y.inicio)
  // Antes de un turno hay que levantarse (despertar) y viajar; el sueño termina antes de eso (regla 5).
  const margenSalida = a.trasladoMin + a.despertarMin
  const candidatos: Tramo[] = []
  const agregar = (tipo: TipoTramo, inicio: number, fin: number) => {
    if (fin > inicio) candidatos.push({ tipo, inicio, fin })
  }

  // --- Lo que dice cada turno (reglas 3, 6 y 7)
  for (const t of turnos) {
    agregar('turno', t.inicio, t.fin)
    agregar('traslado', t.inicio - a.trasladoMin, t.inicio)
    agregar('traslado', t.fin, t.fin + a.trasladoMin)
    if (terminaAlDiaSiguiente(t)) {
      // Nocturno: no lleva recuperación. Esos 30 min entre el traslado y el sueño son la preparación para
      // dormir, espejo del despertar: se marcan ocupados para que no aparezca una ventana inútil.
      agregar('despertar', t.fin + a.trasladoMin, t.fin + margenSalida)
    } else if (duracionTurno(t) >= TURNO_LARGO_MIN) {
      agregar('recuperacion', t.fin + a.trasladoMin, t.fin + a.trasladoMin + a.recuperacionMin)
    }
  }

  // Lo que ningún sueño puede pisar. Si el sueño arrancaría adentro (ej. regla 5 con un 14–22 la noche
  // anterior), se corre al final: se duerme cuando se termina de trabajar, no antes.
  const fuertes = unir(candidatos.map((c): Intervalo => [c.inicio, c.fin]))
  const despuesDeLoFuerte = (m: number) => {
    for (const [fa, fb] of fuertes) if (m >= fa && m < fb) m = fb
    return m
  }
  const primerTurnoDesde = (m: number) => turnos.find((t) => t.inicio >= m)
  /** El sueño no puede seguir cuando hay que levantarse para el próximo turno. */
  const finAntesDelProximoTurno = (desde: number, fin: number) => {
    const t = primerTurnoDesde(desde)
    return t ? Math.min(fin, t.inicio - margenSalida) : fin
  }
  const dormir = (inicio: number, fin: number) => {
    const f = finAntesDelProximoTurno(inicio, fin)
    if (inicio >= f) return
    agregar('sueno', inicio, f)
    agregar('despertar', f, f + a.despertarMin)
  }

  // --- Sueño de cada noche: la noche n arranca el día n y termina la mañana del día n+1.
  // La noche 6 (domingo→lunes siguiente) usa el sueño por defecto: no se conoce la semana que viene.
  for (let n = -1; n <= 6; n++) {
    const hoy = n * MIN_DIA
    const manana = hoy + MIN_DIA
    // Un turno que cruza la medianoche ocupa la noche: el sueño va después, de día (regla 6)
    if (turnos.some((t) => diaDeInicio(t) === n && terminaAlDiaSiguiente(t))) continue

    const arranques: number[] = []
    // Regla 4: turno que termina entre las 21 y las 24
    if (turnos.some((t) => diaDeInicio(t) === n && t.fin - hoy >= a.turnoTardeDesde)) {
      arranques.push(hoy + a.suenoTrasTardeInicio)
    }
    // Regla 5: turno que empieza temprano la mañana siguiente
    if (turnos.some((t) => t.inicio >= manana && t.inicio <= manana + a.turnoTempranoHasta)) {
      arranques.push(hoy + a.suenoPreTempranoInicio)
    }
    // Las reglas de un turno mandan sobre las de por defecto (regla 9)
    const porDefecto = a.suenoInicio < a.suenoFin ? manana + a.suenoInicio : hoy + a.suenoInicio
    const inicio = despuesDeLoFuerte(arranques.length > 0 ? Math.min(...arranques) : porDefecto)
    dormir(inicio, manana + a.suenoFin)
  }

  // --- Sueño después de cada turno nocturno (regla 6): de fin + traslado + despertar hasta las 14:00
  for (const t of turnos) {
    if (!terminaAlDiaSiguiente(t)) continue
    const diaFin = Math.floor(t.fin / MIN_DIA)
    dormir(t.fin + margenSalida, diaFin * MIN_DIA + a.suenoTrasNocheHasta)
  }

  // --- Comidas (regla 8). Se agregan al final para saber contra qué chocan.
  for (let d = 0; d < 7; d++) {
    for (const c of a.comidas) agregar('comida', d * MIN_DIA + c.inicio, d * MIN_DIA + c.inicio + c.duracionMin)
  }

  // --- Resolver choques por prioridad
  const resueltos: Tramo[] = []
  let ocupados: Intervalo[] = []
  const porPrioridad = [...candidatos].sort((x, y) => PRIORIDAD[x.tipo] - PRIORIDAD[y.tipo] || x.inicio - y.inicio)
  for (const c of porPrioridad) {
    if (c.tipo === 'comida') {
      if (hayChoque(c.inicio, c.fin, ocupados)) continue
      resueltos.push(c)
      ocupados = unir([...ocupados, [c.inicio, c.fin]])
      continue
    }
    for (const [ri, rf] of restar(c.inicio, c.fin, ocupados)) resueltos.push({ tipo: c.tipo, inicio: ri, fin: rf })
    ocupados = unir([...ocupados, [c.inicio, c.fin]])
  }

  const suenos = resueltos.filter((t) => t.tipo === 'sueno')
  const enfocado = (finVentana: number) =>
    !suenos.some((s) => s.inicio >= finVentana && s.inicio - finVentana < a.focoMargenMin)

  // --- Recorte por día y huecos que quedan
  return Array.from({ length: 7 }, (_, dia) => {
    const desde = dia * MIN_DIA
    const hasta = desde + MIN_DIA
    const tramos = resueltos
      .filter((t) => t.fin > desde && t.inicio < hasta)
      .map((t) => ({ ...t, inicio: Math.max(t.inicio, desde), fin: Math.min(t.fin, hasta) }))
      .sort((x, y) => x.inicio - y.inicio)
    const ventanas: Ventana[] = []
    const cerrar = (inicio: number, fin: number) => {
      if (fin - inicio >= a.ventanaMinimaMin) ventanas.push({ inicio, fin, foco: enfocado(fin) })
    }
    let cursor = desde
    for (const t of tramos) {
      cerrar(cursor, t.inicio)
      cursor = Math.max(cursor, t.fin)
    }
    cerrar(cursor, hasta)
    return { dia, tramos, ventanas }
  })
}

/** Suma de todas las ventanas libres de la semana, en minutos. */
export const minutosLibres = (dias: DiaCalculado[]): number =>
  dias.reduce((total, d) => total + d.ventanas.reduce((s, v) => s + (v.fin - v.inicio), 0), 0)
