// Lógica pura del respaldo: nombre de archivo y cuándo avisar. Sin DOM, para poder probarla.

export const DIAS_AVISO_RESPALDO = 7
const MS_DIA = 24 * 60 * 60 * 1000

/** bloques-respaldo-AAAA-MM-DD.json, con la fecha local (no UTC: de noche no debe saltar de día). */
export function nombreArchivoRespaldo(fecha: Date): string {
  const dos = (n: number) => String(n).padStart(2, '0')
  return `bloques-respaldo-${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}.json`
}

export type EstadoRespaldo = { aviso: false } | { aviso: true; dias: number | null }

/** Avisa si el último respaldo pasó de 7 días, o si nunca hubo y ya hay datos que perder. */
export function estadoRespaldo(ultimo: number | null, ahora: number, hayDatos: boolean): EstadoRespaldo {
  if (ultimo === null) return hayDatos ? { aviso: true, dias: null } : { aviso: false }
  const transcurrido = ahora - ultimo
  // Comparar en ms: "más de 7 días" es estrictamente más de 168 h, no días calendario redondeados
  return transcurrido > DIAS_AVISO_RESPALDO * MS_DIA
    ? { aviso: true, dias: Math.floor(transcurrido / MS_DIA) }
    : { aviso: false }
}
