import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { contraste } from '../logic/contraste'
import { ACTIVIDADES } from './actividades'

const css = readFileSync(new URL('../styles/tokens.css', import.meta.url), 'utf8')
const entradas = Object.entries(ACTIVIDADES)

describe('paleta de actividades', () => {
  it.each(entradas)('%s: texto sobre su fondo cumple 4.5:1 en claro y oscuro', (_n, { claro, oscuro }) => {
    expect(contraste(claro.color, claro.fondo)).toBeGreaterThanOrEqual(4.5)
    expect(contraste(oscuro.color, oscuro.fondo)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(entradas)('%s: el CSS usa los mismos valores', (nombre, { claro, oscuro }) => {
    for (const hex of [claro.color, claro.fondo, oscuro.color, oscuro.fondo]) {
      expect(css, `${nombre} ${hex}`).toContain(hex)
    }
  })
})
