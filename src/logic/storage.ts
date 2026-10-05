// Capa de almacenamiento: localStorage si anda, memoria si no.
// Nunca lanza: Safari en modo privado o con cuota llena rompe setItem y la app no debe caerse.

import { ACTIVIDADES_POR_DEFECTO, AJUSTES_POR_DEFECTO, COMIDAS_V3, PRIORIDADES_V4 } from './defaults'
import type { Datos } from './types'

export type { Datos } from './types'

export const CLAVE = 'bloques'
export const VERSION_ACTUAL = 6

export interface Guardado {
  schemaVersion: number
  datos: Datos
}

export const DATOS_INICIALES: Datos = {
  pestaña: 'hoy',
  semanas: {},
  ajustes: AJUSTES_POR_DEFECTO,
  actividades: ACTIVIDADES_POR_DEFECTO,
}

/** Cada migración lleva el guardado de la versión N a la N+1. Índice 0 = v1→v2. */
export type Migracion = (viejo: Record<string, unknown>) => Record<string, unknown>

export const MIGRACIONES: Migracion[] = [
  // v1 → v2: aparecen las semanas. Lo que ya había se conserva intacto.
  (v1) => ({ ...v1, schemaVersion: 2, datos: { semanas: {}, ...(v1.datos as object) } }),
  // v2 → v3: cada semana pasa a llevar su propio lunes, y aparecen ajustes y actividades con sus valores por defecto.
  // Los turnos y bloques se dejan tal cual vienen: en v2 no los escribía ninguna pantalla.
  (v2) => {
    const datos = v2.datos as Record<string, unknown>
    const semanas = esObjeto(datos.semanas)
      ? Object.fromEntries(Object.entries(datos.semanas).map(([lunes, s]) => [lunes, esObjeto(s) ? { lunes, ...s } : s]))
      : datos.semanas
    return {
      ...v2,
      schemaVersion: 3,
      datos: {
        ajustes: AJUSTES_POR_DEFECTO,
        actividades: ACTIVIDADES_POR_DEFECTO,
        ...datos,
        ...(semanas === undefined ? {} : { semanas }),
      },
    }
  },
  // v3 → v4: los ajustes pasan a describir las reglas de sueño, despertar, recuperación y foco.
  // Se parte de los valores por defecto y encima se pone todo lo que ya había: nada escrito se pierde.
  // `suenoMin` (duración) pasa a `suenoFin` porque el sueño arranca a las 00:00: 420 min → 00:00–07:00.
  // Las comidas se cambian solo si siguen siendo las tres que traía la v3 (que ninguna pantalla podía editar).
  (v3) => {
    const datos = v3.datos as Record<string, unknown>
    const viejos = esObjeto(datos.ajustes) ? datos.ajustes : {}
    const { suenoMin, ...resto } = viejos
    const suenoFin = typeof suenoMin === 'number' && suenoMin > 0 && suenoMin < 1440 ? { suenoFin: suenoMin } : {}
    const comidasNuevas = !('comidas' in viejos) || JSON.stringify(viejos.comidas) === JSON.stringify(COMIDAS_V3)
    return {
      ...v3,
      schemaVersion: 4,
      datos: {
        ...datos,
        ajustes: { ...AJUSTES_POR_DEFECTO, ...suenoFin, ...resto, ...(comidasNuevas ? { comidas: AJUSTES_POR_DEFECTO.comidas } : {}) },
      },
    }
  },
  // v4 → v5: el orden de asignación por defecto pasa a ser inglés, gimnasio, programación, caminata, libre.
  // Solo se reordena si las prioridades siguen siendo exactamente las de la v4 (nadie las podía editar todavía);
  // si no coinciden, o falta alguna actividad, se deja todo como está.
  (v4) => {
    const datos = v4.datos as Record<string, unknown>
    const lista = datos.actividades
    const sinTocar =
      Array.isArray(lista) &&
      lista.length === Object.keys(PRIORIDADES_V4).length &&
      lista.every((a) => esObjeto(a) && typeof a.id === 'string' && PRIORIDADES_V4[a.id] === a.prioridad)
    if (!sinTocar) return { ...v4, schemaVersion: 5 }
    const nueva = new Map<string, number>(ACTIVIDADES_POR_DEFECTO.map((a) => [a.id, a.prioridad]))
    const actividades = (lista as Record<string, unknown>[]).map((a) => ({ ...a, prioridad: nueva.get(a.id as string) ?? a.prioridad }))
    return { ...v4, schemaVersion: 5, datos: { ...datos, actividades } }
  },
  // v5 → v6: aparecen los días en que una actividad no se puede hacer. El gimnasio queda cerrado los domingos;
  // solo se completa a las actividades que todavía no traen el campo, así que nada escrito se pisa.
  (v5) => {
    const datos = v5.datos as Record<string, unknown>
    if (!Array.isArray(datos.actividades)) return { ...v5, schemaVersion: 6 }
    const actividades = datos.actividades.map((a) =>
      esObjeto(a) && !('diasNo' in a) && a.id === 'gimnasio' ? { ...a, diasNo: [6] } : a,
    )
    return { ...v5, schemaVersion: 6, datos: { ...datos, actividades } }
  },
]

