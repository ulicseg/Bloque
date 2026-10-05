// Paleta de actividades. Es la fuente de verdad para el test de contraste; src/styles/tokens.css
// repite estos valores y actividades.test.ts verifica que ambos coincidan.
// "color" es el de texto/íconos; "fondo" es el tinte suave sobre el que se apoya.

import type { IdActividad } from '../logic/types'

// Mismas claves que las actividades de la lógica: hay un solo lugar donde se definen
export type Actividad = IdActividad

export interface ParColores {
  color: string
  fondo: string
}

export const ACTIVIDADES: Record<Actividad, { claro: ParColores; oscuro: ParColores }> = {
  ingles: { claro: { color: '#0a5fc4', fondo: '#e3effd' }, oscuro: { color: '#6fb0ff', fondo: '#0f2740' } },
  gimnasio: { claro: { color: '#c4310a', fondo: '#fde9e3' }, oscuro: { color: '#ff8a6b', fondo: '#3a1a12' } },
  programacion: { claro: { color: '#5b3fc9', fondo: '#ece8fb' }, oscuro: { color: '#a99bff', fondo: '#221b46' } },
  psicologo: { claro: { color: '#a8247f', fondo: '#fbe6f4' }, oscuro: { color: '#ff8ccf', fondo: '#3d1530' } },
  caminata: { claro: { color: '#1b7a35', fondo: '#e2f5e7' }, oscuro: { color: '#62d487', fondo: '#123522' } },
  siesta: { claro: { color: '#0b6b7a', fondo: '#dff3f6' }, oscuro: { color: '#5fd0e0', fondo: '#0f3038' } },
  libre: { claro: { color: '#8a5a00', fondo: '#fcf0d6' }, oscuro: { color: '#ffc65c', fondo: '#3a2c0a' } },
}
