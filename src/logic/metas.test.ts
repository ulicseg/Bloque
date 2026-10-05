import { describe, expect, it } from 'vitest'
import { ACTIVIDADES_POR_DEFECTO } from './defaults'
import { LIMITES, alternarFranja, editarActividad, esCualquierFranja, normalizarFranjas, ordenadas, reordenar, textoFranjas, puede, resumen, siguiente, textoMeta, textoMinimo } from './metas'
import type { Actividad, IdActividad } from './types'

const lista = ACTIVIDADES_POR_DEFECTO
const de = (l: Actividad[], id: IdActividad) => l.find((a) => a.id === id)!

describe('editarActividad', () => {
  it('cambia solo la actividad pedida', () => {
    const r = editarActividad(lista, 'gimnasio', { meta: 3, franjas: ['noche'] })
    expect(de(r, 'gimnasio')).toMatchObject({ meta: 3, franjas: ['noche'], duracionMin: 75 })
    expect(r.filter((a) => a.id !== 'gimnasio')).toEqual(lista.filter((a) => a.id !== 'gimnasio'))
  })

  it('respeta los límites y los pasos de cada tipo de meta', () => {
    expect(de(editarActividad(lista, 'gimnasio', { meta: 99 }), 'gimnasio').meta).toBe(LIMITES.sesiones.max)
    expect(de(editarActividad(lista, 'gimnasio', { meta: -3 }), 'gimnasio').meta).toBe(0)
    expect(de(editarActividad(lista, 'ingles', { meta: 6.3 }), 'ingles').meta).toBe(6.5)
    expect(de(editarActividad(lista, 'ingles', { meta: 1000 }), 'ingles').meta).toBe(LIMITES.horas.max)
    expect(de(editarActividad(lista, 'ingles', { duracionMin: 0 }), 'ingles').duracionMin).toBe(LIMITES.duracionMin.min)
    expect(de(editarActividad(lista, 'ingles', { duracionMin: 92 }), 'ingles').duracionMin).toBe(90)
  })

  it('el mínimo nunca supera la duración y por debajo del primer paso es "sin mínimo"', () => {
    expect(de(editarActividad(lista, 'ingles', { duracionMin: 15 }), 'ingles').minimoMin).toBe(15)
    expect(de(editarActividad(lista, 'ingles', { minimoMin: 500 }), 'ingles').minimoMin).toBe(90)
    expect(de(editarActividad(lista, 'ingles', { minimoMin: 0 }), 'ingles').minimoMin).toBeNull()
    expect(de(editarActividad(lista, 'ingles', { minimoMin: null }), 'ingles').minimoMin).toBeNull()
    expect(de(editarActividad(lista, 'libre', { minimoMin: 30 }), 'libre').minimoMin).toBe(30)
  })

  it('no toca la prioridad ni los datos que no se editan', () => {
    const r = de(editarActividad(lista, 'caminata', { meta: 5 }), 'caminata')
    expect(r.prioridad).toBe(de(lista, 'caminata').prioridad)
    expect(r.fija).toBe(false)
    expect(r.nombre).toBe('Caminata')
  })
})

describe('reordenar', () => {
  const sortables = ['gimnasio', 'ingles', 'programacion', 'caminata', 'libre'] as IdActividad[]

  it('la lista acomodada a mano define las prioridades 1..N y las fijas quedan al final', () => {
    const r = reordenar(lista, sortables)
    expect(ordenadas(r).map((a) => a.id)).toEqual([...sortables, 'psicologo'])
    expect(r.map((a) => a.prioridad).sort()).toEqual([1, 2, 3, 4, 5, 6])
    expect(de(r, 'gimnasio').prioridad).toBe(1)
  })

  it('con prioridades repetidas las vuelve a numerar sin repetir', () => {
    const repetidas = lista.map((a) => ({ ...a, prioridad: 1 }))
    expect(new Set(reordenar(repetidas, sortables).map((a) => a.prioridad)).size).toBe(lista.length)
  })

  it('ignora ids que no existen o repetidos y no pierde ninguna actividad', () => {
    const r = reordenar(lista, ['libre', 'libre', 'fantasma' as IdActividad])
    expect(ordenadas(r)[0].id).toBe('libre')
    expect(r).toHaveLength(lista.length)
  })
})

