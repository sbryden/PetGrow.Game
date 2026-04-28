<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { gameStore } from '$lib/GameState.svelte.js';
  import { loadAll, deleteCreature, saveCreature } from '$lib/db.js';
  import { calculateRarity, TRANSPARENT_PIXEL } from '$systems/constants.js';
  import BackendStatus from '$components/BackendStatus.svelte';

  let creatures = $state([]);
  let sortBy = $state('retiredAt');
  let loading = $state(true);
  // Creature pending delete confirmation. null = no modal open.
  let pendingDelete = $state(null);

  let activeCreature = $derived(
    gameStore.data.createdAt && gameStore.data.petName ? gameStore.data : null
  );

  let sorted = $derived.by(() =>
    [...creatures].sort((a, b) => {
      if (sortBy === 'retiredAt') return (b.retiredAt || 0) - (a.retiredAt || 0);
      if (sortBy === 'clicks')    return (b.clicks || 0) - (a.clicks || 0);
      if (sortBy === 'name')      return (a.petName || '').localeCompare(b.petName || '');
      return 0;
    })
  );

  onMount(async () => {
    await refresh();
  });

  async function refresh() {
    loading = true;
    try {
      creatures = await loadAll();
    } catch (e) {
      creatures = [];
    }
    loading = false;
  }

  async function remove(id) {
    await deleteCreature(id);
    await refresh();
  }

  function askDelete(creature) {
    pendingDelete = creature;
  }

  function cancelDelete() {
    pendingDelete = null;
  }

  async function confirmDelete() {
    const c = pendingDelete;
    pendingDelete = null;
    if (!c) return;
    await remove(c.id);
  }

  async function equip(creature) {
    // Auto-hibernate any currently-active creature so it's preserved in the
    // gallery instead of being silently overwritten by the equipped one.
    // Skip when the equipped creature *is* the currently-active one
    // (matching createdAt) — otherwise we'd archive a duplicate.
    const current = gameStore.data;
    if (
      current.createdAt &&
      current.petName &&
      current.createdAt !== creature.createdAt
    ) {
      try {
        await saveCreature({
          petName: current.petName,
          level: current.level,
          ingredients: { ...(current.ingredients || {}) },
          job: current.job,
          clicks: current.clicks,
          needs: { ...(current.needs || {}) },
          cachedImages: { ...(current.cachedImages || {}) },
          createdAt: current.createdAt,
          retiredAt: Date.now(),
        });
      } catch (e) {
        console.error('Failed to hibernate active creature on equip:', e);
      }
      await gameStore.reset();
    }

    gameStore.update(s => ({
      ...s,
      petName: creature.petName,
      level: creature.level,
      ingredients: { ...creature.ingredients },
      job: creature.job || null,
      clicks: creature.clicks || 0,
      needs: { ...creature.needs },
      cachedImages: { ...(creature.cachedImages || {}) },
      createdAt: creature.createdAt || Date.now(),
      lastNeedDecayTime: Date.now(),
      lastDecayTime: Date.now(),
    }));
    await gameStore.saveNow();
    goto('/game');
  }

  function goBack() {
    goto('/lab');
  }

  function rarityClass(c) {
    return calculateRarity(c.ingredients || {})?.cls || 'common';
  }
</script>

