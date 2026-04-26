# PetGrow — SvelteKit Retrofit Plan

## Goal
Retrofit SvelteKit into the existing Svelte 5 project. Migrate to file-based routing,
Svelte 5 Runes state management, and SvelteKit API routes. Zero functional changes to game.

## Status Legend
- [x] Done
- [-] In progress
- [ ] Not started

---

## Phase 1 — Infrastructure

- [x] Install `@sveltejs/kit` + `@sveltejs/adapter-vercel`
- [x] Update `svelte.config.js` (add adapter, path aliases)
- [x] Update `vite.config.js` (replace `svelte()` + `localApiPlugin` with `sveltekit()`)
- [x] Update `vercel.json` (remove `outputDirectory`/`framework` conflicts)
- [x] Create `src/app.html` (SvelteKit entry, move boot screen from `index.html`)

## Phase 2 — State Layer

- [x] Create `src/lib/GameState.svelte.js` (class-based `$state`, replaces `gameStore.js`)
- [x] Delete `src/stores/gameStore.js`
- [x] Delete `src/stores/uiStore.js`
- [x] Delete `src/stores/` directory

## Phase 3 — Routing

- [x] Create `src/routes/+layout.js` (`ssr=false`, boot migrations)
- [x] Create `src/routes/+layout.svelte` (global styles, boot screen removal, redirect)
- [x] Create `src/routes/+page.svelte` (root — redirected by layout)
- [x] Create `src/routes/api/generate/+server.js` (replaces `api/generate.js`)
- [x] Create `src/routes/api/ping/+server.js` (replaces `api/ping.js`)

## Phase 4 — Screen Migration (Svelte 5 Runes)

- [x] `src/routes/lab/+page.svelte` — EggLab ($state, $derived, goto)
- [x] `src/routes/hatching/+page.svelte` — Hatching (local $state, $derived)
- [x] `src/routes/game/+page.svelte` — PetGame (class store, $derived)
- [x] `src/routes/gallery/+page.svelte` — Gallery ($state, $derived.by)
- [x] `src/components/BackendStatus.svelte` — $state, $derived, $effect

## Phase 5 — Cleanup

- [x] Delete `index.html`
- [x] Delete `src/main.js`
- [x] Delete `src/App.svelte`
- [x] Delete `src/screens/` directory
- [x] Delete `api/` directory
- [x] Delete `check-svelte.cjs`

## Phase 6 — Docs

- [x] Create `.github/copilot-instructions.md`
- [x] Update `/memories/repo/petgrow-notes.md`

---

## Key Decisions

| Decision | Rationale |
|---|---|
| `ssr = false` globally | All storage is browser-only (IDB, localStorage, Web Audio, canvas) |
| Class-based `$state` in `.svelte.js` | Encapsulates game state + auto-save logic cleanly |
| `goto()` replaces `goTo()` + `currentScreen` | SvelteKit router handles all navigation |
| JS (not TS) throughout | Project is JS-first; no TS toolchain configured |
| `$systems` + `$components` aliases | Clean imports from routes to `src/systems/` and `src/components/` |
| `adapter-vercel` | Replaces manual `api/` Vercel functions; SvelteKit routes compile to Vercel functions |
| Boot screen in `app.html` | Shows before JS loads; removed by layout `onMount` — same UX as before |

## What Was NOT Changed

- `src/systems/` — pure JS logic, no Svelte imports, untouched
- `src/lib/db.js` — IDB layer, no changes
- `src/lib/api.js` — Gemini client, no changes
- `src/lib/audio.js` — Web Audio, no changes
- `src/platform.css` — game world styles, no changes
- All game mechanics, animations, UI visuals

## File Map (Old → New)

| Old | New |
|---|---|
| `index.html` | `src/app.html` |
| `src/main.js` | (SvelteKit entry — deleted) |
| `src/App.svelte` | `src/routes/+layout.svelte` |
| `src/stores/gameStore.js` | `src/lib/GameState.svelte.js` |
| `src/stores/uiStore.js` | SvelteKit `goto()` + local `$state` |
| `src/screens/EggLab.svelte` | `src/routes/lab/+page.svelte` |
| `src/screens/Hatching.svelte` | `src/routes/hatching/+page.svelte` |
| `src/screens/PetGame.svelte` | `src/routes/game/+page.svelte` |
| `src/screens/Gallery.svelte` | `src/routes/gallery/+page.svelte` |
| `api/generate.js` | `src/routes/api/generate/+server.js` |
| `api/ping.js` | `src/routes/api/ping/+server.js` |
