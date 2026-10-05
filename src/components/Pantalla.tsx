import { useState, type ReactNode } from 'react'
import { AvisoInstalar } from './AvisoInstalar'

// Contenedor desplazable con encabezado grande. El degradé superior solo aparece cuando el
// contenido ya pasó por debajo de la zona del reloj; no se muestra una línea divisoria (§12).
export function Pantalla({ titulo, children }: { titulo: string; children?: ReactNode }) {
  const [pasaPorDebajo, setPasaPorDebajo] = useState(false)
  return (
    <div className="pantalla" onScroll={(e) => setPasaPorDebajo(e.currentTarget.scrollTop > 4)}>
      <div className="pantalla-borde-superior" data-visible={pasaPorDebajo || undefined} aria-hidden />
      <main className="pantalla-contenido">
        <h1 className="titulo-grande">{titulo}</h1>
        <AvisoInstalar />
        {children}
      </main>
    </div>
  )
}
