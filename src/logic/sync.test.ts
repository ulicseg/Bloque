import { describe, expect, it } from 'vitest'
import { aBase64, conMarca, deBase64, decidir, leerRemoto, type EntradaDecision } from './sync'

const base: EntradaDecision = {
  modificadoLocal: 1000,
  localVacio: false,
  remoto: { sha: 'a', guardadoEn: 1000, vacio: false },
  ultimo: { sha: 'a', ms: 1000 },
}
const con = (cambios: Partial<EntradaDecision>): EntradaDecision => ({ ...base, ...cambios })

describe('decidir', () => {
  it('todo igual: nada', () => {
    expect(decidir(base)).toBe('nada')
  })

  it('el archivo no existe: sube lo local, o nada si no hay nada', () => {
    expect(decidir(con({ remoto: null, ultimo: null }))).toBe('subir')
    expect(decidir(con({ remoto: null, ultimo: null, localVacio: true }))).toBe('nada')
  })

  it('un teléfono vacío se recupera desde GitHub', () => {
    expect(decidir(con({ localVacio: true, modificadoLocal: null, ultimo: null }))).toBe('bajar')
  })

  it('nunca pisa lo local con un remoto vacío, ni lo remoto con un local vacío', () => {
    expect(decidir(con({ remoto: { sha: 'b', guardadoEn: 9999, vacio: true } }))).toBe('subir')
    expect(decidir(con({ localVacio: true, remoto: { sha: 'b', guardadoEn: 1, vacio: true } }))).toBe('nada')
  })

  it('cambié algo acá y el remoto sigue igual: sube', () => {
    expect(decidir(con({ modificadoLocal: 2000 }))).toBe('subir')
  })

  it('cambió el remoto y acá no toqué nada: baja', () => {
    expect(decidir(con({ remoto: { sha: 'b', guardadoEn: 3000, vacio: false } }))).toBe('bajar')
  })

  it('cambiaron los dos lados: gana el más nuevo', () => {
    const remoto = { sha: 'b', guardadoEn: 3000, vacio: false }
    expect(decidir(con({ modificadoLocal: 2000, remoto }))).toBe('bajar')
    expect(decidir(con({ modificadoLocal: 4000, remoto }))).toBe('subir')
  })

  it('primera vez en este dispositivo con datos en los dos lados: gana el más nuevo', () => {
    const remoto = { sha: 'b', guardadoEn: 3000, vacio: false }
    expect(decidir(con({ ultimo: null, modificadoLocal: 5000, remoto }))).toBe('subir')
    expect(decidir(con({ ultimo: null, modificadoLocal: 2000, remoto }))).toBe('bajar')
  })
})

describe('base64', () => {
  it('ida y vuelta con tildes, eñes y emoji', () => {
    const t = '{"pestaña":"hoy","nota":"Gimnasio ✓ — año 2026 🙂"}'
    expect(deBase64(aBase64(t))).toBe(t)
  })

  it('acepta el base64 con saltos de línea que devuelve GitHub', () => {
    const b64 = aBase64('hola mundo, esto es un texto')
    expect(deBase64(`${b64.slice(0, 8)}\n${b64.slice(8)}\n`)).toBe('hola mundo, esto es un texto')
  })

  it('archivos grandes no revientan', () => {
    const grande = 'á'.repeat(200_000)
    expect(deBase64(aBase64(grande))).toBe(grande)
  })
})

describe('marca del archivo', () => {
  it('conMarca agrega guardadoEn sin tocar lo demás', () => {
    const r = JSON.parse(conMarca('{"schemaVersion":11,"datos":{"semanas":{}}}', 42))
    expect(r).toEqual({ schemaVersion: 11, datos: { semanas: {} }, guardadoEn: 42 })
  })

  it('leerRemoto detecta vacío y marca', () => {
    expect(leerRemoto('{"datos":{"semanas":{}},"guardadoEn":7}')).toEqual({ guardadoEn: 7, vacio: true })
    expect(leerRemoto('{"datos":{"semanas":{"2026-10-05":{}}},"guardadoEn":9}')).toEqual({ guardadoEn: 9, vacio: false })
    expect(leerRemoto('{"datos":{"semanas":{"x":{}}}}')).toEqual({ guardadoEn: 0, vacio: false })
    expect(leerRemoto('no es json')).toBeNull()
  })
})
