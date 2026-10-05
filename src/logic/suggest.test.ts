import { describe, expect, it } from 'vitest'
import { ACTIVIDADES_POR_DEFECTO, AJUSTES_POR_DEFECTO } from './defaults'
import { SEMANA_EJEMPLO } from './ejemplo'
import {
  MARGEN_SUENO_GIMNASIO_MIN,
  MARGEN_SUENO_SIESTA_MIN,
  SIESTA_DESDE_MIN,
  TOPE_DIA,
  TOPE_SEMANA,
  TRASLADO_GIMNASIO_MIN,
  bloquesPorDia,
  suggest,
  type Sugerencia,
} from './suggest'
import { MIN_DIA, formatearDuracion, horaCampo } from './tiempo'
import { crearTurno, fijarTurnoDelDia, semanaVacia } from './turnos'
import { computeWindows, type DiaCalculado } from './windows'
import type { Actividad, Bloque, IdActividad, Semana } from './types'

const H = 60
const por = (id: IdActividad, cambios: Partial<Actividad> = {}): Actividad => ({
  ...ACTIVIDADES_POR_DEFECTO.find((a) => a.id === id)!,
  ...cambios,
})
// Las mismas metas sin días prohibidos: la semana de ejemplo es justa y con el gimnasio cerrado los domingos
// una caminata de 30 min queda afuera (se prueba aparte, más abajo)
const SIN_DIAS_NO = ACTIVIDADES_POR_DEFECTO.map((a) => ({ ...a, diasNo: [] as number[] }))
const fijo = (actividad: IdActividad, dia: number, desde: number, hasta: number): Bloque => ({
  id: `fijo-${actividad}-${dia}`,
  actividad,
  inicio: dia * MIN_DIA + desde * H,
  fin: dia * MIN_DIA + hasta * H,
  estado: 'planificado',
  fijo: true,
})

const ventanasDe = (s: Semana) => computeWindows(s, AJUSTES_POR_DEFECTO)
const rango = (b: { inicio: number; fin: number }) => `${horaCampo(b.inicio % MIN_DIA)}–${horaCampo(b.fin % MIN_DIA)}`
const diaDe = (b: Bloque) => Math.floor(b.inicio / MIN_DIA)

