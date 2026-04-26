<script>
  import { onMount, onDestroy } from 'svelte';
  import '../platform.css';
  import { gameStore } from '../stores/gameStore.js';
  import { goTo } from '../stores/uiStore.js';
  import { play, isEnabled, toggle } from '../lib/audio.js';
  import { doFeed, doClean, doPlay, doSleep, applyNeedDecay, calcMissedNeedTicks } from '../systems/needs.js';
  import { ROOMS, PLATFORM_ROOM_ID, NEED_WARN_THRESHOLD, NEED_CRITICAL_THRESHOLD, TEEN_THRESHOLD, LEGEND_THRESHOLD, TRANSPARENT_PIXEL } from '../systems/constants.js';
  import { saveCreature } from '../lib/db.js';
  import BackendStatus from '../components/BackendStatus.svelte';

  // ── Platform constants ─────────────────────────────────────
  const PET_SIZE       = 180;
  const PET_SIZE_SMALL = 150;
  const DOOR_SLOTS     = [32, 68]; // % X positions of platform-room doors
  const DOOR_RADIUS    = 110;      // px proximity to open a door

  // ── Store binding ─────────────────────────────────────────
  let state;
  const unsub = gameStore.subscribe(s => { state = s; });
  onDestroy(unsub);

  // ── Derived UI values ─────────────────────────────────────
  $: petImage     = state?.cachedImages?.[state?.level] || state?.cachedImages?.raw || TRANSPARENT_PIXEL;
  $: currentRoomId = state?.currentRoom || PLATFORM_ROOM_ID;
  $: currentRoom  = ROOMS.find(r => r.id === currentRoomId) || ROOMS[0];
  $: actions      = currentRoom?.actions || [];
  $: needs        = state?.needs || { hunger: 100, cleanliness: 100, fun: 100, energy: 100 };
  $: petName      = state?.petName || '';
  $: level        = state?.level || 'Baby';
  $: clicks       = state?.clicks || 0;
  $: job          = state?.job;
  $: audioOn      = isEnabled();
  $: labFloor     = state?.labFloor ?? 1;
  $: roomBgClass  = `room-bg room-${currentRoomId}${currentRoomId === 'lab' && labFloor === 2 ? ' lab-floor-2' : ''}`;

  // ── DOM refs ──────────────────────────────────────────────
  let petGameEl;
  let gameWorldEl;
  let roomPropsEl;
  let petPartsEl;
  let sceneRootEl;

  // ── Platform state ────────────────────────────────────────
  let petX             = null;
  let petY             = null;
  let petFacingLeft    = false;
  let isWalking        = false;
  let enteringRoom     = false;
  let walkTarget       = null;
  let platformReturnX  = null;
  let platformDoors    = [];
  let nearDoor         = null;
  let nearElevator     = false;
  let labElevatorEl    = null;
  let labElevatorScrolling = false;
  const ELEV_X_PERCENT = 88; // elevator right-side position in lab
  const keys           = { a: false, d: false };
  let rafId;
  let lastTick       = 0;
  let needTimer;
  let _cleanup;

  // ── Helpers ───────────────────────────────────────────────
  function getPetSize() { return window.innerWidth <= 480 ? PET_SIZE_SMALL : PET_SIZE; }
  function getFloorY()  { return gameWorldEl ? Math.max(0, gameWorldEl.clientHeight * 0.78 - getPetSize()) : 0; }
  function needColor(v) { return v <= NEED_CRITICAL_THRESHOLD ? '#e94560' : v <= NEED_WARN_THRESHOLD ? '#ffd700' : '#00e676'; }

  function applyPetTransform() {
    if (!petPartsEl || petX === null) return;
    petPartsEl.style.left      = `${petX}px`;
    petPartsEl.style.top       = `${petY}px`;
    petPartsEl.style.transform = petFacingLeft ? 'scaleX(-1)' : 'scaleX(1)';
    petPartsEl.classList.toggle('walking', isWalking);
  }

  function initPetPosition() {
    if (!gameWorldEl) return;
    const sz   = getPetSize();
    const maxX = Math.max(0, gameWorldEl.clientWidth - sz);
    if (petX === null) petX = Math.max(0, Math.min(maxX, state?.petX ?? maxX / 2));
    petY = getFloorY();
    applyPetTransform();
  }

  // ── Door proximity ────────────────────────────────────────
  function checkDoors() {
    if (enteringRoom || !platformDoors.length || petX === null || !gameWorldEl) return;
    const sz     = getPetSize();
    const petCx  = petX + sz / 2;
    const worldW = Math.max(1, gameWorldEl.clientWidth);
    let found    = null;
    let bestDist = Infinity;

    platformDoors.forEach(door => {
      const doorX = (door.xPercent / 100) * worldW;
      const dist  = Math.abs(petCx - doorX);
      if (dist < DOOR_RADIUS) {
        door.el.classList.add('room-door--open');
        if (dist < bestDist) { bestDist = dist; found = door; }
      } else {
        door.el.classList.remove('room-door--open');
      }
    });

    if (found !== nearDoor) {
      nearDoor = found;
    }
  }

  // ── Room switching ────────────────────────────────────────
  function enterDoor(door) {
    if (enteringRoom) return;
    enteringRoom = true;
    doSwitchRoom(door.roomId);
  }

  function doSwitchRoom(roomId) {
    play('room');
    // Save return X when leaving platform
    if (state?.currentRoom === PLATFORM_ROOM_ID && roomId !== PLATFORM_ROOM_ID) {
      platformReturnX = petX;
    }
    petGameEl?.classList.add('room-fading');
    setTimeout(() => {
      petGameEl?.classList.remove('room-fading');
      const sz = getPetSize();
      gameStore.update(s => ({ ...s, currentRoom: roomId }));
      petX = (roomId === PLATFORM_ROOM_ID && platformReturnX !== null)
        ? platformReturnX
        : gameWorldEl ? gameWorldEl.clientWidth / 2 - sz / 2 : petX;
      petY        = getFloorY();
      nearDoor    = null;
      enteringRoom = false;
      walkTarget  = null;
      applyPetTransform();
      buildRoomProps(roomId);
    }, 220);
  }

  // ── Room builder (DOM) ────────────────────────────────────
  function buildRoomProps(roomId) {
    if (!roomPropsEl || !gameWorldEl) return;
    roomPropsEl.innerHTML = '';
    platformDoors = [];
    nearDoor = null;

    const addFloor = () => {
      const el = document.createElement('div');
      el.className = 'room-floor';
      roomPropsEl.appendChild(el);
    };

    const addLights = () => {
      [12, 30, 50, 70, 88].forEach(x => {
        const el = document.createElement('div');
        el.className  = 'wall-light';
        el.style.left = `${x}%`;
        el.style.top  = '18%';
        roomPropsEl.appendChild(el);
      });
    };

    const addDoor = (xPercent, targetId, colorClass, symbol, label) => {
      const sz   = getPetSize();
      const door = document.createElement('div');
      door.className   = `room-door room-door--${colorClass}`;
      door.style.left   = `${xPercent}%`;
      door.style.bottom = '22%';
      door.style.width  = `${Math.round(sz * 0.6)}px`;
      door.style.height = `${sz}px`;

      const knob = document.createElement('div');
      knob.className = 'door-knob';
      door.appendChild(knob);

      if (symbol) {
        const sym = document.createElement('span');
        sym.className   = 'door-symbol';
        sym.textContent = symbol;
        door.appendChild(sym);
      }
      if (label) {
        const lbl = document.createElement('span');
        lbl.className   = 'door-engraving';
        lbl.textContent = label;
        door.appendChild(lbl);
      }
      if (colorClass === 'exit') {
        const sign = document.createElement('div');
        sign.className   = 'exit-sign';
        sign.textContent = 'EXIT';
        door.appendChild(sign);
      }

      door.addEventListener('pointerdown', e => {
        e.stopPropagation();
        enterDoor({ el: door, xPercent, roomId: targetId });
      });

      roomPropsEl.appendChild(door);
      platformDoors.push({ el: door, xPercent, roomId: targetId });
    };

    if (roomId === PLATFORM_ROOM_ID) {
      addFloor();
      addLights();
      const rug = document.createElement('div');
      rug.className    = 'platform-rug';
      rug.style.left   = '35%';
      rug.style.bottom = '23%';
      roomPropsEl.appendChild(rug);
      addDoor(DOOR_SLOTS[0], 'lab',     'teal',   '🧪', 'LAB');
      addDoor(DOOR_SLOTS[1], 'feeding', 'orange', '🍎', 'FOOD');

    } else if (roomId === 'lab') {
      labElevatorEl = null;
      nearElevator  = false;
      addFloor();
      addLights();

      // Floor indicator toggles a CSS class on the scene root element
      if (sceneRootEl) {
        sceneRootEl.classList.toggle('lab-floor-2', labFloor === 2);
      }

      const currentFloor = state?.labFloor ?? 1;

      if (currentFloor === 1) {
        addDoor(5,  PLATFORM_ROOM_ID, 'exit',   null,   null);
        addDoor(35, 'lab-science',    'teal',   '🔬', 'SCIENCE');
        addDoor(65, 'lab-mix',        'purple', '🧬', "MIX N' MIX");
      } else {
        // Floor 2 indicator sign
        const sign = document.createElement('div');
        sign.className = 'lab-floor-indicator';
        roomPropsEl.appendChild(sign);

        addDoor(20, 'lab-breeding',    'pink',   '💕', 'BREEDING');
        addDoor(50, 'lab-potions',     'purple', '⚗️', 'POTIONS');
        addDoor(75, 'lab-enhancement', 'orange', '⬆️', 'ENHANCE');
      }

      // Elevator (both floors)
      const sz = getPetSize();
      const elev = document.createElement('div');
      elev.className    = 'lab-elevator';
      elev.style.left   = `${ELEV_X_PERCENT}%`;
      elev.style.bottom = '22%';
      elev.style.width  = `${Math.round(sz * 0.9)}px`;
      elev.style.height = `${Math.round(sz * 1.15)}px`;

      const panelL = document.createElement('div');
      panelL.className = 'elevator-door-panel elevator-door-left';
      const panelR = document.createElement('div');
      panelR.className = 'elevator-door-panel elevator-door-right';

      const btn = document.createElement('div');
      btn.className   = 'elevator-floor-btn';
      btn.textContent = currentFloor === 1 ? '▲' : '▼';

      const hint = document.createElement('span');
      hint.className   = 'elevator-hint';
      hint.textContent = 'SPACE to ride';

      elev.appendChild(panelL);
      elev.appendChild(panelR);
      elev.appendChild(btn);
      elev.appendChild(hint);
      roomPropsEl.appendChild(elev);
      labElevatorEl = elev;

    } else if (['lab-science','lab-mix','lab-breeding','lab-potions','lab-enhancement'].includes(roomId)) {
      addFloor();
      addLights();
      const LAB_SUB_ICONS = {
        'lab-science':     '🔬',
        'lab-mix':         '🧬',
        'lab-breeding':    '💕',
        'lab-potions':     '⚗️',
        'lab-enhancement': '⬆️',
      };
      const stub = document.createElement('div');
      stub.className   = 'lab-stub-prop';
      stub.textContent = LAB_SUB_ICONS[roomId] || '🧪';
      roomPropsEl.appendChild(stub);
      addDoor(5, 'lab', 'exit', null, null);

    } else {
      // feeding, bathroom, playroom, bedroom, breeding
      addFloor();
      addDoor(5, PLATFORM_ROOM_ID, 'exit', null, null);
    }
  }

  // ── Elevator proximity ─────────────────────────────────────
  function checkElevator() {
    if (!labElevatorEl || petX === null || labElevatorScrolling || !gameWorldEl) return;
    const sz     = getPetSize();
    const petCx  = petX + sz / 2;
    const worldW = Math.max(1, gameWorldEl.clientWidth);
    const elevCx = (ELEV_X_PERCENT / 100) * worldW + Math.round(sz * 0.45);
    const dist   = Math.abs(petCx - elevCx);
    const wasNear = nearElevator;
    nearElevator  = dist < 120;

    if (nearElevator !== wasNear) {
      const hint = labElevatorEl.querySelector('.elevator-hint');
      if (nearElevator) {
        labElevatorEl.classList.add('lab-elevator--open');
        if (hint) hint.style.opacity = '1';
      } else {
        labElevatorEl.classList.remove('lab-elevator--open');
        if (hint) hint.style.opacity = '0';
      }
    }
  }

  // ── Elevator ride ─────────────────────────────────────────
  function rideElevator() {
    if (labElevatorScrolling || enteringRoom || !sceneRootEl) return;
    labElevatorScrolling = true;
    enteringRoom         = true;
    walkTarget           = null;

    const currentFloor = state?.labFloor ?? 1;
    const goingUp      = currentFloor === 1;

    // 1. Close doors (300 ms)
    if (labElevatorEl) {
      labElevatorEl.classList.remove('lab-elevator--open');
    }

    setTimeout(() => {
      // 2. Hide pet — inside elevator
      if (petPartsEl) petPartsEl.style.opacity = '0';

      // 3. Scroll scene 100% vertically (800 ms linear)
      const scrollClass = goingUp ? 'lab-scroll-up' : 'lab-scroll-down';
      sceneRootEl.classList.add(scrollClass);

      setTimeout(() => {
        // 4. Swap floor, rebuild
        sceneRootEl.classList.remove(scrollClass);
        const newFloor = goingUp ? 2 : 1;
        gameStore.update(s => ({ ...s, labFloor: newFloor, currentRoom: 'lab' }));

        const sz = getPetSize();
        petX = gameWorldEl ? gameWorldEl.clientWidth / 2 - sz / 2 : petX;
        petY = getFloorY();
        nearDoor     = null;
        nearElevator = false;
        buildRoomProps('lab');
        applyPetTransform();

        // 5. Reveal pet after brief pause
        setTimeout(() => {
          if (petPartsEl) petPartsEl.style.opacity = '1';
          labElevatorScrolling = false;
          enteringRoom         = false;
        }, 200);
      }, 800);
    }, 300);
  }

  // ── RAF loop ──────────────────────────────────────────────
  function tick(ts) {
    if (!lastTick) lastTick = ts;
    const dt = Math.min(0.05, (ts - lastTick) / 1000);
    lastTick = ts;

    if (petX !== null && gameWorldEl && !enteringRoom && !labElevatorScrolling) {
      const speed = 220;
      let vx = 0;
      if (keys.a) { vx = -1; walkTarget = null; }
      if (keys.d) { vx =  1; walkTarget = null; }

      if (walkTarget !== null && vx === 0) {
        const petCx = petX + getPetSize() / 2;
        const diff  = walkTarget - petCx;
        if (Math.abs(diff) < 6) walkTarget = null;
        else vx = diff > 0 ? 1 : -1;
      }

      if (vx !== 0) {
        const sz   = getPetSize();
        const maxX = Math.max(0, gameWorldEl.clientWidth - sz);
        petX = Math.max(0, Math.min(maxX, petX + vx * speed * dt));
        petFacingLeft = vx < 0;
        isWalking = true;
      } else {
        isWalking = false;
      }

      petY = getFloorY();
      applyPetTransform();
      checkDoors();
      if (state?.currentRoom === 'lab') checkElevator();
    }

    rafId = requestAnimationFrame(tick);
  }

  // ── Touch / tap to walk ───────────────────────────────────
  function onWorldPointerDown(e) {
    if (petX === null || enteringRoom) return;
    if (e.target.closest('.room-door')) return;
    const rect = gameWorldEl.getBoundingClientRect();
    walkTarget = e.clientX - rect.left;
  }

  // ── Actions ───────────────────────────────────────────────
  function doAction(type) {
    play(type);
    gameStore.update(s => {
      let result;
      if (type === 'feed')  result = doFeed(s.needs, s.clicks);
      if (type === 'clean') result = doClean(s.needs, s.clicks);
      if (type === 'play')  result = doPlay(s.needs, s.clicks);
      if (type === 'sleep') result = doSleep(s.needs, s.clicks);
      if (!result) return s;
      let newLevel = s.level;
      if (s.level === 'Baby'     && result.clicks >= TEEN_THRESHOLD)   newLevel = 'Teenager';
      if (s.level === 'Teenager' && result.clicks >= LEGEND_THRESHOLD) newLevel = 'Legendary Adult';
      return { ...s, needs: result.needs, clicks: result.clicks, level: newLevel };
    });
  }

  function openGallery()  { goTo('gallery'); }
  function toggleAudio()  { audioOn = toggle(); }

  async function retireToGallery() {
    if (!confirm(`Retire ${petName} to the gallery?`)) return;
    await saveCreature({
      petName: state.petName, level: state.level,
      ingredients: { ...state.ingredients }, job: state.job,
      clicks: state.clicks, needs: { ...state.needs },
      cachedImages: { ...state.cachedImages },
      createdAt: state.createdAt || Date.now(), retiredAt: Date.now(),
    });
    await gameStore.reset();
    goTo('egg-lab');
  }

  // ── Lifecycle ─────────────────────────────────────────────
  onMount(() => {
    const missed = calcMissedNeedTicks(state?.lastNeedDecayTime);
    if (missed > 0) {
      gameStore.update(s => ({ ...s, needs: applyNeedDecay(s.needs, missed), lastNeedDecayTime: Date.now() }));
    }
    needTimer = setInterval(() => {
      const t = calcMissedNeedTicks(state.lastNeedDecayTime);
      if (t > 0) gameStore.update(s => ({ ...s, needs: applyNeedDecay(s.needs, t), lastNeedDecayTime: Date.now() }));
    }, 15_000);

    petX = state?.petX ?? null;
    buildRoomProps(state?.currentRoom || PLATFORM_ROOM_ID);
    initPetPosition();
    rafId = requestAnimationFrame(tick);

    const onKeyDown = e => {
      const k = e.key.toLowerCase();
      if (k === 'a' || e.key === 'ArrowLeft')  { keys.a = true; e.preventDefault(); }
      if (k === 'd' || e.key === 'ArrowRight') { keys.d = true; e.preventDefault(); }
      if (e.code === 'Space' && !enteringRoom) {
        if (nearDoor) { e.preventDefault(); enterDoor(nearDoor); }
        else if (nearElevator && !labElevatorScrolling) { e.preventDefault(); rideElevator(); }
      }
    };
    const onKeyUp = e => {
      const k = e.key.toLowerCase();
      if (k === 'a' || e.key === 'ArrowLeft')  keys.a = false;
      if (k === 'd' || e.key === 'ArrowRight') keys.d = false;
    };
    const onResize = () => {
      initPetPosition();
      buildRoomProps(state?.currentRoom || PLATFORM_ROOM_ID);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup',   onKeyUp);
    window.addEventListener('resize',    onResize);

    _cleanup = () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup',   onKeyUp);
      window.removeEventListener('resize',    onResize);
    };
  });

  onDestroy(() => {
    clearInterval(needTimer);
    cancelAnimationFrame(rafId);
    _cleanup?.();
    if (petX !== null) gameStore.update(s => ({ ...s, petX, petY }));
  });
