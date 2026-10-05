import { describe, expect, it } from 'vitest'
import { finDeSiesta, minutosDeSiesta } from './siestas'

describe('siestas', () => {
  it('la rápida dura 35 min y la larga 3 bloques de 35 (1 h 45 min)', () => {
    expect(minutosDeSiesta(1)).toBe(35)
    expect(minutosDeSiesta(3)).toBe(105)
  })

  it('calcula el fin desde el inicio', () => {
    expect(finDeSiesta('14:00', 1)).toBe('14:35')
    expect(finDeSiesta('14:00', 3)).toBe('15:45')
    expect(finDeSiesta('23:25', 1)).toBe('00:00')
  })

  it('no inventa un fin si se pasa de medianoche o la hora no vale', () => {
    expect(finDeSiesta('23:30', 1)).toBeNull()
    expect(finDeSiesta('', 3)).toBeNull()
  })
})
