import { useCallback, useState } from 'react'
import { almacen } from './almacenGlobal'
import type { Datos } from './logic/types'

/** Datos de la app con escritura inmediata. Cada cambio parte de lo que hay guardado en ese momento
 *  (no de una copia vieja en memoria), así no pisa lo que otra pantalla haya escrito, como la pestaña activa. */
export function useDatos() {
  const [datos, setDatos] = useState<Datos>(() => almacen.leer())
  const [fallo, setFallo] = useState(false)

  const cambiar = useCallback((fn: (actual: Datos) => Datos) => {
    const nuevo = fn(almacen.leer())
    setFallo(!almacen.guardar(nuevo))
    setDatos(nuevo)
  }, [])

  return { datos, cambiar, fallo }
}
