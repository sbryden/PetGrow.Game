<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { gameStore } from '$lib/GameState.svelte.js';
  import { migrateFromLocalStorage, migrateActiveGameFromLocalStorage } from '$lib/db.js';

  let { children } = $props();

  onMount(async () => {
    // One-time migrations from legacy localStorage
    await migrateFromLocalStorage();
    await migrateActiveGameFromLocalStorage('petgrow_save');

    // Load active save — if found, go straight to /game
    const saved = await gameStore.load();

    // Dismiss boot loading screen
    const bootEl = document.getElementById('boot-loading');
    if (bootEl) {
      bootEl.classList.add('fade-out');
      setTimeout(() => bootEl.remove(), 420);
    }

    // Redirect from root based on whether a save exists
    if (window.location.pathname === '/') {
      await goto(saved?.createdAt ? '/game' : '/lab', { replaceState: true });
    }
  });
</script>

{@render children()}

<style>
  :global(*) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(body) {
    background: #0c0e14;
    color: #e0e6ff;
    font-family: 'Pixelify Sans', 'Press Start 2P', monospace;
    min-height: 100dvh;
    overflow: hidden;
  }

  :global(button) {
    cursor: pointer;
    font-family: inherit;
  }
</style>