</script>

<div class="pet-game screen" bind:this={petGameEl}>

  <!-- Top bar -->
  <header class="top-bar">
    <div class="header-left">
      <button class="btn-icon" onclick={openGallery} title="Gallery">🐾</button>
      <BackendStatus />
    </div>
    <div class="pet-info">
      <span class="pet-name">{petName}</span>
      <span class="pet-level">{level}{job ? ` · ${job.emoji} ${job.name}` : ''}</span>
    </div>
    <button class="btn-icon" onclick={toggleAudio} title="Toggle sound">
      {audioOn ? '🔊' : '🔇'}
    </button>
  </header>

  <!-- Needs bar -->
  <div class="needs-bar">
    {#each [['🍖', needs.hunger], ['🧼', needs.cleanliness], ['🎾', needs.fun], ['😴', needs.energy]] as [icon, val]}
      <div class="need">
        <span class="need-icon">{icon}</span>
        <div class="need-track">
          <div
            class="need-fill"
            style="width: {val}%; background: {needColor(val)};"
          ></div>
        </div>
        <span class="need-val" style="color: {needColor(val)}">{val}</span>
      </div>
    {/each}
  </div>

  <!-- Game world -->
  <div class="game-world" bind:this={gameWorldEl} onpointerdown={onWorldPointerDown} role="application" aria-label="Game world">
    <div class="scene-root" bind:this={sceneRootEl}>
      <div class={roomBgClass}></div>
      <div class="room-props" bind:this={roomPropsEl}></div>
      <div class="pet-parts" bind:this={petPartsEl}>
        <img class="pet-part-img" src={petImage} alt={petName} />
      </div>
    </div>
  </div>

  <!-- Action buttons (room-specific) -->
  {#if actions.length > 0}
    <div class="action-bar">
      {#each actions as action}
        <button class="btn-action" onclick={() => doAction(action)}>
          {action === 'feed'  ? '🍖 Feed'  :
           action === 'clean' ? '🧼 Clean' :
           action === 'play'  ? '🎾 Play'  :
           action === 'sleep' ? '😴 Sleep' :
           action === 'breed' ? '🥚 Breed' : action}
        </button>
      {/each}
    </div>
  {/if}

  <!-- Room navigation -->
  <nav class="room-nav">
    <div class="room-scroll">
      {#each ROOMS as room}
        <button
          class="room-btn"
          class:active={room.id === currentRoomId}
          onclick={() => doSwitchRoom(room.id)}
        >
          <span class="room-emoji">{room.emoji}</span>
          <span class="room-name">{room.name}</span>
        </button>
      {/each}
    </div>
  </nav>

  <!-- Bottom bar -->
  <footer class="bottom-bar">
    <span class="clicks-label">⭐ {clicks} clicks</span>
    <button class="btn-retire" onclick={retireToGallery}>Retire</button>
  </footer>

</div>

<style>
  .pet-game {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    background: #0c0e14;
    overflow: hidden;
  }

  /* ── Top bar ─────────────────────────────────────────────── */
  .header-left { display: flex; align-items: center; gap: 0.4rem; }

  .top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    background: #13162299;
    backdrop-filter: blur(4px);
    border-bottom: 1px solid #2a2f4a;
    flex-shrink: 0;
  }

  .btn-icon {
    background: none; border: none; font-size: 1.2rem; padding: 0.3rem;
    color: #c0ccee; cursor: pointer; transition: transform 0.15s;
  }
  .btn-icon:hover { transform: scale(1.15); }

  .pet-info   { display: flex; flex-direction: column; align-items: center; gap: 0.1rem; }
  .pet-name   { font-family: 'Press Start 2P', monospace; font-size: clamp(0.6rem, 2.5vw, 0.85rem); color: #00d2ff; }
  .pet-level  { font-size: 0.65rem; color: #8899cc; }

  /* ── Needs bar ───────────────────────────────────────────── */
  .needs-bar {
    display: flex; gap: 0.4rem; padding: 0.4rem 0.75rem;
    background: #0f1120; border-bottom: 1px solid #2a2f4a; flex-shrink: 0;
  }
  .need       { flex: 1; display: flex; align-items: center; gap: 0.25rem; min-width: 0; }
  .need-icon  { font-size: 0.75rem; flex-shrink: 0; }
  .need-track { flex: 1; height: 6px; background: #2a2f4a; border-radius: 3px; overflow: hidden; }
  .need-fill  { height: 100%; border-radius: 3px; transition: width 0.4s ease, background 0.4s ease; }
  .need-val   { font-size: 0.6rem; min-width: 20px; text-align: right; flex-shrink: 0; }

  /* ── Game world ──────────────────────────────────────────── */
  .game-world {
    flex: 1;
    position: relative;
    overflow: hidden;
    cursor: crosshair;
    perspective: 900px;
    perspective-origin: 50% 38%;
    min-height: 240px;
  }

  .scene-root {
    position: absolute;
    inset: 0;
    transform-style: preserve-3d;
  }

  /* room-bg backgrounds are handled by global platform.css */
  .room-bg {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
  }

  .room-props {
    position: absolute;
    inset: 0;
    z-index: 1;
  }

  /* Pet sprite — absolutely positioned by JS */
  .pet-parts {
    position: absolute;
    width: 180px;
    height: 180px;
    z-index: 10;
    cursor: default;
    user-select: none;
  }

  @media (max-width: 480px) {
    .pet-parts { width: 150px; height: 150px; }
  }

  .pet-part-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    image-rendering: auto;
    filter: drop-shadow(0 4px 20px rgba(0, 210, 255, 0.35));
    animation: pet-idle 3s ease-in-out infinite;
  }

  :global(.pet-parts.walking) .pet-part-img {
    animation: pet-walk 0.45s ease-in-out infinite;
  }

  @keyframes pet-idle {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-6px); }
  }

  @keyframes pet-walk {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-4px); }
  }

  /* ── Action bar ──────────────────────────────────────────── */
  .action-bar {
    display: flex; gap: 0.5rem; padding: 0.5rem 0.75rem; justify-content: center;
    background: #0f1120; border-top: 1px solid #2a2f4a; flex-shrink: 0;
  }
  .btn-action {
    background: linear-gradient(135deg, #1e2140, #2a2f50);
    border: 2px solid #3a3f60; border-radius: 10px;
    padding: 0.55rem 1rem; font-family: inherit; font-size: 0.8rem; color: #e0e6ff;
    transition: border-color 0.2s, transform 0.1s;
  }
  .btn-action:hover  { border-color: #00d2ff; }
  .btn-action:active { transform: scale(0.95); }

  /* ── Room nav ────────────────────────────────────────────── */
  .room-nav { background: #0c0e14; border-top: 1px solid #2a2f4a; flex-shrink: 0; overflow: hidden; }
  .room-scroll {
    display: flex; gap: 0.3rem; padding: 0.4rem 0.6rem;
    overflow-x: auto; scrollbar-width: none;
  }
  .room-scroll::-webkit-scrollbar { display: none; }
  .room-btn {
    display: flex; flex-direction: column; align-items: center; gap: 0.1rem;
    padding: 0.35rem 0.6rem; background: #161928;
    border: 2px solid #2a2f4a; border-radius: 8px;
    font-family: inherit; font-size: 0.6rem; color: #8899cc;
    white-space: nowrap; transition: border-color 0.2s, color 0.2s; flex-shrink: 0;
  }
  .room-btn.active             { border-color: #00d2ff; color: #00d2ff; }
  .room-btn:hover:not(.active) { border-color: #3a3f60; color: #c0ccee; }
  .room-emoji { font-size: 1rem; }
  .room-name  { font-size: 0.55rem; }

  /* ── Bottom bar ──────────────────────────────────────────── */
  .bottom-bar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.4rem 0.75rem;
    background: #0f1120; border-top: 1px solid #2a2f4a; flex-shrink: 0;
  }
  .clicks-label { font-size: 0.75rem; color: #ffd700; }
  .btn-retire {
    background: none; border: 2px solid #e9456044; border-radius: 8px;
    padding: 0.3rem 0.75rem; font-family: inherit; font-size: 0.7rem; color: #e94560;
    transition: border-color 0.2s;
  }
  .btn-retire:hover { border-color: #e94560; }
</style>
