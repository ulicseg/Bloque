import { crearAlmacen } from './logic/storage'

// Una sola instancia para toda la app: así App y Ajustes leen y escriben el mismo lugar.
export const almacen = crearAlmacen()
