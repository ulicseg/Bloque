import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { almacen } from '../almacenGlobal'
import { HojaConfirmacion } from '../components/HojaConfirmacion'
import { Pantalla } from '../components/Pantalla'
import { Presionable } from '../components/Presionable'
import { estadoRespaldo, nombreArchivoRespaldo } from '../logic/respaldo'
import { resumir, validarRespaldo, type Resumen } from '../logic/storage'
import { estaPersistente } from '../plataforma'

const MOTIVOS = {
  'no-es-json': 'El archivo no es un respaldo de Bloques (no se pudo leer).',
  'version-no-soportada': 'Este respaldo es de una versión más nueva de la app. Actualizá la app y probá de nuevo.',
  'formato-invalido': 'El archivo no tiene el formato de un respaldo de Bloques.',
} as const

interface Pendiente {
  texto: string
  resumen: Resumen
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`
const textoResumen = (r: Resumen) => `${plural(r.semanas, 'semana', 'semanas')}, ${plural(r.bloques, 'bloque', 'bloques')}`

export function Ajustes() {
  const [persistente, setPersistente] = useState<boolean | null>(null)
  const [ultimo, setUltimo] = useState(() => almacen.ultimoRespaldo())
  const [pendiente, setPendiente] = useState<Pendiente | null>(null)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [actual, setActual] = useState(() => resumir(almacen.leer()))
  const entrada = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void estaPersistente().then(setPersistente)
  }, [])

  const estado = estadoRespaldo(ultimo, Date.now(), actual.semanas > 0 || actual.bloques > 0)

  // Sin await antes de share(): iOS exige que se llame dentro del gesto del toque.
  const exportar = () => {
    const texto = almacen.exportarJSON()
    const nombre = nombreArchivoRespaldo(new Date())
    const archivo = new File([texto], nombre, { type: 'application/json' })
    const marcar = () => {
      const ahora = Date.now()
      almacen.marcarRespaldo(ahora)
      setUltimo(ahora)
      setMensaje({ tipo: 'ok', texto: 'Respaldo exportado.' })
    }

    if (navigator.canShare?.({ files: [archivo] })) {
      navigator
        .share({ files: [archivo], title: 'Respaldo de Bloques' })
        .then(marcar)
        // Cerrar la hoja de compartir no es un error y tampoco cuenta como respaldo hecho
        .catch((e: unknown) => {
          if (e instanceof DOMException && e.name === 'AbortError') return
          setMensaje({ tipo: 'error', texto: 'No se pudo compartir el archivo. Probá de nuevo.' })
        })
      return
    }
    const url = URL.createObjectURL(archivo)
    const a = document.createElement('a')
    a.href = url
    a.download = nombre
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    marcar()
  }

  const alElegirArchivo = async (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    e.target.value = '' // permite elegir el mismo archivo otra vez
    if (!archivo) return
    setMensaje(null)
    let texto: string
    try {
      texto = await archivo.text()
    } catch {
      setMensaje({ tipo: 'error', texto: 'No se pudo abrir el archivo.' })
      return
    }
    // Solo se valida: hasta que se confirme, los datos actuales no se tocan
    const r = validarRespaldo(texto)
    if (!r.ok) {
      setMensaje({ tipo: 'error', texto: MOTIVOS[r.motivo] })
      return
    }
    setPendiente({ texto, resumen: r.resumen })
  }

  const confirmarImportacion = () => {
    if (!pendiente) return
    const ok = almacen.importarJSON(pendiente.texto)
    setPendiente(null)
    if (ok) {
      setActual(resumir(almacen.leer()))
      setMensaje({ tipo: 'ok', texto: `Respaldo importado: ${textoResumen(pendiente.resumen)}.` })
    } else {
      setMensaje({ tipo: 'error', texto: 'No se pudo guardar el respaldo. Tus datos actuales siguen igual.' })
    }
  }

  return (
    <Pantalla titulo="Ajustes">
      <h2 className="seccion-titulo">Almacenamiento</h2>
      <div className="grupo">
        <div className="fila">
          <span>Almacenamiento persistente</span>
          <span className="fila-valor">{persistente === null ? '…' : persistente ? 'sí' : 'no'}</span>
        </div>
        {persistente === false && (
          <p className="fila-nota">
            El navegador puede borrar los datos si falta espacio. Instalá la app y exportá respaldos seguido.
          </p>
        )}
        {!almacen.persistente && (
          <p className="fila-nota">Este navegador no deja guardar datos: lo que cargues se pierde al cerrar.</p>
        )}
      </div>

      <h2 className="seccion-titulo">Respaldo</h2>
      {estado.aviso && (
        <p className="aviso aviso-atencion" role="note">
          {estado.dias === null
            ? 'Todavía no hiciste ningún respaldo.'
            : `Tu último respaldo es de hace ${estado.dias} días.`}{' '}
          Exportá uno para no perder tus datos.
        </p>
      )}
      <div className="grupo">
        <Presionable className="fila fila-boton" onClick={exportar}>
          Exportar respaldo
        </Presionable>
        <Presionable className="fila fila-boton" onClick={() => entrada.current?.click()}>
          Importar respaldo
        </Presionable>
        <p className="fila-nota">
          {ultimo === null
            ? 'Sin respaldos todavía.'
            : `Último respaldo: ${new Date(ultimo).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}.`}{' '}
          Tenés {textoResumen(actual)}.
        </p>
      </div>
      <input
        ref={entrada}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => void alElegirArchivo(e)}
      />
      {mensaje && (
        <p className={`aviso ${mensaje.tipo === 'error' ? 'aviso-error' : 'aviso-ok'}`} role="status">
          {mensaje.texto}
        </p>
      )}

      <HojaConfirmacion
        abierta={pendiente !== null}
        titulo="¿Reemplazar tus datos?"
        alCancelar={() => setPendiente(null)}
        acciones={
          <>
            <Presionable className="boton-hoja" onClick={() => setPendiente(null)}>
              Cancelar
            </Presionable>
            <Presionable className="boton-hoja boton-hoja-destructivo" onClick={confirmarImportacion}>
              Reemplazar
            </Presionable>
          </>
        }
      >
        <p>
          El respaldo tiene <strong>{pendiente ? textoResumen(pendiente.resumen) : ''}</strong>. Hoy tenés{' '}
          {textoResumen(actual)}.
        </p>
        <p className="hoja-nota">Se guarda una copia de lo actual antes de reemplazar.</p>
      </HojaConfirmacion>
    </Pantalla>
  )
}
