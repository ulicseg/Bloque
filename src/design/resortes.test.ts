import { describe, expect, it } from 'vitest'
import { RESORTE_DEFECTO, RESORTE_IMPULSO, aFisica, transicion } from './resortes'

describe('resortes', () => {
  it('valores de la skill', () => {
    expect(RESORTE_DEFECTO).toEqual({ amortiguacion: 1, respuesta: 0.35 })
    expect(RESORTE_IMPULSO).toEqual({ amortiguacion: 0.8, respuesta: 0.3 })
  })

  it('amortiguación 1 es críticamente amortiguado: damping² = 4·rigidez', () => {
    const f = aFisica(RESORTE_DEFECTO)
    expect(f.damping ** 2).toBeCloseTo(4 * f.stiffness * f.mass, 6)
  })

  it('amortiguación 0.8 queda subamortiguado (rebota)', () => {
    const f = aFisica(RESORTE_IMPULSO)
    expect(f.damping ** 2).toBeLessThan(4 * f.stiffness * f.mass)
  })

  it('con movimiento reducido devuelve un fundido, no un resorte', () => {
    expect(transicion(RESORTE_DEFECTO, true).type).toBe('tween')
    expect(transicion(RESORTE_DEFECTO, false).type).toBe('spring')
  })
})
