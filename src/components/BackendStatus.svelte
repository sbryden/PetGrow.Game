<script>
  import { onMount, onDestroy } from 'svelte';
  import { PING_URL } from '../systems/constants.js';

  /** 'checking' | 'online' | 'offline' */
  let status = 'checking';
  let interval;

  async function check() {
    try {
      const res = await fetch(PING_URL, { method: 'GET' });
      status = res.ok ? 'online' : 'offline';
    } catch {
      status = 'offline';
    }
  }

  onMount(() => {
    check();
    interval = setInterval(check, 10_000);
  });

  onDestroy(() => clearInterval(interval));

  $: title = status === 'online'   ? 'Backend: online'
           : status === 'offline'  ? 'Backend: offline'
           : 'Backend: checking…';
</script>

<span class="dot {status}" {title}></span>

<style>
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #555;
    display: inline-block;
    flex-shrink: 0;
    align-self: center;
    transition: background 0.4s ease, box-shadow 0.4s ease;
  }

  .dot.online {
    background: #4cff72;
    box-shadow: 0 0 6px rgba(76, 255, 114, 0.8);
  }

  .dot.offline {
    background: #ff4c4c;
    box-shadow: 0 0 6px rgba(255, 76, 76, 0.8);
  }
</style>
