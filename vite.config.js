import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { realpathSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// La raíz y las entradas deben usar la misma unidad al abrir el proyecto por un enlace.
const projectRoot = realpathSync(fileURLToPath(new URL('.', import.meta.url)))

export default defineConfig({
  root: projectRoot,
  plugins: [vue()],
  optimizeDeps: { entries: ['index.html'] },
  resolve: { alias: { '@': path.resolve(projectRoot, 'src') } },
  server: { port: 5173 }
})
