import { describe, expect, it } from 'vitest'
import { AJUSTES_POR_DEFECTO } from './defaults'
import { SEMANA_EJEMPLO } from './ejemplo'
import { MIN_DIA } from './tiempo'
import { crearTurno, semanaVacia } from './turnos'
import { computeWindows, minutosLibres, type DiaCalculado, type TipoTramo } from './windows'
import type { Ajustes, Semana } from './types'

const H = 60
const LUNES = '2026-10-05'
const LUNES_SIGUIENTE = '2026-10-12'

const turno = (dia: number, desde: number, hasta: number) => crearTurno(dia, desde * H, hasta * H)!
const semanaCon = (turnos: Semana['turnos'], lunes = LUNES): Semana => ({ lunes, turnos, bloques: [] })
const calcular = (s: Semana, anterior?: Semana, ajustes: Ajustes = AJUSTES_POR_DEFECTO) => computeWindows(s, ajustes, anterior)

/** 510 → "08:30" (hora del día). Un fin a medianoche se muestra como 24:00; un inicio, como 00:00. */
const hhmm = (min: number, esFin = false) => {
  const m = esFin && min % MIN_DIA === 0 && min > 0 ? MIN_DIA : min % MIN_DIA
  return `${String(Math.floor(m / H)).padStart(2, '0')}:${String(m % H).padStart(2, '0')}`
}
const rango = (a: number, b: number) => `${hhmm(a)}–${hhmm(b, true)}`
const ventanas = (d: DiaCalculado) => d.ventanas.map((v) => rango(v.inicio, v.fin))
const tramos = (d: DiaCalculado) => d.tramos.map((t) => `${t.tipo} ${rango(t.inicio, t.fin)}`)
const tipos = (d: DiaCalculado, tipo: TipoTramo) => d.tramos.filter((t) => t.tipo === tipo).map((t) => rango(t.inicio, t.fin))

describe('computeWindows: la semana real (5–11 oct 2026)', () => {
  const dias = calcular(SEMANA_EJEMPLO)

  it('lunes, martes y miércoles (14–22)', () => {
    for (const d of [0, 1, 2]) expect(ventanas(dias[d]), `día ${d}`).toEqual(['08:30–12:30'])
  })

  it('jueves y viernes', () => {
    for (const d of [3, 4]) expect(ventanas(dias[d]), `día ${d}`).toEqual(['08:30–12:30', '13:30–20:30', '21:30–24:00'])
  })

  it('sábado: a las 21:30 se duerme por el turno del domingo', () => {
    expect(ventanas(dias[5])).toEqual(['08:30–12:30', '13:30–20:30'])
    expect(tipos(dias[5], 'sueno')).toEqual(['00:00–08:00', '21:30–24:00'])
  })

  it('domingo: sueño hasta las 5:00, despertar, traslado, turno y recuperación', () => {
    expect(ventanas(dias[6])).toEqual(['15:30–20:30', '21:30–24:00'])
    expect(tramos(dias[6]).slice(0, 6)).toEqual([
      'sueno 00:00–05:00',
      'despertar 05:00–05:30',
      'traslado 05:30–06:00',
      'turno 06:00–14:00',
      'traslado 14:00–14:30',
      'recuperacion 14:30–15:30',
    ])
  })

  it('el lunes a la noche: turno, traslado, recuperación y sueño desde las 23:30', () => {
    expect(tramos(dias[0]).slice(-6)).toEqual([
      'comida 12:30–13:30',
      'traslado 13:30–14:00',
      'turno 14:00–22:00',
      'traslado 22:00–22:30',
      'recuperacion 22:30–23:30',
      'sueno 23:30–24:00',
    ])
    // la cena del lunes cae adentro del turno y se descarta
    expect(tipos(dias[0], 'comida')).toEqual(['12:30–13:30'])
  })

  it('total: 57,5 horas', () => {
    expect(minutosLibres(dias)).toBe(57.5 * H)
  })

  it('las ventanas de la cena y de las 21:30 antes de dormir son "foco: no", y las del día "foco: sí"', () => {
    expect(dias[3].ventanas.map((v) => v.foco)).toEqual([true, true, false])
    // sábado: 13:30–20:30 termina justo 60 min antes de dormir (21:30): no está "dentro" de los 60 minutos
    expect(dias[5].ventanas.map((v) => v.foco)).toEqual([true, true])
    expect(dias[6].ventanas.map((v) => v.foco)).toEqual([true, false])
  })
})