describe('franjas', () => {
  it('marcar y desmarcar mantiene el orden del día y nunca deja la lista vacía', () => {
    expect(alternarFranja(['noche'], 'manana')).toEqual(['manana', 'noche'])
    expect(alternarFranja(['manana', 'noche'], 'manana')).toEqual(['noche'])
    expect(alternarFranja(['noche'], 'noche')).toEqual(['noche'])
  })

  it('normalizar descarta lo inválido y, sin nada válido, vuelve a las tres', () => {
    expect(normalizarFranjas(['noche', 'tarde', 'tarde', 'x'])).toEqual(['tarde', 'noche'])
    expect(normalizarFranjas([])).toEqual(['manana', 'tarde', 'noche'])
  })

  it('las tres juntas (o ninguna) son "cualquiera" y no se nombran en el resumen', () => {
    expect(esCualquierFranja(['manana', 'tarde', 'noche'])).toBe(true)
    expect(esCualquierFranja([])).toBe(true)
    expect(esCualquierFranja(['tarde'])).toBe(false)
    expect(textoFranjas(['manana', 'noche'])).toBe('mañana o noche')
    expect(textoFranjas(['manana', 'tarde', 'noche'])).toBe('mañana, tarde o noche')
    const dosFranjas = { ...de(lista, 'ingles'), franjas: ['manana', 'tarde'] as Actividad['franjas'] }
    expect(resumen(dosFranjas)).toBe('10 h por semana · 1 h 30 min · mañana o tarde')
  })
})

describe('textos', () => {
  it('meta, mínimo y resumen', () => {
    expect(textoMeta(de(lista, 'ingles'))).toBe('10 h')
    expect(textoMeta({ ...de(lista, 'ingles'), meta: 6.5 })).toBe('6,5 h')
    expect(textoMeta(de(lista, 'psicologo'))).toBe('1 sesión')
    expect(textoMinimo(de(lista, 'libre'))).toBe('Sin mínimo')
    expect(textoMinimo(de(lista, 'gimnasio'))).toBe('30 min')
    expect(resumen(de(lista, 'gimnasio'))).toBe('4 sesiones por semana · 1 h 15 min · tarde')
    expect(resumen(de(lista, 'ingles'))).toBe('10 h por semana · 1 h 30 min')
    expect(resumen({ ...de(lista, 'ingles'), meta: 0 })).toBe('Desactivada')
  })
})

describe('contadores', () => {
  const gimnasio = de(lista, 'gimnasio')

  it('cada toque mueve un paso y se detiene en los topes', () => {
    expect(siguiente(gimnasio, 'meta', 1)).toEqual({ meta: 5 })
    expect(siguiente(de(lista, 'ingles'), 'meta', -1)).toEqual({ meta: 9.5 })
    expect(siguiente(gimnasio, 'duracionMin', 1)).toEqual({ duracionMin: 80 })
    expect(puede({ ...gimnasio, meta: LIMITES.sesiones.max }, 'meta', 1)).toBe(false)
    expect(puede({ ...gimnasio, meta: 0 }, 'meta', -1)).toBe(false)
    expect(puede({ ...gimnasio, duracionMin: LIMITES.duracionMin.min }, 'duracionMin', -1)).toBe(false)
  })

  it('el mínimo recorre "sin mínimo" → 5 min … hasta la duración', () => {
    const libre = de(lista, 'libre') // sin mínimo, 180 min
    expect(puede(libre, 'minimoMin', -1)).toBe(false)
    expect(editarActividad([libre], 'libre', siguiente(libre, 'minimoMin', 1))[0].minimoMin).toBe(5)
    const cinco = { ...libre, minimoMin: 5 }
    expect(editarActividad([cinco], 'libre', siguiente(cinco, 'minimoMin', -1))[0].minimoMin).toBeNull()
    expect(puede({ ...libre, minimoMin: libre.duracionMin }, 'minimoMin', 1)).toBe(false)
  })

  it('los días que no se puede se ordenan, sin repetir y sin valores imposibles', () => {
    const r = editarActividad([gimnasio], 'gimnasio', { diasNo: [6, 2, 6, 9, -1] })[0]
    expect(r.diasNo).toEqual([2, 6])
    expect(editarActividad([gimnasio], 'gimnasio', { meta: 5 })[0].diasNo).toEqual(gimnasio.diasNo)
  })
})
