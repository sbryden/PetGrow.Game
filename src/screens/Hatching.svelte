<script>
  import { onMount, onDestroy } from 'svelte';
  import { gameStore } from '../stores/gameStore.js';
  import { isGenerating, generatingText, goTo } from '../stores/uiStore.js';
  import { play } from '../lib/audio.js';
  import { buildPrompt } from '../systems/prompts.js';
  import { fetchCreatureImage, removeBackground } from '../lib/api.js';

  let state;
  const unsub = gameStore.subscribe(s => { state = s; });
  onDestroy(unsub);

  // ── Generation status ─────────────────────────────────────
  let statusMsg = 'Your egg is wobbling...';
  let dotCount = 0;
  let dotTimer;
  let failureMsg = '';
  let apiKeyInput = '';
  let resolveApiKey = null;

  onMount(() => {
    dotTimer = setInterval(() => {
      dotCount = (dotCount + 1) % 4;
    }, 400);
    startGeneration();
  });

  onDestroy(() => {
    clearInterval(dotTimer);
  });

  $: dots = '.'.repeat(dotCount);

  async function startGeneration() {
    isGenerating.set(true);
    failureMsg = '';

    try {
      const { ingredients, petName, level, job } = state;

      generatingText.set(statusMsg);

      const prompt = buildPrompt(ingredients, level, job?.id);

      statusMsg = 'Something is stirring inside!';
      generatingText.set(statusMsg);

      // Fetch image — pass a callback that prompts for a client API key
      const imageDataUrl = await fetchCreatureImage(prompt, async () => {
        return new Promise(resolve => {
          failureMsg = 'Server API key missing. Enter your Gemini API key:';
          resolveApiKey = resolve;
        });
      });

      statusMsg = 'Growing your creature...';
      generatingText.set(statusMsg);

      const cleanedDataUrl = await removeBackground(imageDataUrl);

      // Update the store with the generated image
      gameStore.update(s => ({
        ...s,
        createdAt: s.createdAt || Date.now(),
        cachedImages: { ...s.cachedImages, raw: cleanedDataUrl },
        lastNeedDecayTime: Date.now(),
        lastDecayTime: Date.now(),
      }));

      // Save to gallery if this is a fresh creature (no createdAt yet)
      await gameStore.saveNow();
      play('hatch');

      generatingText.set('');
      isGenerating.set(false);
      goTo('pet-game');

    } catch (err) {
      console.error('Generation error:', err);
      play('error');
      statusMsg = '';
      failureMsg = err.message || 'Something went wrong. Please try again.';
      isGenerating.set(false);
    }
  }

  function submitApiKey() {
    const key = apiKeyInput.trim();
    if (key && resolveApiKey) {
      resolveApiKey(key);
      resolveApiKey = null;
      failureMsg = '';
      apiKeyInput = '';
      isGenerating.set(true);
    }
  }

  function goBack() {
    isGenerating.set(false);
    generatingText.set('');
    goTo('egg-lab');
  }
</script>

<div class="hatching screen">

  <div class="card">
    <!-- Spinning egg / creature animation -->
    <div class="egg-anim" class:done={!$isGenerating}>
      <div class="glow-ring"></div>
      <div class="egg-pulse">🥚</div>
    </div>

    <h2 class="title">
      {#if $isGenerating}
        {statusMsg}{dots}
      {:else if failureMsg}
        ⚠️ Error
      {:else}
        Creature born!
      {/if}
    </h2>

    {#if failureMsg}
      <p class="error-msg">{failureMsg}</p>
      {#if failureMsg.toLowerCase().includes('api key')}
        <div class="key-row">
          <input
            class="key-input"
            type="password"
            placeholder="AIza..."
            bind:value={apiKeyInput}
            onkeydown={(e) => e.key === 'Enter' && submitApiKey()}
          />
          <button class="btn-primary" onclick={submitApiKey}>Submit</button>
        </div>
      {/if}
      <button class="btn-back" onclick={goBack}>← Go Back</button>
    {/if}
  </div>

</div>

<style>
  .hatching {
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(ellipse at center, #1a1c2e 0%, #0c0e14 80%);
  }

  .card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    padding: 2rem;
    text-align: center;
  }

  /* ── Egg anim ────────────────────────────────────────── */
  .egg-anim {
    position: relative;
    width: 120px;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .glow-ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 3px solid #00d2ff88;
    animation: spin 2s linear infinite, pulse-ring 1.5s ease-in-out infinite;
  }

  .egg-pulse {
    font-size: 3.5rem;
    animation: bounce-egg 0.6s ease-in-out infinite alternate;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  @keyframes pulse-ring {
    0%, 100% { box-shadow: 0 0 20px #00d2ff44; }
    50%       { box-shadow: 0 0 40px #00d2ffaa; }
  }

  @keyframes bounce-egg {
    from { transform: translateY(-4px) scale(1.0); }
    to   { transform: translateY(4px)  scale(1.05); }
  }

  .egg-anim.done .egg-pulse { animation: none; }
  .egg-anim.done .glow-ring { animation: none; border-color: #00e67688; }

  /* ── Text ─────────────────────────────────────────────── */
  .title {
    font-family: 'Press Start 2P', monospace;
    font-size: clamp(0.7rem, 3vw, 1rem);
    color: #00d2ff;
    min-height: 2em;
  }

  .error-msg {
    font-size: 0.8rem;
    color: #ff5555;
    max-width: 300px;
  }

  /* ── API key fallback ─────────────────────────────────── */
  .key-row {
    display: flex;
    gap: 0.5rem;
  }

  .key-input {
    flex: 1;
    background: #161928;
    border: 2px solid #2a2f4a;
    border-radius: 8px;
    color: #fff;
    padding: 0.5rem;
    font-family: inherit;
    font-size: 0.8rem;
  }
  .key-input:focus { outline: none; border-color: #00d2ff; }

  .btn-primary {
    background: #00d2ff;
    border: none;
    border-radius: 8px;
    padding: 0.5rem 1rem;
    color: #000;
    font-family: inherit;
    font-size: 0.8rem;
  }

  .btn-back {
    background: none;
    border: 2px solid #2a2f4a;
    border-radius: 8px;
    padding: 0.5rem 1.2rem;
    color: #8899cc;
    font-family: inherit;
    font-size: 0.75rem;
    transition: border-color 0.2s;
  }
  .btn-back:hover { border-color: #00d2ff; color: #00d2ff; }
</style>
