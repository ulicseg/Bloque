import { describe, expect, it } from 'vitest'
import { ACTIVIDADES_POR_DEFECTO, AJUSTES_POR_DEFECTO } from './defaults'
import { SEMANA_EJEMPLO } from './ejemplo'
import { MIN_DIA, MIN_SEMANA } from './tiempo'
import {
  conSemana,
  continuaciones,
  copiarTurnos,
  crearTurno,
  descripcionFin,
  etiquetaTurno,
  fijarTurnoDelDia,
  minutosDeTurnos,
  semanaVacia,
  terminaAlDiaSiguiente,
  textoConflicto,
  textoTotal,
  largoDeTurno,
  tipoDeTurno,
  vecinasDe,
} from './turnos'
import { crearAlmacen, DATOS_INICIALES } from './storage'
import type { Semana } from './types'

const H = 60
const turno = (dia: number, desde: number, hasta: number) => crearTurno(dia, desde * H, hasta * H)!
const fijar = (s: Semana, dia: number, t: ReturnType<typeof turno> | null, v = {}) => {
  const r = fijarTurnoDelDia(s, dia, t, v)
  if (!r.ok) throw new Error(`no debía fallar: ${r.motivo}`)
  return r.semana
}

describe('crearTurno', () => {
  it('turnos de un mismo día', () => {
    expect(turno(0, 6, 14)).toEqual({ inicio: 360, fin: 840 })
    expect(turno(2, 14, 22)).toEqual({ inicio: 2 * MIN_DIA + 840, fin: 2 * MIN_DIA + 1320 })
  })

  it('el 22–6 cruza la medianoche y dura 8 h', () => {
    const t = turno(1, 22, 6)
    expect(t).toEqual({ inicio: MIN_DIA + 1320, fin: 2 * MIN_DIA + 360 })
    expect(terminaAlDiaSiguiente(t)).toBe(true)
    expect(descripcionFin(t)).toBe('Termina al día siguiente (miércoles 6)')
    expect(tipoDeTurno(t)).toBe('22-6')
  })

  it('rechaza duración cero y valores fuera de rango', () => {
    expect(crearTurno(0, 360, 360)).toBeNull()
    expect(crearTurno(7, 360, 840)).toBeNull()
    expect(crearTurno(0, -1, 840)).toBeNull()
    expect(crearTurno(0, 360, MIN_DIA)).toBeNull()
  })

  it('los turnos de 4 h se reconocen y el 22–2 cruza la medianoche', () => {
    expect(tipoDeTurno(turno(0, 6, 10))).toBe('6-10')
    expect(tipoDeTurno(turno(0, 18, 22))).toBe('18-22')
    const noche = turno(3, 22, 2)
    expect(tipoDeTurno(noche)).toBe('22-2')
    expect(terminaAlDiaSiguiente(noche)).toBe(true)
    expect(largoDeTurno(noche)).toBe('4')
    expect(largoDeTurno(turno(0, 6, 14))).toBe('8')
    expect(largoDeTurno(turno(0, 8, 12))).toBe('otro')
  })

  it('un horario de 4 h que no es de la lista es "otro" y terminar justo a las 24 no cuenta como día siguiente', () => {
    expect(tipoDeTurno(turno(0, 8, 12))).toBe('otro')
    const noche = turno(0, 20, 0)
    expect(noche.fin).toBe(MIN_DIA + 0)
    expect(terminaAlDiaSiguiente(noche)).toBe(false)
    expect(etiquetaTurno(turno(0, 6, 14))).toBe('6–14')
  })
})

