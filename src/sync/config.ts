// Configuración de la copia en GitHub. Vive en su propia clave de localStorage y NO en `Datos`:
// así el token no sale en los respaldos exportados ni se sube al archivo de datos.

export interface ConfigSync {
  token: string
  /** "usuario/repositorio" */
  repo: string
  rama: string
  ruta: string
}

export const CONFIG_POR_DEFECTO = { repo: 'ulicseg/Bloque', rama: 'datos', ruta: 'datos.json' } as const

const CLAVE_CONFIG = 'bloques:sync-config'
const CLAVE_ULTIMO = 'bloques:sync-ultimo'

/** localStorage puede faltar o tirar error (Safari privado): sin él simplemente no hay copia automática. */
function leer(clave: string): string | null {
  try {
    return localStorage.getItem(clave)
  } catch {
    return null
  }
}

function escribir(clave: string, valor: string | null): boolean {
  try {
    if (valor === null) localStorage.removeItem(clave)
    else localStorage.setItem(clave, valor)
    return true
  } catch {
    return false
  }
}

export function leerConfig(): ConfigSync | null {
  const crudo = leer(CLAVE_CONFIG)
  if (!crudo) return null
  try {
    const c = JSON.parse(crudo) as Partial<ConfigSync>
    if (typeof c.token === 'string' && c.token && typeof c.repo === 'string' && typeof c.rama === 'string' && typeof c.ruta === 'string') {
      return { token: c.token, repo: c.repo, rama: c.rama, ruta: c.ruta }
    }
  } catch {
    /* JSON roto: se trata como sin configurar */
  }
  return null
}

export const guardarConfig = (c: ConfigSync): boolean => escribir(CLAVE_CONFIG, JSON.stringify(c))

/** Desconectar también olvida lo último sincronizado: al volver a conectar se decide desde cero. */
export function borrarConfig(): void {
  escribir(CLAVE_CONFIG, null)
  escribir(CLAVE_ULTIMO, null)
}

export interface UltimoSync {
  sha: string
  ms: number
  /** Cuándo (ms) terminó la última sincronización correcta, para mostrarla. */
  cuando: number
}

export function leerUltimo(): UltimoSync | null {
  const crudo = leer(CLAVE_ULTIMO)
  if (!crudo) return null
  try {
    const u = JSON.parse(crudo) as Partial<UltimoSync>
    if (typeof u.sha === 'string' && typeof u.ms === 'number' && typeof u.cuando === 'number') return { sha: u.sha, ms: u.ms, cuando: u.cuando }
  } catch {
    /* se ignora: la próxima sincronización lo rehace */
  }
  return null
}

export const guardarUltimo = (u: UltimoSync): boolean => escribir(CLAVE_ULTIMO, JSON.stringify(u))
