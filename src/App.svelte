<script>
  import { onMount } from 'svelte';
  import { currentScreen, goTo } from './stores/uiStore.js';
  import { gameStore } from './stores/gameStore.js';
  import { migrateFromLocalStorage, migrateActiveGameFromLocalStorage } from './lib/db.js';
  import EggLab from './screens/EggLab.svelte';
  import Hatching from './screens/Hatching.svelte';
  import PetGame from './screens/PetGame.svelte';
  import Gallery from './screens/Gallery.svelte';

  onMount(async () => {
    // Run one-time migrations from legacy localStorage
    await migrateFromLocalStorage();
    await migrateActiveGameFromLocalStorage('petgrow_save');

    // Load active save — if found, go straight to pet-game
    const saved = await gameStore.load();
    if (saved?.createdAt) {
      goTo('pet-game');
    }

    // Dismiss boot loading screen
    const bootEl = document.getElementById('boot-loading');
    if (bootEl) {
      bootEl.classList.add('fade-out');
      setTimeout(() => bootEl.remove(), 420);
    }
  });
</script>

<main>
  {#if $currentScreen === 'egg-lab'}
    <EggLab />
  {:else if $currentScreen === 'hatching'}
    <Hatching />
  {:else if $currentScreen === 'pet-game'}
    <PetGame />
  {:else if $currentScreen === 'gallery'}
    <Gallery />
  {/if}
</main>

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

  main {
    width: 100%;
    height: 100dvh;
    display: flex;
    flex-direction: column;
  }
</style>
