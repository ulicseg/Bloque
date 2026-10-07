import { useState, useSyncExternalStore } from 'react'
import { almacen } from '../almacenGlobal'
import { Presionable } from './Presionable'
import { CONFIG_POR_DEFECTO, borrarConfig, guardarConfig, leerConfig } from '../sync/config'
import { estadoSync, refrescarConfig, sincronizar, suscribirEstado } from '../sync/sincronizar'

const fechaHora = (ms: number) => new Date(ms).toLocaleString('es-AR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

// Copia automática de los datos en un archivo de GitHub. El token queda solo en este teléfono (ver sync/config.ts).
export function CopiaGitHub() {
  const estado = useSyncExternalStore(suscribirEstado, estadoSync)
  const [config, setConfig] = useState(leerConfig)
  const [token, setToken] = useState('')
  const [repo, setRepo] = useState<string>(CONFIG_POR_DEFECTO.repo)
  const [rama, setRama] = useState<string>(CONFIG_POR_DEFECTO.rama)

  const correr = () =>
    void sincronizar(almacen).then((r) => {
      // Las pantallas leen el almacén al montarse: tras bajar datos nuevos hay que recargar para verlos
      if (r === 'bajo') location.reload()
    })

  const conectar = () => {
    const nueva = { token: token.trim(), repo: repo.trim(), rama: rama.trim(), ruta: CONFIG_POR_DEFECTO.ruta }
    if (!nueva.token || !/^[\w.-]+\/[\w.-]+$/.test(nueva.repo) || !nueva.rama) return
    if (!guardarConfig(nueva)) return
    setConfig(nueva)
    setToken('')
    refrescarConfig()
    correr()
  }

  const desconectar = () => {
    borrarConfig()
    setConfig(null)
    refrescarConfig()
  }

  if (config) {
    return (
      <>
        <div className="grupo">
          <div className="fila">
            <span>Repositorio</span>
            <span className="fila-valor">
              {config.repo} · {config.rama}
            </span>
          </div>
          <div className="fila">
            <span>Estado</span>
            <span className="fila-valor">
              {estado.fase === 'sincronizando' ? 'Sincronizando…' : estado.fase === 'error' ? 'Con error' : estado.cuando ? `Al día · ${fechaHora(estado.cuando)}` : 'Conectado'}
            </span>
          </div>
          <Presionable className="fila fila-boton" onClick={correr} disabled={estado.fase === 'sincronizando'}>
            Sincronizar ahora
          </Presionable>
          <Presionable className="fila fila-boton" onClick={desconectar}>
            Desconectar
          </Presionable>
          <p className="fila-nota">Cada cambio se sube solo unos segundos después, y al abrir la app se baja lo más nuevo. Si el teléfono pierde los datos, se recuperan solos.</p>
        </div>
        {estado.mensaje && (
          <p className={`aviso ${estado.fase === 'error' ? 'aviso-error' : 'aviso-ok'}`} role="status">
            {estado.mensaje}
          </p>
        )}
      </>
    )
  }

  return (
    <div className="grupo grupo-formulario">
      <label className="campo">
        <span>Token de GitHub</span>
        <input type="password" autoComplete="off" autoCapitalize="none" spellCheck={false} value={token} onChange={(e) => setToken(e.target.value)} placeholder="github_pat_…" />
      </label>
      <label className="campo">
        <span>Repositorio</span>
        <input type="text" autoComplete="off" autoCapitalize="none" spellCheck={false} value={repo} onChange={(e) => setRepo(e.target.value)} />
      </label>
      <label className="campo">
        <span>Rama de los datos</span>
        <input type="text" autoComplete="off" autoCapitalize="none" spellCheck={false} value={rama} onChange={(e) => setRama(e.target.value)} />
      </label>
      <Presionable className="fila fila-boton" onClick={conectar} disabled={!token.trim()}>
        Conectar y sincronizar
      </Presionable>
      <p className="fila-nota">
        En GitHub: Settings → Developer settings → Fine-grained tokens. Elegí solo este repositorio y el permiso <strong>Contents: Read and write</strong>. El token se guarda únicamente en este teléfono: no va en el código ni en los respaldos.
      </p>
    </div>
  )
}
