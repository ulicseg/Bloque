import { describe, expect, it } from 'vitest'
import { ACTIVIDADES_POR_DEFECTO, COMIDAS_V3, PRIORIDADES_V4 } from './defaults'
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
    const lunes = `2026-10-${String(5 + 7 * i).padStart(2, '0')}`
    r[lunes] = {
      lunes,
      turnos: [{ inicio: 360, fin: 840 }],
      bloques: Array.from({ length: bloquesPorSemana }, (_, j) => ({
        id: `${i}-${j}`,
        actividad: 'ingles' as const,
        inicio: 900,
        fin: 990,
        estado: 'hecho' as const,
        fijo: false,
      })),
    }
  }
  return r
}

describe('exportar e importar', () => {
  it('devuelve exactamente los mismos datos', () => {
    const origen = {
      ...DATOS_INICIALES,
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
    expect(r).toEqual({ schemaVersion: VERSION_ACTUAL, datos: { ...DATOS_INICIALES, pestaña: 'metas' } })
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
    const actual = { schemaVersion: VERSION_ACTUAL, datos: { ...DATOS_INICIALES, semanas: semanasDe(1, 1) } }
    expect(migrar(actual)).toEqual(actual)
    expect(migrar({ schemaVersion: VERSION_ACTUAL + 1, datos: {} })).toBeNull()
    expect(migrar({ schemaVersion: 0, datos: {} })).toBeNull()
    expect(migrar({ schemaVersion: 1.5, datos: {} })).toBeNull()
    expect(migrar({ schemaVersion: 1, datos: 'roto' })).toBeNull()
  })

  it('v2 → v3: cada semana recibe su lunes, aparecen los valores por defecto y no se pierde nada', () => {
    const v2 = {
      schemaVersion: 2,
      datos: {
        pestaña: 'semana',
        semanas: { '2026-10-05': { turnos: [{ dia: 0, desde: 6, hasta: 14 }], bloques: [{ id: 'x' }], nota: 'vieja' } },
        rareza: [1, 2],
      },
    }
    const r = migrar(v2)
    expect(r?.schemaVersion).toBe(VERSION_ACTUAL)
    expect(r?.datos.ajustes).toEqual(DATOS_INICIALES.ajustes)
    expect(r?.datos.actividades).toEqual(DATOS_INICIALES.actividades)
    expect(r?.datos.semanas['2026-10-05']).toEqual({
      lunes: '2026-10-05',
      turnos: [{ dia: 0, desde: 6, hasta: 14 }],
      bloques: [{ id: 'x' }],
      nota: 'vieja',
    })
    expect((r?.datos as unknown as Record<string, unknown>).rareza).toEqual([1, 2])
    expect(r?.datos.pestaña).toBe('semana')
  })

  it('v1 → actual encadena todas las migraciones', () => {
    const r = migrar({ schemaVersion: 1, datos: { pestaña: 'ajustes' } })
    expect(r).toEqual({ schemaVersion: VERSION_ACTUAL, datos: { ...DATOS_INICIALES, pestaña: 'ajustes' } })
  })

  it('v2 → v3 no pisa ajustes que ya existieran por una importación rara', () => {
    const ajustes = { trasladoMin: 10, comidas: [] }
    const v3 = MIGRACIONES[1]({ schemaVersion: 2, datos: { pestaña: 'hoy', semanas: {}, ajustes } })
    expect((v3.datos as Datos).ajustes).toEqual(ajustes)
  })

  describe('v3 → v4', () => {
    const v3 = (ajustes: unknown) => ({ schemaVersion: 3, datos: { pestaña: 'semana', semanas: {}, actividades: [], ajustes, rareza: 7 } })

    it('con los ajustes de la v3 sin tocar, aparecen las reglas nuevas y las comidas nuevas', () => {
      const r = migrar(v3({ trasladoMin: 30, suenoMin: 480, comidas: COMIDAS_V3 }))
      expect(r?.schemaVersion).toBe(VERSION_ACTUAL)
      expect(r?.datos.ajustes).toEqual(DATOS_INICIALES.ajustes)
      expect((r?.datos as unknown as Record<string, unknown>).rareza).toBe(7)
    })

    it('conserva lo que el usuario cambió: traslado, duración del sueño y comidas propias', () => {
      const comidas = [{ nombre: 'Merienda', inicio: 1000, duracionMin: 20 }]
      const r = migrar(v3({ trasladoMin: 45, suenoMin: 420, comidas }))
      expect(r?.datos.ajustes.trasladoMin).toBe(45)
      expect(r?.datos.ajustes.suenoInicio).toBe(0)
      expect(r?.datos.ajustes.suenoFin).toBe(420)
      expect(r?.datos.ajustes.comidas).toEqual(comidas)
      expect(r?.datos.ajustes.despertarMin).toBe(30)
      expect('suenoMin' in (r?.datos.ajustes ?? {})).toBe(false)
    })

    it('ajustes ausentes o rotos se completan con los valores por defecto', () => {
      expect(migrar(v3(undefined))?.datos.ajustes).toEqual(DATOS_INICIALES.ajustes)
      expect(migrar(v3('roto'))?.datos.ajustes).toEqual(DATOS_INICIALES.ajustes)
    })
  })

  describe('v4 → v5', () => {
    const v4 = (actividades: unknown) => ({ schemaVersion: 4, datos: { pestaña: 'metas', semanas: {}, ajustes: {}, actividades, rareza: 3 } })
    const viejas = () => ACTIVIDADES_POR_DEFECTO.map((a) => ({ ...a, prioridad: PRIORIDADES_V4[a.id] }))

    it('con las prioridades de la v4 sin tocar, pasan al orden nuevo y no cambia nada más', () => {
      const r = migrar(v4(viejas()))
      expect(r?.schemaVersion).toBe(VERSION_ACTUAL)
      expect(r?.datos.actividades).toEqual(ACTIVIDADES_POR_DEFECTO)
      expect((r?.datos as unknown as Record<string, unknown>).rareza).toBe(3)
    })

    it('si hay alguna otra prioridad, o faltan actividades, se conserva tal cual', () => {
      const tocadas = viejas().map((a) => (a.id === 'caminata' ? { ...a, prioridad: 1, meta: 5 } : a))
      // lo único que suma la v6 es el gimnasio cerrado los domingos
      const conDomingo = tocadas.map((a) => (a.id === 'gimnasio' ? { ...a, diasNo: [6] } : a))
      expect(migrar(v4(tocadas))?.datos.actividades).toEqual(conDomingo)
      const incompletas = viejas().slice(0, 3)
      expect(migrar(v4(incompletas))?.datos.actividades).toEqual(incompletas.map((a) => (a.id === 'gimnasio' ? { ...a, diasNo: [6] } : a)))
      expect(migrar(v4([]))?.datos.actividades).toEqual([])
    })
  })

  describe('v5 → v6', () => {
    const v5 = (actividades: unknown) => ({ schemaVersion: 5, datos: { pestaña: 'metas', semanas: {}, ajustes: {}, actividades, rareza: 3 } })

    it('el gimnasio pasa a estar cerrado los domingos y el resto queda igual', () => {
      const sinCampo = ACTIVIDADES_POR_DEFECTO.map(({ diasNo, ...a }) => (void diasNo, a))
      const r = migrar(v5(sinCampo))
      expect(r?.schemaVersion).toBe(VERSION_ACTUAL)
      expect(r?.datos.actividades).toEqual(ACTIVIDADES_POR_DEFECTO)
      expect((r?.datos as unknown as Record<string, unknown>).rareza).toBe(3)
    })

    it('si el gimnasio ya traía sus días, no se pisan', () => {
      const propios = [{ id: 'gimnasio', diasNo: [2] }]
      expect(migrar(v5(propios))?.datos.actividades).toEqual(propios)
    })
  })
})
