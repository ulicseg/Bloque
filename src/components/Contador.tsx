import { useEffect, useRef } from 'react'
import { IconoMas, IconoMenos } from './Iconos'
import { Presionable } from './Presionable'

interface BotonProps {
  etiqueta: string
  icono: 'mas' | 'menos'
  accion: () => void
  deshabilitado: boolean
}

const ESPERA_MS = 400
const REPETICION_MS = 110

// Responde al apoyar el dedo (§1): el cambio se aplica en pointerdown, no al soltar. Si se mantiene apretado,
// repite hasta soltar; así llegar de 75 a 120 min no son nueve toques. El click con detail 0 es el teclado
// (o el lector de pantalla), que no genera pointerdown.
function BotonPaso({ etiqueta, icono, accion, deshabilitado }: BotonProps) {
  const ultima = useRef(accion)
  const espera = useRef<number | undefined>(undefined)
  const repeticion = useRef<number | undefined>(undefined)
  const escucha = useRef<(() => void) | undefined>(undefined)

  useEffect(() => {
    ultima.current = accion
  })

  const soltar = useRef(() => {
    window.clearTimeout(espera.current)
    window.clearInterval(repeticion.current)
    if (escucha.current) {
      window.removeEventListener('pointerup', escucha.current)
      window.removeEventListener('pointercancel', escucha.current)
      escucha.current = undefined
    }
  })

  // Si la pantalla se cierra con el dedo apoyado, no queda nada repitiéndose
  useEffect(() => {
    const parar = soltar.current
    return parar
  }, [])

  return (
    <Presionable
      className="contador-boton"
      aria-label={etiqueta}
      disabled={deshabilitado}
      onPointerDown={() => {
        if (deshabilitado) return
        ultima.current()
        soltar.current()
        escucha.current = () => soltar.current()
        window.addEventListener('pointerup', escucha.current)
        window.addEventListener('pointercancel', escucha.current)
        espera.current = window.setTimeout(() => {
          repeticion.current = window.setInterval(() => ultima.current(), REPETICION_MS)
        }, ESPERA_MS)
      }}
      onClick={(e) => {
        if (e.detail === 0) accion()
      }}
    >
      {icono === 'mas' ? <IconoMas /> : <IconoMenos />}
    </Presionable>
  )
}

interface Props {
  etiqueta: string
  /** Texto ya formateado: "75 min", "4 sesiones". */
  valor: string
  alBajar: () => void
  alSubir: () => void
  puedeBajar: boolean
  puedeSubir: boolean
  nota?: string
}

export function Contador({ etiqueta, valor, alBajar, alSubir, puedeBajar, puedeSubir, nota }: Props) {
  return (
    <div className="contador">
      <div className="contador-fila">
        <div className="contador-texto">
          <span className="contador-etiqueta">{etiqueta}</span>
          <strong className="contador-valor" aria-live="polite">
            {valor}
          </strong>
        </div>
        <div className="contador-botones" role="group" aria-label={etiqueta}>
          <BotonPaso etiqueta={`Menos ${etiqueta.toLowerCase()}`} icono="menos" accion={alBajar} deshabilitado={!puedeBajar} />
          <BotonPaso etiqueta={`Más ${etiqueta.toLowerCase()}`} icono="mas" accion={alSubir} deshabilitado={!puedeSubir} />
        </div>
      </div>
      {nota && <p className="contador-nota">{nota}</p>}
    </div>
  )
}
