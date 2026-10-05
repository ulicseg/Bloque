import { describe, expect, it } from 'vitest'
import { ACTIVIDADES_POR_DEFECTO } from './defaults'
import { admiteMinimo, avanceSemana, minutosEfectivos } from './progreso'
import type { Bloque, EstadoBloque, IdActividad, Semana } from './types'

let n = 0
const bloque = (actividad: IdActividad, estado: EstadoBloque, min: number): Bloque => ({
  id: `b${n++}`,
  actividad,
  inicio: n * 1000,
  fin: n * 1000 + min,
  estado,
  fijo: false,
})
const semana = (bloques: Bloque[]): Semana => ({ lunes: '2026-10-05', turnos: [], bloques })
const de = (s: Semana, id: IdActividad) => avanceSemana(s, ACTIVIDADES_POR_DEFECTO).find((a) => a.actividad === id)!
const act = (id: IdActividad) => ACTIVIDADES_POR_DEFECTO.find((a) => a.id === id)!

describe('avanceSemana', () => {
  it('sin bloques, todo en cero', () => {
    const r = avanceSemana(semana([]), ACTIVIDADES_POR_DEFECTO)
    expect(r).toHaveLength(7)
    expect(r.every((a) => a.fraccion === 0 && !a.cumplida)).toBe(true)
    expect(r.find((a) => a.actividad === 'gimnasio')?.texto).toBe('0 de 4 sesiones')
  })

  it('metas por sesiones: hecho y mínimo suman; salteado y planificado no', () => {
    const s = semana([bloque('gimnasio', 'hecho', 75), bloque('gimnasio', 'minimo', 75), bloque('gimnasio', 'salteado', 75), bloque('gimnasio', 'planificado', 75)])
    expect(de(s, 'gimnasio')).toMatchObject({ hechos: 1, minimos: 1, salteados: 1, planificados: 1, fraccion: 0.5, cumplida: false })
    expect(de(s, 'gimnasio').texto).toBe('2 de 4 sesiones · 1 mínimo')
  })

  it('metas por horas: el hecho cuenta entero y el mínimo, reducido', () => {
    const s = semana([bloque('ingles', 'hecho', 90), bloque('ingles', 'minimo', 90), bloque('ingles', 'planificado', 90)])
    expect(de(s, 'ingles').minutos).toBe(90 + 20) // el mínimo de inglés es de 20 min
    expect(de(s, 'ingles').texto).toBe('1 h 50 min de 10 h · 1 mínimo')
    expect(de(s, 'ingles').fraccion).toBeCloseTo(110 / 600)
  })

  it('al llegar a la meta queda cumplida y la fracción no pasa de 1', () => {
    const s = semana(Array.from({ length: 5 }, () => bloque('gimnasio', 'hecho', 75)))
    expect(de(s, 'gimnasio')).toMatchObject({ fraccion: 1, cumplida: true })
  })

  it('una actividad con meta cero no aparece', () => {
    const sin = ACTIVIDADES_POR_DEFECTO.map((a) => (a.id === 'caminata' ? { ...a, meta: 0 } : a))
    expect(avanceSemana(semana([]), sin).some((a) => a.actividad === 'caminata')).toBe(false)
  })

  it('minutosEfectivos y admiteMinimo', () => {
    expect(minutosEfectivos(bloque('libre', 'minimo', 180), act('libre'))).toBe(180) // sin mínimo: vale entero
    expect(minutosEfectivos(bloque('ingles', 'minimo', 10), act('ingles'))).toBe(10) // nunca más que el bloque
    expect(minutosEfectivos(bloque('ingles', 'salteado', 90), act('ingles'))).toBe(0)
    expect(admiteMinimo(act('ingles'))).toBe(true)
    expect(admiteMinimo(act('libre'))).toBe(false)
    expect(admiteMinimo(undefined)).toBe(false)
  })
})
