// Capa de almacenamiento: localStorage si anda, memoria si no.
// Nunca lanza: Safari en modo privado o con cuota llena rompe setItem y la app no debe caerse.

export const CLAVE = 'bloques'
export const VERSION_ACTUAL = 1

export interface Datos {
  pestaña: string
}

export interface Guardado {
  schemaVersion: number
  datos: Datos
}

export const DATOS_INICIALES: Datos = { pestaña: 'hoy' }

/** Cada migración lleva el guardado de la versión N a la N+1. Índice 0 = v1→v2. */
export const MIGRACIONES: Array<(viejo: unknown) => unknown> = []

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

const esObjeto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null

export function migrar(crudo: unknown): Guardado | null {
  if (!esObjeto(crudo) || typeof crudo.schemaVersion !== 'number') return null
  let version = crudo.schemaVersion
  if (!Number.isInteger(version) || version < 1 || version > VERSION_ACTUAL) return null
  let actual: unknown = crudo
  while (version < VERSION_ACTUAL) {
    actual = MIGRACIONES[version - 1](actual)
    version++
  }
  if (!esObjeto(actual) || !esObjeto(actual.datos)) return null
  return { schemaVersion: VERSION_ACTUAL, datos: { ...DATOS_INICIALES, ...(actual.datos as Partial<Datos>) } }
}

export interface Almacen {
  /** true si está usando localStorage real; false si cayó a memoria. */
  readonly persistente: boolean
  leer(): Datos
  guardar(datos: Datos): boolean
  exportarJSON(): string
  importarJSON(texto: string): boolean
}

export function crearAlmacen(backend?: Storage): Almacen {
  const candidato = backend ?? localStorageSeguro()
  const persistente = funciona(candidato)
  const s: Storage = persistente ? (candidato as Storage) : new AlmacenMemoria()

  // Un dato ilegible no se descarta: se guarda aparte tal cual para poder recuperarlo.
  const conservar = (crudo: string) => {
    try {
      s.setItem(`${CLAVE}:respaldo-${Date.now()}`, crudo)
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
      try {
        const migrado = migrar(JSON.parse(texto))
        return migrado ? escribir(migrado) : false
      } catch {
        return false
      }
    },
  }
}
