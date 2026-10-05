import { describe, expect, it } from 'vitest'
import { CLAVE, DATOS_INICIALES, MIGRACIONES, VERSION_ACTUAL, crearAlmacen, migrar, resumir, validarRespaldo, type Datos, type Migracion } from './storage'

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
    expect(a.guardar({ ...DATOS_INICIALES, pestaña: 'metas' })).toBe(true)
    expect(JSON.parse(m.get(CLAVE)!).schemaVersion).toBe(VERSION_ACTUAL)
    expect(a.leer().pestaña).toBe('metas')
  })

  it('cae a memoria si el backend no deja escribir', () => {
    const { s } = falso('siempre')
    const a = crearAlmacen(s)
    expect(a.persistente).toBe(false)
    expect(a.guardar({ ...DATOS_INICIALES, pestaña: 'semana' })).toBe(true)
    expect(a.leer().pestaña).toBe('semana')
  })

  it('cae a memoria si no hay localStorage global', () => {
    const a = crearAlmacen()
    expect(a.guardar({ ...DATOS_INICIALES, pestaña: 'ajustes' })).toBe(true)
    expect(a.leer().pestaña).toBe('ajustes')
  })

  it('guardar devuelve false y no lanza si se llena la cuota', () => {
    const { s } = falso('despues')
    const a = crearAlmacen(s)
    expect(a.persistente).toBe(true)
    expect(a.guardar({ ...DATOS_INICIALES, pestaña: 'metas' })).toBe(false)
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
    a.guardar({ ...DATOS_INICIALES, pestaña: 'metas' })
    const texto = a.exportarJSON()
    const b = crearAlmacen(falso().s)
    expect(b.importarJSON(texto)).toBe(true)
    expect(b.leer().pestaña).toBe('metas')
    expect(b.importarJSON('basura')).toBe(false)
    expect(b.importarJSON('{"schemaVersion":99,"datos":{}}')).toBe(false)
  })

  it('migrar completa los campos que faltan con los iniciales', () => {
    expect(migrar({ schemaVersion: VERSION_ACTUAL, datos: {} })?.datos).toEqual(DATOS_INICIALES)
    expect(migrar({ datos: {} })).toBeNull()
  })

  it('hay una migración por cada salto de versión', () => {
    expect(MIGRACIONES.length).toBe(VERSION_ACTUAL - 1)
  })
})

function semanasDe(n: number, bloquesPorSemana: number): Datos['semanas'] {
  const r: Datos['semanas'] = {}
  for (let i = 0; i < n; i++) {
    r[`2026-10-${String(5 + 7 * i).padStart(2, '0')}`] = {
      turnos: [{ dia: 0, desde: 6, hasta: 14 }],
      bloques: Array.from({ length: bloquesPorSemana }, (_, j) => ({ id: `${i}-${j}`, estado: 'hecho' })),
    }
  }
  return r
}

