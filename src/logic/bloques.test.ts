import { describe, expect, it } from 'vitest'
import { AJUSTES_POR_DEFECTO } from './defaults'
import {
  aceptarSugerencia,
  bloqueDesdeCampos,
  bloquesDelDia,
  bloquesQueCuentan,
  cambiarEstado,
  fueraDeVentanas,
  guardarBloque,
  idNuevo,
  quitarBloque,
} from './bloques'
import { SEMANA_EJEMPLO } from './ejemplo'
import { MIN_DIA } from './tiempo'
import { computeWindows } from './windows'
import type { Bloque, Semana } from './types'

const H = 60
const b = (id: string, dia: number, desde: number, hasta: number, extra: Partial<Bloque> = {}): Bloque => ({
  id,
  actividad: 'ingles',
  inicio: dia * MIN_DIA + desde * H,
  fin: dia * MIN_DIA + hasta * H,
  estado: 'planificado',
  fijo: false,
  ...extra,
})
const semana = (bloques: Bloque[]): Semana => ({ lunes: '2026-10-05', turnos: [], bloques })

describe('aceptarSugerencia', () => {
  it('reemplaza lo planificado y conserva lo fijo y lo hecho', () => {
    const s = semana([
      b('viejo', 0, 9, 10),
      b('fijo', 1, 9, 10, { fijo: true, actividad: 'psicologo' }),
      b('hecho', 2, 9, 10, { estado: 'hecho' }),
      b('minimo', 3, 9, 10, { estado: 'minimo' }),
      b('salteado', 4, 9, 10, { estado: 'salteado' }),
    ])
    const r = aceptarSugerencia(s, [b('nuevo', 0, 10, 11), b('pisa', 2, 9, 9.5)])
    expect(r.bloques.map((x) => x.id)).toEqual(['nuevo', 'fijo', 'hecho', 'minimo'])
    // no se modifica la semana original
    expect(s.bloques).toHaveLength(5)
  })

  it('bloquesQueCuentan: fijos, hechos y mínimos', () => {
    const s = semana([b('a', 0, 9, 10), b('f', 0, 11, 12, { fijo: true }), b('h', 0, 13, 14, { estado: 'hecho' }), b('s', 0, 15, 16, { estado: 'salteado' })])
    expect(bloquesQueCuentan(s).map((x) => x.id)).toEqual(['f', 'h'])
  })
})

describe('guardarBloque', () => {
  const s = semana([b('a', 0, 9, 10)])

  it('agrega, reemplaza por id y deja todo ordenado', () => {
    const r = guardarBloque(s, b('c', 0, 8, 8.5))
    expect(r.ok && r.semana.bloques.map((x) => x.id)).toEqual(['c', 'a'])
    const mov = guardarBloque(s, b('a', 0, 9.5, 10.5))
    expect(mov.ok && mov.semana.bloques).toHaveLength(1)
  })

  it('rechaza superposiciones, pero un bloque no choca consigo mismo', () => {
    expect(guardarBloque(s, b('c', 0, 9.5, 10.5))).toMatchObject({ ok: false, motivo: 'superpuesto' })
    expect(guardarBloque(s, b('a', 0, 9, 10.5)).ok).toBe(true)
    // pegados no se superponen
    expect(guardarBloque(s, b('c', 0, 10, 11)).ok).toBe(true)
  })

  it('rechaza rangos inválidos', () => {
    expect(guardarBloque(s, b('c', 0, 9, 9)).ok).toBe(false)
    expect(guardarBloque(s, b('c', 0, 10, 9)).ok).toBe(false)
    expect(guardarBloque(s, { ...b('c', 0, 9, 10), fin: 7 * MIN_DIA + 1 }).ok).toBe(false)
    expect(guardarBloque(s, b('c', 0, 23, 25)).ok).toBe(false) // cruza la medianoche
    expect(guardarBloque(s, b('c', 0, 23, 24)).ok).toBe(true)
  })
})

describe('otros cambios', () => {
  const s = semana([b('a', 0, 9, 10), b('c', 1, 9, 10)])

  it('quitar, cambiar estado y listar por día', () => {
    expect(quitarBloque(s, 'a').bloques.map((x) => x.id)).toEqual(['c'])
    expect(cambiarEstado(s, 'c', 'minimo').bloques[1].estado).toBe('minimo')
    expect(s.bloques[1].estado).toBe('planificado')
    expect(bloquesDelDia(s, 1).map((x) => x.id)).toEqual(['c'])
    expect(bloquesDelDia(s, 3)).toEqual([])
  })

  it('idNuevo no repite ids', () => {
    expect(idNuevo(s, 'ingles', 5)).toBe('ingles-5-0')
    expect(idNuevo(semana([b('ingles-5-0', 0, 0, 1)]), 'ingles', 5)).toBe('ingles-5-1')
  })

  it('bloqueDesdeCampos: horas válidas, 00:00 como fin y errores', () => {
    const base = { id: 'x', actividad: 'ingles' as const, estado: 'planificado' as const, fijo: false }
    expect(bloqueDesdeCampos(base, 2, '09:00', '10:30')).toMatchObject({ inicio: 2 * MIN_DIA + 540, fin: 2 * MIN_DIA + 630 })
    expect(bloqueDesdeCampos(base, 2, '22:00', '00:00')?.fin).toBe(3 * MIN_DIA)
    expect(bloqueDesdeCampos(base, 2, '10:00', '09:00')).toBeNull()
    expect(bloqueDesdeCampos(base, 2, '', '09:00')).toBeNull()
    expect(bloqueDesdeCampos(base, 9, '09:00', '10:00')).toBeNull()
  })

  it('fueraDeVentanas avisa cuando el bloque no cae en una ventana libre', () => {
    const dias = computeWindows(SEMANA_EJEMPLO, AJUSTES_POR_DEFECTO)
    expect(fueraDeVentanas(b('x', 0, 9, 10), dias)).toBe(false) // lunes 8:30–12:30
    expect(fueraDeVentanas(b('x', 0, 15, 16), dias)).toBe(true) // en pleno turno
  })
})