describe('computeWindows: otros casos', () => {
  it('1. un 22–6 el martes: el miércoles se duerme de 7:00 a 14:00 y la primera ventana empieza a las 14:30', () => {
    const dias = calcular(semanaCon([turno(1, 22, 6)]))
    const mie = dias[2]
    expect(tramos(mie).slice(0, 5)).toEqual([
      'turno 00:00–06:00',
      'traslado 06:00–06:30',
      'despertar 06:30–07:00',
      'sueno 07:00–14:00',
      'despertar 14:00–14:30',
    ])
    expect(ventanas(mie)).toEqual(['14:30–20:30', '21:30–24:00'])
    // el martes no hay sueño de noche porque se trabaja
    expect(tipos(dias[1], 'sueno')).toEqual(['00:00–08:00'])
    expect(ventanas(dias[1])).toEqual(['08:30–12:30', '13:30–20:30'])
  })

  it('2. dos noches seguidas de 22–6', () => {
    const dias = calcular(semanaCon([turno(0, 22, 6), turno(1, 22, 6)]))
    expect(ventanas(dias[0])).toEqual(['08:30–12:30', '13:30–20:30'])
    for (const d of [1, 2]) {
      expect(tipos(dias[d], 'sueno'), `día ${d}`).toEqual(['07:00–14:00'])
    }
    expect(ventanas(dias[1])).toEqual(['14:30–20:30'])
    // la comida del mediodía cae en el sueño y se descarta; la cena queda entre la ventana y el traslado
    expect(tipos(dias[1], 'comida')).toEqual(['20:30–21:30'])
    expect(ventanas(dias[2])).toEqual(['14:30–20:30', '21:30–24:00'])
    // jueves: la noche del miércoles no tuvo turno, vuelve el sueño por defecto
    expect(tipos(dias[3], 'sueno')).toEqual(['00:00–08:00'])
  })

  it('3. turno de 4 h de 18 a 22: sin recuperación y ventana 22:30–23:30 con foco: no', () => {
    const dias = calcular(semanaCon([turno(0, 18, 22)]))
    expect(dias[0].tramos.some((t) => t.tipo === 'recuperacion')).toBe(false)
    expect(ventanas(dias[0])).toEqual(['08:30–12:30', '13:30–17:30', '22:30–23:30'])
    expect(dias[0].ventanas.map((v) => v.foco)).toEqual([true, true, false])
    expect(tipos(dias[0], 'sueno')).toEqual(['00:00–08:00', '23:30–24:00'])
  })

  it('4. semana sin turnos: sueño por defecto y comidas todos los días', () => {
    const dias = calcular(semanaVacia(LUNES))
    for (const d of dias) {
      expect(ventanas(d)).toEqual(['08:30–12:30', '13:30–20:30', '21:30–24:00'])
      expect(tipos(d, 'sueno')).toEqual(['00:00–08:00'])
      expect(tipos(d, 'comida')).toEqual(['12:30–13:30', '20:30–21:30'])
    }
    expect(minutosLibres(dias)).toBe(7 * 13.5 * H)
  })

  it('5. un 22–6 del domingo afecta al lunes de la semana siguiente', () => {
    const semana1 = semanaCon([turno(6, 22, 6)])
    const dias1 = calcular(semana1)
    expect(tramos(dias1[6]).slice(-2)).toEqual(['traslado 21:30–22:00', 'turno 22:00–24:00'])
    expect(ventanas(dias1[6])).toEqual(['08:30–12:30', '13:30–20:30'])

    const semana2 = semanaVacia(LUNES_SIGUIENTE)
    const lunes = calcular(semana2, semana1)[0]
    expect(tramos(lunes).slice(0, 5)).toEqual([
      'turno 00:00–06:00',
      'traslado 06:00–06:30',
      'despertar 06:30–07:00',
      'sueno 07:00–14:00',
      'despertar 14:00–14:30',
    ])
    expect(ventanas(lunes)).toEqual(['14:30–20:30', '21:30–24:00'])
    // sin la semana anterior, el lunes sería un día común
    expect(ventanas(calcular(semana2)[0])).toEqual(['08:30–12:30', '13:30–20:30', '21:30–24:00'])
  })

  it('una semana anterior que no es la contigua se ignora', () => {
    const lejana = semanaCon([turno(6, 22, 6)], '2026-09-21')
    expect(ventanas(calcular(semanaVacia(LUNES_SIGUIENTE), lejana)[0])).toEqual(['08:30–12:30', '13:30–20:30', '21:30–24:00'])
  })

  it('un 22–6 el domingo: la parte del lunes de la semana anterior también cuenta para el sueño del lunes', () => {
    // Domingo anterior 14–22 termina a las 22: la noche del domingo se duerme desde las 23:30 y se levanta a las 8
    const ant = semanaCon([turno(6, 14, 22)], '2026-09-28')
    const lunes = calcular(semanaVacia(LUNES), ant)[0]
    expect(tipos(lunes, 'sueno')).toEqual(['00:00–08:00'])
  })
})

