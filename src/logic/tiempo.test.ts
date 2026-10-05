import { describe, expect, it } from 'vitest'
import {
  minutosDelDiaEnArgentina,
  fechaEnArgentina,
  formatearDuracion,
  horaCampo,
  horaDeFin,
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

describe('horaDeFin', () => {
  it('la medianoche de cierre se lee 24:00 y el resto igual que horaCampo', () => {
    expect(horaDeFin(1440)).toBe('24:00')
    expect(horaDeFin(2 * 1440)).toBe('24:00')
    expect(horaDeFin(0)).toBe('00:00')
    expect(horaDeFin(1440 + 750)).toBe('12:30')
  })
})

describe('fechas de hoy', () => {
  it('día de la semana y texto de fecha', async () => {
    const { diaDeLaSemana, textoFecha, fechaEnArgentina } = await import('./tiempo')
    expect(diaDeLaSemana('2026-10-05')).toBe(0)
    expect(diaDeLaSemana('2026-10-11')).toBe(6)
    expect(textoFecha('2026-10-04')).toBe('Domingo 4 de octubre')
    expect(textoFecha('2026-01-01')).toBe('Jueves 1 de enero')
    // 01:00 UTC del lunes 5 sigue siendo domingo 4 en Argentina
    expect(fechaEnArgentina(Date.UTC(2026, 9, 5, 1, 0))).toBe('2026-10-04')
  })
})

describe('minutosDelDiaEnArgentina', () => {
  it('descuenta el huso: 03:00 UTC son las 00:00 en Argentina, y 02:59 UTC siguen siendo las 23:59 de ayer', () => {
    expect(minutosDelDiaEnArgentina(Date.UTC(2026, 9, 5, 3, 0))).toBe(0)
    expect(minutosDelDiaEnArgentina(Date.UTC(2026, 9, 5, 2, 59))).toBe(23 * 60 + 59)
    expect(minutosDelDiaEnArgentina(Date.UTC(2026, 9, 5, 15, 30))).toBe(12 * 60 + 30)
  })
})