describe('un 22–6 del domingo', () => {
  const domingo = fijar(semanaVacia('2026-10-05'), 6, turno(6, 22, 6))

  it('queda guardado en su semana con el fin más allá del domingo', () => {
    expect(domingo.turnos).toEqual([{ inicio: 6 * MIN_DIA + 1320, fin: MIN_SEMANA + 360 }])
    expect(descripcionFin(domingo.turnos[0])).toBe('Termina al día siguiente (lunes de la semana siguiente 6)')
  })

  it('cruza a la semana siguiente sin perderse', () => {
    expect(continuaciones(domingo)).toEqual([{ inicio: 0, fin: 360 }])
    expect(continuaciones(semanaVacia('2026-10-12'))).toEqual([])
    // sigue ocupando el lunes 0–6 de la semana siguiente
    const siguiente = semanaVacia('2026-10-12')
    const choca = fijarTurnoDelDia(siguiente, 0, turno(0, 0, 4), { anterior: domingo })
    expect(choca.ok).toBe(false)
    if (!choca.ok && choca.motivo === 'superpuesto') {
      expect(textoConflicto(choca.conflicto)).toBe('Se superpone con el turno 22–6 del domingo de la semana anterior')
    }
    // pero un turno que arranca recién a las 6 entra
    expect(fijarTurnoDelDia(siguiente, 0, turno(0, 6, 14), { anterior: domingo }).ok).toBe(true)
  })

  it('también se valida desde el otro lado: no se puede cargar sobre un lunes ya ocupado', () => {
    const siguiente = fijar(semanaVacia('2026-10-12'), 0, turno(0, 0, 4))
    const r = fijarTurnoDelDia(semanaVacia('2026-10-05'), 6, turno(6, 22, 6), { siguiente })
    expect(r.ok).toBe(false)
  })

  it('suma sus 8 h a la semana donde empezó, y sobrevive a guardar y leer', () => {
    expect(minutosDeTurnos(domingo)).toBe(8 * H)
    const almacen = crearAlmacen()
    almacen.guardar(conSemana(DATOS_INICIALES, domingo))
    const leido = almacen.leer()
    expect(leido.semanas['2026-10-05'].turnos).toEqual(domingo.turnos)
    expect(continuaciones(vecinasDe(leido, '2026-10-12').anterior)).toEqual([{ inicio: 0, fin: 360 }])
  })
})

describe('fijarTurnoDelDia', () => {
  it('reemplaza el turno del día y deja libre con null', () => {
    let s = fijar(semanaVacia('2026-10-05'), 0, turno(0, 6, 14))
    s = fijar(s, 0, turno(0, 14, 22))
    expect(s.turnos).toEqual([turno(0, 14, 22)])
    s = fijar(s, 0, null)
    expect(s.turnos).toEqual([])
  })

  it('no deja cargar turnos superpuestos y no cambia nada', () => {
    const s = fijar(semanaVacia('2026-10-05'), 0, turno(0, 22, 6))
    // el martes 4–8 pisa el final del 22–6 del lunes
    const r = fijarTurnoDelDia(s, 1, turno(1, 4, 8))
    expect(r.ok).toBe(false)
    expect(s.turnos).toHaveLength(1)
    if (!r.ok && r.motivo === 'superpuesto') expect(textoConflicto(r.conflicto)).toBe('Se superpone con el turno 22–6 del lunes')
  })

  it('turnos que se tocan en el borde no se superponen (14–22 y 22–6)', () => {
    let s = fijar(semanaVacia('2026-10-05'), 0, turno(0, 14, 22))
    s = fijar(s, 0, turno(0, 14, 22))
    expect(fijarTurnoDelDia(s, 1, turno(1, 6, 14)).ok).toBe(true)
    const noche = fijar(s, 1, turno(1, 22, 6))
    expect(noche.turnos).toHaveLength(2)
  })

  it('rechaza un turno que no empieza en el día indicado', () => {
    const r = fijarTurnoDelDia(semanaVacia('2026-10-05'), 2, turno(1, 6, 14))
    expect(r).toEqual({ ok: false, motivo: 'invalido' })
  })

  it('no modifica la semana original y deja los turnos ordenados', () => {
    const base = fijar(semanaVacia('2026-10-05'), 3, turno(3, 6, 14))
    const antes = JSON.stringify(base)
    const nueva = fijar(base, 1, turno(1, 6, 14))
    expect(JSON.stringify(base)).toBe(antes)
    expect(nueva.turnos.map((t) => t.inicio)).toEqual([MIN_DIA + 360, 3 * MIN_DIA + 360])
  })
})

