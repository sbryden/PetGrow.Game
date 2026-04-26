<script>
  import { get } from 'svelte/store';
  import { gameStore } from '../stores/gameStore.js';
  import { currentScreen, goTo } from '../stores/uiStore.js';
  import { play } from '../lib/audio.js';
  import { CREATURE_NAMES, INGREDIENT_OPTIONS, INGREDIENT_EMOJIS } from '../systems/constants.js';
  import { loadAll, saveCreature } from '../lib/db.js';
  import BackendStatus from '../components/BackendStatus.svelte';

  const OPTIONS = INGREDIENT_OPTIONS;
  const EMOJIS = INGREDIENT_EMOJIS;

  function optionLabel(category, opt) {
    const emoji = EMOJIS[category]?.[opt];
    return emoji ? `${emoji} ${opt}` : opt;
  }

  const SERUM_COLORS = [
    '#e94560','#00d2ff','#ffd700','#00e676','#b388ff',
    '#ff6f00','#e040fb','#76ff03','#ff1744','#00e5ff',
    '#ffab00','#651fff','#1de9b6','#f50057','#3d5afe',
  ];

  // ── Local state ───────────────────────────────────────────
  let petName = '';
  let ingredients = { animal: null, color: null, wildcard: null, element: null };
  let syringeVisible = false;
  let syringeColor = '#00d2ff';
  let syringeAnimating = false;
  let hintText = 'Pick at least a Base Animal and give it a name!';
  let hintColor = '';

  $: hasAnimal = !!ingredients.animal;
  $: hasName = petName.trim().length > 0;
  $: canHatch = hasAnimal && hasName;
  $: hasAnyIngredient = Object.values(ingredients).some(Boolean);
  $: {
    if (hasAnimal && hasName) {
      hintText = 'Ready to hatch!';
      hintColor = '#00e676';
    } else if (hasAnimal) {
      hintText = 'Now give your creature a name!';
      hintColor = '#ffd700';
    } else {
      hintText = 'Pick at least a Base Animal and give it a name!';
      hintColor = '';
    }
  }

  async function onIngredientChange(category, value) {
    if (value) {
      ingredients = { ...ingredients, [category]: value };
      // Syringe animation
      syringeColor = SERUM_COLORS[Math.floor(Math.random() * SERUM_COLORS.length)];
      syringeVisible = true;
      syringeAnimating = true;
      play('inject');
      await sleep(2200);
      syringeVisible = false;
      syringeAnimating = false;
    } else {
      ingredients = { ...ingredients, [category]: null };
    }
  }

  async function pickRandomName() {
    const all = await loadAll().catch(() => []);
    const usedNames = new Set(all.map(c => (c.petName || '').toLowerCase()));
    if (petName) usedNames.add(petName.toLowerCase());
    const available = CREATURE_NAMES.filter(n => !usedNames.has(n.toLowerCase()));
    const pool = available.length > 0 ? available : CREATURE_NAMES;
    petName = pool[Math.floor(Math.random() * pool.length)];
  }

  async function onHatch() {
    if (!canHatch) return;
    // Auto-hibernate any active creature before starting a new one
    const current = get(gameStore);
    if (current.createdAt) {
      await saveCreature({
        petName: current.petName, level: current.level,
        ingredients: { ...current.ingredients }, job: current.job,
        clicks: current.clicks, needs: { ...current.needs },
        cachedImages: { ...current.cachedImages },
        createdAt: current.createdAt, retiredAt: Date.now(),
      });
      await gameStore.reset();
    }
    gameStore.update(s => ({
      ...s,
      ingredients: { ...ingredients },
      petName: petName.trim(),
    }));
    goTo('hatching');
  }

  function openGallery() {
    goTo('gallery');
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
</script>

<div class="egg-lab screen">

  <!-- Header -->
  <header class="lab-header">
    <h1 class="title">PetGrow</h1>
    <div class="header-right">
      <BackendStatus />
      <button class="btn-icon" onclick={openGallery} title="My Creatures">🐾</button>
    </div>
  </header>

  <!-- Egg display -->
  <div class="egg-wrap">
    <div class="egg" class:has-ingredients={hasAnyIngredient}>
      <div class="egg-shell"></div>
      <div class="egg-shine"></div>
    </div>

    <!-- Syringe overlay -->
    {#if syringeVisible}
      <div class="syringe-overlay" class:animating={syringeAnimating}>
        <div class="syringe" class:inject={syringeAnimating}>
          <div class="syringe-serum" style="background: {syringeColor};" class:emptying={syringeAnimating}></div>
          <div class="syringe-plunger-handle" class:pushed={syringeAnimating}></div>
        </div>
        <div class="injection-splash" class:active={syringeAnimating} style="background: {syringeColor}; box-shadow: 0 0 12px {syringeColor};"></div>
      </div>
    {/if}
  </div>

  <!-- Ingredient pickers -->
  <section class="pickers">
    {#each Object.entries(OPTIONS) as [category, options]}
      <div class="picker-row">
        <label class="picker-label" for="pick-{category}">
          {category === 'animal' ? '🐾 Base Animal' :
           category === 'color'  ? '🎨 Color / Material' :
           category === 'wildcard' ? '🔮 Wild Card' : '⚡ Element'}
        </label>
        <select
          id="pick-{category}"
          class="ingredient-select"
          class:has-value={!!ingredients[category]}
          value={ingredients[category] || ''}
          onchange={(e) => onIngredientChange(category, e.target.value)}
        >
          <option value="">— None —</option>
          {#each options as opt}
            <option value={opt}>{optionLabel(category, opt)}</option>
          {/each}
        </select>
      </div>
    {/each}
  </section>

  <!-- Name input -->
  <section class="name-section">
    <label class="picker-label" for="pet-name">✏️ Name your creature</label>
    <div class="name-row">
      <input
        id="pet-name"
        class="name-input"
        type="text"
        maxlength="30"
        placeholder="Give it a name..."
        bind:value={petName}
      />
      <button class="btn-dice" onclick={pickRandomName} title="Random name">🎲</button>
    </div>
  </section>

  <!-- Hatch button + hint -->
  <div class="hatch-section">
    <p class="hatch-hint" style="color: {hintColor || 'inherit'}">{hintText}</p>
    <button class="btn-hatch" disabled={!canHatch} onclick={onHatch}>
      HATCH!
    </button>
  </div>

</div>

<style>
  .egg-lab {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1rem;
    gap: 0.75rem;
    min-height: 100dvh;
    background: radial-gradient(ellipse at top, #1a1c2e 0%, #0c0e14 70%);
    overflow-y: auto;
  }

  .lab-header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .title {
    font-family: 'Press Start 2P', monospace;
    font-size: clamp(0.8rem, 4vw, 1.2rem);
    color: #00d2ff;
    text-shadow: 0 0 12px #00d2ff88;
  }

  .btn-icon {
    background: none;
    border: 2px solid #00d2ff44;
    border-radius: 8px;
    padding: 0.4rem 0.6rem;
    font-size: 1.2rem;
    color: #00d2ff;
    transition: border-color 0.2s;
  }
  .btn-icon:hover { border-color: #00d2ff; }

  /* ── Egg ──────────────────────────────────────────── */
  .egg-wrap {
    position: relative;
    width: 140px;
    height: 170px;
    flex-shrink: 0;
  }

  .egg {
    width: 100%;
    height: 100%;
    position: relative;
  }

  .egg-shell {
    position: absolute;
    inset: 0;
    border-radius: 50% 50% 55% 55% / 40% 40% 60% 60%;
    background: linear-gradient(135deg, #2a2d4a 0%, #1a1d30 60%, #0f1020 100%);
    box-shadow:
      inset 0 -20px 40px rgba(0,0,0,0.15),
      inset 0 15px 30px rgba(255,255,255,0.08),
      0 15px 35px rgba(0,0,0,0.45);
    transition: box-shadow 0.4s;
  }

  .egg.has-ingredients .egg-shell {
    box-shadow:
      inset 0 -20px 40px rgba(0,0,0,0.15),
      inset 0 15px 30px rgba(255,255,255,0.15),
      0 15px 35px rgba(0,0,0,0.45),
      0 0 30px #00d2ff44;
  }

  .egg-shine {
    position: absolute;
    top: 12%;
    left: 20%;
    width: 25%;
    height: 18%;
    border-radius: 50%;
    background: rgba(255,255,255,0.18);
    filter: blur(4px);
  }

  /* ── Syringe overlay (simplified CSS-driven animation) ── */
  .syringe-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .syringe {
    width: 60px;
    height: 14px;
    background: #ccc;
    border-radius: 4px;
    position: relative;
    transform: translateX(80px);
    transition: transform 0.5s ease;
  }

  .syringe.inject {
    transform: translateX(0px);
  }

  .syringe-serum {
    position: absolute;
    left: 4px;
    top: 3px;
    height: 8px;
    width: 60%;
    border-radius: 2px;
    transition: width 0.6s ease 0.6s;
  }

  .syringe-serum.emptying { width: 0%; }

  .syringe-plunger-handle {
    position: absolute;
    right: -12px;
    top: -4px;
    width: 12px;
    height: 22px;
    background: #999;
    border-radius: 2px;
    transition: right 0.3s ease 0.7s;
  }

  .syringe-plunger-handle.pushed { right: 4px; }

  .injection-splash {
    position: absolute;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    opacity: 0;
    left: 40%;
    top: 40%;
    transform: scale(0);
    transition: opacity 0.1s, transform 0.3s;
  }

  .injection-splash.active {
    opacity: 1;
    transform: scale(1.4);
  }

  /* ── Pickers ───────────────────────────────────────── */
  .pickers {
    width: 100%;
    max-width: 360px;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .picker-row {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .picker-label {
    font-size: 0.65rem;
    color: #8899cc;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .ingredient-select {
    background: #161928;
    border: 2px solid #2a2f4a;
    color: #c0ccee;
    border-radius: 8px;
    padding: 0.5rem 0.6rem;
    font-family: inherit;
    font-size: 0.8rem;
    width: 100%;
    transition: border-color 0.2s;
    appearance: none;
  }

  .ingredient-select:focus { outline: none; border-color: #00d2ff; }
  .ingredient-select.has-value { border-color: #00e676; color: #fff; }

  /* ── Name section ──────────────────────────────────── */
  .name-section {
    width: 100%;
    max-width: 360px;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .name-row {
    display: flex;
    gap: 0.5rem;
  }

  .name-input {
    flex: 1;
    background: #161928;
    border: 2px solid #2a2f4a;
    color: #fff;
    border-radius: 8px;
    padding: 0.5rem 0.7rem;
    font-family: inherit;
    font-size: 0.85rem;
    transition: border-color 0.2s;
  }
  .name-input:focus { outline: none; border-color: #00d2ff; }

  .btn-dice {
    background: #1e2140;
    border: 2px solid #2a2f4a;
    border-radius: 8px;
    padding: 0.4rem 0.6rem;
    font-size: 1.1rem;
    transition: border-color 0.2s;
  }
  .btn-dice:hover { border-color: #ffd700; }

  /* ── Hatch button ─────────────────────────────────── */
  .hatch-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    padding-bottom: 1rem;
  }

  .hatch-hint {
    font-size: 0.7rem;
    text-align: center;
    color: #8899cc;
    max-width: 280px;
  }

  .btn-hatch {
    font-family: 'Press Start 2P', monospace;
    font-size: clamp(0.7rem, 3vw, 0.9rem);
    padding: 0.75rem 2rem;
    background: linear-gradient(135deg, #00d2ff, #0097b2);
    border: none;
    border-radius: 10px;
    color: #fff;
    letter-spacing: 0.05em;
    box-shadow: 0 4px 20px #00d2ff44;
    transition: opacity 0.2s, transform 0.1s;
  }

  .btn-hatch:hover:not(:disabled) { transform: scale(1.04); }
  .btn-hatch:active:not(:disabled) { transform: scale(0.97); }
  .btn-hatch:disabled { opacity: 0.35; cursor: not-allowed; }
</style>