describe('computeWindows: choques entre reglas', () => {
  it('14–22 y a la mañana siguiente 6–14: se duerme al terminar la recuperación (23:30) hasta las 5:00', () => {
    const dias = calcular(semanaCon([turno(0, 14, 22), turno(1, 6, 14)]))
    expect(tipos(dias[0], 'sueno')).toEqual(['00:00–08:00', '23:30–24:00'])
    expect(tipos(dias[1], 'sueno')).toEqual(['00:00–05:00'])
    expect(tramos(dias[1]).slice(0, 4)).toEqual(['sueno 00:00–05:00', 'despertar 05:00–05:30', 'traslado 05:30–06:00', 'turno 06:00–14:00'])
  })

  it('turno de 7:00: se duerme de 21:30 a 6:00', () => {
    const dias = calcular(semanaCon([turno(2, 7, 15)]))
    expect(tipos(dias[1], 'sueno')).toEqual(['00:00–08:00', '21:30–24:00'])
    expect(tipos(dias[2], 'sueno')).toEqual(['00:00–06:00'])
  })

  it('turno de 8:00 no activa la regla 5: el sueño por defecto solo se acorta para llegar a horario', () => {
    const dias = calcular(semanaCon([turno(2, 8, 16)]))
    expect(tipos(dias[1], 'sueno')).toEqual(['00:00–08:00'])
    expect(tipos(dias[2], 'sueno')).toEqual(['00:00–07:00'])
  })

  it('la comida que choca con un turno, un traslado o una recuperación se descarta entera, no se achica', () => {
    // 13–17 (4 h): el traslado de las 12:30 pisa el almuerzo; la cena queda libre
    expect(tipos(calcular(semanaCon([turno(0, 13, 17)]))[0], 'comida')).toEqual(['20:30–21:30'])
    // 12–20 (8 h): el almuerzo cae en el turno y la recuperación de 20:30 pisa la cena
    expect(tipos(calcular(semanaCon([turno(0, 12, 20)]))[0], 'comida')).toEqual([])
    // 14–18: el traslado termina justo cuando empieza el almuerzo (12:30–13:30 vs 13:30) y no lo toca
    expect(tipos(calcular(semanaCon([turno(0, 14, 18)]))[0], 'comida')).toEqual(['12:30–13:30', '20:30–21:30'])
  })

  it('las ventanas de menos de 20 minutos se descartan y las de exactamente 20 se conservan', () => {
    // turno 10–13:30 → traslado 9:30–10 deja 08:30–09:30 y el almuerzo 12:30 queda adentro del turno
    const corta = calcular(semanaCon([turno(0, 9, 13)]))
    // wake hasta 8:30, traslado desde 8:30 → no queda nada antes del turno
    expect(corta[0].ventanas[0].inicio).toBeGreaterThanOrEqual(13 * H)
    const justa = calcular(semanaCon([turno(0, 9, 13) /* hueco 8:30–8:30 */]), undefined, { ...AJUSTES_POR_DEFECTO, trasladoMin: 10 })
    // traslado de 10 min: 8:30–8:50 son 20 min exactos
    expect(ventanas(justa[0])[0]).toBe('08:30–08:50')
    const casi = calcular(semanaCon([turno(0, 9, 13)]), undefined, { ...AJUSTES_POR_DEFECTO, trasladoMin: 11 })
    expect(ventanas(casi[0])[0]).not.toBe('08:30–08:49')
    expect(casi[0].ventanas.every((v) => v.fin - v.inicio >= 20)).toBe(true)
  })

  it('los ajustes mandan: traslado de 45 y recuperación de 30 cambian las ventanas', () => {
    const dias = calcular(SEMANA_EJEMPLO, undefined, { ...AJUSTES_POR_DEFECTO, trasladoMin: 45, recuperacionMin: 30 })
    expect(tipos(dias[0], 'traslado')).toEqual(['13:15–14:00', '22:00–22:45'])
    expect(tipos(dias[0], 'recuperacion')).toEqual(['22:45–23:15'])
  })

  it('los tramos de un día no se superponen y las ventanas no pisan ningún tramo', () => {
    for (const semana of [SEMANA_EJEMPLO, semanaCon([turno(0, 22, 6), turno(1, 22, 6), turno(3, 14, 22), turno(4, 6, 14), turno(5, 18, 22)])]) {
      for (const d of calcular(semana)) {
        for (let i = 1; i < d.tramos.length; i++) expect(d.tramos[i].inicio, `día ${d.dia}`).toBeGreaterThanOrEqual(d.tramos[i - 1].fin)
        for (const v of d.ventanas) {
          expect(d.tramos.some((t) => v.inicio < t.fin && t.inicio < v.fin), `día ${d.dia}`).toBe(false)
          expect(v.inicio).toBeGreaterThanOrEqual(d.dia * MIN_DIA)
          expect(v.fin).toBeLessThanOrEqual((d.dia + 1) * MIN_DIA)
        }
      }
    }
  })

  it('no modifica los datos que recibe', () => {
    const copia = JSON.stringify(SEMANA_EJEMPLO)
    calcular(SEMANA_EJEMPLO, SEMANA_EJEMPLO)
    expect(JSON.stringify(SEMANA_EJEMPLO)).toBe(copia)
  })
})

describe('computeWindows: la semana siguiente', () => {
  it('un lunes temprano adelanta el sueño del domingo a las 21:30', () => {
    const siguiente = semanaCon([turno(0, 6, 14)], LUNES_SIGUIENTE)
    const sin = calcular(SEMANA_EJEMPLO)[6]
    const con = computeWindows(SEMANA_EJEMPLO, AJUSTES_POR_DEFECTO, undefined, siguiente)[6]
    expect(ventanas(sin)).toEqual(['15:30–20:30', '21:30–24:00'])
    expect(tipos(con, 'sueno')).toEqual(['00:00–05:00', '21:30–24:00'])
    expect(ventanas(con)).toEqual(['15:30–20:30'])
  })

  it('una semana que no es la contigua se ignora', () => {
    const lejana = semanaCon([turno(0, 6, 14)], '2026-10-19')
    expect(computeWindows(SEMANA_EJEMPLO, AJUSTES_POR_DEFECTO, undefined, lejana)).toEqual(calcular(SEMANA_EJEMPLO))
  })
})