/** Todo lo que no debe pasar nunca, para una sugerencia sobre `dias`. Devuelve las violaciones encontradas. */
function violaciones(dias: DiaCalculado[], metas: Actividad[], fijos: Bloque[], r: Sugerencia): string[] {
  const v: string[] = []
  const ventanas = dias.flatMap((d) => d.ventanas.map((w) => ({ ...w, dia: d.dia })))
  const conTurno = dias.map((d) => d.tramos.some((t) => t.tipo === 'turno'))
  const sueno = dias.flatMap((d) => d.tramos.filter((t) => t.tipo === 'sueno'))

  // Cada bloque (con sus traslados) cae entero adentro de una ventana
  const pad = (b: Bloque) => (b.actividad === 'gimnasio' ? TRASLADO_GIMNASIO_MIN : 0)
  for (const b of r.bloques) {
    if (!ventanas.some((x) => b.inicio - pad(b) >= x.inicio && b.fin + pad(b) <= x.fin)) {
      v.push(`${b.actividad} ${rango(b)} fuera de toda ventana`)
    }
    if (b.estado !== 'planificado' || b.fijo) v.push(`${b.id} no es planificado`)
  }

  // Nada se superpone: ni entre sí (con traslados) ni con los fijos
  const todos = [
    ...r.bloques.map((b) => ({ id: b.id, inicio: b.inicio - pad(b), fin: b.fin + pad(b) })),
    ...fijos.map((b) => ({ id: b.id, inicio: b.inicio, fin: b.fin })),
  ]
  for (let i = 0; i < todos.length; i++) {
    for (let j = i + 1; j < todos.length; j++) {
      if (todos[i].inicio < todos[j].fin && todos[j].inicio < todos[i].fin) v.push(`${todos[i].id} pisa a ${todos[j].id}`)
    }
  }

  // Topes de uso: 85 % por día y 70 % de la semana
  // La siesta es una recomendación aparte: no gasta de los topes
  const costo = (b: Bloque) => (b.actividad === 'siesta' ? 0 : b.fin - b.inicio + 2 * pad(b))
  let total = 0
  for (const d of dias) {
    const libre = d.ventanas.reduce((n, w) => n + (w.fin - w.inicio), 0)
    const usado = r.bloques.filter((b) => diaDe(b) === d.dia).reduce((n, b) => n + costo(b), 0)
    total += usado
    if (usado > Math.floor(libre * TOPE_DIA)) v.push(`día ${d.dia}: ${usado} > ${TOPE_DIA} de ${libre}`)
  }
  const libreSemana = ventanas.reduce((n, w) => n + (w.fin - w.inicio), 0)
  if (total > Math.floor(libreSemana * TOPE_SEMANA)) v.push(`semana: ${total} > ${TOPE_SEMANA} de ${libreSemana}`)

  // Reglas por actividad
  const cuentaPorDia = (id: IdActividad) => dias.map((d) => r.bloques.filter((b) => b.actividad === id && diaDe(b) === d.dia).length)
  cuentaPorDia('ingles').forEach((n, d) => n > 2 && v.push(`inglés ${n} bloques el día ${d}`))
  for (const id of ['gimnasio', 'caminata', 'programacion', 'libre', 'siesta'] as const) {
    cuentaPorDia(id).forEach((n, d) => n > 1 && v.push(`${id} ${n} bloques el día ${d}`))
  }
  for (const b of r.bloques) {
    const dia = diaDe(b)
    const w = ventanas.find((x) => b.inicio >= x.inicio && b.fin <= x.fin)
    if (!w) continue
    if ((b.actividad === 'ingles' || b.actividad === 'programacion') && !w.foco) v.push(`${b.actividad} en ventana foco: no`)
    if (b.actividad === 'programacion' && w.fin - w.inicio < 120) v.push('programación en ventana de menos de 2 h')
    if (b.actividad === 'libre') {
      if (conTurno[dia]) v.push(`libre en día con turno (${dia})`)
      if (w.fin - w.inicio < 180) v.push('libre en ventana de menos de 3 h')
      if ((b.inicio + b.fin) / 2 - dia * MIN_DIA < 18 * H) v.push('libre fuera de la noche')
    }
    if (b.actividad === 'siesta') {
      if (b.inicio - dia * MIN_DIA < SIESTA_DESDE_MIN) v.push(`siesta ${rango(b)} antes de las 13:00`)
      for (const s of sueno) {
        if (s.inicio > b.inicio && s.inicio - b.fin < MARGEN_SUENO_SIESTA_MIN) v.push(`siesta ${rango(b)} a menos de 3 h de dormir`)
      }
    }
    if (b.actividad === 'gimnasio') {
      for (const s of sueno) {
        if (s.inicio > b.inicio && s.inicio - b.fin < MARGEN_SUENO_GIMNASIO_MIN) v.push(`gimnasio ${rango(b)} a menos de 2 h de dormir`)
      }
    }
  }

  // Nunca se pasa de la meta de sesiones
  for (const a of metas) {
    if (a.fija || a.meta <= 0 || a.tipoMeta !== 'sesiones') continue
    const hechos = fijos.filter((b) => b.actividad === a.id).length
    const sugeridos = r.bloques.filter((b) => b.actividad === a.id).length
    if (sugeridos + hechos > Math.max(Math.ceil(a.meta), hechos)) v.push(`${a.id}: más sesiones que la meta`)
  }
  return v
}

