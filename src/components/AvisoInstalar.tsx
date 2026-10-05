import { estaInstalada } from '../plataforma'

// En iOS lo que se guarda desde Safari NO pasa a la app instalada: son almacenamientos separados.
// Por eso el aviso aparece en todas las pantallas hasta que se abre desde el ícono de inicio.
const instalada = estaInstalada()

export function AvisoInstalar() {
  if (instalada) return null
  return (
    <p className="aviso aviso-atencion" role="note">
      Instalá la app desde Compartir → Agregar a inicio antes de cargar datos
    </p>
  )
}
