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
