import { describe, expect, it } from 'vitest'
import { CLAVE, DATOS_INICIALES, MIGRACIONES, VERSION_ACTUAL, crearAlmacen, migrar } from './storage'

/** Storage falso mínimo; `falla` simula Safari privado o cuota llena. */
function falso(falla: 'nunca' | 'siempre' | 'despues' = 'nunca') {
  const m = new Map<string, string>()
  let escrituras = 0
  const s: Storage = {
    get length() {
      return m.size
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => {
      escrituras++
      if (falla === 'siempre' || (falla === 'despues' && escrituras > 1)) throw new Error('cuota')
      m.set(k, v)
    },
  }
  return { s, m }
}

describe('storage', () => {
  it('usa el backend si anda y devuelve datos iniciales si está vacío', () => {
    const { s } = falso()
    const a = crearAlmacen(s)
    expect(a.persistente).toBe(true)
    expect(a.leer()).toEqual(DATOS_INICIALES)
  })

  it('guarda y lee ida y vuelta con schemaVersion', () => {
    const { s, m } = falso()
    const a = crearAlmacen(s)
    expect(a.guardar({ pestaña: 'metas' })).toBe(true)
    expect(JSON.parse(m.get(CLAVE)!).schemaVersion).toBe(VERSION_ACTUAL)
    expect(a.leer().pestaña).toBe('metas')
  })

  it('cae a memoria si el backend no deja escribir', () => {
    const { s } = falso('siempre')
    const a = crearAlmacen(s)
    expect(a.persistente).toBe(false)
    expect(a.guardar({ pestaña: 'semana' })).toBe(true)
    expect(a.leer().pestaña).toBe('semana')
  })

  it('cae a memoria si no hay localStorage global', () => {
    const a = crearAlmacen()
    expect(a.guardar({ pestaña: 'ajustes' })).toBe(true)
    expect(a.leer().pestaña).toBe('ajustes')
  })

  it('guardar devuelve false y no lanza si se llena la cuota', () => {
    const { s } = falso('despues')
    const a = crearAlmacen(s)
    expect(a.persistente).toBe(true)
    expect(a.guardar({ pestaña: 'metas' })).toBe(false)
  })

  it('un JSON roto se conserva en un respaldo y no se pisa', () => {
    const { s, m } = falso()
    m.set(CLAVE, '{no es json')
    const a = crearAlmacen(s)
    expect(a.leer()).toEqual(DATOS_INICIALES)
    const resp = [...m.entries()].find(([k]) => k.startsWith(`${CLAVE}:respaldo-`))
    expect(resp?.[1]).toBe('{no es json')
    expect(m.get(CLAVE)).toBe('{no es json')
  })

  it('una versión futura se conserva en un respaldo', () => {
    const { s, m } = falso()
    const futuro = JSON.stringify({ schemaVersion: VERSION_ACTUAL + 1, datos: { x: 1 } })
    m.set(CLAVE, futuro)
    crearAlmacen(s).leer()
    expect([...m.values()].filter((v) => v === futuro).length).toBe(2)
    expect(m.get(CLAVE)).toBe(futuro)
  })

  it('exporta e importa JSON', () => {
    const a = crearAlmacen(falso().s)
    a.guardar({ pestaña: 'metas' })
    const texto = a.exportarJSON()
    const b = crearAlmacen(falso().s)
    expect(b.importarJSON(texto)).toBe(true)
    expect(b.leer().pestaña).toBe('metas')
    expect(b.importarJSON('basura')).toBe(false)
    expect(b.importarJSON('{"schemaVersion":99,"datos":{}}')).toBe(false)
  })

  it('migrar completa los campos que faltan con los iniciales', () => {
    expect(migrar({ schemaVersion: 1, datos: {} })?.datos).toEqual(DATOS_INICIALES)
    expect(migrar({ datos: {} })).toBeNull()
  })

  it('hay una migración por cada salto de versión', () => {
    expect(MIGRACIONES.length).toBe(VERSION_ACTUAL - 1)
  })
})
