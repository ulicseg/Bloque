// Paleta de actividades. Es la fuente de verdad para el test de contraste; src/styles/tokens.css
// repite estos valores y actividades.test.ts verifica que ambos coincidan.
// "color" es el de texto/íconos; "fondo" es el tinte suave sobre el que se apoya.

export type Actividad = 'ingles' | 'gimnasio' | 'programacion' | 'psicologo' | 'caminata' | 'libre' | 'revision'

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
  libre: { claro: { color: '#8a5a00', fondo: '#fcf0d6' }, oscuro: { color: '#ffc65c', fondo: '#3a2c0a' } },
  revision: { claro: { color: '#3d5a6c', fondo: '#e6edf1' }, oscuro: { color: '#9fbccd', fondo: '#1c2a33' } },
}
