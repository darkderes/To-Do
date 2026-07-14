# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Vite dev server
- `npm run build` — typecheck (`tsc -b`) then build for production
- `npm run test` — run the full Vitest suite once
- `npm run test:watch` — run Vitest in watch mode
- `npx vitest run src/App.test.tsx` — run a single test file
- `npm run lint` — run ESLint
- `npm run format` / `npm run format:check` — write/check Prettier formatting
- `npm run tauri dev` — run the app as a native desktop window (requires the Rust toolchain)
- `npm run tauri build` — build the native Windows/Linux installer for the current OS (output in `src-tauri/target/release/bundle/`)

## Architecture

Single-page React app, no backend. State lives entirely in `App.tsx`:

- `App.tsx` owns the `todos` array and the active `filter` (all/active/completed), and passes callbacks (`addTodo`, `toggleTodo`, `deleteTodo`) down to children — there is no state management library or context.
- `hooks/useLocalStorage.ts` is a generic `useState` wrapper that syncs a value to `window.localStorage` on every change; `App.tsx` uses it as its only persistence mechanism (key `"todos"`).
- `components/` are presentational: `AddTodo` (controlled input + submit), `TodoList` (maps todos to items, renders empty state), `TodoItem` (checkbox + delete button). None of them touch storage directly — everything flows through the callbacks from `App.tsx`.
- `types.ts` defines the single `Todo` shape (`id`, `text`, `completed`) shared across components.

### Tooling notes

- ESLint uses flat config (`eslint.config.js`) with `typescript-eslint`, `eslint-plugin-react-hooks`, and `eslint-plugin-react-refresh`, plus `eslint-config-prettier` to disable formatting-related rules. Note `eslint-plugin-react-hooks`'s flat-config export lives at `reactHooks.configs.flat.recommended`, not `recommended-latest` (the latter is eslintrc-style and throws under flat config).
- Vitest config lives inside `vite.config.ts` (not a separate file), using `jsdom` environment and `src/test/setup.ts` for jest-dom matchers.
- The project was scaffolded with `create-vite` (which now defaults to oxlint); oxlint was removed and replaced with ESLint per project preference.
- `src-tauri/` wraps the built frontend as a native Windows/Linux desktop app via Tauri v2. `vite.config.ts`'s `base` is conditional on `TAURI_ENV_PLATFORM` — GitHub Pages needs the `/To-Do/` subpath, but Tauri loads the build from a local/relative path, so it forces `base: '/'` whenever Vite is invoked through a `tauri` command. `.github/workflows/build-desktop.yml` cross-builds Windows + Linux installers on `workflow_dispatch` and uploads them as build artifacts (no auto-release).