<div class="gallery screen">

  <!-- Header -->
  <header class="gallery-header">
    <h1 class="title">My Creatures</h1>
    <p class="subtitle">Your collection of hatched creatures</p>
    <BackendStatus />
  </header>

  <!-- Scrollable body -->
  <div class="gallery-body">

    <!-- Current Creature -->
    {#if activeCreature}
      {@const activeRarity = calculateRarity(activeCreature.ingredients || {})}
      <section class="active-section">
        <p class="active-label">Current Creature</p>
        <div class="active-card {activeRarity.cls}">
          <div class="active-preview">
            <img
              class="active-img"
              src={activeCreature.cachedImages?.[activeCreature.level] || activeCreature.cachedImages?.raw || TRANSPARENT_PIXEL}
              alt={activeCreature.petName}
            />
          </div>
          <div class="active-info">
            <p class="active-name">{activeCreature.petName}</p>
            <p class="active-meta">Level: {activeCreature.level}</p>
            <p class="active-meta">⭐ {activeCreature.clicks || 0} clicks</p>
            {#if activeCreature.job}
              <p class="active-meta">{activeCreature.job.emoji} {activeCreature.job.name}</p>
            {/if}
          </div>
        </div>
        {#if activeCreature.ingredients}
          <div class="active-tags">
            {#each Object.entries({ animal: 'Animal', color: 'Color', wildcard: 'Wild Card', element: 'Element' }) as [key, label]}
              {#if activeCreature.ingredients[key]}
                <span class="tag">{label}: {activeCreature.ingredients[key]}</span>
              {/if}
            {/each}
          </div>
        {/if}
        <button class="btn-continue" onclick={() => goto('/game')}>▶ Continue Current Creature</button>
      </section>
    {/if}

    <!-- Sort bar -->
    <div class="sort-bar">
      <span class="sort-label">Sort by:</span>
      <select class="sort-select" bind:value={sortBy}>
        <option value="retiredAt">Newest First</option>
        <option value="clicks">Most Clicks</option>
        <option value="name">Name</option>
      </select>
    </div>

    <!-- Archived grid -->
    {#if loading}
      <div class="empty-state">Loading...</div>
    {:else if sorted.length === 0}
      <div class="empty-state">
        <p>No creatures in storage yet.</p>
        <p class="sub">Create one or archive a current creature to see it here.</p>
      </div>
    {:else}
      <div class="grid">
        {#each sorted as creature (creature.id)}
          {@const rarity = calculateRarity(creature.ingredients || {})}
          <div class="card {rarity.cls}">
            <div class="card-img-wrap">
              <img
                class="card-img"
                src={creature.cachedImages?.[creature.level] || creature.cachedImages?.raw || TRANSPARENT_PIXEL}
                alt={creature.petName}
              />
            </div>
            <div class="card-body">
              <p class="card-name">{creature.petName}</p>
              <p class="card-meta">{creature.level} · {rarity.name}</p>
              {#if creature.job}
                <p class="card-job">{creature.job.emoji} {creature.job.name}</p>
              {/if}
            </div>
            <div class="card-actions">
              <button class="btn-equip" onclick={() => equip(creature)}>Play</button>
              <button class="btn-delete" onclick={() => askDelete(creature)}>Delete</button>
            </div>
          </div>
        {/each}
      </div>
    {/if}

  </div>

  <!-- Footer actions -->
  <footer class="gallery-footer">
    <button class="btn-footer btn-footer-primary" onclick={goBack}>Create New Creature</button>
  </footer>

  <!-- Delete confirm modal -->
  {#if pendingDelete}
    <div class="modal-backdrop" onpointerdown={cancelDelete} role="presentation">
      <div
        class="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-title"
        onpointerdown={(e) => e.stopPropagation()}
      >
        <p id="delete-title" class="modal-title">Delete creature?</p>
        <p class="modal-body">
          {pendingDelete.petName || 'This creature'} will be permanently removed from your gallery. This cannot be undone.
        </p>
        <div class="modal-actions">
          <button class="modal-btn modal-btn-cancel" onclick={cancelDelete}>Cancel</button>
          <button class="modal-btn modal-btn-confirm" onclick={confirmDelete}>Delete</button>
        </div>
      </div>
    </div>
  {/if}

</div>

<style>
  .gallery {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    background: #0b0d18;
    overflow: hidden;
    font-family: inherit;
  }

  /* ── Header ───────────────────────────────────────── */
  .gallery-header {
    flex-shrink: 0;
    padding: 1rem 1rem 0.5rem;
    text-align: center;
    border-bottom: 1px solid #1e2235;
  }

  .title {
    font-family: 'Press Start 2P', monospace;
    font-size: clamp(0.75rem, 3.5vw, 1rem);
    color: #00d2ff;
    margin: 0 0 0.35rem;
  }

  .subtitle {
    font-size: 0.7rem;
    color: #5a6490;
    margin: 0;
  }

  /* ── Scrollable body ─────────────────────────────── */
  .gallery-body {
    flex: 1;
    overflow-y: auto;
    padding: 0.85rem 0.85rem 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  /* ── Active / Current Creature ────────────────────── */
  .active-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .active-label {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.55rem;
    color: #ffd700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin: 0;
  }

  .active-card {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.75rem;
    background: #131625;
    border: 2px solid #2a3060;
    border-radius: 12px;
    padding: 0.65rem;
  }

  .active-card.rare     { border-color: #00d2ff66; }
  .active-card.uncommon { border-color: #00e67666; }
  .active-card.epic     { border-color: #b388ff66; }

  .active-preview {
    width: 72px;
    height: 72px;
    flex-shrink: 0;
    background: #0b0d18;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .active-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    image-rendering: pixelated;
  }

  .active-info {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .active-name {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.7rem;
    color: #00d2ff;
    margin: 0;
  }

  .active-meta {
    font-size: 0.65rem;
    color: #8899cc;
    margin: 0;
  }

  .active-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .tag {
    font-size: 0.6rem;
    background: #1a1f38;
    border: 1px solid #2a3060;
    border-radius: 20px;
    padding: 0.2rem 0.55rem;
    color: #8899cc;
  }

  .btn-continue {
    width: 100%;
    padding: 0.7rem;
    font-family: 'Press Start 2P', monospace;
    font-size: 0.6rem;
    background: #0b0d18;
    border: 2px solid #ffd700;
    border-radius: 10px;
    color: #ffd700;
    cursor: pointer;
    transition: background 0.15s;
  }
  .btn-continue:hover { background: #ffd70015; }

  /* ── Sort bar ─────────────────────────────────────── */
  .sort-bar {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  .sort-label {
    font-size: 0.65rem;
    color: #5a6490;
  }

  .sort-select {
    background: #161928;
    border: 2px solid #2a3060;
    border-radius: 8px;
    color: #c0ccee;
    padding: 0.3rem 0.6rem;
    font-family: 'Press Start 2P', monospace;
    font-size: 0.55rem;
    cursor: pointer;
  }
  .sort-select:focus { outline: none; border-color: #00d2ff; }

  /* ── Grid ─────────────────────────────────────────── */
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.75rem;
    padding-bottom: 0.75rem;
  }

  .card {
    background: #131625;
    border: 2px solid #2a2f4a;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: border-color 0.2s;
  }

  .card.common   { border-color: #3a3f60; }
  .card.uncommon { border-color: #00e676; }
  .card.rare     { border-color: #00d2ff; }
  .card.epic     { border-color: #b388ff; }

  .card-img-wrap {
    background: #0b0d18;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    aspect-ratio: 1;
  }

  .card-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    image-rendering: pixelated;
  }

  .card-body {
    padding: 0.5rem;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .card-name {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.55rem;
    color: #e0e6ff;
    word-break: break-word;
  }

  .card-meta   { font-size: 0.6rem; color: #8899cc; }
  .card-job    { font-size: 0.6rem; color: #c0ccee; }

  .card-actions {
    display: flex;
    border-top: 1px solid #2a2f4a;
  }

  .btn-equip, .btn-delete {
    flex: 1;
    padding: 0.4rem;
    font-family: inherit;
    font-size: 0.65rem;
    border: none;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-equip {
    background: #00d2ff22;
    color: #00d2ff;
    border-right: 1px solid #2a2f4a;
  }
  .btn-equip:hover { background: #00d2ff44; }

  .btn-delete {
    background: #e9456022;
    color: #e94560;
  }
  .btn-delete:hover { background: #e9456044; }

  /* ── Empty state ──────────────────────────────────── */
  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: #5a6490;
    font-size: 0.75rem;
    text-align: center;
    padding: 2rem 1rem;
  }
  .sub { font-size: 0.65rem; color: #3a4060; }

  /* ── Footer ───────────────────────────────────────── */
  .gallery-footer {
    flex-shrink: 0;
    display: flex;
    gap: 0.6rem;
    padding: 0.75rem;
    border-top: 1px solid #1e2235;
  }

  .btn-footer {
    flex: 1;
    padding: 0.65rem 0.5rem;
    font-family: 'Press Start 2P', monospace;
    font-size: 0.55rem;
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-footer-primary {
    background: #131625;
    border: 2px solid #2a3060;
    color: #c0ccee;
  }
  .btn-footer-primary:hover { border-color: #00d2ff; color: #00d2ff; }

  /* ── Delete confirm modal ─────────────────────────── */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.65);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1rem;
  }

  .modal-card {
    background: #131625;
    border: 2px solid #e94560;
    border-radius: 12px;
    padding: 1rem;
    max-width: 320px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  }

  .modal-title {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.7rem;
    color: #e94560;
    margin: 0;
  }

  .modal-body {
    font-size: 0.75rem;
    color: #c0ccee;
    line-height: 1.4;
    margin: 0;
  }

  .modal-actions {
    display: flex;
    gap: 0.5rem;
  }

  .modal-btn {
    flex: 1;
    padding: 0.65rem;
    font-family: 'Press Start 2P', monospace;
    font-size: 0.55rem;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    border: 2px solid transparent;
  }

  .modal-btn-cancel {
    background: #1a1f38;
    border-color: #2a3060;
    color: #c0ccee;
  }
  .modal-btn-cancel:hover { border-color: #00d2ff; color: #00d2ff; }

  .modal-btn-confirm {
    background: #e9456022;
    border-color: #e94560;
    color: #e94560;
  }
  .modal-btn-confirm:hover { background: #e9456044; }
</style>
