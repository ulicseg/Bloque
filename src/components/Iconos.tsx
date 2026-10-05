import type { ReactNode } from 'react'
import type { IdActividad } from '../logic/types'

const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

const icono = (hijos: ReactNode) => () => <svg {...base}>{hijos}</svg>

export const IconoHoy = icono(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
  </>,
)
export const IconoSemana = icono(
  <>
    <rect x="4" y="5" width="16" height="15" rx="3" />
    <path d="M4 10h16M9 3v4M15 3v4" />
  </>,
)
export const IconoMetas = icono(
  <>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="0.8" fill="currentColor" />
  </>,
)
export const IconoAjustes = icono(
  <>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </>,
)
export const IconoAtras = icono(<path d="m14.5 5-7 7 7 7" />)
export const IconoAdelante = icono(<path d="m9.5 5 7 7-7 7" />)
export const IconoMas = icono(<path d="M12 5v14M5 12h14" />)
export const IconoMenos = icono(<path d="M5 12h14" />)
export const IconoAsa = icono(<path d="M5 8h14M5 12h14M5 16h14" />)

// Un ícono por actividad, mismo trazo que los de la barra. Van sobre el tinte de cada actividad.
const ICONOS_ACTIVIDAD: Record<IdActividad, ReactNode> = {
  ingles: <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4A2.5 2.5 0 0 1 4 13.5z" />,
  gimnasio: <path d="M6.5 8v8M17.5 8v8M3.5 10v4M20.5 10v4M6.5 12h11" />,
  programacion: <path d="m8.5 8-4 4 4 4M15.5 8l4 4-4 4M13.5 6l-3 12" />,
  psicologo: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.4A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  caminata: (
    <>
      <circle cx="13" cy="5" r="1.6" />
      <path d="m10 21 2-6-2.5-2.5 1-4.5 3 1.5 2.5 2M8 11l2-3" />
    </>
  ),
  libre: <path d="M12 3.5l2 5.5 5.5 2-5.5 2-2 5.5-2-5.5-5.5-2 5.5-2z" />,
}

export function IconoActividad({ id }: { id: IdActividad }) {
  return (
    <span className="chip-actividad" aria-hidden>
      <svg {...base}>{ICONOS_ACTIVIDAD[id]}</svg>
    </span>
  )
}
