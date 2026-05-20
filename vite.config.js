import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),

        projects: resolve(__dirname, 'projects.html'),
        materials: resolve(__dirname, 'materials.html'),
        bridge: resolve(__dirname, 'bridge.html'),
      }
    }
  }
})
