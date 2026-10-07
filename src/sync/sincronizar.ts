// Orquesta la copia en GitHub: lee, decide (src/logic/sync.ts), sube o baja. Nunca lanza: todo error queda en el estado
// para mostrarlo en Ajustes, y los datos locales siguen funcionando igual sin conexión.

import { conMarca, decidir, leerRemoto } from '../logic/sync'
import { resumir, validarRespaldo, type Almacen } from '../logic/storage'
import { guardarUltimo, leerConfig, leerUltimo } from './config'
import { FalloGitHub, leerArchivo, subirArchivo, type ErrorGitHub } from './github'

export type FaseSync = 'apagada' | 'inactiva' | 'sincronizando' | 'ok' | 'error'

export interface EstadoSync {
  fase: FaseSync
  mensaje: string
  /** Cuándo (ms) terminó la última sincronización correcta. */
  cuando: number | null
}

export const TEXTO_ERROR: Record<ErrorGitHub, string> = {
  'sin-conexion': 'Sin conexión. Se vuelve a intentar solo.',
  'token-invalido': 'El token no es válido o venció. Creá uno nuevo en GitHub.',
  'sin-permiso': 'GitHub rechazó el acceso: revisá los permisos del token o esperá un rato.',
  'no-existe': 'No se encontró el repositorio o la rama. Revisá los datos y que el token llegue a ese repositorio.',
  conflicto: 'No se pudo subir: la rama no existe o alguien cambió el archivo justo en el medio.',
  otro: 'GitHub respondió algo inesperado.',
}

let estado: EstadoSync = { fase: leerConfig() ? 'inactiva' : 'apagada', mensaje: '', cuando: leerUltimo()?.cuando ?? null }
const oyentes = new Set<() => void>()

function poner(nuevo: EstadoSync) {
  estado = nuevo
  oyentes.forEach((fn) => fn())
}

/** Para useSyncExternalStore: devuelve siempre el mismo objeto mientras no cambie nada. */
export const estadoSync = (): EstadoSync => estado
export function suscribirEstado(fn: () => void): () => void {
  oyentes.add(fn)
  return () => void oyentes.delete(fn)
}

/** Vuelve a mirar si hay configuración (tras conectar o desconectar desde Ajustes). */
export function refrescarConfig() {
  const hay = leerConfig() !== null
  if (!hay) poner({ fase: 'apagada', mensaje: '', cuando: null })
  else if (estado.fase === 'apagada') poner({ fase: 'inactiva', mensaje: '', cuando: leerUltimo()?.cuando ?? null })
}

export type Resultado = 'subio' | 'bajo' | 'nada' | 'error' | 'apagada'

let enCurso: Promise<Resultado> | null = null
let volverAPasar = false
/** Verdadero solo mientras la propia sincronización escribe lo que bajó: ese cambio no debe disparar otra subida. */
let bajando = false

/** Una sola sincronización a la vez: si llega otro pedido mientras corre, se repite una vez al terminar. */
export function sincronizar(almacen: Almacen): Promise<Resultado> {
  if (enCurso) {
    volverAPasar = true
    return enCurso
  }
  enCurso = (async () => {
    let r = await una(almacen)
    while (volverAPasar && r !== 'error' && r !== 'bajo') {
      volverAPasar = false
      r = await una(almacen)
    }
    volverAPasar = false
    return r
  })().finally(() => {
    enCurso = null
  })
  return enCurso
}

async function una(almacen: Almacen): Promise<Resultado> {
  const config = leerConfig()
  if (!config) return 'apagada'
  poner({ ...estado, fase: 'sincronizando', mensaje: '' })
  try {
    // Hasta dos vueltas: si GitHub dice que el archivo cambió en el medio, se vuelve a leer y decidir
    for (let intento = 0; intento < 2; intento++) {
      const archivo = await leerArchivo(config)
      const remoto = archivo ? leerRemoto(archivo.texto) : null
      if (archivo && !remoto) throw new Error('El archivo de GitHub no se puede leer: no se toca para no perderlo.')

      const localVacio = resumir(almacen.leer()).semanas === 0
      // Datos de antes de que existiera la copia: sin fecha de cambio. Se los toma como recientes (gana lo local);
      // lo que se reemplace en GitHub sigue en el historial de commits.
      let modificado = almacen.modificado()
      if (modificado === null && !localVacio) {
        modificado = Date.now()
        almacen.fijarModificado(modificado)
      }

      const decision = decidir({
        modificadoLocal: modificado,
        localVacio,
        remoto: archivo && remoto ? { sha: archivo.sha, guardadoEn: remoto.guardadoEn, vacio: remoto.vacio } : null,
        ultimo: (() => {
          const u = leerUltimo()
          return u ? { sha: u.sha, ms: u.ms } : null
        })(),
      })

      const ahora = Date.now()
      if (decision === 'nada') {
        // Al día: se anota el sha para no tener que decidir de nuevo la próxima vez
        if (archivo && remoto) guardarUltimo({ sha: archivo.sha, ms: remoto.guardadoEn || (modificado ?? ahora), cuando: ahora })
        poner({ fase: 'ok', mensaje: '', cuando: ahora })
        return 'nada'
      }

      if (decision === 'bajar' && archivo && remoto) {
        // Se valida antes de reemplazar; importarJSON además guarda una copia de lo actual
        bajando = true
        const importado = validarRespaldo(archivo.texto).ok && almacen.importarJSON(archivo.texto)
        bajando = false
        if (!importado) {
          throw new Error('El archivo de GitHub no tiene el formato esperado: no se reemplazó nada.')
        }
        const ms = remoto.guardadoEn || ahora
        almacen.fijarModificado(ms)
        guardarUltimo({ sha: archivo.sha, ms, cuando: ahora })
        poner({ fase: 'ok', mensaje: 'Se bajaron datos más nuevos de GitHub.', cuando: ahora })
        return 'bajo'
      }

      const guardadoEn = modificado ?? ahora
      try {
        const sha = await subirArchivo(config, conMarca(almacen.exportarJSON(), guardadoEn), archivo?.sha ?? null, `Datos de Bloques (${new Date(ahora).toISOString()})`)
        guardarUltimo({ sha, ms: guardadoEn, cuando: ahora })
        poner({ fase: 'ok', mensaje: '', cuando: ahora })
        return 'subio'
      } catch (e) {
        if (e instanceof FalloGitHub && e.tipo === 'conflicto' && intento === 0) continue
        throw e
      }
    }
    throw new FalloGitHub('conflicto')
  } catch (e) {
    const mensaje = e instanceof FalloGitHub ? TEXTO_ERROR[e.tipo] : e instanceof Error ? e.message : TEXTO_ERROR.otro
    poner({ ...estado, fase: 'error', mensaje })
    return 'error'
  }
}

const ESPERA_TRAS_CAMBIO_MS = 4000

/** Se llama una vez al arrancar. Sincroniza al abrir, al volver a la app, al recuperar la conexión y poco después de
 *  cada cambio. Si bajaron datos nuevos, recarga: las pantallas leen el almacén una sola vez al montarse. */
export function iniciarSyncAutomatica(almacen: Almacen) {
  const correr = () => {
    if (!leerConfig()) return
    void sincronizar(almacen).then((r) => {
      if (r === 'bajo') location.reload()
    })
  }

  let temporizador: ReturnType<typeof setTimeout> | undefined
  almacen.suscribir(() => {
    if (!leerConfig() || bajando) return
    clearTimeout(temporizador)
    temporizador = setTimeout(correr, ESPERA_TRAS_CAMBIO_MS)
  })
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && correr())
  window.addEventListener('online', correr)
  correr()
}
