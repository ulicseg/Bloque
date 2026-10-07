import { describe, expect, it } from 'vitest'
import { MIN_BASE_SEMANA, horasDelMes, textoDiferencia } from './horasMes'
import { diasDelMes, sumarMeses } from './tiempo'
import { crearTurno } from './turnos'
import type { Semana } from './types'

const H = 60
const turno = (dia: number, desde: number, hasta: number) => crearTurno(dia, desde * H, hasta * H)!
const semana = (lunes: string, turnos: Semana['turnos']): Semana => ({ lunes, turnos, bloques: [] })
/** 6 días de 4 h = la base de 24 h (el domingo es franco). */
const base = (lunes: string) => semana(lunes, [0, 1, 2, 3, 4, 5].map((d) => turno(d, 6, 10)))

describe('horasDelMes', () => {
  it('semana a semana, con la base de 24 h', () => {
    // Octubre 2026 arranca un jueves: lunes 28/9, 5, 12, 19 y 26/10
    const datos = { semanas: { '2026-10-05': base('2026-10-05'), '2026-10-12': base('2026-10-12') } }
    const r = horasDelMes(datos, '2026-10')
    expect(r.semanas.map((s) => s.lunes)).toEqual(['2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'])
    expect(r.semanas[1].minutos).toBe(MIN_BASE_SEMANA)
    expect(r.totalMin).toBe(2 * MIN_BASE_SEMANA)
    expect(r.diferenciaMin).toBe(0)
  })

  it('un día de 8 h hace pasar la semana de la base', () => {
    const s = semana('2026-10-05', [turno(0, 6, 14), ...[1, 2, 3, 4, 5].map((d) => turno(d, 6, 10))])
    const r = horasDelMes({ semanas: { '2026-10-05': s } }, '2026-10')
    expect(r.semanas[1].minutos).toBe(28 * H)
    expect(r.diferenciaMin).toBe(4 * H)
    expect(textoDiferencia(r.diferenciaMin)).toBe('+4 h')
  })

  it('una semana sin cargar no cuenta como faltante', () => {
    const r = horasDelMes({ semanas: { '2026-10-05': base('2026-10-05') } }, '2026-10')
    expect(r.semanas[2].cargada).toBe(false)
    expect(r.esperadoMin).toBe(MIN_BASE_SEMANA)
    expect(r.diferenciaMin).toBe(0)
  })

  it('en la semana que cruza de mes solo cuentan los días de ese mes', () => {
    // Semana 28/9–4/10: lunes a miércoles son septiembre, jueves a domingo octubre
    const datos = { semanas: { '2026-09-28': base('2026-09-28') } }
    const oct = horasDelMes(datos, '2026-10')
    const sep = horasDelMes(datos, '2026-09')
    expect(oct.semanas[0].diasEnMes).toBe(4)
    expect(oct.semanas[0].minutos).toBe(3 * 4 * H) // jue, vie y sáb (dom franco)
    expect(sep.semanas.at(-1)!.minutos).toBe(3 * 4 * H) // lun, mar y mié
    expect(oct.semanas[0].minutos + sep.semanas.at(-1)!.minutos).toBe(MIN_BASE_SEMANA)
  })

  it('un turno 22–6 cuenta entero en el mes en que empieza', () => {
    // Sábado 31/10/2026 22:00 → domingo 1/11 06:00
    const datos = { semanas: { '2026-10-26': semana('2026-10-26', [turno(5, 22, 6)]) } }
    expect(horasDelMes(datos, '2026-10').totalMin).toBe(8 * H)
    expect(horasDelMes(datos, '2026-11').totalMin).toBe(0)
  })

  it('sin datos devuelve ceros', () => {
    const r = horasDelMes({ semanas: {} }, '2026-02')
    expect(r.totalMin).toBe(0)
    expect(r.esperadoMin).toBe(0)
    expect(r.semanas).toHaveLength(5) // febrero 2026: lunes 26/1 a lunes 23/2
  })
})

describe('textoDiferencia', () => {
  it('signo y duración', () => {
    expect(textoDiferencia(0)).toBe('Justo')
    expect(textoDiferencia(210)).toBe('+3 h 30 min')
    expect(textoDiferencia(-120)).toBe('−2 h')
  })
})

describe('meses', () => {
  it('sumarMeses cruza de año', () => {
    expect(sumarMeses('2026-12', 1)).toBe('2027-01')
    expect(sumarMeses('2026-01', -1)).toBe('2025-12')
  })

  it('diasDelMes', () => {
    expect(diasDelMes('2026-02')).toBe(28)
    expect(diasDelMes('2028-02')).toBe(29)
    expect(diasDelMes('2026-10')).toBe(31)
  })
})