describe('suggest: la semana de ejemplo', () => {
  const dias = ventanasDe(SEMANA_EJEMPLO)
  const fijos = [fijo('psicologo', 3, 10, 11)] // jueves 10–11
  const r = suggest(dias, ACTIVIDADES_POR_DEFECTO, fijos)

  it('no viola ninguna restricción', () => {
    expect(violaciones(dias, ACTIVIDADES_POR_DEFECTO, fijos, r)).toEqual([])
  })

  it('cumple todas las metas por defecto', () => {
    const r = suggest(dias, SIN_DIAS_NO, fijos)
    expect(r.faltantes).toEqual([])
    const min = (id: IdActividad) => r.bloques.filter((b) => b.actividad === id).reduce((n, b) => n + (b.fin - b.inicio), 0)
    expect(min('ingles')).toBe(10 * H)
    expect(min('programacion')).toBe(6 * H)
    expect(r.bloques.filter((b) => b.actividad === 'gimnasio')).toHaveLength(4)
    expect(r.bloques.filter((b) => b.actividad === 'caminata')).toHaveLength(7)
    expect(r.bloques.filter((b) => b.actividad === 'libre')).toHaveLength(2)
    // el psicólogo es fijo: está en `fijos` y no se repite en la sugerencia
    expect(r.bloques.some((b) => b.actividad === 'psicologo')).toBe(false)
  })

  it('el inglés queda repartido y el libre en noches sin turno', () => {
    const porDia = bloquesPorDia(r.bloques)
    expect(porDia.map((d) => d.filter((b) => b.actividad === 'ingles').length)).toEqual([1, 1, 1, 1, 1, 1, 1])
    const diasLibre = porDia.flatMap((d, i) => (d.some((b) => b.actividad === 'libre') ? [i] : []))
    expect(diasLibre.every((d) => d >= 3 && d <= 5)).toBe(true)
  })

  it('es determinista, sin importar el orden en que llegan las actividades', () => {
    expect(suggest(dias, ACTIVIDADES_POR_DEFECTO, fijos)).toEqual(r)
    expect(suggest(ventanasDe(SEMANA_EJEMPLO), [...ACTIVIDADES_POR_DEFECTO].reverse(), fijos)).toEqual(r)
  })

  it('el bloque fijo se descuenta de las ventanas', () => {
    const solapa = [fijo('psicologo', 0, 9, 11)] // lunes 9–11, dentro de 08:30–12:30
    const s = suggest(dias, ACTIVIDADES_POR_DEFECTO, solapa)
    for (const b of s.bloques.filter((x) => x.inicio < MIN_DIA)) {
      expect(b.fin <= solapa[0].inicio || b.inicio >= solapa[0].fin).toBe(true)
    }
  })

  it('un bloque fijo de una actividad con meta cuenta para esa meta', () => {
    const s = suggest(dias, ACTIVIDADES_POR_DEFECTO, [fijo('gimnasio', 4, 15, 16.25)])
    expect(s.bloques.filter((b) => b.actividad === 'gimnasio')).toHaveLength(3)
  })
})

