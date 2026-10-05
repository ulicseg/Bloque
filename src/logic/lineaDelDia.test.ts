import { describe, expect, it } from 'vitest'
import { lineaDelDia } from './lineaDelDia'
import type { DiaCalculado } from './windows'
import type { Bloque } from './types'

const DIA = 2 // miércoles
const base = DIA * 1440
// Como los entrega computeWindows: minutos desde el lunes
const hs = (x: number) => base + x * 60
const h = (x: number) => x * 60

const calculado: DiaCalculado = {
  dia: DIA,
  tramos: [
    { tipo: 'sueno', inicio: hs(0), fin: hs(7) },
    { tipo: 'turno', inicio: hs(8), fin: hs(12) },
    { tipo: 'sueno', inicio: hs(23), fin: hs(24) },
  ],
  ventanas: [
    { inicio: hs(12), fin: hs(18), foco: true },
    { inicio: hs(20), fin: hs(22), foco: false },
  ],
}

const bloque = (desde: number, hasta: number): Bloque => ({
  id: `b${desde}`,
  actividad: 'ingles',
  inicio: base + h(desde),
  fin: base + h(hasta),
  estado: 'planificado',
  fijo: false,
})

describe('lineaDelDia', () => {
  it('sin bloques: lo ocupado y cada ventana como hueco, en orden', () => {
    const r = lineaDelDia(calculado, [], 15)
    expect(r.segmentos.map((s) => [s.tipo, s.inicio, s.fin])).toEqual([
      ['ocupado', h(0), h(7)],
      ['ocupado', h(8), h(12)],
      ['libre', h(12), h(18)],
      ['libre', h(20), h(22)],
      ['ocupado', h(23), h(24)],
    ])
    expect(r.libreMin).toBe(h(8))
  })

  it('un bloque dentro de una ventana la parte en dos huecos y no cuenta como libre', () => {
    const r = lineaDelDia(calculado, [bloque(14, 15.5)], 15)
    expect(r.segmentos.filter((s) => s.tipo !== 'ocupado').map((s) => [s.tipo, s.inicio / 60, s.fin / 60])).toEqual([
      ['libre', 12, 14],
      ['bloque', 14, 15.5],
      ['libre', 15.5, 18],
      ['libre', 20, 22],
    ])
    expect(r.libreMin).toBe(h(2) + h(2.5) + h(2))
  })

  it('un hueco que queda más corto que el mínimo se descarta', () => {
    const r = lineaDelDia(calculado, [bloque(12, 17.9)], 15)
    expect(r.segmentos.some((s) => s.tipo === 'libre' && s.inicio === h(17.9))).toBe(false)
    expect(r.libreMin).toBe(h(2))
  })

  it('el hueco que queda antes de un bloque deja de estar pegado al sueño y recupera el foco', () => {
    const r = lineaDelDia(calculado, [bloque(21, 22)], 15)
    expect(r.segmentos.filter((s) => s.tipo === 'libre' && s.inicio >= h(20))).toEqual([{ tipo: 'libre', inicio: h(20), fin: h(21), foco: true }])
  })

  it('el hueco que llega hasta el sueño sigue sin foco', () => {
    const r = lineaDelDia(calculado, [bloque(20, 21)], 15)
    expect(r.segmentos.filter((s) => s.tipo === 'libre' && s.inicio >= h(20))).toEqual([{ tipo: 'libre', inicio: h(21), fin: h(22), foco: false }])
  })

  it('ignora los bloques de otros días', () => {
    const otro: Bloque = { ...bloque(14, 15), inicio: h(14), fin: h(15) } // lunes
    expect(lineaDelDia(calculado, [otro], 15).libreMin).toBe(h(8))
  })
})
