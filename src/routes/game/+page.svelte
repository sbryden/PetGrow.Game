<script>
  import { onMount, onDestroy } from 'svelte';
  import '../../platform.css';
  import { goto } from '$app/navigation';
  import { gameStore } from '$lib/GameState.svelte.js';
  import { play, isEnabled, toggle } from '$lib/audio.js';
  import { doFeed, doClean, doPlay, doSleep, applyNeedDecay, calcMissedNeedTicks } from '$systems/needs.js';
  import { ROOMS, PLATFORM_ROOM_ID, NEED_WARN_THRESHOLD, NEED_CRITICAL_THRESHOLD, TEEN_THRESHOLD, LEGEND_THRESHOLD, TRANSPARENT_PIXEL } from '$systems/constants.js';
  import { saveCreature } from '$lib/db.js';
  import { buildPrompt } from '$systems/prompts.js';
  import { fetchCreatureImage, removeBackground } from '$lib/api.js';
  import BackendStatus from '$components/BackendStatus.svelte';

  // ── Platform constants ─────────────────────────────────────
  const PET_SIZE       = 180;
  const PET_SIZE_SMALL = 150;
  const DOOR_SLOTS     = [32, 68]; // % X positions of platform-room doors
  const DOOR_RADIUS    = 110;      // px proximity to open a door
  const PICKUP_RADIUS  = 90;       // px proximity to pickup a loose item
  const INTERACT_RADIUS = 110;     // px proximity to interact with a station

  // ── Food / pickup catalog ────────────────────────────────
  const FOOD_ITEMS = [
    { id: 'meat',   emoji: '🍖', name: 'Meat',   xPercent: 22 },
    { id: 'apple',  emoji: '🍎', name: 'Apple',  xPercent: 42 },
    { id: 'cake',   emoji: '🍰', name: 'Cake',   xPercent: 62 },
    { id: 'muffin', emoji: '🧁', name: 'Muffin', xPercent: 78 },
  ];

  // ── Mix recipes (key = sorted ids joined by '+') ─────────
  const MIX_RECIPES = {
    'apple+meat':   { emoji: '🥗', name: "Carnivore's Remorse", quip: "A carnivore's nightmare." },
    'cake+meat':    { emoji: '🎂', name: 'Meat Cake',          quip: 'No one asked for this.' },
    'meat+muffin':  { emoji: '💪', name: 'Protein Puff',       quip: 'Gains incoming.' },
    'apple+cake':   { emoji: '🥧', name: 'Apple Tart',         quip: 'Suspiciously fancy.' },
    'apple+muffin': { emoji: '🍇', name: 'Cram-Berry',         quip: 'Fruit overload.' },
    'cake+muffin':  { emoji: '🏔️', name: 'Mega Muffin',        quip: 'Too much of a good thing.' },
  };
  const INSPECT_TEXTS = {
    meat:   'Protein density: extreme. Smells… powerful.',
    apple:  'Suspiciously round. 99% apple, 1% mystery.',
    cake:   'Structural integrity: collapsing. Delicious.',
    muffin: 'Sprinkle-to-muffin ratio: chaotic.',
  };
  const INSPECT_DEFAULT = 'Unknown substance. Handle with extreme curiosity.';

  function recipeFor(a, b) {
    if (!a || !b) return null;
    if (a.id === b.id) {
      return { emoji: '💥', name: `Double ${a.name}`, quip: 'Twice the chaos.' };
    }
    const key = [a.id, b.id].sort().join('+');
    return MIX_RECIPES[key] || { emoji: '✨', name: 'Strange Brew', quip: 'Science cannot explain this.' };
  }

  // ── Derived UI values (replaces $: reactive statements) ───
  // petImage walks back through the evolution chain so that if a higher
  // level's sprite failed to generate (network/API error), the pet silently
  // shows its previous level's sprite instead of jumping straight to the
  // baby/raw image. The level itself stays promoted; only the visual falls
  // back. regenerateForLevel will retry on the next level-up event.
  let petImage     = $derived.by(() => {
    const cached = gameStore.data.cachedImages || {};
    const lvl    = gameStore.data.level || 'Baby';
    if (lvl === 'Legendary Adult') {
      return cached['Legendary Adult'] ?? cached['Teenager'] ?? cached['Baby'] ?? cached.raw ?? TRANSPARENT_PIXEL;
    }
    if (lvl === 'Teenager') {
      return cached['Teenager'] ?? cached['Baby'] ?? cached.raw ?? TRANSPARENT_PIXEL;
    }
    return cached['Baby'] ?? cached.raw ?? TRANSPARENT_PIXEL;
  });
  let currentRoomId = $derived(gameStore.data.currentRoom || PLATFORM_ROOM_ID);
  let currentRoom  = $derived(ROOMS.find(r => r.id === currentRoomId) || ROOMS[0]);
  let actions      = $derived(currentRoom?.actions || []);
  let needs        = $derived(gameStore.data.needs || { hunger: 100, cleanliness: 100, fun: 100, energy: 100 });
  let petName      = $derived(gameStore.data.petName || '');
  let level        = $derived(gameStore.data.level || 'Baby');
  let clicks       = $derived(gameStore.data.clicks || 0);
  let job          = $derived(gameStore.data.job);
  let labFloor     = $derived(gameStore.data.labFloor ?? 1);
  let roomBgClass  = $derived(`room-bg room-${currentRoomId}${currentRoomId === 'lab' && labFloor === 2 ? ' lab-floor-2' : ''}`);
  let heldItem     = $derived(gameStore.data.heldItem ?? null);
  let mixSlots     = $derived(gameStore.data.mixSlots ?? [null, null]);
  let journal      = $derived(gameStore.data.journal ?? []);

  // ── Local reactive state ───────────────────────────────────
  let audioOn       = $state(isEnabled());
  let sadMessage    = $state('');
  let inspectOpen   = $state(false);
  let inspectText   = $state('');
  let mixResultMsg  = $state(null); // { emoji, name, quip } | null
  let mixerReady    = $state(false); // both slots filled, awaiting button press
  let journalOpen   = $state(false);

  // ── DOM refs ──────────────────────────────────────────────
  let petGameEl;
  let gameWorldEl;
  let roomPropsEl;
  let petPartsEl;
  let sceneRootEl;

  // ── Platform state (non-reactive, managed by RAF loop) ────
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
  let pickupItems      = [];   // [{ el, xPercent, item }] — loose pickupable items in current room
  let nearPickup       = null; // nearest pickup ref or null
  let scienceProps     = [];   // [{ el, xPercent, type }] — interactable science stations
  let nearStation      = null; // nearest science station ref or null
  let mixResultTimer   = null;
  const ELEV_X_PERCENT = 88; // elevator right-side position in lab
  const keys           = { a: false, d: false };
  let isJumping        = false;
  let jumpVY           = 0;
  const JUMP_FORCE     = -520; // px/s (upward)
  const GRAVITY        = 1400; // px/s²
  let rafId;
  let lastTick       = 0;
  let needTimer;
  let _cleanup;
  let sadTimer;

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
    petPartsEl.classList.toggle('facing-left', petFacingLeft);
  }

  function initPetPosition() {
    if (!gameWorldEl) return;
    const sz   = getPetSize();
    const maxX = Math.max(0, gameWorldEl.clientWidth - sz);
    if (petX === null) petX = Math.max(0, Math.min(maxX, gameStore.data.petX ?? maxX / 2));
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
    doSwitchRoom(door.roomId);
  }

  function doSwitchRoom(roomId) {
    if (enteringRoom) return;
    enteringRoom = true;
    play('room');
    // Save return X when leaving platform
    if (gameStore.data.currentRoom === PLATFORM_ROOM_ID && roomId !== PLATFORM_ROOM_ID) {
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
    pickupItems   = [];
    scienceProps  = [];
    nearDoor      = null;
    nearPickup    = null;
    nearStation   = null;

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

      const currentFloor = gameStore.data.labFloor ?? 1;

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

      elev.addEventListener('pointerdown', e => {
        e.stopPropagation();
        if (!labElevatorScrolling) rideElevator();
      });

      roomPropsEl.appendChild(elev);
      labElevatorEl = elev;

    } else if (roomId === 'lab-science') {
      addFloor();
      addLights();
      buildScienceRoom();
      addDoor(5, 'lab', 'exit', null, null);
      addDroppedItems(roomId);

    } else if (['lab-mix','lab-breeding','lab-potions','lab-enhancement'].includes(roomId)) {
      addFloor();
      addLights();
      const LAB_SUB_ICONS = {
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
      addDroppedItems(roomId);

    } else if (roomId === 'feeding') {
      addFloor();
      addDoor(5, PLATFORM_ROOM_ID, 'exit', null, null);
      addFoodPickups();
      addDroppedItems(roomId);

    } else {
      // bathroom, playroom, bedroom, breeding
      addFloor();
      addDoor(5, PLATFORM_ROOM_ID, 'exit', null, null);
      addDroppedItems(roomId);
    }
  }

  // ── Pickup / dropped item DOM ─────────────────────────────
  function addFoodPickups() {
    const pickedIds = gameStore.data.feedingPickedIds || [];
    FOOD_ITEMS.forEach(item => {
      if (pickedIds.includes(item.id)) return;
      addPickupProp(item, item.xPercent);
    });
  }

  function addDroppedItems(roomId) {
    const drops = gameStore.data.droppedItems?.[roomId] || [];
    drops.forEach(d => addPickupProp(d, d.xPercent));
  }

  function addPickupProp(item, xPercent) {
    const el = document.createElement('div');
    el.className   = 'pickup-prop';
    el.style.left   = `${xPercent}%`;
    el.style.bottom = '23%';
    el.innerHTML = `
      <span class="pickup-emoji">${item.emoji}</span>
      <span class="pickup-label">${item.name}</span>
    `;
    el.addEventListener('pointerdown', e => {
      e.stopPropagation();
      doPickup({ item, xPercent });
    });
    roomPropsEl.appendChild(el);
    pickupItems.push({ el, xPercent, item });
  }

  // ── Science room props ────────────────────────────────────
  function buildScienceRoom() {
    // TV / monitor (top-left)
    const tv = document.createElement('div');
    tv.className = 'sci-tv';
    const screen = document.createElement('div');
    screen.className = 'sci-tv-screen';
    const bubbleHues = [140, 180, 90, 200, 50, 280, 320, 20];
    for (let i = 0; i < 12; i++) {
      const b = document.createElement('div');
      b.className = 'sci-bubble';
      b.style.left = `${5 + (i * 47) % 90}%`;
      const dur = 5 + (i % 5) * 1.2; // 5s..10.8s
      b.style.animationDuration = `${dur.toFixed(2)}s`;
      b.style.animationDelay = `${((i * 0.7) % dur).toFixed(2)}s`;
      const size = 5 + (i % 6) * 3; // 5..20px
      b.style.width = b.style.height = `${size}px`;
      const hue = bubbleHues[i % bubbleHues.length];
      b.style.background = `radial-gradient(circle at 30% 30%, hsla(${hue},100%,90%,0.95) 0%, hsla(${hue},80%,60%,0.5) 60%, hsla(${hue},80%,60%,0) 100%)`;
      b.style.boxShadow = `0 0 6px hsla(${hue},100%,75%,0.6)`;
      screen.appendChild(b);
    }
    tv.appendChild(screen);
    roomPropsEl.appendChild(tv);

    // Fan (top-right)
    const fan = document.createElement('div');
    fan.className = 'sci-fan';
    const blades = document.createElement('div');
    blades.className = 'sci-fan-blades';
    blades.innerHTML = '<span></span><span></span><span></span><span></span>';
    fan.appendChild(blades);
    const hub = document.createElement('div');
    hub.className = 'sci-fan-hub';
    fan.appendChild(hub);
    roomPropsEl.appendChild(fan);

    // Diagonal tubes from fan to mixer
    const tubes = document.createElement('div');
    tubes.className = 'sci-tubes';
    roomPropsEl.appendChild(tubes);

    // INSPECT table
    const inspect = makeStation('inspect', 28, '🔬', 'INSPECT');
    roomPropsEl.appendChild(inspect.el);
    scienceProps.push(inspect);

    // JOURNAL table
    const journal = makeStation('journal', 50, '📓', 'JOURNAL');
    roomPropsEl.appendChild(journal.el);
    scienceProps.push(journal);

    // ELEMENTAL MIX machine
    const mixer = document.createElement('div');
    mixer.className = 'sci-mixer';
    mixer.style.left = '78%';
    const slots = (gameStore.data.mixSlots || [null, null]);
    mixer.innerHTML = `
      <div class="sci-mixer-title">ELEMENTAL MIX</div>
      <div class="sci-mixer-window"></div>
      <div class="sci-mixer-slots">
        <div class="sci-slot ${slots[0] ? 'sci-slot--filled' : ''}">${slots[0]?.emoji || '?'}</div>
        <div class="sci-slot ${slots[1] ? 'sci-slot--filled' : ''}">${slots[1]?.emoji || '?'}</div>
      </div>
      <div class="sci-mixer-btn"></div>
      <div class="sci-mixer-base"></div>
    `;
    mixer.addEventListener('pointerdown', e => {
      e.stopPropagation();
      interactWithStation({ el: mixer, xPercent: 78, type: 'mixer' });
    });
    roomPropsEl.appendChild(mixer);
    scienceProps.push({ el: mixer, xPercent: 78, type: 'mixer' });
  }

  function makeStation(type, xPercent, icon, label) {
    const el = document.createElement('div');
    el.className = `sci-station sci-station--${type}`;
    el.style.left = `${xPercent}%`;
    el.innerHTML = `
      <div class="sci-station-icon">${icon}</div>
      <div class="sci-station-table"></div>
      <div class="sci-station-label">${label}</div>
    `;
    const ref = { el, xPercent, type };
    el.addEventListener('pointerdown', e => {
      e.stopPropagation();
      interactWithStation(ref);
    });
    return ref;
  }

  // ── Pickup / station proximity ────────────────────────────
  function checkPickups() {
    if (enteringRoom || petX === null || !gameWorldEl) return;
    if (!pickupItems.length) {
      if (nearPickup) { nearPickup.el.classList.remove('pickup-prop--near'); nearPickup = null; }
      return;
    }
    const sz = getPetSize();
    const petCx = petX + sz / 2;
    const worldW = Math.max(1, gameWorldEl.clientWidth);
    let found = null, bestDist = Infinity;
    pickupItems.forEach(p => {
      const px = (p.xPercent / 100) * worldW;
      const dist = Math.abs(petCx - px);
      if (dist < PICKUP_RADIUS && dist < bestDist) { bestDist = dist; found = p; }
    });
    if (found !== nearPickup) {
      if (nearPickup) nearPickup.el.classList.remove('pickup-prop--near');
      if (found) found.el.classList.add('pickup-prop--near');
      nearPickup = found;
    }
  }

  function checkStations() {
    if (enteringRoom || petX === null || !gameWorldEl) return;
    if (!scienceProps.length) {
      if (nearStation) { nearStation.el.classList.remove('sci-station--near'); nearStation = null; }
      return;
    }
    const sz = getPetSize();
    const petCx = petX + sz / 2;
    const worldW = Math.max(1, gameWorldEl.clientWidth);
    let found = null, bestDist = Infinity;
    scienceProps.forEach(s => {
      const sx = (s.xPercent / 100) * worldW;
      const dist = Math.abs(petCx - sx);
      if (dist < INTERACT_RADIUS && dist < bestDist) { bestDist = dist; found = s; }
    });
    if (found !== nearStation) {
      if (nearStation) nearStation.el.classList.remove('sci-station--near');
      if (found) found.el.classList.add('sci-station--near');
      nearStation = found;
    }
  }

  // ── Pickup / drop / station actions ───────────────────────
  function doPickup(p) {
    if (gameStore.data.heldItem) return; // only 1 at a time
    play('click');
    const item = { id: p.item.id, emoji: p.item.emoji, name: p.item.name };
    const room = gameStore.data.currentRoom;
    gameStore.update(s => {
      const next = { ...s, heldItem: item };
      // If picked from feeding room (no entry in droppedItems), mark as picked
      const drops = s.droppedItems?.[room] || [];
      const droppedIdx = drops.findIndex(d => d.id === p.item.id && Math.abs(d.xPercent - p.xPercent) < 0.01);
      if (droppedIdx >= 0) {
        const newDrops = drops.slice(0, droppedIdx).concat(drops.slice(droppedIdx + 1));
        next.droppedItems = { ...(s.droppedItems || {}), [room]: newDrops };
      } else if (room === 'feeding') {
        next.feedingPickedIds = [...(s.feedingPickedIds || []), p.item.id];
      }
      return next;
    });
    buildRoomProps(gameStore.data.currentRoom);
  }

  function doDrop() {
    if (!gameStore.data.heldItem || petX === null || !gameWorldEl) return;
    play('click');
    const room = gameStore.data.currentRoom;
    const sz = getPetSize();
    const worldW = Math.max(1, gameWorldEl.clientWidth);
    const xPercent = Math.max(4, Math.min(96, ((petX + sz / 2) / worldW) * 100));
    const item = gameStore.data.heldItem;

    gameStore.update(s => {
      const next = { ...s, heldItem: null };
      if (room === 'feeding') {
        // Restore item to feeding room (remove from picked list)
        next.feedingPickedIds = (s.feedingPickedIds || []).filter(id => id !== item.id);
      } else {
        const drops = s.droppedItems?.[room] || [];
        next.droppedItems = {
          ...(s.droppedItems || {}),
          [room]: [...drops, { ...item, xPercent }],
        };
      }
      return next;
    });
    buildRoomProps(gameStore.data.currentRoom);
  }

  function interactWithStation(station) {
    if (!station) return;
    if (station.type === 'inspect') {
      if (!gameStore.data.heldItem) {
        sadMessage = '🔬 Nothing to inspect!';
        clearTimeout(sadTimer);
        sadTimer = setTimeout(() => { sadMessage = ''; }, 1800);
        return;
      }
      openInspect();
    } else if (station.type === 'journal') {
      openJournal();
    } else if (station.type === 'mixer') {
      const slots = gameStore.data.mixSlots || [null, null];
      if (slots[0] && slots[1]) {
        // Both slots filled — press red button to mix
        triggerMix();
      } else if (gameStore.data.heldItem) {
        insertIntoMixer();
      } else {
        sadMessage = '🧪 Pick up an item first!';
        clearTimeout(sadTimer);
        sadTimer = setTimeout(() => { sadMessage = ''; }, 1800);
      }
    }
  }

  function insertIntoMixer() {
    const item = gameStore.data.heldItem;
    if (!item) return;
    const slots = [...(gameStore.data.mixSlots || [null, null])];
    const slotIdx = slots[0] === null ? 0 : slots[1] === null ? 1 : -1;
    if (slotIdx === -1) return;
    play('click');
    slots[slotIdx] = { id: item.id, emoji: item.emoji, name: item.name };
    gameStore.update(s => ({ ...s, heldItem: null, mixSlots: slots }));
    buildRoomProps('lab-science');
  }

  function triggerMix() {
    const slots = gameStore.data.mixSlots || [null, null];
    if (!slots[0] || !slots[1]) return;
    play('evolve');
    const result = recipeFor(slots[0], slots[1]);
    const entryKey = [slots[0].id, slots[1].id].sort().join('+');
    const ingredients = [
      { id: slots[0].id, emoji: slots[0].emoji, name: slots[0].name },
      { id: slots[1].id, emoji: slots[1].emoji, name: slots[1].name },
    ];
    // Find mixer DOM element to add animation class
    const mixerProp = scienceProps.find(s => s.type === 'mixer');
    if (mixerProp) mixerProp.el.classList.add('sci-mixer--mixing');

    clearTimeout(mixResultTimer);
    mixResultTimer = setTimeout(() => {
      mixResultMsg = result;
      const now = Date.now();
      // Clear slots, respawn foods, and log to journal
      gameStore.update(s => {
        const journal = Array.isArray(s.journal) ? [...s.journal] : [];
        const idx = journal.findIndex(e => e.key === entryKey);
        if (idx >= 0) {
          journal[idx] = { ...journal[idx], count: (journal[idx].count || 1) + 1, lastAt: now };
        } else {
          journal.push({
            key: entryKey,
            emoji: result.emoji,
            name: result.name,
            quip: result.quip,
            ingredients,
            count: 1,
            firstAt: now,
            lastAt: now,
          });
        }
        return {
          ...s,
          mixSlots: [null, null],
          // Respawn feeding-room foods only — wiping droppedItems entirely
          // would also delete pickups the player intentionally dropped in
          // other rooms (bedroom, lab, playroom, etc.).
          feedingPickedIds: [],
          journal,
        };
      });
      if (mixerProp) mixerProp.el.classList.remove('sci-mixer--mixing');
      buildRoomProps('lab-science');
      mixResultTimer = setTimeout(() => { mixResultMsg = null; }, 3500);
    }, 1400);
  }

  function openInspect() {
    const item = gameStore.data.heldItem;
    if (!item) return;
    play('click');
    inspectText = INSPECT_TEXTS[item.id] || INSPECT_DEFAULT;
    inspectOpen = true;
  }

  function closeInspect() {
    if (!inspectOpen) return;
    inspectOpen = false;
    inspectText = '';
    // Inspect closing restocks the feeding-room foods (per spec) but must
    // not delete user-placed drops in other rooms.
    gameStore.update(s => ({
      ...s,
      feedingPickedIds: [],
    }));
    buildRoomProps(gameStore.data.currentRoom);
  }

  function openJournal() {
    play('click');
    journalOpen = true;
  }

  function closeJournal() {
    if (!journalOpen) return;
    journalOpen = false;
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

    const currentFloor = gameStore.data.labFloor ?? 1;
    const goingUp      = currentFloor === 1;

    // 1. Close doors (300 ms)
    if (labElevatorEl) {
      labElevatorEl.classList.remove('lab-elevator--open');
    }

    setTimeout(() => {
      // 2. Hide pet — inside elevator
      if (petPartsEl) petPartsEl.style.opacity = '0';

      // 3. Scroll scene 100% vertically (800 ms linear)
      const scrollClass = goingUp ? 'lab-scroll-down' : 'lab-scroll-up';
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

      const floorY = getFloorY();
      if (isJumping) {
        jumpVY += GRAVITY * dt;
        petY   += jumpVY * dt;
        if (petY >= floorY) {
          petY      = floorY;
          isJumping = false;
          jumpVY    = 0;
        }
      } else {
        petY = floorY;
      }
      if (petPartsEl) petPartsEl.classList.toggle('jumping', isJumping);
      applyPetTransform();
      checkDoors();
      checkPickups();
      if (gameStore.data.currentRoom === 'lab') checkElevator();
      if (gameStore.data.currentRoom === 'lab-science') checkStations();
    }

    rafId = requestAnimationFrame(tick);
  }

  // ── Touch / tap to walk ───────────────────────────────────
  function onWorldPointerDown(e) {
    if (petX === null || enteringRoom) return;
    if (e.target.closest('.room-door')) return;
    if (e.target.closest('.pickup-prop')) return;
    if (e.target.closest('.sci-station')) return;
    if (e.target.closest('.sci-mixer')) return;
    if (e.target.closest('.lab-elevator')) return;
    const rect = gameWorldEl.getBoundingClientRect();
    walkTarget = e.clientX - rect.left;
  }

  // ── Actions ───────────────────────────────────────────────
  // Track in-flight evolution image regenerations so we don't fire duplicates.
  const evolvingLevels = new Set();

  // Generate (and cache) a sprite for `newLevel` using the current
  // ingredients/job. The new visual swaps in automatically because
  // `petImage` is derived from `cachedImages[level]`.
  async function regenerateForLevel(newLevel) {
    if (!newLevel || evolvingLevels.has(newLevel)) return;
    if (gameStore.data.cachedImages?.[newLevel]) return;
    evolvingLevels.add(newLevel);
    try {
      const { ingredients, job } = gameStore.data;
      const prompt = buildPrompt(ingredients, newLevel, job?.id ?? null);
      const raw = await fetchCreatureImage(prompt);
      const cleaned = await removeBackground(raw);
      gameStore.update(s => ({
        ...s,
        cachedImages: { ...s.cachedImages, [newLevel]: cleaned },
      }));
      await gameStore.saveNow();
    } catch (err) {
      console.error('Evolution image generation failed:', err);
    } finally {
      evolvingLevels.delete(newLevel);
    }
  }

  // Compute the final level given the current level and a fresh click count.
  // Walks the chain Baby -> Teenager -> Legendary Adult so a single action
  // that crosses *both* thresholds (e.g. when constants are tuned low or
  // multiple click gains stack) still ends in the correct terminal level
  // instead of stopping at Teenager because the original branch checked the
  // pre-update `s.level`.
  function levelForClicks(currentLevel, clicks) {
    let level = currentLevel;
    if (level === 'Baby'     && clicks >= TEEN_THRESHOLD)   level = 'Teenager';
    if (level === 'Teenager' && clicks >= LEGEND_THRESHOLD) level = 'Legendary Adult';
    return level;
  }

  function doAction(type) {
    play(type);
    let tooSad = false;
    let leveledUp = false;
    gameStore.update(s => {
      let result;
      if (type === 'feed')  result = doFeed(s.needs, s.clicks);
      if (type === 'clean') result = doClean(s.needs, s.clicks);
      if (type === 'play')  result = doPlay(s.needs, s.clicks);
      if (type === 'sleep') result = doSleep(s.needs, s.clicks);
      if (!result) return s;
      tooSad = result.tooSad;
      const newLevel = levelForClicks(s.level, result.clicks);
      if (newLevel !== s.level) leveledUp = true;
      return { ...s, needs: result.needs, clicks: result.clicks, level: newLevel };
    });
    if (tooSad) {
      sadMessage = '😢 Too sad to respond!';
      clearTimeout(sadTimer);
      sadTimer = setTimeout(() => { sadMessage = ''; }, 2000);
    }
    if (leveledUp) {
      play('evolve');
      sadMessage = `✨ Evolved to ${gameStore.data.level}!`;
      clearTimeout(sadTimer);
      sadTimer = setTimeout(() => { sadMessage = ''; }, 2500);
      regenerateForLevel(gameStore.data.level);
    }
  }

  // Feed the pet by consuming the currently held food item.
  // Awards a click (subject to mood), restores hunger, and triggers level-up.
  function doEat() {
    if (!gameStore.data.heldItem) return;
    play('feed');
    let tooSad = false;
    let leveledUp = false;
    gameStore.update(s => {
      const result = doFeed(s.needs, s.clicks);
      tooSad = result.tooSad;
      const newLevel = levelForClicks(s.level, result.clicks);
      if (newLevel !== s.level) leveledUp = true;
      return { ...s, heldItem: null, needs: result.needs, clicks: result.clicks, level: newLevel };
    });
    if (tooSad) {
      sadMessage = '😢 Too sad to respond!';
      clearTimeout(sadTimer);
      sadTimer = setTimeout(() => { sadMessage = ''; }, 2000);
    }
    if (leveledUp) {
      play('evolve');
      sadMessage = `✨ Evolved to ${gameStore.data.level}!`;
      clearTimeout(sadTimer);
      sadTimer = setTimeout(() => { sadMessage = ''; }, 2500);
      regenerateForLevel(gameStore.data.level);
    }
  }

  function openGallery()  { goto('/gallery'); }
  function toggleAudio()  { audioOn = toggle(); }

  async function hibernateToGallery() {
    await saveCreature({
      petName: gameStore.data.petName, level: gameStore.data.level,
      ingredients: { ...gameStore.data.ingredients }, job: gameStore.data.job,
      clicks: gameStore.data.clicks, needs: { ...gameStore.data.needs },
      cachedImages: { ...gameStore.data.cachedImages },
      createdAt: gameStore.data.createdAt || Date.now(), retiredAt: Date.now(),
    });
    await gameStore.reset();
    goto('/gallery');
  }

  // ── Lifecycle ─────────────────────────────────────────────
  onMount(() => {
    const missed = calcMissedNeedTicks(gameStore.data.lastNeedDecayTime);
    if (missed > 0) {
      gameStore.update(s => ({ ...s, needs: applyNeedDecay(s.needs, missed), lastNeedDecayTime: Date.now() }));
    }
    needTimer = setInterval(() => {
      const t = calcMissedNeedTicks(gameStore.data.lastNeedDecayTime);
      if (t > 0) gameStore.update(s => ({ ...s, needs: applyNeedDecay(s.needs, t), lastNeedDecayTime: Date.now() }));
    }, 15_000);

    petX = gameStore.data.petX ?? null;
    buildRoomProps(gameStore.data.currentRoom || PLATFORM_ROOM_ID);
    initPetPosition();
    rafId = requestAnimationFrame(tick);

    const onKeyDown = e => {
      const k = e.key.toLowerCase();
      if (inspectOpen) {
        if (e.code === 'Space' || k === 'escape' || k === 'q') { e.preventDefault(); closeInspect(); }
        return;
      }
      if (journalOpen) {
        if (e.code === 'Space' || k === 'escape' || k === 'q') { e.preventDefault(); closeJournal(); }
        return;
      }
      if (k === 'a' || e.key === 'ArrowLeft')  { keys.a = true; e.preventDefault(); }
      if (k === 'd' || e.key === 'ArrowRight') { keys.d = true; e.preventDefault(); }
      if (k === 'q' && !enteringRoom) {
        e.preventDefault();
        if (gameStore.data.heldItem) doDrop();
      }
      if (k === 'e' && !enteringRoom) {
        e.preventDefault();
        if (gameStore.data.heldItem) doEat();
      }
      if (e.code === 'Space' && !enteringRoom) {
        e.preventDefault();
        if (nearDoor) { enterDoor(nearDoor); }
        else if (nearElevator && !labElevatorScrolling) { rideElevator(); }
        else if (nearPickup) { doPickup(nearPickup); }
        else if (nearStation) { interactWithStation(nearStation); }
        else if (!isJumping) { isJumping = true; jumpVY = JUMP_FORCE; }
      }
    };
    const onKeyUp = e => {
      const k = e.key.toLowerCase();
      if (k === 'a' || e.key === 'ArrowLeft')  keys.a = false;
      if (k === 'd' || e.key === 'ArrowRight') keys.d = false;
    };
    const onResize = () => {
      initPetPosition();
      buildRoomProps(gameStore.data.currentRoom || PLATFORM_ROOM_ID);
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
    clearTimeout(mixResultTimer);
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
        {#if heldItem}
          <button
            type="button"
            class="held-item-bubble"
            title={`Tap to eat ${heldItem.name} (E)`}
            onpointerdown={(e) => { e.stopPropagation(); doEat(); }}
          ><span>{heldItem.emoji}</span></button>
        {/if}
      </div>
    </div>
    {#if sadMessage}
      <div class="sad-toast">{sadMessage}</div>
    {/if}
    {#if mixResultMsg}
      <div class="mix-result-toast">
        <span class="mix-result-emoji">{mixResultMsg.emoji}</span>
        <strong class="mix-result-name">{mixResultMsg.name}</strong>
        <em class="mix-result-quip">{mixResultMsg.quip}</em>
      </div>
    {/if}
    {#if inspectOpen}
      <div
        class="inspect-overlay"
        onpointerdown={closeInspect}
        role="button"
        tabindex="0"
        aria-label="Close inspect view"
      >
        <div class="inspect-modal">
          <div class="inspect-lens">
            <span class="inspect-lens-emoji">{heldItem?.emoji ?? '❓'}</span>
          </div>
          <div class="inspect-name">{heldItem?.name ?? 'Unknown'}</div>
          <p class="inspect-text">{inspectText}</p>
          <span class="inspect-close-hint">SPACE / tap to close</span>
        </div>
      </div>
    {/if}
    {#if journalOpen}
      <div
        class="inspect-overlay"
        onpointerdown={closeJournal}
        role="button"
        tabindex="0"
        aria-label="Close journal"
      >
        <div class="inspect-modal journal-modal" onpointerdown={e => e.stopPropagation()} role="presentation">
          <div class="inspect-name">📓 RECIPE JOURNAL</div>
          {#if journal.length === 0}
            <p class="inspect-text">No cooked foods yet.<br/>Mix two ingredients in the Elemental Mix machine to discover recipes.</p>
          {:else}
            <ul class="journal-list">
              {#each journal as entry (entry.key)}
                <li class="journal-entry">
                  <span class="journal-emoji">{entry.emoji}</span>
                  <div class="journal-text">
                    <strong class="journal-name">{entry.name}</strong>
                    <span class="journal-recipe">
                      {#each entry.ingredients as ing, i}
                        <span title={ing.name}>{ing.emoji}</span>{#if i < entry.ingredients.length - 1}<span class="journal-plus">+</span>{/if}
                      {/each}
                    </span>
                    <em class="journal-quip">{entry.quip}</em>
                  </div>
                  {#if entry.count > 1}
                    <span class="journal-count">×{entry.count}</span>
                  {/if}
                </li>
              {/each}
            </ul>
          {/if}
          <span class="inspect-close-hint">SPACE / tap to close</span>
        </div>
      </div>
    {/if}
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
    <button class="btn-hibernate" onclick={hibernateToGallery}>Hibernate</button>
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

  :global(.pet-parts.jumping) .pet-part-img {
    animation: none;
    transform: rotate(-8deg);
    filter: drop-shadow(0 8px 28px rgba(0, 210, 255, 0.55));
  }

  @keyframes pet-idle {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-6px); }
  }

  @keyframes pet-walk {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-4px); }
  }

  /* ── Sad toast ───────────────────────────────────────────── */
  .sad-toast {
    position: absolute;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(20, 10, 30, 0.88);
    color: #ff88aa;
    font-size: 0.75rem;
    padding: 0.35rem 0.85rem;
    border-radius: 999px;
    border: 1px solid #ff4488;
    pointer-events: none;
    z-index: 50;
    animation: sad-fade 2s ease forwards;
  }

  @keyframes sad-fade {
    0%   { opacity: 1; transform: translateX(-50%) translateY(0); }
    70%  { opacity: 1; }
    100% { opacity: 0; transform: translateX(-50%) translateY(-8px); }
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
  .btn-hibernate {
    background: none; border: 2px solid #e9456044; border-radius: 8px;
    padding: 0.3rem 0.75rem; font-family: inherit; font-size: 0.7rem; color: #e94560;
    transition: border-color 0.2s;
  }
  .btn-hibernate:hover { border-color: #e94560; }
</style>
