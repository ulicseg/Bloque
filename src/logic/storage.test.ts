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

const sinSiesta = <T extends { id: string }>(a: T[] | undefined) => a?.filter((x) => x.id !== 'siesta')

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
    // La v4 todavía traía la revisión semanal (la v7 la quita): se agrega a mano para armar la lista de entonces
    const revision = { id: 'revision', nombre: 'Revisión semanal', color: 'revision', tipoMeta: 'sesiones', meta: 1, duracionMin: 20, minimoMin: null, franja: 'noche', prioridad: PRIORIDADES_V4.revision, fija: false }
    const viejas = () => [...ACTIVIDADES_POR_DEFECTO.filter((a) => a.id !== 'siesta').map((a) => ({ ...a, prioridad: PRIORIDADES_V4[a.id] })), revision]

    it('con las prioridades de la v4 sin tocar, pasan al orden nuevo y no cambia nada más', () => {
      const r = migrar(v4(viejas()))
      expect(r?.schemaVersion).toBe(VERSION_ACTUAL)
      expect(sinSiesta(r?.datos.actividades)).toEqual(sinSiesta(ACTIVIDADES_POR_DEFECTO))
      expect((r?.datos as unknown as Record<string, unknown>).rareza).toBe(3)
    })

    it('si hay alguna otra prioridad, o faltan actividades, se conserva tal cual', () => {
      const tocadas = viejas().map((a) => (a.id === 'caminata' ? { ...a, prioridad: 1, meta: 5 } : a))
      // lo único que suman las migraciones siguientes es el gimnasio cerrado los domingos (v6) y sacar la revisión (v7)
      const conDomingo = tocadas.filter((a) => a.id !== 'revision').map((a) => (a.id === 'gimnasio' ? { ...a, diasNo: [6] } : a))
      expect(sinSiesta(migrar(v4(tocadas))?.datos.actividades)).toEqual(conDomingo)
      const incompletas = viejas().slice(0, 3)
      expect(sinSiesta(migrar(v4(incompletas))?.datos.actividades)).toEqual(incompletas.map((a) => (a.id === 'gimnasio' ? { ...a, diasNo: [6] } : a)))
      expect(sinSiesta(migrar(v4([]))?.datos.actividades)).toEqual([])
    })
  })

  describe('v9 → v10', () => {
    const v9 = (actividades: unknown) => ({ schemaVersion: 9, datos: { pestaña: 'hoy', semanas: {}, ajustes: {}, actividades } })

    it('la siesta tal cual salió de la v9 (fija y sin meta) pasa a sugerirse', () => {
      const r = migrar(v9([{ id: 'siesta', fija: true, meta: 0, prioridad: 7 }]), MIGRACIONES, 10)
      expect(r?.schemaVersion).toBe(10)
      expect(r?.datos.actividades).toEqual([{ id: 'siesta', fija: false, meta: 3, prioridad: 7 }])
    })

    it('si la persona ya la tocó no se pisa, y con datos vacíos no se cae', () => {
      const propia = [{ id: 'siesta', fija: false, meta: 5, prioridad: 2 }]
      expect(migrar(v9(propia), MIGRACIONES, 10)?.datos.actividades).toEqual(propia)
      expect(migrar(v9(undefined), MIGRACIONES, 10)?.schemaVersion).toBe(10)
    })
  })

  describe('v10 → v11', () => {
    const v10 = (actividades: unknown) => ({ schemaVersion: 10, datos: { pestaña: 'hoy', semanas: {}, ajustes: {}, actividades } })

    it('la siesta como la dejó la v10 (meta 3, sugerible) vuelve a ser una recomendación sin meta', () => {
      const r = migrar(v10([{ id: 'siesta', fija: false, meta: 3, prioridad: 7 }]))
      expect(r?.schemaVersion).toBe(VERSION_ACTUAL)
      expect(r?.datos.actividades).toEqual([{ id: 'siesta', fija: true, meta: 0, prioridad: 7 }])
    })

    it('si la persona ya la tocó no se pisa, y con datos vacíos no se cae', () => {
      const propia = [{ id: 'siesta', fija: false, meta: 5, prioridad: 2 }]
      expect(migrar(v10(propia))?.datos.actividades).toEqual(propia)
      expect(migrar(v10(undefined))?.schemaVersion).toBe(VERSION_ACTUAL)
    })
  })

  describe('v8 → v9', () => {
    const v8 = (actividades: unknown) => ({ schemaVersion: 8, datos: { pestaña: 'hoy', semanas: {}, ajustes: {}, actividades } })

    it('agrega la siesta al final, con la prioridad siguiente, sin tocar lo demás', () => {
      const previas = [{ id: 'ingles', prioridad: 1 }, { id: 'psicologo', prioridad: 6 }]
      const r = migrar(v8(previas))
      expect(r?.schemaVersion).toBe(VERSION_ACTUAL)
      expect(r?.datos.actividades.slice(0, 2)).toEqual(previas)
      expect(r?.datos.actividades[2]).toMatchObject({ id: 'siesta', prioridad: 7, duracionMin: 35 })
    })

    it('si ya estaba no se duplica, y con datos vacíos no se cae', () => {
      const propias = [{ id: 'siesta', prioridad: 3 }]
      expect(migrar(v8(propias))?.datos.actividades).toEqual(propias)
      expect(migrar(v8(undefined))?.schemaVersion).toBe(VERSION_ACTUAL)
    })
  })

  describe('v7 → v8', () => {
    const v7 = (actividades: unknown) => ({ schemaVersion: 7, datos: { pestaña: 'hoy', semanas: {}, ajustes: {}, actividades, rareza: 3 } })

    it('franja pasa a lista: "cualquiera" son las tres y el resto se conserva como única franja', () => {
      const r = migrar(
        v7([
          { id: 'ingles', franja: 'cualquiera', meta: 10 },
          { id: 'gimnasio', franja: 'tarde', meta: 4 },
          { id: 'raro', franja: 'madrugada' },
        ]),
      )
      expect(r?.schemaVersion).toBe(VERSION_ACTUAL)
      expect(sinSiesta(r?.datos.actividades)).toEqual([
        { id: 'ingles', franjas: ['manana', 'tarde', 'noche'], meta: 10 },
        { id: 'gimnasio', franjas: ['tarde'], meta: 4 },
        { id: 'raro', franjas: ['manana', 'tarde', 'noche'] },
      ])
      expect((r?.datos as unknown as Record<string, unknown>).rareza).toBe(3)
    })

    it('si ya traía franjas no se toca, y con datos vacíos no se cae', () => {
      const propias = [{ id: 'ingles', franjas: ['noche'] }]
      expect(sinSiesta(migrar(v7(propias))?.datos.actividades)).toEqual(propias)
      expect(migrar(v7(undefined))?.schemaVersion).toBe(VERSION_ACTUAL)
    })
  })

  describe('v6 → v7', () => {
    const bloque = (id: string, actividad: string) => ({ id, actividad, dia: 6, inicio: 1200, fin: 1220, estado: 'planificado' })
    const v6 = (datos: object) => ({ schemaVersion: 6, datos: { pestaña: 'hoy', semanas: {}, ajustes: {}, actividades: [], ...datos } })

    it('quita la revisión semanal y sus bloques, y deja todo lo demás', () => {
      const r = migrar(
        v6({
          actividades: [{ id: 'ingles', prioridad: 1 }, { id: 'revision', prioridad: 6 }, { id: 'psicologo', prioridad: 7 }],
          semanas: { '2026-10-05': { lunes: '2026-10-05', turnos: [], bloques: [bloque('a', 'ingles'), bloque('b', 'revision')], rara: 1 } },
          rareza: 3,
        }),
      )
      expect(r?.schemaVersion).toBe(VERSION_ACTUAL)
      expect(sinSiesta(r?.datos.actividades)).toEqual([{ id: 'ingles', prioridad: 1 }, { id: 'psicologo', prioridad: 7 }])
      expect(r?.datos.semanas['2026-10-05']).toMatchObject({ bloques: [bloque('a', 'ingles')], rara: 1 })
      expect((r?.datos as unknown as Record<string, unknown>).rareza).toBe(3)
    })

    it('con datos vacíos o raros no se cae', () => {
      expect(migrar(v6({ actividades: undefined, semanas: undefined }))?.schemaVersion).toBe(VERSION_ACTUAL)
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
      expect(sinSiesta(migrar(v5(propios))?.datos.actividades)).toEqual(propios)
    })
  })
})