describe('suggest: informe de lo que no entró', () => {
  it('el psicólogo sin bloque fijo aparece como faltante "fija"', () => {
    const r = suggest(ventanasDe(SEMANA_EJEMPLO), SIN_DIAS_NO, [])
    expect(r.faltantes).toHaveLength(1)
    expect(r.faltantes[0]).toMatchObject({ actividad: 'psicologo', motivo: 'fija', bloquesFaltantes: 1, faltanMin: 60 })
    expect(r.faltantes[0].detalle).toBe('Psicólogo: falta 1 bloque (1 h); es un bloque fijo: ubicalo a mano.')
  })

  it('una semana muy cargada produce faltantes y no fuerza nada', () => {
    // turnos 6–14 todos los días, salvo el domingo (14–22)
    let sem = semanaVacia(SEMANA_EJEMPLO.lunes)
    for (let d = 0; d < 7; d++) {
      const r = fijarTurnoDelDia(sem, d, d === 6 ? crearTurno(d, 14 * H, 22 * H) : crearTurno(d, 6 * H, 14 * H))
      if (r.ok) sem = r.semana
    }
    const dias = ventanasDe(sem)
    const fijos = [fijo('psicologo', 0, 16, 17)]
    const r = suggest(dias, ACTIVIDADES_POR_DEFECTO, fijos)
    expect(violaciones(dias, ACTIVIDADES_POR_DEFECTO, fijos, r)).toEqual([])
    expect(r.faltantes.length).toBeGreaterThan(0)
    expect(r.usoSemana.asignadoMin).toBeLessThanOrEqual(r.usoSemana.topeMin)
    for (const f of r.faltantes) {
      expect(f.faltanMin).toBeGreaterThan(0)
      expect(f.bloquesFaltantes).toBeGreaterThan(0)
      expect(f.detalle).toContain(formatearDuracion(f.faltanMin))
    }
  })

  it('sin ventanas no se sugiere nada y se informa cada meta', () => {
    const vacias = ventanasDe(semanaVacia(SEMANA_EJEMPLO.lunes)).map((d) => ({ ...d, ventanas: [] }))
    const r = suggest(vacias, ACTIVIDADES_POR_DEFECTO, [])
    expect(r.bloques).toEqual([])
    expect(r.faltantes.map((f) => f.actividad).sort()).toEqual(['caminata', 'gimnasio', 'ingles', 'libre', 'programacion', 'psicologo'])
    expect(r.faltantes.find((f) => f.actividad === 'ingles')).toMatchObject({ bloquesFaltantes: 7, faltanMin: 10 * H, motivo: 'sin-espacio' })
  })

  it('el motivo es preciso: programación sin ventanas de 2 h', () => {
    const cortas = ventanasDe(SEMANA_EJEMPLO).map((d) => ({
      ...d,
      ventanas: [{ inicio: d.dia * MIN_DIA + 9 * H, fin: d.dia * MIN_DIA + 10 * H, foco: true }],
    }))
    const r = suggest(cortas, [por('programacion', { meta: 1.5, duracionMin: 45 })], [])
    expect(r.faltantes[0]).toMatchObject({ actividad: 'programacion', motivo: 'ventana-corta' })
  })

  it('el motivo es preciso: ventanas "foco: no" para el inglés', () => {
    const dias = ventanasDe(SEMANA_EJEMPLO).map((d) => ({ ...d, ventanas: d.ventanas.map((w) => ({ ...w, foco: false })) }))
    expect(suggest(dias, [por('ingles')], []).faltantes[0]).toMatchObject({ actividad: 'ingles', motivo: 'foco' })
  })

  it('el motivo es preciso: el tope de la semana', () => {
    // 7 ventanas de 2 h = 14 h; el 70 % son 9 h 48 min: 7 bloques de 90 min (10 h 30 min) no entran
    const dias = Array.from({ length: 7 }, (_, n) => ({
      dia: n,
      tramos: [],
      ventanas: [{ inicio: n * MIN_DIA + 9 * H, fin: n * MIN_DIA + 11 * H, foco: true }],
    }))
    const r = suggest(dias, [por('ingles', { meta: 10.5 })], [])
    expect(r.faltantes[0].motivo).toBe('tope-semana')
    expect(r.usoSemana.asignadoMin).toBeLessThanOrEqual(r.usoSemana.topeMin)
  })

  it('el máximo diario del gimnasio: con un solo día útil entra uno y el informe lo dice', () => {
    const uno = ventanasDe(SEMANA_EJEMPLO).map((d, i) => ({ ...d, ventanas: i === 3 ? d.ventanas : [] }))
    const r = suggest(uno, [por('gimnasio')], [])
    expect(r.bloques).toHaveLength(1)
    expect(r.faltantes[0]).toMatchObject({ actividad: 'gimnasio', bloquesFaltantes: 3, motivo: 'maximo-dia' })
  })
})