class AlmacenMemoria implements Storage {
  private mapa = new Map<string, string>()
  get length() {
    return this.mapa.size
  }
  clear() {
    this.mapa.clear()
  }
  getItem(k: string) {
    return this.mapa.get(k) ?? null
  }
  key(i: number) {
    return [...this.mapa.keys()][i] ?? null
  }
  removeItem(k: string) {
    this.mapa.delete(k)
  }
  setItem(k: string, v: string) {
    this.mapa.set(k, v)
  }
}

/** Probar escribir de verdad: en Safari privado localStorage existe pero setItem tira error. */
function funciona(s: Storage | undefined): s is Storage {
  if (!s) return false
  try {
    const prueba = `${CLAVE}:prueba`
    s.setItem(prueba, '1')
    s.removeItem(prueba)
    return true
  } catch {
    return false
  }
}

function localStorageSeguro(): Storage | undefined {
  try {
    // Solo acceder a la propiedad ya puede lanzar (cookies bloqueadas).
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

const esObjeto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)

/** Lleva un guardado de cualquier versión anterior a la actual, encadenando v1→v2→v3…
 *  Devuelve null si no se puede leer (versión futura, sin versión, forma rara): quien llama decide
 *  cómo conservarlo. `migraciones` y `destino` se inyectan solo para poder probar cadenas largas. */
export function migrar(crudo: unknown, migraciones: Migracion[] = MIGRACIONES, destino = VERSION_ACTUAL): Guardado | null {
  if (!esObjeto(crudo) || typeof crudo.schemaVersion !== 'number') return null
  let version = crudo.schemaVersion
  if (!Number.isInteger(version) || version < 1 || version > destino) return null
  let actual: Record<string, unknown> = crudo
  while (version < destino) {
    if (!esObjeto(actual.datos)) return null
    actual = migraciones[version - 1](actual)
    version++
  }
  if (!esObjeto(actual.datos)) return null
  return { schemaVersion: destino, datos: { ...DATOS_INICIALES, ...(actual.datos as Partial<Datos>) } }
}

export interface Resumen {
  semanas: number
  bloques: number
}

export function resumir(datos: Datos): Resumen {
  const lista = Object.values(datos.semanas)
  return { semanas: lista.length, bloques: lista.reduce((n, sem) => n + sem.bloques.length, 0) }
}

/** La forma mínima que el resto de la app da por cierta. Un respaldo que no la cumple se rechaza entero. */
function datosValidos(d: Datos): boolean {
  return (
    typeof d.pestaña === 'string' &&
    esObjeto(d.semanas) &&
    esObjeto(d.ajustes) &&
    Array.isArray(d.actividades) &&
    Object.values(d.semanas).every((x) => esObjeto(x) && Array.isArray(x.turnos) && Array.isArray(x.bloques))
  )
}

export type ResultadoRespaldo =
  | { ok: true; guardado: Guardado; resumen: Resumen }
  | { ok: false; motivo: 'no-es-json' | 'version-no-soportada' | 'formato-invalido' }

/** Valida un archivo de respaldo sin tocar nada. Sirve para la vista previa antes de confirmar. */
export function validarRespaldo(texto: string): ResultadoRespaldo {
  let crudo: unknown
  try {
    crudo = JSON.parse(texto)
  } catch {
    return { ok: false, motivo: 'no-es-json' }
  }
  if (esObjeto(crudo) && typeof crudo.schemaVersion === 'number' && crudo.schemaVersion > VERSION_ACTUAL) {
    return { ok: false, motivo: 'version-no-soportada' }
  }
  const guardado = migrar(crudo)
  if (!guardado || !datosValidos(guardado.datos)) return { ok: false, motivo: 'formato-invalido' }
  return { ok: true, guardado, resumen: resumir(guardado.datos) }
}

export interface Almacen {
  /** true si está usando localStorage real; false si cayó a memoria. */
  readonly persistente: boolean
  leer(): Datos
  guardar(datos: Datos): boolean
  exportarJSON(): string
  /** Valida y reemplaza. Si el archivo no sirve devuelve false y no toca nada. */
  importarJSON(texto: string): boolean
  /** Fecha (ms) del último respaldo exportado, o null si nunca. No forma parte del respaldo. */
  ultimoRespaldo(): number | null
  marcarRespaldo(ms: number): void
}

const CLAVE_RESPALDO = `${CLAVE}:ultimo-respaldo`

export function crearAlmacen(backend?: Storage): Almacen {
  const candidato = backend ?? localStorageSeguro()
  const persistente = funciona(candidato)
  const s: Storage = persistente ? (candidato as Storage) : new AlmacenMemoria()

  // Un dato ilegible no se descarta: se guarda aparte tal cual para poder recuperarlo.
  const conservar = (crudo: string, etiqueta = 'respaldo') => {
    try {
      s.setItem(`${CLAVE}:${etiqueta}-${Date.now()}`, crudo)
    } catch {
      /* sin lugar: el original queda intacto en CLAVE */
    }
  }

  const inicial = (): Guardado => ({ schemaVersion: VERSION_ACTUAL, datos: { ...DATOS_INICIALES } })

  const leerGuardado = (): Guardado => {
    let crudo: string | null = null
    try {
      crudo = s.getItem(CLAVE)
    } catch {
      return inicial()
    }
    if (crudo === null) return inicial()
    try {
      const migrado = migrar(JSON.parse(crudo))
      if (migrado) return migrado
    } catch {
      /* JSON roto: se conserva abajo */
    }
    conservar(crudo)
    return inicial()
  }

  const escribir = (g: Guardado): boolean => {
    try {
      s.setItem(CLAVE, JSON.stringify(g))
      return true
    } catch {
      return false
    }
  }

  return {
    persistente,
    leer: () => leerGuardado().datos,
    guardar: (datos) => escribir({ schemaVersion: VERSION_ACTUAL, datos }),
    exportarJSON: () => JSON.stringify(leerGuardado(), null, 2),
    importarJSON(texto) {
      const r = validarRespaldo(texto)
      if (!r.ok) return false
      // Antes de pisar lo actual se deja una copia aparte: importar nunca debe ser irreversible.
      let actual: string | null = null
      try {
        actual = s.getItem(CLAVE)
      } catch {
        /* sin lectura: no hay nada que copiar */
      }
      if (actual !== null) conservar(actual, 'antes-de-importar')
      return escribir(r.guardado)
    },
    ultimoRespaldo() {
      try {
        const n = Number(s.getItem(CLAVE_RESPALDO))
        return Number.isFinite(n) && n > 0 ? n : null
      } catch {
        return null
      }
    },
    marcarRespaldo(ms) {
      try {
        s.setItem(CLAVE_RESPALDO, String(ms))
      } catch {
        /* sin lugar: el aviso de respaldo viejo seguirá apareciendo, que es lo seguro */
      }
    },
  }
}
