import { describe, expect, it } from 'vitest'
import { estadoRespaldo, nombreArchivoRespaldo } from './respaldo'

const DIA = 24 * 60 * 60 * 1000
const AHORA = new Date(2026, 9, 11, 12).getTime()

describe('respaldo', () => {
  it('el nombre lleva la fecha local con ceros', () => {
    expect(nombreArchivoRespaldo(new Date(2026, 0, 5, 23, 59))).toBe('bloques-respaldo-2026-01-05.json')
  })

  it('avisa recién cuando pasaron más de 7 días', () => {
    expect(estadoRespaldo(AHORA - 7 * DIA, AHORA, true)).toEqual({ aviso: false })
    expect(estadoRespaldo(AHORA - 7 * DIA - 1, AHORA, true)).toEqual({ aviso: true, dias: 7 })
    expect(estadoRespaldo(AHORA - 30 * DIA, AHORA, false)).toEqual({ aviso: true, dias: 30 })
  })

  it('sin respaldo previo avisa solo si ya hay datos', () => {
    expect(estadoRespaldo(null, AHORA, true)).toEqual({ aviso: true, dias: null })
    expect(estadoRespaldo(null, AHORA, false)).toEqual({ aviso: false })
  })
})