describe('suggest: reglas por actividad', () => {
  const dia = (n: number, ventanas: [number, number][], turno = false): DiaCalculado => ({
    dia: n,
    tramos: turno ? [{ tipo: 'turno', inicio: n * MIN_DIA + 600, fin: n * MIN_DIA + 700 }] : [],
    ventanas: ventanas.map(([a, b]) => ({ inicio: n * MIN_DIA + a * H, fin: n * MIN_DIA + b * H, foco: true })),
  })
  const semana = (f: (n: number) => DiaCalculado) => Array.from({ length: 7 }, (_, n) => f(n))
  const diasDe = (bs: Bloque[]) => bs.map(diaDe)

  it('gimnasio: no en las 2 h previas a dormir', () => {
    const sueno = (n: number) => ({ tipo: 'sueno' as const, inicio: n * MIN_DIA + 22 * H, fin: n * MIN_DIA + 24 * H })
    const dias = semana((n) => ({ ...dia(n, [[17, 22]]), tramos: [sueno(n)] }))
    const metas = [por('gimnasio', { meta: 1 })]
    const r = suggest(dias, metas, [])
    expect(r.bloques).toHaveLength(1)
    expect(r.bloques[0].fin % MIN_DIA).toBeLessThanOrEqual(20 * H)
    expect(violaciones(dias, metas, [], r)).toEqual([])
  })

  // Almuerzo de 12:00 a 13:30: el hueco libre arranca justo cuando se termina de comer
  const conAlmuerzo = (n: number, finAlmuerzo = 13.5, hasta = 22): DiaCalculado => ({
    dia: n,
    tramos: [
      { tipo: 'comida', inicio: n * MIN_DIA + (finAlmuerzo - 1.5) * H, fin: n * MIN_DIA + finAlmuerzo * H },
      { tipo: 'sueno', inicio: n * MIN_DIA + 22 * H, fin: n * MIN_DIA + 24 * H },
    ],
    ventanas: [{ inicio: n * MIN_DIA + finAlmuerzo * H, fin: n * MIN_DIA + hasta * H, foco: true }],
  })

  it('siesta: una por día, pegada al final de la comida (desde las 13:00), antes de cualquier otra cosa y sin ser meta', () => {
    const dias = semana((n) => conAlmuerzo(n))
    for (const duracionMin of [35, 105]) {
      const metas = [por('siesta', { duracionMin }), ...ACTIVIDADES_POR_DEFECTO.filter((a) => a.id === 'caminata')]
      const r = suggest(dias, metas, [])
      const siestas = r.bloques.filter((b) => b.actividad === 'siesta')
      expect(siestas).toHaveLength(7)
      for (const b of siestas) {
        expect(b.fin - b.inicio).toBe(duracionMin)
        expect(rango(b)).toBe(duracionMin === 35 ? '13:30–14:05' : '13:30–15:15')
      }
      expect(r.faltantes.map((f) => f.actividad)).not.toContain('siesta')
      expect(violaciones(dias, metas, [], r)).toEqual([])
    }
  })

  it('siesta: sin comida, con la comida antes de las 13:00 o con el sueño muy cerca, no se propone; respeta una ya puesta', () => {
    const metas = [por('siesta')]
    expect(suggest(semana((n) => dia(n, [[13.5, 18]])), metas, []).bloques).toEqual([])
    expect(suggest(semana((n) => conAlmuerzo(n, 12.5)), metas, []).bloques).toEqual([])
    // Un hueco de 24 min después de comer no alcanza para 35
    expect(suggest(semana((n) => conAlmuerzo(n, 13.5, 13.9)), metas, []).bloques).toEqual([])
    const r = suggest(semana((n) => conAlmuerzo(n)), metas, [fijo('siesta', 2, 14, 14.5)])
    expect(r.bloques.map(diaDe)).toEqual([0, 1, 3, 4, 5, 6])
  })

  it('gimnasio: reserva 15 min de traslado de cada lado', () => {
    // 75 min de gimnasio + 2 × 15 de traslado = 105 min: no entra en una ventana de 90, sí en una de 180
    expect(suggest(semana((n) => dia(n, [[10, 11.5]])), [por('gimnasio', { meta: 1 })], []).bloques).toEqual([])
    const r = suggest(semana((n) => dia(n, [[10, 13]])), [por('gimnasio', { meta: 1, franjas: ['manana', 'tarde', 'noche'] })], [])
    expect(r.bloques).toHaveLength(1)
    expect(rango(r.bloques[0])).toBe('10:15–11:30')
  })

  it('libre: solo noches de días sin turno y en ventanas de 3 h o más', () => {
    const dias = semana((n) => dia(n, [[14, 21]], n < 4))
    const r = suggest(dias, [por('libre', { meta: 2 })], [])
    expect(r.bloques).toHaveLength(2)
    expect(diasDe(r.bloques).every((d) => d >= 4)).toBe(true)
    expect(r.bloques.map(rango)).toEqual(['18:00–21:00', '18:00–21:00'])
    // en ventanas de 2 h 30 no entra nunca
    expect(suggest(semana((n) => dia(n, [[18, 20.5]])), [por('libre', { meta: 2 })], []).bloques).toEqual([])
  })

  it('inglés: máximo dos por día y en las primeras ventanas', () => {
    const dias = semana((n) => dia(n, n === 2 ? [[8, 10], [14, 18]] : []))
    const r = suggest(dias, [por('ingles', { meta: 4.5 })], [])
    expect(r.bloques.map(rango)).toEqual(['08:00–09:30', '14:00–15:30'])
    expect(r.faltantes[0]).toMatchObject({ actividad: 'ingles', motivo: 'maximo-dia' })
  })

  it('la prioridad decide quién se queda con el lugar escaso', () => {
    // el lunes es el único lugar donde entra algo grande; los demás días solo tienen 30 min
    const dias = semana((n) => dia(n, n === 0 ? [[9, 11.5]] : [[9, 9.5]]))
    const ingles = (prioridad: number) => por('ingles', { meta: 1.5, prioridad })
    const prog = (prioridad: number) => por('programacion', { meta: 2, prioridad })
    expect(suggest(dias, [ingles(1), prog(2)], []).bloques.map((b) => b.actividad)).toEqual(['ingles'])
    expect(suggest(dias, [ingles(2), prog(1)], []).bloques.map((b) => b.actividad)).toEqual(['programacion'])
  })
})

