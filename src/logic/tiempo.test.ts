import { describe, expect, it } from 'vitest'
import {
  fechaEnArgentina,
  formatearDuracion,
  horaCampo,
  horaCorta,
  leerHoraCampo,
  lunesActual,
  lunesDe,
  rangoSemana,
  sumarDias,
} from './tiempo'

describe('fechas', () => {
  it('lunesDe devuelve el lunes de cualquier día de la semana', () => {
    for (const d of ['2026-10-05', '2026-10-07', '2026-10-11']) expect(lunesDe(d)).toBe('2026-10-05')
    expect(lunesDe('2026-10-12')).toBe('2026-10-12')
  })

  it('sumarDias cruza meses y años', () => {
    expect(sumarDias('2026-10-28', 7)).toBe('2026-11-04')
    expect(sumarDias('2026-12-28', 7)).toBe('2027-01-04')
    expect(sumarDias('2026-10-05', -7)).toBe('2026-09-28')
  })

  it('la fecha en Argentina no depende de la zona del teléfono', () => {
    // 02:30 UTC del lunes 5 sigue siendo domingo 4 a la noche en Argentina (UTC-3)
    expect(fechaEnArgentina(Date.UTC(2026, 9, 5, 2, 30))).toBe('2026-10-04')
    expect(fechaEnArgentina(Date.UTC(2026, 9, 5, 3, 0))).toBe('2026-10-05')
    expect(lunesActual(Date.UTC(2026, 9, 5, 2, 30))).toBe('2026-09-28')
    expect(lunesActual(Date.UTC(2026, 9, 5, 3, 0))).toBe('2026-10-05')
  })

  it('rangoSemana marca el cambio de mes', () => {
    expect(rangoSemana('2026-10-05')).toBe('5–11 oct')
    expect(rangoSemana('2026-09-28')).toBe('28 sep – 4 oct')
  })
})

describe('horas', () => {
  it('horaCorta no lleva ceros y envuelve pasada la medianoche', () => {
    expect(horaCorta(360)).toBe('6')
    expect(horaCorta(390)).toBe('6:30')
    expect(horaCorta(24 * 60 + 360)).toBe('6')
    expect(horaCorta(0)).toBe('0')
  })

  it('horaCampo y leerHoraCampo son inversas', () => {
    expect(horaCampo(375)).toBe('06:15')
    expect(leerHoraCampo('06:15')).toBe(375)
    expect(leerHoraCampo('24:00')).toBeNull()
    expect(leerHoraCampo('')).toBeNull()
  })

  it('formatearDuracion', () => {
    expect(formatearDuracion(480)).toBe('8 h')
    expect(formatearDuracion(510)).toBe('8 h 30 min')
    expect(formatearDuracion(45)).toBe('45 min')
  })
})
