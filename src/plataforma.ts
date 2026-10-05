// Detección de entorno y almacenamiento persistente. Va fuera de src/logic porque toca APIs del navegador.

/** true si corre instalada (iOS: navigator.standalone; resto: display-mode). En Safari común es false. */
export function estaInstalada(): boolean {
  try {
    const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
    return iosStandalone || window.matchMedia('(display-mode: standalone)').matches
  } catch {
    return false
  }
}

export async function estaPersistente(): Promise<boolean> {
  try {
    return (await navigator.storage?.persisted?.()) ?? false
  } catch {
    return false
  }
}

/** Pide que el navegador no borre los datos al faltar espacio. Safari puede decir que no; no es un error. */
export async function pedirPersistencia(): Promise<boolean> {
  try {
    if (await estaPersistente()) return true
    return (await navigator.storage?.persist?.()) ?? false
  } catch {
    return false
  }
}
