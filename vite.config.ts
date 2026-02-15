import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
          return
        }
        if (warning.message.includes('Use of direct `eval`')) {
          return
        }
        warn(warning)
      },
      external: ['fs/promises', 'module', 'path', 'url'],
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    pool: 'vmThreads',
    maxWorkers: 1,
    fileParallelism: false,
  },
})
