// Lógica pura de la copia en GitHub: qué hacer con lo local y lo remoto, y cómo codificar el archivo.
// Nada de red acá: la red está en src/sync, así esto se prueba sin conexión.

export interface EstadoRemoto {
  /** Identificador del contenido en GitHub: cambia cada vez que alguien sube algo. */
  sha: string
  /** Cuándo se hizo el último cambio real en los datos que se subieron (ms). */
  guardadoEn: number
  /** El archivo remoto no trae ninguna semana: no se debe pisar lo local con él. */
  vacio: boolean
}

export interface EntradaDecision {
  /** Último cambio real local (ms), sin contar cambiar de pestaña. null = nunca se cambió nada. */
  modificadoLocal: number | null
  localVacio: boolean
  /** null = el archivo todavía no existe en GitHub. */
  remoto: EstadoRemoto | null
  /** Lo último que se sincronizó en este dispositivo. null = nunca. */
  ultimo: { sha: string; ms: number } | null
}

export type Decision = 'subir' | 'bajar' | 'nada'

/** Nunca pierde datos: lo que se descarta de un lado queda guardado del otro (copia local antes de
 *  reemplazar, o historial de commits en GitHub antes de sobrescribir). Ante la duda gana lo más nuevo. */
export function decidir({ modificadoLocal, localVacio, remoto, ultimo }: EntradaDecision): Decision {
  if (remoto === null) return localVacio ? 'nada' : 'subir'
  // Un teléfono recién vacío (iOS limpió el almacenamiento) se recupera solo
  if (localVacio) return remoto.vacio ? 'nada' : 'bajar'
  if (remoto.vacio) return 'subir'

  const remotoSinCambios = ultimo !== null && ultimo.sha === remoto.sha
  const localCambio = modificadoLocal !== null && (ultimo === null || modificadoLocal > ultimo.ms)

  if (remotoSinCambios) return localCambio ? 'subir' : 'nada'
  // El remoto cambió desde la última vez (o nunca nos sincronizamos)
  if (!localCambio) return 'bajar'
  // Cambiaron los dos lados: gana el más nuevo
  return remoto.guardadoEn > (modificadoLocal ?? 0) ? 'bajar' : 'subir'
}

/** UTF-8 → base64 (la API de GitHub pide el contenido así). Va de a tramos para no reventar la pila con archivos grandes. */
export function aBase64(texto: string): string {
  const bytes = new TextEncoder().encode(texto)
  let binario = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binario)
}

/** Lo inverso. GitHub devuelve el base64 cortado en líneas, que atob no acepta con saltos. */
export function deBase64(b64: string): string {
  const binario = atob(b64.replace(/\s/g, ''))
  return new TextDecoder().decode(Uint8Array.from(binario, (c) => c.charCodeAt(0)))
}

/** Agrega al respaldo la marca de cuándo cambió por última vez. migrar() ignora los campos que no conoce. */
export function conMarca(respaldoJSON: string, guardadoEn: number): string {
  return JSON.stringify({ ...(JSON.parse(respaldoJSON) as object), guardadoEn }, null, 2)
}

/** Lee la marca y si el archivo trae semanas. null si el texto no es un respaldo legible. */
export function leerRemoto(texto: string): { guardadoEn: number; vacio: boolean } | null {
  try {
    const o = JSON.parse(texto) as { guardadoEn?: unknown; datos?: { semanas?: unknown } }
    const semanas = o.datos?.semanas
    const vacio = typeof semanas !== 'object' || semanas === null || Object.keys(semanas).length === 0
    return { guardadoEn: typeof o.guardadoEn === 'number' ? o.guardadoEn : 0, vacio }
  } catch {
    return null
  }
}
