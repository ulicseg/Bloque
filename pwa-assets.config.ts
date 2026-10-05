import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// El SVG ya viene a sangre (con fondo), así que no se agrega relleno extra salvo en el ícono
// "maskable", que Android recorta en círculo y necesita margen de seguridad.
const fondo = '#0a6cff'

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    maskable: { ...minimal2023Preset.maskable, padding: 0.12, resizeOptions: { background: fondo } },
    // iOS redondea solo las esquinas: tiene que ser opaco y llenar los 180 px
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: fondo } },
  },
  images: ['public/icono.svg'],
})