describe('exportar e importar', () => {
  it('devuelve exactamente los mismos datos', () => {
    const origen = {
      pestaña: 'semana',
      semanas: semanasDe(3, 4),
      // Un campo que esta versión no conoce también tiene que sobrevivir
      extraFuturo: { a: [1, 2, { b: 'ñandú' }] },
    } as Datos
    const a = crearAlmacen(falso().s)
    a.guardar(origen)
    const texto = a.exportarJSON()

    const b = crearAlmacen(falso().s)
    expect(b.importarJSON(texto)).toBe(true)
    expect(b.leer()).toEqual(origen)
    expect(b.leer()).toEqual(a.leer())
    // y exportar de nuevo da el mismo archivo, byte a byte
    expect(b.exportarJSON()).toBe(texto)
  })

  it('importar un JSON inválido no toca los datos actuales', () => {
    const { s, m } = falso()
    const a = crearAlmacen(s)
    a.guardar({ ...DATOS_INICIALES, pestaña: 'metas', semanas: semanasDe(2, 3) })
    const antes = m.get(CLAVE)
    const clavesAntes = [...m.keys()].sort()
    const v = VERSION_ACTUAL
    const malos = [
      'basura',
      '',
      '[]',
      'null',
      '{"schemaVersion":99,"datos":{}}',
      '{"datos":{}}',
      '{"schemaVersion":"2","datos":{}}',
      `{"schemaVersion":${v},"datos":null}`,
      `{"schemaVersion":${v},"datos":{"semanas":{"2026-10-05":{"turnos":1,"bloques":[]}}}}`,
      `{"schemaVersion":${v},"datos":{"semanas":[]}}`,
    ]
    for (const texto of malos) expect(a.importarJSON(texto), texto).toBe(false)
    expect(m.get(CLAVE)).toBe(antes)
    expect([...m.keys()].sort()).toEqual(clavesAntes)
  })

  it('importar un respaldo válido deja una copia de lo anterior', () => {
    const { s, m } = falso()
    const a = crearAlmacen(s)
    a.guardar({ ...DATOS_INICIALES, pestaña: 'semana' })
    const previo = m.get(CLAVE)
    expect(a.importarJSON(JSON.stringify({ schemaVersion: VERSION_ACTUAL, datos: DATOS_INICIALES }))).toBe(true)
    expect([...m.entries()].some(([k, v]) => k.includes(':antes-de-importar-') && v === previo)).toBe(true)
  })

  it('la vista previa cuenta semanas y bloques', () => {
    const a = crearAlmacen(falso().s)
    a.guardar({ ...DATOS_INICIALES, semanas: semanasDe(3, 4) })
    const r = validarRespaldo(a.exportarJSON())
    expect(r.ok && r.resumen).toEqual({ semanas: 3, bloques: 12 })
    expect(resumir(DATOS_INICIALES)).toEqual({ semanas: 0, bloques: 0 })
  })

  it('distingue los motivos de rechazo', () => {
    expect(validarRespaldo('hola')).toEqual({ ok: false, motivo: 'no-es-json' })
    expect(validarRespaldo('{"schemaVersion":99,"datos":{}}')).toEqual({ ok: false, motivo: 'version-no-soportada' })
    expect(validarRespaldo('{"x":1}')).toEqual({ ok: false, motivo: 'formato-invalido' })
  })

  it('el último respaldo se guarda aparte y no entra en el respaldo', () => {
    const a = crearAlmacen(falso().s)
    expect(a.ultimoRespaldo()).toBeNull()
    a.marcarRespaldo(1234567890)
    expect(a.ultimoRespaldo()).toBe(1234567890)
    expect(a.exportarJSON()).not.toContain('1234567890')
  })
})

describe('migrar', () => {
  it('lleva un respaldo v1 a la versión actual sin perder nada', () => {
    const r = migrar({ schemaVersion: 1, datos: { pestaña: 'metas' } })
    expect(r).toEqual({ schemaVersion: VERSION_ACTUAL, datos: { pestaña: 'metas', semanas: {} } })
  })

  it('conserva campos desconocidos al migrar', () => {
    const r = migrar({ schemaVersion: 1, datos: { pestaña: 'hoy', rareza: [1, 2] } })
    expect((r?.datos as unknown as Record<string, unknown>).rareza).toEqual([1, 2])
  })

  it('encadena varias migraciones en orden (v1→v2→v3→v4)', () => {
    type D = { orden?: number[] }
    const paso = (n: number): Migracion => (v) => ({
      ...v,
      schemaVersion: n,
      datos: { ...(v.datos as object), orden: [...((v.datos as D).orden ?? []), n] },
    })
    const cadena = [paso(2), paso(3), paso(4)]
    const r = migrar({ schemaVersion: 1, datos: {} }, cadena, 4)
    expect(r?.schemaVersion).toBe(4)
    expect((r?.datos as unknown as D).orden).toEqual([2, 3, 4])
    // empezando en v3 solo corre la última
    const r3 = migrar({ schemaVersion: 3, datos: {} }, cadena, 4)
    expect((r3?.datos as unknown as D).orden).toEqual([4])
  })

  it('un dato ya actual pasa sin cambios; versión futura o inválida da null', () => {
    const actual = { schemaVersion: VERSION_ACTUAL, datos: { pestaña: 'hoy', semanas: semanasDe(1, 1) } }
    expect(migrar(actual)).toEqual(actual)
    expect(migrar({ schemaVersion: VERSION_ACTUAL + 1, datos: {} })).toBeNull()
    expect(migrar({ schemaVersion: 0, datos: {} })).toBeNull()
    expect(migrar({ schemaVersion: 1.5, datos: {} })).toBeNull()
    expect(migrar({ schemaVersion: 1, datos: 'roto' })).toBeNull()
  })
})
