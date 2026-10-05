/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Los tests son de lógica pura: no hace falta DOM.
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
