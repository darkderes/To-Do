/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Tauri loads the built app from a local/relative path, not a GitHub
  // Pages subpath, so use "/" whenever Vite is invoked from a Tauri command.
  base: process.env.TAURI_ENV_PLATFORM ? '/' : '/To-Do/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