describe('copiar una semana', () => {
  it('preserva los turnos, incluido el que cruza el domingo, y no comparte referencias', () => {
    let origen = semanaVacia('2026-10-05')
    origen = fijar(origen, 0, turno(0, 14, 22))
    origen = fijar(origen, 2, turno(2, 6, 14))
    origen = fijar(origen, 4, turno(4, 8, 12))
    origen = fijar(origen, 6, turno(6, 22, 6))
    const { semana, omitidos } = copiarTurnos(origen, semanaVacia('2026-10-12'), { anterior: origen })
    expect(omitidos).toEqual([])
    expect(semana.lunes).toBe('2026-10-12')
    expect(semana.turnos).toEqual(origen.turnos)
    expect(minutosDeTurnos(semana)).toBe(minutosDeTurnos(origen))
    expect(semana.turnos[0]).not.toBe(origen.turnos[0])
  })

  it('reemplaza los turnos del destino pero conserva sus bloques', () => {
    const bloque = { id: 'b1', actividad: 'ingles' as const, inicio: 900, fin: 990, estado: 'planificado' as const, fijo: false }
    const destino: Semana = { lunes: '2026-10-12', turnos: [turno(3, 6, 14)], bloques: [bloque] }
    const origen = fijar(semanaVacia('2026-10-05'), 0, turno(0, 14, 22))
    const { semana } = copiarTurnos(origen, destino)
    expect(semana.turnos).toEqual([turno(0, 14, 22)])
    expect(semana.bloques).toEqual([bloque])
  })

  it('avisa los turnos que chocan con el 22–6 que viene de la semana anterior en vez de perderlos', () => {
    // Lunes 0–4 es válido en la semana de origen; en la copia chocaría con el 22–6 de su domingo
    let origen = semanaVacia('2026-10-05')
    origen = fijar(origen, 0, turno(0, 0, 4))
    origen = fijar(origen, 6, turno(6, 22, 6))
    const { semana, omitidos } = copiarTurnos(origen, semanaVacia('2026-10-12'), { anterior: origen })
    expect(omitidos).toEqual([turno(0, 0, 4)])
    expect(semana.turnos).toEqual([turno(6, 22, 6)])
  })
})

describe('conSemana', () => {
  it('una semana vacía no queda guardada', () => {
    const con = conSemana(DATOS_INICIALES, fijar(semanaVacia('2026-10-05'), 0, turno(0, 6, 14)))
    expect(Object.keys(con.semanas)).toEqual(['2026-10-05'])
    expect(conSemana(con, semanaVacia('2026-10-05')).semanas).toEqual({})
  })
})

describe('semana de ejemplo', () => {
  it('lunes a miércoles 14–22, domingo 6–14, el resto libre', () => {
    expect(SEMANA_EJEMPLO.lunes).toBe('2026-10-05')
    expect(SEMANA_EJEMPLO.turnos.map(etiquetaTurno)).toEqual(['14–22', '14–22', '14–22', '6–14'])
    expect(SEMANA_EJEMPLO.turnos.map((t) => Math.floor(t.inicio / MIN_DIA))).toEqual([0, 1, 2, 6])
    expect(textoTotal(SEMANA_EJEMPLO)).toBe('32 h')
    expect(textoTotal(semanaVacia('2026-10-12'))).toBe('0 h')
  })
})

describe('metas por defecto', () => {
  const por = (id: string) => ACTIVIDADES_POR_DEFECTO.find((a) => a.id === id)!

  it('coinciden con la tabla acordada', () => {
    const tabla = [
      ['ingles', 'horas', 10, 90, 20],
      ['gimnasio', 'sesiones', 4, 75, 30],
      ['programacion', 'horas', 6, 120, 30],
      ['psicologo', 'sesiones', 1, 60, null],
      ['caminata', 'sesiones', 7, 30, 10],
      ['libre', 'sesiones', 2, 180, null],
    ] as const
    for (const [id, tipo, meta, duracion, minimo] of tabla) {
      const a = por(id)
      expect([a.tipoMeta, a.meta, a.duracionMin, a.minimoMin], id).toEqual([tipo, meta, duracion, minimo])
    }
    expect(ACTIVIDADES_POR_DEFECTO.filter((a) => a.fija).map((a) => a.id)).toEqual(['psicologo', 'siesta'])
  })

  it('las prioridades no se repiten y hay ajustes completos', () => {
    const p = ACTIVIDADES_POR_DEFECTO.map((a) => a.prioridad)
    expect(new Set(p).size).toBe(p.length)
    expect(AJUSTES_POR_DEFECTO.comidas.length).toBeGreaterThan(0)
  })
})