// ---------- Propiedades sobre semanas al azar ----------

/** Generador con semilla (mulberry32): cada falla se puede repetir con el mismo número. */
function azar(semilla: number) {
  let t = semilla
  return () => {
    t = (t + 0x6d2b79f5) | 0
    let x = Math.imul(t ^ (t >>> 15), 1 | t)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

describe('suggest: propiedades en semanas al azar', () => {
  const CASOS = 400

  it(`ninguna restricción se viola (${CASOS} semanas)`, () => {
    const malas: string[] = []
    for (let caso = 0; caso < CASOS; caso++) {
      const rnd = azar(caso + 1)
      const entre = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1))

      let sem = semanaVacia(SEMANA_EJEMPLO.lunes)
      const densidad = rnd()
      for (let d = 0; d < 7; d++) {
        if (rnd() > densidad) continue
        const opciones = [
          crearTurno(d, 6 * H, 14 * H),
          crearTurno(d, 14 * H, 22 * H),
          crearTurno(d, 22 * H, 6 * H),
          crearTurno(d, entre(0, 23) * H, entre(0, 23) * H),
          crearTurno(d, 8 * H, 12 * H),
        ]
        const r = fijarTurnoDelDia(sem, d, opciones[entre(0, opciones.length - 1)])
        if (r.ok) sem = r.semana
      }

      // Metas editadas al azar, como podría hacerlo el usuario
      const metas = ACTIVIDADES_POR_DEFECTO.map((a) => ({
        ...a,
        meta: a.tipoMeta === 'horas' ? entre(0, 24) / 2 : entre(0, 8),
        duracionMin: entre(3, 30) * 5,
        franjas: ([['manana'], ['tarde'], ['noche'], ['manana', 'noche'], ['manana', 'tarde', 'noche']] as const)[entre(0, 4)].slice(),
        prioridad: entre(1, 7),
      }))

      const dias = ventanasDe(sem)
      const fijos: Bloque[] = []
      if (rnd() < 0.7) {
        const libres = dias.flatMap((d) => d.ventanas.filter((w) => w.fin - w.inicio >= 60))
        const w = libres[entre(0, Math.max(0, libres.length - 1))]
        if (w) fijos.push({ id: 'p', actividad: 'psicologo', inicio: w.inicio, fin: w.inicio + 60, estado: 'planificado', fijo: true })
      }

      const r = suggest(dias, metas, fijos)
      const mal = violaciones(dias, metas, fijos, r)
      if (JSON.stringify(suggest(dias, metas, fijos)) !== JSON.stringify(r)) mal.push('no determinista')
      if (mal.length) malas.push(`semilla ${caso + 1}: ${mal.slice(0, 3).join(' | ')}`)
    }
    expect(malas).toEqual([])
  })

})

describe('días en que una actividad no se puede', () => {
  const dias = ventanasDe(SEMANA_EJEMPLO)

  it('el gimnasio por defecto no se ubica el domingo', () => {
    const r = suggest(dias, ACTIVIDADES_POR_DEFECTO, [])
    const gim = r.bloques.filter((b) => b.actividad === 'gimnasio')
    expect(gim.length).toBeGreaterThan(0)
    expect(gim.every((b) => Math.floor(b.inicio / MIN_DIA) !== 6)).toBe(true)
  })

  it('si solo quedan días prohibidos, el informe lo dice', () => {
    const r = suggest(dias, [por('gimnasio', { diasNo: [0, 1, 2, 3, 4, 5, 6] })], [])
    expect(r.bloques).toEqual([])
    expect(r.faltantes[0]?.motivo).toBe('dias-no')
  })
})
