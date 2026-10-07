// Cliente mínimo de la API de contenidos de GitHub. Un solo archivo, una sola rama.

import { aBase64, deBase64 } from '../logic/sync'
import type { ConfigSync } from './config'

export type ErrorGitHub = 'sin-conexion' | 'token-invalido' | 'sin-permiso' | 'no-existe' | 'conflicto' | 'otro'

export class FalloGitHub extends Error {
  constructor(
    readonly tipo: ErrorGitHub,
    detalle?: string,
  ) {
    super(detalle ?? tipo)
  }
}

const url = (c: ConfigSync) => `https://api.github.com/repos/${c.repo}/contents/${encodeURI(c.ruta)}`

const cabeceras = (c: ConfigSync): HeadersInit => ({
  Authorization: `Bearer ${c.token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
})

async function pedir(entrada: string, init: RequestInit): Promise<Response> {
  try {
    // no-store: una respuesta vieja del caché haría creer que el archivo no cambió
    return await fetch(entrada, { ...init, cache: 'no-store' })
  } catch {
    throw new FalloGitHub('sin-conexion')
  }
}

function errorDe(r: Response): FalloGitHub {
  if (r.status === 401) return new FalloGitHub('token-invalido')
  if (r.status === 403) return new FalloGitHub('sin-permiso')
  if (r.status === 404) return new FalloGitHub('no-existe')
  if (r.status === 409 || r.status === 422) return new FalloGitHub('conflicto')
  return new FalloGitHub('otro', `GitHub respondió ${r.status}`)
}

export interface ArchivoRemoto {
  sha: string
  texto: string
}

/** null si el archivo todavía no existe en la rama. Una rama inexistente o un repo sin acceso también dan 404:
 *  se distinguen al subir (ahí GitHub explica cuál de las dos es). */
export async function leerArchivo(c: ConfigSync): Promise<ArchivoRemoto | null> {
  const r = await pedir(`${url(c)}?ref=${encodeURIComponent(c.rama)}`, { headers: cabeceras(c) })
  if (r.status === 404) return null
  if (!r.ok) throw errorDe(r)
  const j = (await r.json()) as { sha?: string; content?: string; encoding?: string }
  if (typeof j.sha !== 'string' || typeof j.content !== 'string' || j.encoding !== 'base64') throw new FalloGitHub('otro', 'Respuesta inesperada de GitHub')
  return { sha: j.sha, texto: deBase64(j.content) }
}

/** Crea o reemplaza el archivo. `shaPrevio` es obligatorio para reemplazar: si alguien subió algo en el medio, GitHub
 *  responde conflicto y no se pisa nada. Devuelve el sha nuevo. */
export async function subirArchivo(c: ConfigSync, texto: string, shaPrevio: string | null, mensaje: string): Promise<string> {
  const cuerpo: Record<string, string> = { message: mensaje, content: aBase64(texto), branch: c.rama }
  if (shaPrevio) cuerpo.sha = shaPrevio
  const r = await pedir(url(c), { method: 'PUT', headers: { ...cabeceras(c), 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) })
  if (!r.ok) throw errorDe(r)
  const j = (await r.json()) as { content?: { sha?: string } }
  const sha = j.content?.sha
  if (typeof sha !== 'string') throw new FalloGitHub('otro', 'Respuesta inesperada de GitHub')
  return sha
}
