import { describe, expect, it } from 'vitest'
import {
  COMIDAS_MAX,
  LIMITES_MINUTOS,
  agregarComida,
  comidasOrdenadas,
  editarComida,
  fijarHora,
  pasoComida,
  pasoMinutos,
  puedeMinutos,
  quitarComida,
} from './ajustes'
import { AJUSTES_POR_DEFECTO as A } from './defaults'

describe('contadores de minutos', () => {
  it('mueven un paso y se detienen en los topes', () => {
    expect(pasoMinutos(A, 'trasladoMin', 1).trasladoMin).toBe(35)
    expect(pasoMinutos(A, 'recuperacionMin', -1).recuperacionMin).toBe(45)
    const tope = { ...A, trasladoMin: LIMITES_MINUTOS.trasladoMin.max }
    expect(puedeMinutos(tope, 'trasladoMin', 1)).toBe(false)
    expect(puedeMinutos({ ...A, despertarMin: 0 }, 'despertarMin', -1)).toBe(false)
    expect(puedeMinutos({ ...A, ventanaMinimaMin: 5 }, 'ventanaMinimaMin', -1)).toBe(false)
  })

  it('no modifican los ajustes originales', () => {
    pasoMinutos(A, 'trasladoMin', 1)
    expect(A.trasladoMin).toBe(30)
  })
})

describe('fijarHora', () => {
  it('acepta horas válidas', () => {
    expect(fijarHora(A, 'suenoInicio', '23:00').suenoInicio).toBe(23 * 60)
    expect(fijarHora(A, 'suenoTrasNocheHasta', '13:30').suenoTrasNocheHasta).toBe(13 * 60 + 30)
  })

  it('ignora un texto que no es una hora', () => {
    expect(fijarHora(A, 'suenoFin', '')).toBe(A)
    expect(fijarHora(A, 'suenoFin', '25:00')).toBe(A)
  })

  it('el sueño no puede empezar y terminar a la misma hora', () => {
    expect(fijarHora(A, 'suenoFin', '00:00')).toBe(A)
    expect(fijarHora(A, 'suenoInicio', '08:00')).toBe(A)
  })
})

describe('comidas', () => {
  it('editar corrige la duración y el inicio', () => {
    expect(editarComida(A, 0, { duracionMin: 0 }).comidas[0].duracionMin).toBe(5)
    expect(editarComida(A, 0, { duracionMin: 9999 }).comidas[0].duracionMin).toBe(180)
    expect(editarComida(A, 0, { inicio: 24 * 60 + 10 }).comidas[0].inicio).toBe(24 * 60 - 1)
    // una comida no cruza la medianoche
    expect(editarComida(A, 0, { inicio: 23 * 60 + 30, duracionMin: 90 }).comidas[0].duracionMin).toBe(30)
    expect(editarComida(A, 0, { nombre: 'Brunch' }).comidas[0].nombre).toBe('Brunch')
    expect(editarComida(A, 9, { nombre: 'x' })).toBe(A)
  })

  it('paso de duración, agregar (con tope) y quitar', () => {
    expect(pasoComida(A, 0, 1).comidas[0].duracionMin).toBe(65)
    let a = A
    for (let i = 0; i < 20; i++) a = agregarComida(a)
    expect(a.comidas).toHaveLength(COMIDAS_MAX)
    expect(quitarComida(A, 0).comidas).toEqual([A.comidas[1]])
    expect(quitarComida(quitarComida(A, 0), 0).comidas).toEqual([])
  })

  it('se muestran por hora pero conservan su índice', () => {
    const desordenado = { ...A, comidas: [A.comidas[1], A.comidas[0]] }
    expect(comidasOrdenadas(desordenado).map((x) => x.indice)).toEqual([1, 0])
  })
})
