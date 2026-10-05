import { useState, type ReactNode } from 'react'
import { AvisoInstalar } from './AvisoInstalar'
import { IconoAtras } from './Iconos'
import { Presionable } from './Presionable'

interface Props {
  titulo: string
  children?: ReactNode
  /** Pantalla de segundo nivel: muestra un botón para volver con el nombre de la anterior. */
  atras?: { texto: string; alVolver: () => void }
}

// Contenedor desplazable con encabezado grande. El degradé superior solo aparece cuando el
// contenido ya pasó por debajo de la zona del reloj; no se muestra una línea divisoria (§12).
export function Pantalla({ titulo, children, atras }: Props) {
  const [pasaPorDebajo, setPasaPorDebajo] = useState(false)
  return (
    <div className="pantalla" onScroll={(e) => setPasaPorDebajo(e.currentTarget.scrollTop > 4)}>
      <div className="pantalla-borde-superior" data-visible={pasaPorDebajo || undefined} aria-hidden />
      <main className="pantalla-contenido">
        {atras && (
          <Presionable className="boton-atras" onClick={atras.alVolver}>
            <IconoAtras />
            {atras.texto}
          </Presionable>
        )}
        <h1 className="titulo-grande">{titulo}</h1>
        {!atras && <AvisoInstalar />}
        {children}
      </main>
    </div>
  )
}
