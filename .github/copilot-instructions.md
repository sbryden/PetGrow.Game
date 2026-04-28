# PetGrow — Copilot Instructions

## Project Overview
PetGrow is a Tamagotchi-style browser game built with **SvelteKit + Svelte 5 Runes**.  
Players mix ingredients in an Egg Lab, hatch unique AI-generated creature sprites, then raise and care for them in a multi-room platformer environment.

## Stack
| Layer | Tech |
|-------|------|
| Framework | SvelteKit (`@sveltejs/kit`) |
| UI | Svelte 5 with Runes (`$state`, `$derived`, `$effect`) |
| Routing | SvelteKit file-based routing (`src/routes/`) |
| Persistence | IndexedDB via `src/lib/db.js` |
| Styling | Scoped `<style>` blocks + `src/platform.css` (global) |
| Audio | Web Audio API (`src/lib/audio.js`) — procedural sounds |
| AI | Google Gemini API proxied via `src/routes/api/generate/+server.js` |
| Deployment | Vercel (`@sveltejs/adapter-vercel`, runtime `nodejs22.x`) |
| PWA | vite-plugin-pwa |
| Tests | Vitest (`src/systems/*.test.js`) |

## Project Structure
```
src/
  app.html                     # HTML shell (boot loading screen)
  platform.css                 # Global CSS (room backgrounds, doors, props)
  routes/
    +layout.js                 # export const ssr = false (entire app is client-side)
    +layout.svelte             # Boot migration + initial redirect (lab or game)
    +page.svelte               # Root (empty — layout redirects)
    lab/+page.svelte           # EggLab — mix ingredients, create an egg
    hatching/+page.svelte      # Hatch — AI generates creature sprite
    gallery/+page.svelte       # Gallery — browse retired pets
    game/+page.svelte          # PetGame — main platformer (RAF loop, rooms, needs)
    api/
      generate/+server.js      # POST /api/generate — Gemini proxy
      ping/+server.js          # GET /api/ping — health check
  lib/
    GameState.svelte.js        # Class-based game state (Svelte 5 $state)
    db.js                      # IndexedDB helpers
    api.js                     # Client-side API call wrapper
    audio.js                   # Web Audio procedural sounds
  components/
    BackendStatus.svelte       # Pinging dot indicator
  systems/
    constants.js               # ROOMS, thresholds, TRANSPARENT_PIXEL, etc.
    needs.js                   # doFeed/doClean/doPlay/doSleep, applyNeedDecay
    breeding.js                # Egg ingredient mixing logic
    prompts.js                 # Gemini prompt construction
```

## Key Patterns

### State management
- **No Svelte stores** — use `src/lib/GameState.svelte.js` which exports `gameStore` (a class instance).
- Access state via `gameStore.data.xxx` (reactive — no subscription needed).
- Mutate via `gameStore.update(s => ({ ...s, key: value }))`.
- Persist to IndexedDB via `gameStore.saveNow()` or the auto-save in `update()`.
- **No `$:` reactive declarations** — use `$derived` / `$derived.by()`.
- **No `let x = writable()`** — use `let x = $state(...)`.

### Navigation
- All navigation via `import { goto } from '$app/navigation'`.
- Routes: `/` → `/lab` → `/hatching` → `/game` ↔ `/gallery`.

### SSR
- The entire app runs client-side only. `export const ssr = false` is set in `+layout.js`.
- Never add SSR-incompatible code at module level without a browser guard.

### Import aliases
```js
$lib       → src/lib/
$systems   → src/systems/
$components → src/components/
```

### platform.css
- Imported at the **top of game/+page.svelte** (`import '../../platform.css'`).
- All global room background classes, door styles, and elevator styles live here.
- Do not scope platform styles — they are applied to DOM elements created dynamically by `buildRoomProps()`.

### Audio
- Check `isEnabled()` before playing; use `play(soundName)` from `$lib/audio.js`.
- `toggle()` flips enabled state and returns the new boolean.

### IndexedDB (db.js)
- `saveGame(data)` — save current game state.
- `loadGame()` — load current game state.
- `saveCreature(creature)` — retire a pet to the gallery.
- `loadAll()` — list all retired creatures.
- `deleteCreature(id)` — delete from gallery.

## Do Not Change
- Game logic in `src/systems/` unless fixing a bug.
- The RAF loop architecture in `game/+page.svelte` (tick → move → checkDoors → checkElevator).
- IndexedDB schema in `db.js`.
- The Gemini prompt format in `prompts.js`.

## Launch / Dev Server
- **Local dev: `npm run dev`** (plain `vite`) — runs on `http://localhost:5173`. This is the standard way to run the app locally.
- **Do NOT use `vercel dev`** — it adds no value here and tends to interfere with port/env behavior.
- Env vars for dev live in `.env.local` (gitignored). Required: `GEMINI_API_KEY`.
- **Server-side env access must use `$env/dynamic/private`** (or `$env/static/private`), NOT `process.env`. Vite/SvelteKit only loads `.env.local` into the `$env/*` virtual modules in dev — `process.env.GEMINI_API_KEY` will be undefined and `/api/generate` will return 500 "API key not configured".
- The user typically already has a dev server running. Before starting one, check existing terminals / `lsof -i :5173` rather than spawning another.
- To verify the API proxy from the CLI:
  ```bash
  curl -s -X POST http://localhost:5173/api/generate -H "Content-Type: application/json" \
    -d '{"model":"gemini-2.5-flash-image","contents":[{"parts":[{"text":"test"}]}],"generationConfig":{"responseModalities":["TEXT","IMAGE"],"imageConfig":{"aspectRatio":"1:1"}}}'
  ```

## Testing
```bash
npm test          # Vitest unit tests
npm run build     # SvelteKit build (must pass clean)
npm run preview   # Preview production build locally
```

## Common Pitfalls
- `$state` / `$derived` are **compile-time** Svelte 5 runes — do not call them at runtime.
- `gameStore.data` is the reactive proxy — destructuring it loses reactivity.
- `buildRoomProps()` in game/+page.svelte writes DOM directly (intentional — avoids re-mounting the RAF loop).
- The elevator uses CSS animation classes toggled on `.scene-root`, not Svelte transitions.
