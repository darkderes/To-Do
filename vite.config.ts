/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages no permite headers custom: la CSP va como <meta> en el HTML.
// Solo en build — el dev server necesita los scripts inline de react-refresh.
// Mantener en sync con `app.security.csp` de src-tauri/tauri.conf.json.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "frame-src https://www.youtube-nocookie.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

function cspPlugin(): Plugin {
  return {
    name: 'inject-csp-meta',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: {
            'http-equiv': 'Content-Security-Policy',
            content: CSP,
          },
          injectTo: 'head-prepend',
        },
      ]
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Tauri loads the built app from a local/relative path, not a GitHub
  // Pages subpath, so use "/" whenever Vite is invoked from a Tauri command.
  base: process.env.TAURI_ENV_PLATFORM ? '/' : '/To-Do/',
  plugins: [react(), cspPlugin()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
