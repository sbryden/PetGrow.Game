// ============================================================
//  PetGrow — Egg Mixer Virtual Pet Game
//  By Steven (with help from GitHub Copilot!)
// ============================================================

// ---------- 🔑 GEMINI API (proxied through /api/generate) ----------
const GEMINI_MODEL = "gemini-2.5-flash-image";
const GEMINI_URL = "/api/generate";

// ---------- 🎮 GAME CONSTANTS ----------
const LEVEL_BABY = "Baby";
const LEVEL_TEEN = "Teenager";
const LEVEL_LEGEND = "Legendary Adult";

const TEEN_THRESHOLD = 20;
const LEGEND_THRESHOLD = 50;

const DECAY_INTERVAL_MS = 60 * 60 * 1000; // 1 hour in milliseconds
const SAVE_KEY = "petgrow_save";

// ---------- 💼 PET JOBS ----------
const PET_JOBS = [
  { id: "knight",      name: "Knight",       emoji: "⚔️",  desc: "Sworn to protect the realm",             promptMod: "wearing shining knight armor, a shield on its back, a noble crest, chivalrous warrior vibe" },
  { id: "chef",        name: "Chef",         emoji: "👨‍🍳", desc: "Master of the kitchen arts",              promptMod: "wearing a chef hat and apron, holding a spatula, surrounded by steam and delicious food" },
  { id: "wizard",      name: "Wizard",       emoji: "🧙",  desc: "Wielder of ancient magic",               promptMod: "wearing a wizard robe and pointed hat, glowing magic runes, holding a staff crackling with arcane energy" },
  { id: "mechanic",    name: "Mechanic",     emoji: "🔧",  desc: "Can fix anything with bolts and grease", promptMod: "wearing mechanic overalls covered in grease, holding a wrench, gears and cogs floating around, steampunk vibe" },
  { id: "musician",    name: "Musician",     emoji: "🎸",  desc: "Rocks the stage with epic tunes",        promptMod: "holding an electric guitar, wearing rockstar outfit, musical notes and sound waves floating around, stage lights" },
  { id: "explorer",    name: "Explorer",     emoji: "🧭",  desc: "Charting unknown lands",                 promptMod: "wearing an explorer hat and adventurer gear, binoculars around neck, a treasure map, jungle vines background" },
  { id: "scientist",   name: "Scientist",    emoji: "🔬",  desc: "Pushing the boundaries of knowledge",    promptMod: "wearing a lab coat and safety goggles, holding a bubbling test tube, surrounded by beakers and formulas" },
  { id: "artist",      name: "Artist",       emoji: "🎨",  desc: "Paints masterpieces with flair",         promptMod: "wearing a paint-splattered beret, holding a paintbrush and palette, colorful paint splatters everywhere" },
  { id: "gardener",    name: "Gardener",     emoji: "🌻",  desc: "Grows the most beautiful flowers",       promptMod: "wearing a straw hat, holding a watering can, flowers and vines growing all around, butterflies nearby" },
  { id: "healer",      name: "Healer",       emoji: "💚",  desc: "Mends wounds with gentle magic",         promptMod: "wearing a white healer robe with green glowing hands, surrounded by healing sparkles, gentle angelic aura" },
  { id: "blacksmith",  name: "Blacksmith",   emoji: "🔨",  desc: "Forges legendary weapons",               promptMod: "wearing a leather blacksmith apron, holding a glowing hammer near an anvil, sparks flying, molten metal" },
  { id: "pirate",      name: "Pirate",       emoji: "🏴‍☠️", desc: "Sails the seven seas for treasure",      promptMod: "wearing a pirate hat and eyepatch, a cutlass in hand, pirate ship wheel behind, ocean waves" },
  { id: "detective",   name: "Detective",    emoji: "🔍",  desc: "No mystery goes unsolved",               promptMod: "wearing a detective trench coat and deerstalker hat, holding a magnifying glass, clue board with strings" },
  { id: "athlete",     name: "Athlete",      emoji: "🏅",  desc: "Strongest and fastest of all",           promptMod: "wearing athletic gear and a gold medal, muscular pose, stadium lights, champion energy" },
  { id: "scholar",     name: "Scholar",      emoji: "📚",  desc: "Knows every secret of the world",        promptMod: "wearing reading glasses and a scholar robe, surrounded by floating ancient books, quill pen, glowing wisdom runes" },
  { id: "jester",      name: "Jester",       emoji: "🃏",  desc: "The funniest creature alive",            promptMod: "wearing a colorful jester hat with bells, juggling balls, confetti everywhere, silly grin, party vibe" },
  { id: "ranger",      name: "Ranger",       emoji: "🏹",  desc: "Guardian of the wild forests",           promptMod: "wearing a green ranger cloak, holding a bow and arrow, a wolf companion beside, forest canopy" },
  { id: "alchemist",   name: "Alchemist",    emoji: "⚗️",  desc: "Turns base metals into gold",            promptMod: "wearing an alchemist robe, surrounded by glowing potions and flasks, transmutation circles, mystical smoke" },
  { id: "ninja",       name: "Ninja",        emoji: "🥷",  desc: "Silent and deadly in the shadows",       promptMod: "wearing a dark ninja outfit and mask, holding shuriken, shadow clones behind, smoke bombs, stealthy" },
  { id: "astronaut",   name: "Astronaut",    emoji: "🚀",  desc: "Boldly exploring the cosmos",            promptMod: "wearing a space suit and helmet, floating in zero gravity, stars and planets behind, rocket ship nearby" },
];

const NO_JOB = {
  id: "none",
  name: "No Job",
  emoji: "🦥",
  desc: "Just vibing... no ambition whatsoever",
  promptMod: "looking lazy and slobby, messy unkempt fur/skin, crumbs and stains, slouching posture, bags under eyes, wearing a stained oversized t-shirt, couch potato energy, crusty and disheveled"
};

// ---------- 🏠 ROOMS ----------
const ROOMS = [
  { id: "feeding", name: "Feeding Room", emoji: "🍖", actions: ["feed"] },
  { id: "bathroom", name: "Bathroom", emoji: "🧼", actions: ["clean"] },
  { id: "playroom", name: "Playroom", emoji: "🎾", actions: ["play"] },
  { id: "bedroom", name: "Bedroom", emoji: "🛏️", actions: ["sleep"] },
  { id: "breeding", name: "Breeding Room", emoji: "🥚", actions: ["breed"] },
];

// ---------- ⭐ RARITY ----------
const RARITY_LEVELS = [
  { name: "Common",   cls: "common",   min: 1 },
  { name: "Uncommon", cls: "uncommon", min: 2 },
  { name: "Rare",     cls: "rare",     min: 3 },
  { name: "Epic",     cls: "epic",     min: 4 },
];
function calculateRarity(ingredients) {
  const count = Object.values(ingredients).filter(Boolean).length;
  for (let i = RARITY_LEVELS.length - 1; i >= 0; i--) {
    if (count >= RARITY_LEVELS[i].min) return RARITY_LEVELS[i];
  }
  return RARITY_LEVELS[0];
}

// ---------- 📊 NEEDS CONSTANTS ----------
const NEED_MAX = 100;
const NEED_DECAY_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const NEED_DECAY_AMOUNT = 8;
const NEED_ACTION_RESTORE = 25;
const NEED_WARN_THRESHOLD = 30;
const NEED_CRITICAL_THRESHOLD = 15;

// ---------- 🗂️ GAME STATE ----------
let gameState = {
  ingredients: {
    animal: null,
    color: null,
    wildcard: null,
    element: null,
  },
  petName: "",
  clicks: 0,
  level: LEVEL_BABY,
  cachedImages: {},
  lastDecayTime: Date.now(),
  createdAt: null,
  petX: null,
  petY: null,
  currentRoom: "feeding",
  needs: {
    hunger: NEED_MAX,
    cleanliness: NEED_MAX,
    fun: NEED_MAX,
    energy: NEED_MAX,
  },
  lastNeedDecayTime: Date.now(),
  job: null,              // chosen job id (string) or null
  parentJobs: [],         // job ids from parents (excluded from selection for bred pets)
  bgCleaned: {},          // tracks which cached images already had bg removed
};

// ---------- 📦 DOM ELEMENTS ----------
const $ = (id) => document.getElementById(id);

const eggLab = $("egg-lab");
const petGame = $("pet-game");
const egg = $("egg");
const hatchBtn = $("hatch-btn");
const hatchHint = $("hatch-hint");
const petNameInput = $("pet-name-input");
const hatchingOverlay = $("hatching-overlay");
const hatchingEgg = $("hatching-egg");
const hatchingText = $("hatching-text");

const gameWorld = $("game-world");
const roomBg = $("room-bg");
const petParts = $("pet-parts");
const petImgBase = $("pet-img-base");
const petImgs = {
  head: $("pet-img-head"),
  neck: $("pet-img-neck"),
  leftShoulder: $("pet-img-left-shoulder"),
  leftHand: $("pet-img-left-hand"),
  rightShoulder: $("pet-img-right-shoulder"),
  rightHand: $("pet-img-right-hand"),
  chest: $("pet-img-chest"),
  belly: $("pet-img-belly"),
  tail: $("pet-img-tail"),
  leftThigh: $("pet-img-left-thigh"),
  leftFoot: $("pet-img-left-foot"),
  rightThigh: $("pet-img-right-thigh"),
  rightFoot: $("pet-img-right-foot"),
};
const petEyelid = $("pet-eyelid");
const creatureImage = petImgBase; // backward compat — points to base for any legacy refs
const creatureName = $("creature-name");
const creatureDesc = $("creature-desc");
const levelBadge = $("level-badge");
const clickCount = $("click-count");
const levelText = $("level-text");
const nextLevel = $("next-level");
const progressBar = $("progress-bar");
const loadingSpinner = $("loading-spinner");

const btnStatus = $("btn-status");
const btnNewCreature = $("btn-new-creature");
const btnDiscard = $("btn-discard");
const btnGalleryLab = $("btn-gallery-lab");
const btnGalleryGame = $("btn-gallery-game");
const btnGalleryBack = $("btn-gallery-back");
const galleryScreen = $("gallery");
const galleryGrid = $("gallery-grid");
const galleryEmpty = $("gallery-empty");

const statusPopup = $("status-popup");
const popupClose = $("popup-close");

const evolveOverlay = $("evolve-overlay");
const evolveText = $("evolve-text");

// New cached DOM refs
const popupName = $("popup-name");
const popupLevel = $("popup-level");
const popupClicks = $("popup-clicks");
const popupIngredients = $("popup-ingredients");
const popupNext = $("popup-next");
const popupJob = $("popup-job");
const popupNeeds = $("popup-needs");
const popupAge = $("popup-age");
const popupRarity = $("popup-rarity");
const rarityBadge = $("rarity-badge");
const gallerySortSelect = $("gallery-sort");
const btnShare = $("btn-share");
const breedNameOverlay = $("breed-name-overlay");
const breedNameInput = $("breed-name-input");
const breedNameConfirm = $("breed-name-confirm");

// Room indicators
const roomIndicatorLeft = $("room-indicator-left");
const roomIndicatorRight = $("room-indicator-right");
const roomLabelLeft = $("room-label-left");
const roomLabelRight = $("room-label-right");

// ---------- 🥚 INGREDIENT SELECTION (Dropdown + Syringe) ----------
const syringeOverlay = $("syringe-overlay");
const syringeEl = $("syringe");
const syringeSerum = $("syringe-serum");
const plunger = document.querySelector(".syringe-plunger-handle");
const injectionSplash = $("injection-splash");

// Random serum colour palette
const SERUM_COLORS = [
  "#e94560", "#00d2ff", "#ffd700", "#00e676", "#b388ff",
  "#ff6f00", "#e040fb", "#76ff03", "#ff1744", "#00e5ff",
  "#ffab00", "#651fff", "#1de9b6", "#f50057", "#3d5afe",
];

function randomSerumColor() {
  return SERUM_COLORS[Math.floor(Math.random() * SERUM_COLORS.length)];
}

/** Play the syringe injection animation into the egg */
function playSyringeAnimation() {
  return new Promise((resolve) => {
    const color = randomSerumColor();
    syringeSerum.style.background = color;
    syringeSerum.style.width = "100%";
    syringeSerum.classList.remove("emptying");
    plunger.classList.remove("pushed");
    syringeEl.classList.remove("inject");
    injectionSplash.classList.remove("active");
    injectionSplash.style.background = color;
    injectionSplash.style.boxShadow = `0 0 12px ${color}`;

    // Show overlay
    syringeOverlay.classList.remove("hidden");
    syringeOverlay.classList.add("animating");
    PetAudio.play('inject');

    // Step 1: slide syringe in — needle penetrates the egg
    requestAnimationFrame(() => {
      syringeEl.classList.add("inject");
    });

    // Step 2: push plunger & empty serum after needle is inside egg
    setTimeout(() => {
      plunger.classList.add("pushed");
      syringeSerum.classList.add("emptying");

      // Show injection splash on egg surface
      injectionSplash.classList.add("active");

      // Wobble the egg (unharmed reaction) + color glow on shell
      egg.classList.add("serum-hit");
      const shell = egg.querySelector(".egg-shell");
      if (shell) {
        shell.style.boxShadow = `
          inset 0 -20px 40px rgba(0,0,0,0.15),
          inset 0 15px 30px rgba(255,255,255,0.35),
          0 15px 35px rgba(0,0,0,0.45),
          0 0 35px ${color},
          0 0 70px ${color}44`;
      }
    }, 600);

    // Step 3: slide syringe out
    setTimeout(() => {
      syringeEl.classList.remove("inject");
    }, 1500);

    // Step 4: clean up
    setTimeout(() => {
      egg.classList.remove("serum-hit");
      const shell = egg.querySelector(".egg-shell");
      if (shell) shell.style.boxShadow = "";
      injectionSplash.classList.remove("active");
      syringeOverlay.classList.add("hidden");
      syringeOverlay.classList.remove("animating");
      resolve();
    }, 2200);
  });
}

// Wire up dropdown selects
document.querySelectorAll(".ingredient-select").forEach((sel) => {
  const category = sel.dataset.category;

  sel.addEventListener("change", async () => {
    const val = sel.value;
    if (val) {
      gameState.ingredients[category] = val;
      sel.classList.add("has-value");

      // Play syringe injection
      await playSyringeAnimation();
    } else {
      gameState.ingredients[category] = null;
      sel.classList.remove("has-value");
    }

    updateEggState();
    updateHatchButton();
  });
});

// Name input listener
petNameInput.addEventListener("input", () => {
  gameState.petName = petNameInput.value.trim();
  updateHatchButton();
});

function updateEggState() {
  const picked = Object.values(gameState.ingredients).filter((v) => v !== null).length;
  if (picked > 0) {
    egg.classList.add("has-ingredients");
  } else {
    egg.classList.remove("has-ingredients");
  }
}

function updateHatchButton() {
  const hasAnimal = gameState.ingredients.animal !== null;
  const hasName = gameState.petName.length > 0;

  hatchBtn.disabled = !(hasAnimal && hasName);

  if (hasAnimal && hasName) {
    hatchHint.textContent = "Ready to hatch! 🎉";
    hatchHint.style.color = "#00e676";
  } else if (hasAnimal) {
    hatchHint.textContent = "Now give your creature a name!";
    hatchHint.style.color = "#ffd700";
  } else {
    hatchHint.textContent = "Pick at least a Base Animal and give it a name!";
    hatchHint.style.color = "";
  }
}

// ---------- 🔥 HEAT LAMP MINI-GAME ----------
const heatLampGame = $("heat-lamp-game");
const heatLampEl = $("heat-lamp");
const lampBeam = $("lamp-beam");
const lampEgg = $("lamp-egg");
const gaugeNeedle = $("gauge-needle");
const lampTimerFill = $("lamp-timer-fill");
const lampStatus = $("lamp-status");

const LAMP_DURATION = 8000;        // 8 seconds total
const LAMP_TICK = 50;              // update every 50ms
const TEMP_HEAT_RATE = 1.8;        // how fast temp rises per tick when lamp ON
const TEMP_COOL_RATE = 1.0;        // how fast temp drops per tick when lamp OFF
const TEMP_MIN = 0;
const TEMP_MAX = 100;
const GREEN_LOW = 25;              // green zone: 25-75 (easy & generous)
const GREEN_HIGH = 75;

let lampOn = false;
let lampTemp = 0;                  // 0-100
let lampElapsed = 0;
let lampGreenTime = 0;
let lampTotalTime = 0;
let lampInterval = null;
let lampResolve = null;
let lampKeyHandler = null;

function startHeatLampGame() {
  return new Promise((resolve) => {
    lampResolve = resolve;
    lampOn = false;
    lampTemp = 30;   // start slightly warm so it's easy
    lampElapsed = 0;
    lampGreenTime = 0;
    lampTotalTime = 0;

    // Show the game panel, hide pickers & hatch button
    heatLampGame.classList.remove("hidden");
    hatchBtn.style.display = "none";
    hatchHint.style.display = "none";
    document.querySelector(".pickers").style.display = "none";
    document.querySelector(".name-section").style.display = "none";
    syringeOverlay.classList.add("hidden");

    updateGaugeNeedle();
    updateLampVisuals();
    lampTimerFill.style.width = "0%";
    lampStatus.textContent = "Lamp is OFF — press SPACE";
    lampStatus.className = "lamp-status off";

    // Keyboard handler
    lampKeyHandler = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        lampOn = !lampOn;
        updateLampVisuals();
      }
    };
    document.addEventListener("keydown", lampKeyHandler);

    // Also support tapping the lamp scene for mobile
    const lampScene = document.querySelector(".lamp-scene");
    const tapHandler = () => {
      lampOn = !lampOn;
      updateLampVisuals();
    };
    lampScene.addEventListener("click", tapHandler);

    // Game loop
    lampInterval = setInterval(() => {
      lampElapsed += LAMP_TICK;
      lampTotalTime += LAMP_TICK;

      // Update temperature
      if (lampOn) {
        lampTemp = Math.min(TEMP_MAX, lampTemp + TEMP_HEAT_RATE);
      } else {
        lampTemp = Math.max(TEMP_MIN, lampTemp - TEMP_COOL_RATE);
      }

      // Track time in green zone
      if (lampTemp >= GREEN_LOW && lampTemp <= GREEN_HIGH) {
        lampGreenTime += LAMP_TICK;
      }

      // Update visuals
      updateGaugeNeedle();
      lampTimerFill.style.width = `${(lampElapsed / LAMP_DURATION) * 100}%`;

      // Update status text
      if (lampOn) {
        lampStatus.textContent = "🔥 Lamp is ON — heating up!";
        lampStatus.className = "lamp-status on";
      } else {
        lampStatus.textContent = "Lamp is OFF — press SPACE";
        lampStatus.className = "lamp-status off";
      }

      // Time's up?
      if (lampElapsed >= LAMP_DURATION) {
        endHeatLampGame();
      }
    }, LAMP_TICK);
  });
}

function updateGaugeNeedle() {
  // Map temp (0-100) to gauge position (0%-100%)
  const pct = (lampTemp / TEMP_MAX) * 100;
  gaugeNeedle.style.left = `${pct}%`;
}

function updateLampVisuals() {
  if (lampOn) {
    heatLampEl.classList.remove("lamp-off");
    heatLampEl.classList.add("lamp-on");
    lampBeam.classList.remove("hidden");
    lampEgg.classList.add("warming");
  } else {
    heatLampEl.classList.remove("lamp-on");
    heatLampEl.classList.add("lamp-off");
    lampBeam.classList.add("hidden");
    lampEgg.classList.remove("warming");
  }
}

function endHeatLampGame() {
  clearInterval(lampInterval);
  lampInterval = null;
  document.removeEventListener("keydown", lampKeyHandler);

  const greenPct = lampTotalTime > 0 ? (lampGreenTime / lampTotalTime) * 100 : 0;

  // Brief result flash
  if (greenPct >= 50) {
    lampStatus.textContent = `☀️ Great warming! (${Math.round(greenPct)}% in green)`;
    lampStatus.className = "lamp-status on";
  } else {
    lampStatus.textContent = `❄️ Could be warmer... (${Math.round(greenPct)}% in green)`;
    lampStatus.className = "lamp-status off";
  }

  setTimeout(() => {
    // Hide game, restore UI for hatching
    heatLampGame.classList.add("hidden");
    if (lampResolve) lampResolve(greenPct);
  }, 1500);
}

// ---------- 🥚 HATCHING ----------
hatchBtn.addEventListener("click", async () => {
  // PHASE 0: Heat lamp mini-game
  const greenPct = await startHeatLampGame();

  // Restore hidden elements for hatching overlay
  hatchBtn.style.display = "";
  hatchHint.style.display = "";
  document.querySelector(".pickers").style.display = "";
  document.querySelector(".name-section").style.display = "";

  // Show hatching animation
  hatchingOverlay.classList.remove("hidden");
  hatchingOverlay.style.display = "flex";

  // Initialize game state early so image generation can use it
  gameState.clicks = 0;
  gameState.level = LEVEL_BABY;
  gameState.cachedImages = {};
  gameState.lastDecayTime = Date.now();
  gameState.createdAt = Date.now();
  gameState.petX = null;
  gameState.petY = null;
  gameState.currentRoom = "feeding";
  gameState.needs = { hunger: NEED_MAX, cleanliness: NEED_MAX, fun: NEED_MAX, energy: NEED_MAX };
  gameState.lastNeedDecayTime = Date.now();
  gameState.job = null;
  gameState.parentJobs = [];

  // Start generating the image in the background (runs in parallel with egg animation)
  suppressSpinner = true;
  const imagePromise = generateCreatureImage(LEVEL_BABY);

  // Phase 1: Egg shaking
  hatchingText.textContent = "Your egg is wobbling...";
  await sleep(1500);

  // Phase 2: Cracks appearing
  hatchingEgg.textContent = "🪺";
  hatchingText.textContent = "Cracks are forming!";
  await sleep(1200);

  // Phase 3: Hatching!
  hatchingEgg.textContent = "💥";
  hatchingText.textContent = "IT'S HATCHING!";
  PetAudio.play('hatch');
  await sleep(800);

  // Wait for image — if API is slow, the hatching text stays visible
  hatchingEgg.textContent = "✨";
  try {
    await imagePromise;
  } catch (err) {
    console.error("Image generation failed:", err);
    hatchingText.textContent = "Egg Failed to Hatch 😢";
    await sleep(2000);
    hatchingOverlay.style.display = "none";
    hatchingOverlay.classList.add("hidden");
    hatchingEgg.textContent = "🥚";
    suppressSpinner = false;
    return;
  }

  suppressSpinner = false;

  // Switch screens
  hatchingOverlay.style.display = "none";
  hatchingOverlay.classList.add("hidden");
  hatchingEgg.textContent = "🥚";
  showScreen("pet-game");

  // Position pet in viewport
  positionPet();
  switchRoom(gameState.currentRoom);

  // Update all displays
  updateGameDisplay();
  saveGame();
  startDecayTimer();
  startIdleFidgets();
  startNeedDecayTimer();
});

// ---------- 🎨 PROMPT BUILDER ----------
/** Strip characters that could confuse the AI prompt */
function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9 \-_'.!]/g, '').slice(0, 30);
}

function buildPrompt(level) {
  const { animal, color, wildcard, element } = gameState.ingredients;

  // Build the creature description
  let desc = "";

  // Level-specific adjectives
  let sizeWord, vibe;
  if (level === LEVEL_BABY) {
    sizeWord = "tiny, small, baby";
    vibe = "cute, chibi, adorable, round, big sparkly eyes, wobbly";
  } else if (level === LEVEL_TEEN) {
    sizeWord = "medium-sized, teenage, growing";
    vibe = "confident, cool, energetic, slightly tougher, showing personality";
  } else {
    sizeWord = "massive, majestic, legendary, fully-evolved";
    vibe = "epic, powerful, wearing a crown or armor, boss-level";

    // Inject job visual modifiers
    if (gameState.job) {
      const jobData = gameState.job === NO_JOB.id
        ? NO_JOB
        : PET_JOBS.find(j => j.id === gameState.job);
      if (jobData) {
        vibe += ", " + jobData.promptMod;
      }
    }
  }

  desc = `A ${sizeWord} ${animal}`;
  if (color) desc += ` with ${color} coloring`;
  if (wildcard) desc += `, featuring a ${wildcard} as part of its body or as an accessory`;
  if (element) desc += `, with a ${element} texture`;

  const prompt = `Draw a single cute Tamagotchi-style virtual pet creature. The creature is: ${desc}. Style: ${vibe}. The art style should be colorful digital illustration, like a modern Tamagotchi or virtual pet game sprite. Place the creature on a plain solid bright magenta (#FF00FF) background with absolutely no gradients, patterns, or scenery — just a flat uniform magenta fill behind the sprite. The creature should be centered and facing the viewer. No text in the image.`;

  return prompt;
}

function buildDescription() {
  const { animal, color, wildcard, element } = gameState.ingredients;
  let parts = [];
  if (color) parts.push(color.toLowerCase());
  parts.push(animal.toLowerCase());
  if (wildcard) parts.push(`with a ${wildcard.toLowerCase()}`);
  if (element) parts.push(`made of ${element.toLowerCase()}`);
  return `A ${parts.join(" ")}`;
}

// Flag to suppress the loading spinner when hatching/evolution overlay is visible
let suppressSpinner = false;

// ---------- 🤖 GEMINI API ----------
async function generateCreatureImage(level) {
  // Check if we already have this level cached
  if (gameState.cachedImages[level]) {
    setPetImageSrc(gameState.cachedImages[level]);
    creatureDesc.textContent = buildDescription();
    // Re-process old cached images that may still have a background
    const clean = await removeImageBackground(gameState.cachedImages[level]);
    setPetImageSrc(clean);
    gameState.cachedImages[level] = clean;
    return;
  }

  // Show loading spinner only if not behind an overlay
  if (!suppressSpinner) {
    loadingSpinner.classList.remove("hidden");
    loadingSpinner.style.display = "flex";
  }

  const prompt = buildPrompt(level);
  console.log("Gemini prompt:", prompt);

  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: {
            aspectRatio: "1:1"
          },
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API error ${response.status}: ${errText}`);
    }

    const data = await response.json();

    // Find the image part in the response
    let imageBase64 = null;
    let mimeType = "image/png";

    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      for (const part of data.candidates[0].content.parts) {
        if (part.inlineData) {
          imageBase64 = part.inlineData.data;
          mimeType = part.inlineData.mimeType || "image/png";
          break;
        }
      }
    }

    if (!imageBase64) {
      throw new Error("No image data in response");
    }

    // Remove background, then resize before caching
    const dataUrl = `data:${mimeType};base64,${imageBase64}`;
    const noBg = await removeImageBackground(dataUrl);
    const compressed = await compressImage(noBg, 512, 512);

    // Display and cache
    setPetImageSrc(compressed);
    creatureDesc.textContent = buildDescription();
    gameState.cachedImages[level] = compressed;
    saveGame();

  } catch (err) {
    console.error("Gemini API error:", err);
    // Show a fallback emoji display
    setPetImageSrc("");
    creatureDesc.textContent = buildDescription() + " (Image couldn't load — check your API key!)";
  } finally {
    if (!suppressSpinner) {
      loadingSpinner.classList.add("hidden");
      loadingSpinner.style.display = "none";
    }
  }
}

// ---------- 🖼️ IMAGE UTILITIES ----------

/**
 * Remove the background from an image using corner-seeded flood fill.
 * Returns a PNG data-URL with a transparent background.
 */
function removeImageBackground(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = $("compress-canvas");
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;

      // --- Tolerance-based colour match ---
      const TOLERANCE = 45;
      function colorsMatch(r1, g1, b1, r2, g2, b2) {
        return (
          Math.abs(r1 - r2) <= TOLERANCE &&
          Math.abs(g1 - g2) <= TOLERANCE &&
          Math.abs(b1 - b2) <= TOLERANCE
        );
      }

      // Sample background colour from four corners (average)
      const corners = [
        0,                          // top-left
        (w - 1) * 4,               // top-right
        (h - 1) * w * 4,           // bottom-left
        ((h - 1) * w + (w - 1)) * 4 // bottom-right
      ];

      let bgR = 0, bgG = 0, bgB = 0, count = 0;
      for (const idx of corners) {
        // Only count corners that are opaque (likely background, not already transparent)
        if (data[idx + 3] > 200) {
          bgR += data[idx];
          bgG += data[idx + 1];
          bgB += data[idx + 2];
          count++;
        }
      }

      if (count === 0) {
        // Corners are already transparent — nothing to do
        resolve(canvas.toDataURL("image/png"));
        return;
      }

      bgR = Math.round(bgR / count);
      bgG = Math.round(bgG / count);
      bgB = Math.round(bgB / count);

      // --- Flood fill from every edge pixel that matches bgColor ---
      const visited = new Uint8Array(w * h);
      const queue = [];

      // Seed every edge pixel that matches the background colour
      function tryEnqueue(x, y) {
        const i = y * w + x;
        if (visited[i]) return;
        const idx4 = i * 4;
        if (data[idx4 + 3] < 10) {
          // Already transparent
          visited[i] = 1;
          return;
        }
        if (colorsMatch(data[idx4], data[idx4 + 1], data[idx4 + 2], bgR, bgG, bgB)) {
          visited[i] = 1;
          queue.push(i);
        }
      }

      for (let x = 0; x < w; x++) { tryEnqueue(x, 0); tryEnqueue(x, h - 1); }
      for (let y = 0; y < h; y++) { tryEnqueue(0, y); tryEnqueue(w - 1, y); }

      // --- Helper: BFS flood fill from current queue contents ---
      function floodFill() {
        while (queue.length > 0) {
          const i = queue.pop();
          const x = i % w;
          const y = (i - x) / w;
          const idx4 = i * 4;
          data[idx4 + 3] = 0; // make pixel transparent

          if (x > 0)     { const ni = i - 1; if (!visited[ni]) { const n4 = ni * 4; if (data[n4 + 3] > 10 && colorsMatch(data[n4], data[n4+1], data[n4+2], bgR, bgG, bgB)) { visited[ni] = 1; queue.push(ni); } } }
          if (x < w - 1) { const ni = i + 1; if (!visited[ni]) { const n4 = ni * 4; if (data[n4 + 3] > 10 && colorsMatch(data[n4], data[n4+1], data[n4+2], bgR, bgG, bgB)) { visited[ni] = 1; queue.push(ni); } } }
          if (y > 0)     { const ni = i - w; if (!visited[ni]) { const n4 = ni * 4; if (data[n4 + 3] > 10 && colorsMatch(data[n4], data[n4+1], data[n4+2], bgR, bgG, bgB)) { visited[ni] = 1; queue.push(ni); } } }
          if (y < h - 1) { const ni = i + w; if (!visited[ni]) { const n4 = ni * 4; if (data[n4 + 3] > 10 && colorsMatch(data[n4], data[n4+1], data[n4+2], bgR, bgG, bgB)) { visited[ni] = 1; queue.push(ni); } } }
        }
      }

      // --- Pass 1: edge-seeded flood fill ---
      floodFill();

      // --- Passes 2+: find interior bg-colored pixels next to transparent
      //     pixels and flood-fill from them (catches gaps between limbs) ---
      const MAX_INTERIOR_PASSES = 4;
      for (let pass = 0; pass < MAX_INTERIOR_PASSES; pass++) {
        let found = 0;
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const i = y * w + x;
            if (visited[i]) continue;
            const idx4 = i * 4;
            if (data[idx4 + 3] < 10) continue; // already transparent
            if (!colorsMatch(data[idx4], data[idx4 + 1], data[idx4 + 2], bgR, bgG, bgB)) continue;

            // Check if any neighbour is already transparent
            const hasTransparentNeighbour =
              data[(i - 1) * 4 + 3] === 0 ||
              data[(i + 1) * 4 + 3] === 0 ||
              data[(i - w) * 4 + 3] === 0 ||
              data[(i + w) * 4 + 3] === 0;

            if (hasTransparentNeighbour) {
              visited[i] = 1;
              queue.push(i);
              found++;
            }
          }
        }
        if (found === 0) break; // no new seeds — done
        floodFill();
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Resize an image and return a PNG data-URL (preserves transparency).
 */
function compressImage(dataUrl, maxW, maxH) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = $("compress-canvas");
      canvas.width = maxW;
      canvas.height = maxH;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, maxW, maxH);
      ctx.drawImage(img, 0, 0, maxW, maxH);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// ---------- � PET POSITIONING ----------
const PET_SIZE = 180; // matches CSS .pet-parts width/height
const PET_SIZE_SMALL = 150; // matches CSS responsive .pet-parts

function getPetSize() {
  return window.innerWidth <= 480 ? PET_SIZE_SMALL : PET_SIZE;
}

function positionPet() {
  if (!gameWorld) return;

  const size = getPetSize();

  // Always center pet in the room viewport
  gameState.petX = (gameWorld.clientWidth - size) / 2;
  gameState.petY = (gameWorld.clientHeight - size) / 2;

  petParts.style.left = `${gameState.petX}px`;
  petParts.style.top = `${gameState.petY}px`;
}

// Re-center pet on window resize
window.addEventListener("resize", () => {
  if (gameWorld && gameState.createdAt) {
    positionPet();
  }
});

// ---------- �🖥️ SCREEN MANAGEMENT ----------
function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((s) => {
    s.classList.remove("active");
    s.classList.add("hidden");
    s.style.display = "none";
  });

  const screen = $(screenId);
  screen.classList.add("active");
  screen.classList.remove("hidden");
  screen.style.display = "flex";
}

// ---------- 📊 GAME DISPLAY ----------
function updateGameDisplay() {
  // Update name
  creatureName.textContent = gameState.petName;

  // Update click count
  clickCount.textContent = gameState.clicks;

  // Determine level
  const prevLevel = gameState.level;
  if (gameState.clicks >= LEGEND_THRESHOLD) {
    gameState.level = LEVEL_LEGEND;
  } else if (gameState.clicks >= TEEN_THRESHOLD) {
    gameState.level = LEVEL_TEEN;
  } else {
    gameState.level = LEVEL_BABY;
  }

  // Update level display
  levelText.textContent = gameState.level;

  // Update pet idle animation class
  petParts.classList.remove("pet-baby", "pet-teen", "pet-legend");
  if (gameState.level === LEVEL_BABY) {
    petParts.classList.add("pet-baby");
  } else if (gameState.level === LEVEL_TEEN) {
    petParts.classList.add("pet-teen");
  } else {
    petParts.classList.add("pet-legend");
  }

  // Update level badge
  levelBadge.className = "level-badge";
  if (gameState.level === LEVEL_BABY) {
    levelBadge.textContent = "🍼 Baby";
    progressBar.className = "progress-bar";
  } else if (gameState.level === LEVEL_TEEN) {
    levelBadge.textContent = "💥 Teenager";
    levelBadge.classList.add("teenager");
    progressBar.className = "progress-bar teenager";
  } else {
    levelBadge.textContent = "👑 Legendary";
    levelBadge.classList.add("legendary");
    progressBar.className = "progress-bar legendary";
  }

  // Update "next level" text
  if (gameState.level === LEVEL_BABY) {
    const remaining = TEEN_THRESHOLD - gameState.clicks;
    nextLevel.textContent = `${remaining} to Teen`;
  } else if (gameState.level === LEVEL_TEEN) {
    const remaining = LEGEND_THRESHOLD - gameState.clicks;
    nextLevel.textContent = `${remaining} to Legend`;
  } else {
    nextLevel.textContent = "MAX! 🏆";
  }

  // Update progress bar
  let progress;
  if (gameState.clicks >= LEGEND_THRESHOLD) {
    progress = 100;
  } else if (gameState.clicks >= TEEN_THRESHOLD) {
    progress = ((gameState.clicks - TEEN_THRESHOLD) / (LEGEND_THRESHOLD - TEEN_THRESHOLD)) * 100;
  } else {
    progress = (gameState.clicks / TEEN_THRESHOLD) * 100;
  }
  progressBar.style.width = `${Math.min(progress, 100)}%`;

  // Update needs HUD
  updateNeedsHUD();

  // Update pet mood visual state based on needs
  petParts.classList.remove("pet-sad", "pet-critical");
  const avgNeed = Object.values(gameState.needs).reduce((a, b) => a + b, 0) / 4;
  const minNeed = Math.min(...Object.values(gameState.needs));
  if (minNeed === 0) {
    petParts.classList.add("pet-critical");
  } else if (minNeed <= NEED_WARN_THRESHOLD) {
    petParts.classList.add("pet-sad");
  }

  // Update rarity badge
  const rarity = calculateRarity(gameState.ingredients);
  if (rarityBadge) {
    rarityBadge.textContent = `⭐ ${rarity.name}`;
    rarityBadge.className = `rarity-badge ${rarity.cls}`;
  }

  // Check if level changed (evolution!)
  if (prevLevel !== gameState.level && prevLevel !== null) {
    triggerEvolution(gameState.level);
  }
}

// ---------- ⚡ EVOLUTION ----------
async function triggerEvolution(newLevel) {
  // If evolving to Legendary, show job picker FIRST
  if (newLevel === LEVEL_LEGEND && !gameState.job) {
    const chosenJob = await showJobPicker();
    gameState.job = chosenJob;
    saveGame();
  }

  // Show the evolution overlay
  evolveOverlay.classList.remove("hidden");
  evolveOverlay.style.display = "flex";
  PetAudio.play('evolve');

  if (newLevel === LEVEL_TEEN) {
    evolveText.textContent = "Evolving into a Teenager!";
  } else if (newLevel === LEVEL_LEGEND) {
    evolveText.textContent = "LEGENDARY EVOLUTION!";
  } else {
    evolveText.textContent = "Your creature is changing...";
  }

  // Start generating the image in the background (runs in parallel with animation)
  suppressSpinner = true;
  const imagePromise = generateCreatureImage(newLevel);

  await sleep(2000);

  // Wait for image — if API is slow, the evolution text stays visible
  try {
    await imagePromise;
  } catch (err) {
    console.error("Evolution image failed:", err);
    evolveText.textContent = "Evolution Failed...";
    await sleep(2000);
  }

  suppressSpinner = false;

  // Hide overlay
  evolveOverlay.style.display = "none";
  evolveOverlay.classList.add("hidden");

  // Refresh room props so items upgrade to match new level
  switchRoom(gameState.currentRoom);

  saveGame();
}

// ---------- 💼 JOB PICKER ----------
function showJobPicker() {
  return new Promise((resolve) => {
    const overlay = $("job-picker-overlay");
    const grid = $("job-picker-grid");
    grid.innerHTML = "";

    // Filter out parent jobs (from breeding)
    const available = PET_JOBS.filter(j => !gameState.parentJobs.includes(j.id));

    // Pick 3 random jobs from the available pool
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const picks = shuffled.slice(0, 3);

    // Render the 3 job cards
    picks.forEach((job) => {
      const card = document.createElement("div");
      card.className = "job-card";
      card.innerHTML = `
        <div class="job-card-emoji">${job.emoji}</div>
        <div class="job-card-name">${job.name}</div>
        <div class="job-card-desc">${job.desc}</div>
      `;
      card.addEventListener("click", () => {
        overlay.style.display = "none";
        overlay.classList.add("hidden");
        resolve(job.id);
      });
      grid.appendChild(card);
    });

    // Add the "No Job" slouch option below
    const noJobBtn = $("job-picker-no-job");
    // Re-bind click (remove old listeners by cloning)
    const fresh = noJobBtn.cloneNode(true);
    noJobBtn.parentNode.replaceChild(fresh, noJobBtn);
    fresh.addEventListener("click", () => {
      overlay.style.display = "none";
      overlay.classList.add("hidden");
      resolve(NO_JOB.id);
    });

    overlay.classList.remove("hidden");
    overlay.style.display = "flex";
  });
}

// Check if creature should devolve
async function checkDevolution() {
  let newLevel;
  if (gameState.clicks >= LEGEND_THRESHOLD) {
    newLevel = LEVEL_LEGEND;
  } else if (gameState.clicks >= TEEN_THRESHOLD) {
    newLevel = LEVEL_TEEN;
  } else {
    newLevel = LEVEL_BABY;
  }

  if (newLevel !== gameState.level) {
    gameState.level = newLevel;

    // Load cached image for this level (it was generated before)
    if (gameState.cachedImages[newLevel]) {
      setPetImageSrc(gameState.cachedImages[newLevel]);
    }

    updateGameDisplay();
    saveGame();
  }
}

// ---------- 🍖 ACTIONS (triggered by interactive room props) ----------
/** Get effective click value based on needs — 0 if any need is at 0, half if critical */
function getClickValue() {
  const minNeed = Math.min(...Object.values(gameState.needs));
  if (minNeed === 0) return 0;
  if (minNeed <= NEED_CRITICAL_THRESHOLD) return 0.5;
  return 1;
}

function doFeedAction(emoji) {
  const cv = getClickValue();
  if (cv <= 0) {
    // Pet is too miserable — action still restores needs but no clicks
    showFloatingTextAtPet("😢 too sad!");
  } else {
    gameState.clicks += cv >= 1 ? 1 : 0;
    if (cv < 1 && Math.random() < cv) gameState.clicks++; // probabilistic half-click
    showFloatingPlusOneAtPet();
  }
  PetAudio.play('feed');
  triggerFeedAnimation(emoji);
  restoreNeed("hunger", NEED_ACTION_RESTORE);
  restoreNeed("energy", -3);
  updateGameDisplay();
  saveGame();
}

function doCleanAction(emoji) {
  const cv = getClickValue();
  if (cv <= 0) {
    showFloatingTextAtPet("😢 too sad!");
  } else {
    gameState.clicks += cv >= 1 ? 1 : 0;
    if (cv < 1 && Math.random() < cv) gameState.clicks++;
    showFloatingPlusOneAtPet();
  }
  PetAudio.play('clean');
  triggerWashAnimation(emoji);
  restoreNeed("cleanliness", NEED_ACTION_RESTORE);
  restoreNeed("energy", -3);
  updateGameDisplay();
  saveGame();
}

function doPlayAction(emoji) {
  const cv = getClickValue();
  if (cv <= 0) {
    showFloatingTextAtPet("😢 too sad!");
  } else {
    gameState.clicks += cv >= 1 ? 1 : 0;
    if (cv < 1 && Math.random() < cv) gameState.clicks++;
    showFloatingPlusOneAtPet();
  }
  PetAudio.play('play');
  triggerPlayAnimation(emoji);
  restoreNeed("fun", NEED_ACTION_RESTORE);
  restoreNeed("energy", -5);
  updateGameDisplay();
  saveGame();
}

function doSleepAction(emoji) {
  const cv = getClickValue();
  if (cv <= 0) {
    showFloatingTextAtPet("😢 too sad!");
  } else {
    gameState.clicks += cv >= 1 ? 1 : 0;
    if (cv < 1 && Math.random() < cv) gameState.clicks++;
    showFloatingPlusOneAtPet();
  }
  PetAudio.play('sleep');
  triggerSleepAnimation(emoji);
  restoreNeed("energy", NEED_ACTION_RESTORE + 10);
  restoreNeed("hunger", -3);
  updateGameDisplay();
  saveGame();
}

// Floating +1 animation
function showFloatingPlusOne(buttonEl) {
  const rect = buttonEl.getBoundingClientRect();
  const el = document.createElement("div");
  el.className = "float-plus-one";
  el.textContent = "+1";
  el.style.left = `${rect.left + rect.width / 2 - 15}px`;
  el.style.top = `${rect.top - 10}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

// Floating +1 at pet position
function showFloatingPlusOneAtPet() {
  const rect = petParts.getBoundingClientRect();
  const el = document.createElement("div");
  el.className = "float-plus-one";
  el.textContent = "+1";
  el.style.left = `${rect.left + rect.width / 2 - 15}px`;
  el.style.top = `${rect.top - 10}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

// Floating arbitrary text at pet position
function showFloatingTextAtPet(text) {
  const rect = petParts.getBoundingClientRect();
  const el = document.createElement("div");
  el.className = "float-plus-one";
  el.textContent = text;
  el.style.left = `${rect.left + rect.width / 2 - 30}px`;
  el.style.top = `${rect.top - 10}px`;
  el.style.fontSize = "0.75rem";
  el.style.width = "auto";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

// ---------- 🍖 FEED ANIMATION ----------
async function triggerFeedAnimation(emoji) {
  if (petParts.dataset.animating === "true") return;
  petParts.dataset.animating = "true";

  const rect = petParts.getBoundingClientRect();
  const foods = ["🍖", "🍎", "🧁", "🍕", "🥕"];
  const foodEmoji = emoji || foods[Math.floor(Math.random() * foods.length)];

  // Spawn food item below the creature
  const food = document.createElement("div");
  food.className = "feed-food-item";
  food.textContent = foodEmoji;
  food.style.left = `${rect.left + rect.width / 2 - 16}px`;
  food.style.top = `${rect.bottom}px`;
  document.body.appendChild(food);

  // Phase 1: Arms reach out
  petParts.classList.add("feed-reach");
  await sleep(100);

  // Food floats up to mouth area
  food.style.left = `${rect.left + rect.width / 2 - 16}px`;
  food.style.top = `${rect.top + rect.height * 0.3}px`;
  food.classList.add("feed-food-fly");
  await sleep(500);

  // Phase 2: Arms bring food in, head chews
  petParts.classList.remove("feed-reach");
  petParts.classList.add("feed-eat");
  food.classList.remove("feed-food-fly");
  food.classList.add("feed-food-eaten");
  await sleep(250);
  food.remove();

  // Hearts while chewing
  for (let i = 0; i < 4; i++) {
    setTimeout(() => {
      spawnParticle("❤️",
        rect.left + rect.width * 0.3 + Math.random() * rect.width * 0.4,
        rect.top + rect.height * 0.1 + Math.random() * rect.height * 0.2
      );
    }, i * 200);
  }

  await sleep(1800);
  petParts.classList.remove("feed-eat");
  petParts.dataset.animating = "false";
}

// ---------- 🧼 WASH ANIMATION ----------
async function triggerWashAnimation(emoji) {
  if (petParts.dataset.animating === "true") return;
  petParts.dataset.animating = "true";

  const rect = petParts.getBoundingClientRect();
  const washEmoji = emoji || "🫧";

  // Phase 1: Spawn the clicked wash item + bubbles all over creature
  const bubbles = [];
  for (let i = 0; i < 14; i++) {
    const b = document.createElement("div");
    b.className = "wash-bubble";
    // First few are the clicked item, rest are bubbles
    b.textContent = i < 4 ? washEmoji : "🫧";
    b.style.left = `${rect.left + rect.width * 0.1 + Math.random() * rect.width * 0.8}px`;
    b.style.top = `${rect.top + rect.height * 0.1 + Math.random() * rect.height * 0.8}px`;
    b.style.animationDelay = `${Math.random() * 0.4}s`;
    b.style.fontSize = `${1.0 + Math.random() * 0.8}rem`;
    document.body.appendChild(b);
    bubbles.push(b);
  }

  // Creature jiggles under suds
  petParts.classList.add("wash-bubbly");
  await sleep(1800);

  // Phase 2: Bubbles pop and fade
  petParts.classList.remove("wash-bubbly");
  bubbles.forEach((b, i) => {
    setTimeout(() => b.classList.add("wash-bubble-fade"), i * 30);
  });
  await sleep(600);
  bubbles.forEach(b => b.remove());

  // Phase 3: Shake off water
  petParts.classList.add("wash-shake");

  // Water droplets fly off
  for (let i = 0; i < 10; i++) {
    setTimeout(() => {
      const side = Math.random() > 0.5 ? 1 : -1;
      const drop = document.createElement("div");
      drop.className = "wash-droplet";
      drop.textContent = "💧";
      drop.style.left = `${rect.left + rect.width / 2 + side * rect.width * 0.25}px`;
      drop.style.top = `${rect.top + rect.height * 0.2 + Math.random() * rect.height * 0.6}px`;
      drop.style.setProperty("--fly-x", `${side * (30 + Math.random() * 50)}px`);
      drop.style.setProperty("--fly-y", `${-10 + Math.random() * 30}px`);
      document.body.appendChild(drop);
      setTimeout(() => drop.remove(), 700);
    }, i * 70);
  }

  await sleep(900);
  petParts.classList.remove("wash-shake");

  // Sparkle clean
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      spawnParticle("✨",
        rect.left + Math.random() * rect.width,
        rect.top + Math.random() * rect.height * 0.5
      );
    }, i * 150);
  }

  petParts.dataset.animating = "false";
}

// ---------- ✨ PARTICLE HELPER ----------
function spawnParticle(emoji, x, y) {
  const el = document.createElement("div");
  el.className = "pet-particle";
  el.textContent = emoji;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

// ---------- � SLEEP ANIMATION ----------
async function triggerSleepAnimation(emoji) {
  if (petParts.dataset.animating === "true") return;
  petParts.dataset.animating = "true";

  const rect = petParts.getBoundingClientRect();
  const sleepEmoji = emoji || "💤";

  // Phase 1: Pet curls up
  petParts.classList.add("feed-eat"); // reuse the head-down posture
  
  // Spawn zzz particles floating up
  for (let i = 0; i < 6; i++) {
    setTimeout(() => {
      spawnParticle(i % 2 === 0 ? sleepEmoji : "💤",
        rect.left + rect.width * 0.3 + Math.random() * rect.width * 0.4,
        rect.top + rect.height * 0.1
      );
    }, i * 400);
  }

  await sleep(2400);
  petParts.classList.remove("feed-eat");

  // Phase 2: Wake up sparkle
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      spawnParticle("✨",
        rect.left + Math.random() * rect.width,
        rect.top + Math.random() * rect.height * 0.5
      );
    }, i * 150);
  }

  petParts.dataset.animating = "false";
}

// ---------- �📊 STATUS POPUP ----------
btnStatus.addEventListener("click", () => {
  popupName.textContent = gameState.petName;
  popupLevel.textContent = gameState.level;
  popupClicks.textContent = gameState.clicks;

  // Build ingredients list
  popupIngredients.innerHTML = "";
  const labels = { animal: "Animal", color: "Color", wildcard: "Wild Card", element: "Element" };
  for (const [key, label] of Object.entries(labels)) {
    if (gameState.ingredients[key]) {
      const li = document.createElement("li");
      li.textContent = `${label}: ${gameState.ingredients[key]}`;
      popupIngredients.appendChild(li);
    }
  }

  // Next evolution info
  if (gameState.level === LEVEL_BABY) {
    popupNext.textContent = `${TEEN_THRESHOLD - gameState.clicks} clicks to Teenager`;
  } else if (gameState.level === LEVEL_TEEN) {
    popupNext.textContent = `${LEGEND_THRESHOLD - gameState.clicks} clicks to Legendary Adult`;
  } else {
    popupNext.textContent = "You reached the max level! 🏆";
  }

  // Job info
  if (popupJob) {
    if (gameState.job) {
      const jobData = gameState.job === NO_JOB.id
        ? NO_JOB
        : PET_JOBS.find(j => j.id === gameState.job);
      popupJob.textContent = jobData ? `${jobData.emoji} ${jobData.name}` : "Unknown";
    } else {
      popupJob.textContent = gameState.level === LEVEL_LEGEND ? "None" : "Chosen at Legendary evolution";
    }
  }

  // Creature age
  if (popupAge && gameState.createdAt) {
    const ageMs = Date.now() - gameState.createdAt;
    const hours = Math.floor(ageMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    popupAge.textContent = days > 0 ? `${days} day${days > 1 ? 's' : ''}, ${hours % 24} hr` : `${hours} hour${hours !== 1 ? 's' : ''}`;
  }

  // Rarity
  if (popupRarity) {
    const rarity = calculateRarity(gameState.ingredients);
    popupRarity.textContent = `⭐ ${rarity.name}`;
    popupRarity.style.color = rarity.cls === 'epic' ? 'var(--accent-purple)' : rarity.cls === 'rare' ? 'var(--accent-cyan)' : rarity.cls === 'uncommon' ? 'var(--accent-green)' : 'var(--text-dim)';
  }

  // Build needs display
  if (popupNeeds) {
    popupNeeds.innerHTML = "";
    const needLabels = { hunger: "🍖 Hunger", cleanliness: "🧼 Clean", fun: "🎾 Fun", energy: "💤 Energy" };
    for (const [key, label] of Object.entries(needLabels)) {
      const p = document.createElement("p");
      const val = gameState.needs[key];
      const color = val <= NEED_CRITICAL_THRESHOLD ? "var(--accent-pink)" : val <= NEED_WARN_THRESHOLD ? "var(--accent-yellow)" : "var(--accent-green)";
      p.innerHTML = `${label}: <strong style="color:${color}">${val}%</strong>`;
      popupNeeds.appendChild(p);
    }
  }

  statusPopup.classList.remove("hidden");
  statusPopup.style.display = "flex";
});

popupClose.addEventListener("click", () => {
  statusPopup.style.display = "none";
  statusPopup.classList.add("hidden");
});

// Close popup by clicking outside the card
statusPopup.addEventListener("click", (e) => {
  if (e.target === statusPopup) {
    statusPopup.style.display = "none";
    statusPopup.classList.add("hidden");
  }
});

// ---------- 🥚 NEW CREATURE ----------
btnNewCreature.addEventListener("click", async () => {
  if (confirm("Start over with a new creature? Your current pet will be saved to the gallery!")) {
    await saveToGallery();
    localStorage.removeItem(SAVE_KEY);
    location.reload();
  }
});

// ---------- 🗑️ DISCARD CREATURE ----------
const discardOverlay = $("discard-confirm-overlay");
const discardYes = $("discard-confirm-yes");
const discardNo = $("discard-confirm-no");

btnDiscard.addEventListener("click", () => {
  discardOverlay.classList.remove("hidden");
});

discardYes.addEventListener("click", async () => {
  discardOverlay.classList.add("hidden");
  await saveToGallery();
  localStorage.removeItem(SAVE_KEY);
  location.reload();
});

discardNo.addEventListener("click", () => {
  discardOverlay.classList.add("hidden");
});

// ---------- 🏆 GALLERY ----------
let galleryReturnScreen = "egg-lab";

btnGalleryLab.addEventListener("click", () => {
  galleryReturnScreen = "egg-lab";
  showGallery();
});

btnGalleryGame.addEventListener("click", () => {
  galleryReturnScreen = "pet-game";
  showGallery();
});

btnGalleryBack.addEventListener("click", () => {
  showScreen(galleryReturnScreen);
});

async function showGallery() {
  await renderGallery();
  showScreen("gallery");
}

async function saveToGallery() {
  if (!gameState.createdAt || !gameState.petName) return;
  try {
    await PetDB.saveCreature({
      petName: gameState.petName,
      ingredients: { ...gameState.ingredients },
      clicks: gameState.clicks,
      level: gameState.level,
      cachedImages: { ...gameState.cachedImages },
      createdAt: gameState.createdAt,
      archivedAt: Date.now(),
      job: gameState.job || null,
    });
  } catch (err) {
    console.warn("Failed to save to gallery:", err);
  }
}

async function deleteFromGallery(id) {
  await PetDB.deleteCreature(id);
  await renderGallery();
}

function sortGallery(gallery, sortBy) {
  switch (sortBy) {
    case 'oldest':
      gallery.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      break;
    case 'level': {
      const order = { [LEVEL_LEGEND]: 3, [LEVEL_TEEN]: 2, [LEVEL_BABY]: 1 };
      gallery.sort((a, b) => (order[b.level] || 0) - (order[a.level] || 0));
      break;
    }
    case 'name':
      gallery.sort((a, b) => (a.petName || '').localeCompare(b.petName || ''));
      break;
    case 'newest':
    default:
      gallery.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      break;
  }
}

// Gallery sort change handler
if (gallerySortSelect) {
  gallerySortSelect.addEventListener('change', () => renderGallery());
}

async function renderGallery() {
  const gallery = await PetDB.loadAll();
  const sortBy = gallerySortSelect ? gallerySortSelect.value : 'newest';
  sortGallery(gallery, sortBy);

  galleryGrid.innerHTML = "";

  if (gallery.length === 0) {
    galleryEmpty.classList.remove("hidden");
    galleryEmpty.style.display = "block";
    return;
  }

  galleryEmpty.classList.add("hidden");
  galleryEmpty.style.display = "none";

  const allStages = [LEVEL_BABY, LEVEL_TEEN, LEVEL_LEGEND];
  const stageEmojis = {
    [LEVEL_BABY]: "🍼",
    [LEVEL_TEEN]: "💥",
    [LEVEL_LEGEND]: "👑",
  };

  gallery.forEach((creature) => {
    const card = document.createElement("div");
    card.className = "gallery-card";

    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "gallery-delete-btn";
    deleteBtn.textContent = "🗑️";
    deleteBtn.title = "Delete from gallery";
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm(`Delete ${creature.petName} from your gallery?`)) {
        deleteFromGallery(creature.id);
      }
    });
    card.appendChild(deleteBtn);

    // Pet name
    const name = document.createElement("h3");
    name.className = "gallery-card-name";
    name.textContent = creature.petName;
    card.appendChild(name);

    // Rarity tag
    if (creature.ingredients) {
      const rarity = calculateRarity(creature.ingredients);
      const rarityTag = document.createElement("span");
      rarityTag.className = `gallery-rarity-tag ${rarity.cls}`;
      rarityTag.textContent = `⭐ ${rarity.name}`;
      card.appendChild(rarityTag);
    }

    // Ingredient tags
    const tags = document.createElement("div");
    tags.className = "gallery-tags";
    const labels = { animal: "🐾", color: "🎨", wildcard: "🃏", element: "✨" };
    for (const [key, emoji] of Object.entries(labels)) {
      if (creature.ingredients && creature.ingredients[key]) {
        const tag = document.createElement("span");
        tag.className = "gallery-tag";
        tag.textContent = `${emoji} ${creature.ingredients[key]}`;
        tags.appendChild(tag);
      }
    }
    card.appendChild(tags);

    // Stage thumbnails row
    const stages = document.createElement("div");
    stages.className = "gallery-stages";

    allStages.forEach((stage) => {
      const slot = document.createElement("div");
      const hasImage = creature.cachedImages && creature.cachedImages[stage];

      if (hasImage) {
        slot.className = "gallery-stage unlocked";
        const img = document.createElement("img");
        img.src = creature.cachedImages[stage];
        img.alt = `${creature.petName} - ${stage}`;
        slot.appendChild(img);
      } else {
        slot.className = "gallery-stage locked";
        const lock = document.createElement("div");
        lock.className = "gallery-lock-icon";
        lock.textContent = "🔒";
        slot.appendChild(lock);
      }

      const label = document.createElement("span");
      label.className = "gallery-stage-label";
      label.textContent = `${stageEmojis[stage]} ${stage}`;
      slot.appendChild(label);

      stages.appendChild(slot);
    });

    card.appendChild(stages);

    // Level reached badge
    const badge = document.createElement("div");
    badge.className = "gallery-level-badge";
    badge.textContent = `Reached: ${stageEmojis[creature.level]} ${creature.level}`;
    if (creature.level === LEVEL_LEGEND) badge.classList.add("legendary");
    if (creature.level === LEVEL_TEEN) badge.classList.add("teenager");
    card.appendChild(badge);

    galleryGrid.appendChild(card);
  });
}

// ---------- ⏰ HOURLY DECAY ----------
let decayTimer = null;

function startDecayTimer() {
  // Clear any existing timer
  if (decayTimer) clearInterval(decayTimer);

  // Check for any missed decay (if user closed the tab and came back)
  applyMissedDecay();

  // Start the interval
  decayTimer = setInterval(() => {
    // Decay shield: skip if average needs > 70%
    const avgNeed = Object.values(gameState.needs).reduce((a, b) => a + b, 0) / 4;
    if (avgNeed > 70) {
      console.log("⏰ Decay skipped — needs are healthy (", Math.round(avgNeed), "%)");
      return;
    }
    if (gameState.clicks > 0) {
      gameState.clicks--;
      gameState.lastDecayTime = Date.now();
      updateGameDisplay();
      checkDevolution();
      saveGame();
      console.log("⏰ Decay! Clicks now:", gameState.clicks);
    }
  }, DECAY_INTERVAL_MS);
}

function applyMissedDecay() {
  const now = Date.now();
  const elapsed = now - gameState.lastDecayTime;
  const missedDecays = Math.floor(elapsed / DECAY_INTERVAL_MS);

  if (missedDecays > 0 && gameState.clicks > 0) {
    const actualDecay = Math.min(missedDecays, gameState.clicks);
    gameState.clicks -= actualDecay;
    gameState.lastDecayTime = now;
    console.log(`⏰ Applied ${actualDecay} missed decays. Clicks now: ${gameState.clicks}`);
  }
}

// ---------- 💾 SAVE & LOAD ----------
function saveGame() {
  try {
    const saveData = JSON.stringify(gameState);
    localStorage.setItem(SAVE_KEY, saveData);
  } catch (err) {
    console.warn("Failed to save game:", err);
  }
}

function loadGame() {
  try {
    const data = localStorage.getItem(SAVE_KEY);
    if (!data) return false;

    const saved = JSON.parse(data);

    // Restore state
    gameState.ingredients = saved.ingredients || gameState.ingredients;
    gameState.petName = saved.petName || "";
    gameState.clicks = saved.clicks || 0;
    gameState.level = saved.level || LEVEL_BABY;
    gameState.cachedImages = saved.cachedImages || {};
    gameState.lastDecayTime = saved.lastDecayTime || Date.now();
    gameState.createdAt = saved.createdAt || null;
    gameState.petX = saved.petX ?? null;
    gameState.petY = saved.petY ?? null;
    gameState.currentRoom = saved.currentRoom || "feeding";
    gameState.needs = saved.needs || { hunger: NEED_MAX, cleanliness: NEED_MAX, fun: NEED_MAX, energy: NEED_MAX };
    gameState.lastNeedDecayTime = saved.lastNeedDecayTime || Date.now();
    gameState.job = saved.job || null;
    gameState.parentJobs = saved.parentJobs || [];
    gameState.bgCleaned = saved.bgCleaned || {};

    return true;
  } catch (err) {
    console.warn("Failed to load save:", err);
    return false;
  }
}

// ---------- 🎭 IDLE FIDGETS ----------
let fidgetTimer = null;
const FIDGET_CLASSES = ["fidget-look-left", "fidget-look-right", "fidget-ear-twitch", "fidget-scratch", "fidget-yawn", "fidget-tail-wag"];

function startIdleFidgets() {
  stopIdleFidgets();
  scheduleNextFidget();
}

function stopIdleFidgets() {
  if (fidgetTimer) { clearTimeout(fidgetTimer); fidgetTimer = null; }
}

function scheduleNextFidget() {
  const delay = 4000 + Math.random() * 6000; // 4-10s between fidgets
  fidgetTimer = setTimeout(() => {
    if (petParts.dataset.animating !== "true") {
      const cls = FIDGET_CLASSES[Math.floor(Math.random() * FIDGET_CLASSES.length)];
      petParts.classList.add(cls);
      setTimeout(() => {
        petParts.classList.remove(cls);
        scheduleNextFidget();
      }, 1200);
    } else {
      scheduleNextFidget();
    }
  }, delay);
}

// ---------- 🖐️ DRAG-BETWEEN-ROOMS ----------
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let dragStartX = 0; // track where drag started for room transition detection
const ROOM_TRANSITION_THRESHOLD = 0.65; // drag past 65% of viewport width to switch

function getRoomIndex(roomId) {
  return ROOMS.findIndex(r => r.id === roomId);
}

function getAdjacentRooms() {
  const idx = getRoomIndex(gameState.currentRoom);
  return {
    left: idx > 0 ? ROOMS[idx - 1] : null,
    right: idx < ROOMS.length - 1 ? ROOMS[idx + 1] : null,
  };
}

function showRoomIndicators() {
  const adj = getAdjacentRooms();
  if (adj.left) {
    roomLabelLeft.textContent = `${adj.left.emoji} ${adj.left.name}`;
    roomIndicatorLeft.classList.remove("hidden");
    roomIndicatorLeft.style.display = "flex";
  }
  if (adj.right) {
    roomLabelRight.textContent = `${adj.right.emoji} ${adj.right.name}`;
    roomIndicatorRight.classList.remove("hidden");
    roomIndicatorRight.style.display = "flex";
  }
}

function hideRoomIndicators() {
  roomIndicatorLeft.classList.add("hidden");
  roomIndicatorLeft.style.display = "none";
  roomIndicatorLeft.classList.remove("glow-active");
  roomIndicatorRight.classList.add("hidden");
  roomIndicatorRight.style.display = "none";
  roomIndicatorRight.classList.remove("glow-active");
}

function crawlBackToCenter() {
  const size = getPetSize();
  const centerX = (gameWorld.clientWidth - size) / 2;
  const centerY = (gameWorld.clientHeight - size) / 2;

  petParts.classList.add("crawl-back");
  gameState.petX = centerX;
  gameState.petY = centerY;
  petParts.style.left = `${centerX}px`;
  petParts.style.top = `${centerY}px`;

  setTimeout(() => {
    petParts.classList.remove("crawl-back");
  }, 500);
}

petParts.addEventListener("pointerdown", (e) => {
  if (petParts.dataset.animating === "true") return;
  isDragging = true;
  const rect = petParts.getBoundingClientRect();
  dragOffsetX = e.clientX - rect.left;
  dragOffsetY = e.clientY - rect.top;
  dragStartX = e.clientX;
  petParts.setPointerCapture(e.pointerId);
  petParts.classList.add("dragging");
  showRoomIndicators();
  e.preventDefault();
});

document.addEventListener("pointermove", (e) => {
  if (!isDragging) return;
  const worldRect = gameWorld.getBoundingClientRect();
  const size = getPetSize();
  let newX = e.clientX - worldRect.left - dragOffsetX;
  let newY = e.clientY - worldRect.top - dragOffsetY;
  // Clamp vertical movement within viewport
  newY = Math.max(0, Math.min(newY, gameWorld.clientHeight - size));
  // Allow horizontal to go slightly past edges for transition feel
  newX = Math.max(-size * 0.3, Math.min(newX, gameWorld.clientWidth - size * 0.7));
  gameState.petX = newX;
  gameState.petY = newY;
  petParts.style.left = `${newX}px`;
  petParts.style.top = `${newY}px`;

  // Check if near edges and glow the indicators
  const adj = getAdjacentRooms();
  const petCenter = newX + size / 2;
  const leftThreshold = gameWorld.clientWidth * (1 - ROOM_TRANSITION_THRESHOLD);
  const rightThreshold = gameWorld.clientWidth * ROOM_TRANSITION_THRESHOLD;

  if (adj.left && petCenter < leftThreshold) {
    roomIndicatorLeft.classList.add("glow-active");
  } else {
    roomIndicatorLeft.classList.remove("glow-active");
  }
  if (adj.right && petCenter > rightThreshold) {
    roomIndicatorRight.classList.add("glow-active");
  } else {
    roomIndicatorRight.classList.remove("glow-active");
  }
});

document.addEventListener("pointerup", () => {
  if (!isDragging) return;
  isDragging = false;
  petParts.classList.remove("dragging");
  hideRoomIndicators();

  const size = getPetSize();
  const petCenter = gameState.petX + size / 2;
  const adj = getAdjacentRooms();
  const leftThreshold = gameWorld.clientWidth * (1 - ROOM_TRANSITION_THRESHOLD);
  const rightThreshold = gameWorld.clientWidth * ROOM_TRANSITION_THRESHOLD;

  // Check if pet dragged past threshold to switch rooms
  if (adj.left && petCenter < leftThreshold) {
    // Transition to left room
    switchRoom(adj.left.id);
    // Pet enters from right side, then crawls to center
    gameState.petX = gameWorld.clientWidth - size * 0.3;
    petParts.style.left = `${gameState.petX}px`;
    requestAnimationFrame(() => crawlBackToCenter());
  } else if (adj.right && petCenter > rightThreshold) {
    // Transition to right room
    switchRoom(adj.right.id);
    // Pet enters from left side, then crawls to center
    gameState.petX = -size * 0.3;
    petParts.style.left = `${gameState.petX}px`;
    requestAnimationFrame(() => crawlBackToCenter());
  } else {
    // Not past threshold — crawl back to center
    crawlBackToCenter();
  }
  saveGame();
});

// ---------- 🏠 ROOM SWITCHING ----------
function switchRoom(roomId) {
  const room = ROOMS.find(r => r.id === roomId);
  if (!room) return;
  gameState.currentRoom = roomId;
  roomBg.className = `room-bg room-${roomId}`;
  updateRoomProps(room);
  updateRoomNameBadge(room);
  PetAudio.play('room');
}

function updateRoomNameBadge(room) {
  // Remove existing badge
  const existing = gameWorld.querySelector(".room-name-badge");
  if (existing) existing.remove();
  // Add new badge
  const badge = document.createElement("div");
  badge.className = "room-name-badge";
  badge.textContent = `${room.emoji} ${room.name}`;
  gameWorld.appendChild(badge);
}

function updateRoomProps(room) {
  const propsContainer = $("room-props");
  if (!propsContainer) return;
  propsContainer.innerHTML = "";

  // Breeding room has special interactive boxes
  if (room.id === "breeding") {
    updateBreedingRoomProps(propsContainer);
    return;
  }

  // Level-aware prop sets — items upgrade as the pet grows!
  const level = gameState.level;

  const bedroomProps = {
    [LEVEL_BABY]: [
      { emoji: "🛏️", x: "8%", y: "62%", size: "3.2rem", action: "sleep", hint: "Nap" },
      { emoji: "🪨", x: "80%", y: "72%", size: "2rem", action: "sleep", hint: "Pillow" },
      { emoji: "🌙", x: "82%", y: "12%", size: "1.8rem" },
      { emoji: "⭐", x: "12%", y: "18%", size: "1.2rem" },
    ],
    [LEVEL_TEEN]: [
      { emoji: "🛋️", x: "8%", y: "62%", size: "3.5rem", action: "sleep", hint: "Couch" },
      { emoji: "🎶", x: "80%", y: "72%", size: "2.4rem", action: "sleep", hint: "Lullaby" },
      { emoji: "🌙", x: "82%", y: "12%", size: "2.2rem" },
      { emoji: "🌟", x: "12%", y: "18%", size: "1.5rem" },
    ],
    [LEVEL_LEGEND]: [
      { emoji: "👑", x: "8%", y: "62%", size: "3.8rem", action: "sleep", hint: "Throne Nap" },
      { emoji: "✨", x: "80%", y: "70%", size: "2.8rem", action: "sleep", hint: "Dream" },
      { emoji: "🌌", x: "82%", y: "10%", size: "2.6rem" },
      { emoji: "💫", x: "12%", y: "16%", size: "2rem" },
    ],
  };

  const feedingProps = {
    [LEVEL_BABY]: [
      { emoji: "🥣", x: "8%", y: "72%", size: "2.8rem", action: "feed", hint: "Feed" },
      { emoji: "🍎", x: "82%", y: "68%", size: "2rem", action: "feed", hint: "Feed" },
      { emoji: "🍖", x: "88%", y: "80%", size: "2.2rem", action: "feed", hint: "Feed" },
      { emoji: "🍕", x: "15%", y: "82%", size: "1.8rem", action: "feed", hint: "Feed" },
    ],
    [LEVEL_TEEN]: [
      { emoji: "🍔", x: "8%", y: "72%", size: "3rem", action: "feed", hint: "Feed" },
      { emoji: "🥩", x: "82%", y: "68%", size: "2.4rem", action: "feed", hint: "Feed" },
      { emoji: "🍜", x: "88%", y: "80%", size: "2.6rem", action: "feed", hint: "Feed" },
      { emoji: "🌮", x: "15%", y: "82%", size: "2.2rem", action: "feed", hint: "Feed" },
    ],
    [LEVEL_LEGEND]: [
      { emoji: "🍕", x: "8%", y: "70%", size: "3.5rem", action: "feed", hint: "Pizza Box" },
      { emoji: "🦃", x: "82%", y: "66%", size: "3rem", action: "feed", hint: "Feast" },
      { emoji: "🍱", x: "88%", y: "80%", size: "3rem", action: "feed", hint: "Bento" },
      { emoji: "🎂", x: "15%", y: "80%", size: "2.8rem", action: "feed", hint: "Cake" },
    ],
  };

  const bathroomProps = {
    [LEVEL_BABY]: [
      { emoji: "🛁", x: "10%", y: "62%", size: "3.2rem", action: "clean", hint: "Wash" },
      { emoji: "🧽", x: "80%", y: "72%", size: "2rem", action: "clean", hint: "Scrub" },
      { emoji: "🚿", x: "6%", y: "12%", size: "2.2rem", action: "clean", hint: "Rinse" },
      { emoji: "🫧", x: "78%", y: "18%", size: "1.5rem" },
      { emoji: "🫧", x: "85%", y: "32%", size: "1.2rem" },
    ],
    [LEVEL_TEEN]: [
      { emoji: "🛁", x: "10%", y: "62%", size: "3.5rem", action: "clean", hint: "Hot Tub" },
      { emoji: "🧴", x: "80%", y: "72%", size: "2.4rem", action: "clean", hint: "Shampoo" },
      { emoji: "🚿", x: "6%", y: "12%", size: "2.6rem", action: "clean", hint: "Power Wash" },
      { emoji: "💨", x: "78%", y: "18%", size: "1.8rem" },
      { emoji: "🫧", x: "85%", y: "32%", size: "1.5rem" },
    ],
    [LEVEL_LEGEND]: [
      { emoji: "🏊", x: "10%", y: "62%", size: "3.8rem", action: "clean", hint: "Pool" },
      { emoji: "🧖", x: "80%", y: "70%", size: "2.8rem", action: "clean", hint: "Spa" },
      { emoji: "💎", x: "6%", y: "12%", size: "2.6rem", action: "clean", hint: "Diamond Bath" },
      { emoji: "✨", x: "78%", y: "18%", size: "2rem" },
      { emoji: "✨", x: "85%", y: "32%", size: "1.6rem" },
    ],
  };

  const playroomProps = {
    [LEVEL_BABY]: [
      { emoji: "🎾", x: "88%", y: "76%", size: "2.2rem", action: "play", hint: "Play" },
      { emoji: "🧸", x: "8%", y: "70%", size: "2.8rem", action: "play", hint: "Play" },
      { emoji: "🎈", x: "82%", y: "12%", size: "2rem" },
      { emoji: "🪀", x: "12%", y: "22%", size: "2rem", action: "play", hint: "Play" },
    ],
    [LEVEL_TEEN]: [
      { emoji: "⚽", x: "88%", y: "76%", size: "2.6rem", action: "play", hint: "Kick" },
      { emoji: "🎮", x: "8%", y: "70%", size: "3rem", action: "play", hint: "Game" },
      { emoji: "🛹", x: "82%", y: "12%", size: "2.4rem", action: "play", hint: "Skate" },
      { emoji: "🏀", x: "12%", y: "22%", size: "2.4rem", action: "play", hint: "Shoot" },
    ],
    [LEVEL_LEGEND]: [
      { emoji: "🏋️", x: "88%", y: "74%", size: "3rem", action: "play", hint: "Lift" },
      { emoji: "💪", x: "8%", y: "68%", size: "3.2rem", action: "play", hint: "Pump" },
      { emoji: "🥊", x: "82%", y: "12%", size: "2.8rem", action: "play", hint: "Box" },
      { emoji: "🏆", x: "12%", y: "20%", size: "2.6rem", action: "play", hint: "Champ" },
    ],
  };

  const propSets = {
    feeding: feedingProps[level] || feedingProps[LEVEL_BABY],
    bathroom: bathroomProps[level] || bathroomProps[LEVEL_BABY],
    playroom: playroomProps[level] || playroomProps[LEVEL_BABY],
    bedroom: bedroomProps[level] || bedroomProps[LEVEL_BABY],
    breeding: [],
  };
  const props = propSets[room.id] || [];
  props.forEach(p => {
    const el = document.createElement("div");
    el.className = "room-prop";
    el.textContent = p.emoji;
    el.style.left = p.x;
    el.style.top = p.y;
    el.style.fontSize = p.size;
    // Make interactive if it has an action
    if (p.action) {
      el.classList.add("interactive");
      // Add hint label
      const hint = document.createElement("span");
      hint.className = "prop-hint";
      hint.textContent = p.hint || p.action;
      el.appendChild(hint);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (petParts.dataset.animating === "true") return;
        // Visual feedback on prop
        el.classList.add("prop-used");
        setTimeout(() => el.classList.remove("prop-used"), 400);
        // Trigger the action
        if (p.action === "feed") doFeedAction(p.emoji);
        else if (p.action === "clean") doCleanAction(p.emoji);
        else if (p.action === "play") doPlayAction(p.emoji);
        else if (p.action === "sleep") doSleepAction(p.emoji);
      });
    }
    propsContainer.appendChild(el);
  });
}

function updateRoomActions(roomId) {
  // No longer needed — actions are now interactive props
}

// ---------- 📊 NEEDS SYSTEM ----------
let needDecayTimer = null;

function startNeedDecayTimer() {
  if (needDecayTimer) clearInterval(needDecayTimer);
  applyMissedNeedDecay();
  needDecayTimer = setInterval(decayNeeds, NEED_DECAY_INTERVAL_MS);
}

function decayNeeds() {
  for (const need of Object.keys(gameState.needs)) {
    const decay = need === "energy" ? Math.floor(NEED_DECAY_AMOUNT * 0.5) : NEED_DECAY_AMOUNT;
    gameState.needs[need] = Math.max(0, gameState.needs[need] - decay);
  }
  gameState.lastNeedDecayTime = Date.now();
  updateNeedsHUD();
  saveGame();
}

function applyMissedNeedDecay() {
  const now = Date.now();
  const elapsed = now - (gameState.lastNeedDecayTime || now);
  const missed = Math.floor(elapsed / NEED_DECAY_INTERVAL_MS);
  if (missed > 0) {
    const ticks = Math.min(missed, 20);
    for (let i = 0; i < ticks; i++) {
      for (const need of Object.keys(gameState.needs)) {
        const decay = need === "energy" ? Math.floor(NEED_DECAY_AMOUNT * 0.5) : NEED_DECAY_AMOUNT;
        gameState.needs[need] = Math.max(0, gameState.needs[need] - decay);
      }
    }
    gameState.lastNeedDecayTime = now;
  }
}

function restoreNeed(need, amount) {
  if (!gameState.needs.hasOwnProperty(need)) return;
  gameState.needs[need] = Math.max(0, Math.min(NEED_MAX, gameState.needs[need] + amount));
  updateNeedsHUD();
}

function updateNeedsHUD() {
  const mapping = { hunger: "need-hunger", cleanliness: "need-cleanliness", fun: "need-fun", energy: "need-energy" };
  for (const [need, elId] of Object.entries(mapping)) {
    const el = $(elId);
    if (!el) continue;
    const val = gameState.needs[need];
    el.style.width = `${val}%`;
    el.className = "need-fill";
    if (val <= NEED_CRITICAL_THRESHOLD) el.classList.add("critical");
    else if (val <= NEED_WARN_THRESHOLD) el.classList.add("warning");
  }
}

// ---------- 🎾 PLAY ACTION ----------
const btnPlay = $("btn-play");
const btnBreed = $("btn-breed");

// ---------- 🥚 BREEDING SYSTEM ----------
let breedingMate = null; // The gallery creature chosen as mate

const breedingOverlay = $("breeding-overlay");
const breedSlot1Img = $("breed-slot-1-img");
const breedSlot1Name = $("breed-slot-1-name");
const breedSlot2 = $("breed-slot-2");
const breedSlot2Img = $("breed-slot-2-img");
const breedSlot2Name = $("breed-slot-2-name");
const breedSlot2Placeholder = $("breed-slot-2-placeholder");
const btnBreedGo = $("btn-breed-go");
const btnBreedCancel = $("btn-breed-cancel");
const breedPickerOverlay = $("breed-picker-overlay");
const breedPickerGrid = $("breed-picker-grid");
const breedPickerEmpty = $("breed-picker-empty");
const btnBreedPickerCancel = $("btn-breed-picker-cancel");

function openBreedingOverlay() {
  breedingMate = null;

  // Fill slot 1 with current pet
  const currentImg = gameState.cachedImages[gameState.level] || "";
  breedSlot1Img.src = currentImg;
  breedSlot1Name.textContent = gameState.petName;

  // Reset slot 2
  breedSlot2.classList.remove("filled");
  breedSlot2.classList.add("empty");
  breedSlot2Img.classList.add("hidden");
  breedSlot2Name.classList.add("hidden");
  breedSlot2Placeholder.classList.remove("hidden");
  btnBreedGo.disabled = true;

  breedingOverlay.classList.remove("hidden");
  breedingOverlay.style.display = "flex";
}

function closeBreedingOverlay() {
  breedingOverlay.style.display = "none";
  breedingOverlay.classList.add("hidden");
  breedingMate = null;
}

// Click slot 2 to open gallery picker
breedSlot2.addEventListener("click", () => {
  openBreedPicker();
});

btnBreedCancel.addEventListener("click", closeBreedingOverlay);

// Close breeding overlay by clicking background
breedingOverlay.addEventListener("click", (e) => {
  if (e.target === breedingOverlay) closeBreedingOverlay();
});

// ----- Breed Picker (gallery selection for mate) -----
async function openBreedPicker() {
  const gallery = await PetDB.loadAll();
  breedPickerGrid.innerHTML = "";

  if (gallery.length === 0) {
    breedPickerEmpty.classList.remove("hidden");
    breedPickerEmpty.style.display = "block";
  } else {
    breedPickerEmpty.classList.add("hidden");
    breedPickerEmpty.style.display = "none";

    gallery.forEach((creature, index) => {
      const card = document.createElement("div");
      card.className = "breed-picker-card";

      // Thumbnail — use the highest stage image available
      const imgSrc = creature.cachedImages[LEVEL_LEGEND]
        || creature.cachedImages[LEVEL_TEEN]
        || creature.cachedImages[LEVEL_BABY]
        || "";
      if (imgSrc) {
        const img = document.createElement("img");
        img.className = "breed-picker-thumb";
        img.src = imgSrc;
        img.alt = creature.petName;
        card.appendChild(img);
      } else {
        const placeholder = document.createElement("div");
        placeholder.className = "breed-picker-thumb";
        placeholder.style.display = "flex";
        placeholder.style.alignItems = "center";
        placeholder.style.justifyContent = "center";
        placeholder.style.fontSize = "1.5rem";
        placeholder.textContent = "🥚";
        card.appendChild(placeholder);
      }

      // Info
      const info = document.createElement("div");
      info.className = "breed-picker-info";

      const name = document.createElement("div");
      name.className = "breed-picker-name";
      name.textContent = creature.petName;
      info.appendChild(name);

      const tags = document.createElement("div");
      tags.className = "breed-picker-tags";
      const labels = { animal: "🐾", color: "🎨", wildcard: "🃏", element: "✨" };
      for (const [key, emoji] of Object.entries(labels)) {
        if (creature.ingredients[key]) {
          const tag = document.createElement("span");
          tag.className = "breed-picker-tag";
          tag.textContent = `${emoji} ${creature.ingredients[key]}`;
          tags.appendChild(tag);
        }
      }
      info.appendChild(tags);
      card.appendChild(info);

      // Click to select this mate
      card.addEventListener("click", () => {
        selectBreedMate(creature, imgSrc);
      });

      breedPickerGrid.appendChild(card);
    });
  }

  breedPickerOverlay.classList.remove("hidden");
  breedPickerOverlay.style.display = "flex";
}

function closeBreedPicker() {
  breedPickerOverlay.style.display = "none";
  breedPickerOverlay.classList.add("hidden");
}

btnBreedPickerCancel.addEventListener("click", closeBreedPicker);

breedPickerOverlay.addEventListener("click", (e) => {
  if (e.target === breedPickerOverlay) closeBreedPicker();
});

function selectBreedMate(creature, imgSrc) {
  breedingMate = creature;

  // Fill slot 2
  breedSlot2.classList.remove("empty");
  breedSlot2.classList.add("filled");
  breedSlot2Placeholder.classList.add("hidden");
  breedSlot2Img.src = imgSrc;
  breedSlot2Img.classList.remove("hidden");
  breedSlot2Name.textContent = creature.petName;
  breedSlot2Name.classList.remove("hidden");
  btnBreedGo.disabled = false;

  closeBreedPicker();
}

// ----- BREED ACTION -----
btnBreedGo.addEventListener("click", async () => {
  if (!breedingMate) return;

  // Mix ingredients: for each category, randomly pick from parent A or parent B
  const parentA = gameState.ingredients;
  const parentB = breedingMate.ingredients;
  const mixed = {};

  for (const key of ["animal", "color", "wildcard", "element"]) {
    const options = [parentA[key], parentB[key]].filter(Boolean);
    if (options.length > 0) {
      mixed[key] = options[Math.floor(Math.random() * options.length)];
    } else {
      mixed[key] = null;
    }
  }

  // Name the offspring: suggest a combo, let user customise
  const nameA = gameState.petName;
  const nameB = breedingMate.petName;
  const halfA = nameA.slice(0, Math.ceil(nameA.length / 2));
  const halfB = nameB.slice(Math.floor(nameB.length / 2));
  const suggestedName = (halfA + halfB).slice(0, 20);
  const offspringName = await showBreedNameModal(suggestedName);
  if (!offspringName) return; // user cancelled

  // Collect parent job ids so offspring won't get the same choices
  const parentJobIds = [];
  if (gameState.job) parentJobIds.push(gameState.job);
  if (breedingMate.job) parentJobIds.push(breedingMate.job);

  // Save current pet to gallery before replacing
  await saveToGallery();

  // Close the breeding overlay
  closeBreedingOverlay();

  // Show hatching animation for the new creature
  hatchingOverlay.classList.remove("hidden");
  hatchingOverlay.style.display = "flex";

  // Set up new game state for the offspring
  gameState.ingredients = mixed;
  gameState.petName = offspringName;
  gameState.clicks = 0;
  gameState.level = LEVEL_BABY;
  gameState.cachedImages = {};
  gameState.lastDecayTime = Date.now();
  gameState.createdAt = Date.now();
  gameState.petX = null;
  gameState.petY = null;
  gameState.currentRoom = "feeding";
  gameState.needs = { hunger: NEED_MAX, cleanliness: NEED_MAX, fun: NEED_MAX, energy: NEED_MAX };
  gameState.lastNeedDecayTime = Date.now();
  gameState.job = null;
  gameState.parentJobs = parentJobIds;

  // Generate new creature image
  suppressSpinner = true;
  const imagePromise = generateCreatureImage(LEVEL_BABY);

  hatchingText.textContent = "Mixing the two creatures...";
  await sleep(1500);

  hatchingEgg.textContent = "💕";
  hatchingText.textContent = "A new egg is forming!";
  await sleep(1200);

  hatchingEgg.textContent = "🥚";
  hatchingText.textContent = "Cracks are appearing!";
  await sleep(800);

  hatchingEgg.textContent = "💥";
  hatchingText.textContent = "IT'S HATCHING!";
  await sleep(800);

  hatchingEgg.textContent = "✨";
  try {
    await imagePromise;
  } catch (err) {
    console.error("Breeding image failed:", err);
    hatchingText.textContent = "Breeding Failed 😢";
    await sleep(2000);
    hatchingOverlay.style.display = "none";
    hatchingOverlay.classList.add("hidden");
    hatchingEgg.textContent = "🥚";
    suppressSpinner = false;
    return;
  }

  suppressSpinner = false;

  // Switch to pet game
  hatchingOverlay.style.display = "none";
  hatchingOverlay.classList.add("hidden");
  hatchingEgg.textContent = "🥚";
  showScreen("pet-game");
  positionPet();
  switchRoom(gameState.currentRoom);
  updateGameDisplay();
  saveGame();
  startDecayTimer();
  startIdleFidgets();
  startNeedDecayTimer();
});

// ----- Update breeding room with special props -----
function updateBreedingRoomProps(propsContainer) {
  // Create two breed boxes inside the room
  const currentImg = gameState.cachedImages[gameState.level] || "";

  // Left box — current pet (auto-filled)
  const box1 = document.createElement("div");
  box1.className = "breed-box occupied";
  box1.style.left = "8%";
  box1.style.top = "55%";
  if (currentImg) {
    const img1 = document.createElement("img");
    img1.className = "breed-box-img";
    img1.src = currentImg;
    box1.appendChild(img1);
  } else {
    const emoji1 = document.createElement("div");
    emoji1.className = "breed-box-emoji";
    emoji1.textContent = "🐾";
    box1.appendChild(emoji1);
  }
  const label1 = document.createElement("div");
  label1.className = "breed-box-label";
  label1.textContent = gameState.petName;
  box1.appendChild(label1);
  box1.addEventListener("click", (e) => {
    e.stopPropagation();
    openBreedingOverlay();
  });
  propsContainer.appendChild(box1);

  // Right box — pick a mate
  const box2 = document.createElement("div");
  box2.className = "breed-box";
  box2.style.right = "8%";
  box2.style.left = "auto";
  box2.style.top = "55%";
  const plus = document.createElement("div");
  plus.className = "breed-box-emoji";
  plus.textContent = "➕";
  box2.appendChild(plus);
  const label2 = document.createElement("div");
  label2.className = "breed-box-label";
  label2.textContent = "Pick mate";
  box2.appendChild(label2);
  box2.addEventListener("click", (e) => {
    e.stopPropagation();
    openBreedingOverlay();
  });
  propsContainer.appendChild(box2);

  // Add decorative sparkles
  const sparkle1 = document.createElement("div");
  sparkle1.className = "room-prop";
  sparkle1.textContent = "✨";
  sparkle1.style.left = "45%";
  sparkle1.style.top = "25%";
  sparkle1.style.fontSize = "2rem";
  propsContainer.appendChild(sparkle1);

  const sparkle2 = document.createElement("div");
  sparkle2.className = "room-prop";
  sparkle2.textContent = "🔮";
  sparkle2.style.left = "48%";
  sparkle2.style.top = "78%";
  sparkle2.style.fontSize = "1.8rem";
  propsContainer.appendChild(sparkle2);
}

async function triggerPlayAnimation(emoji) {
  if (petParts.dataset.animating === "true") return;
  petParts.dataset.animating = "true";
  const rect = petParts.getBoundingClientRect();
  const toys = ["🎾", "🧸", "⚽", "🏀", "🪀"];
  const toyEmoji = emoji || toys[Math.floor(Math.random() * toys.length)];
  const toy = document.createElement("div");
  toy.className = "play-toy-item";
  toy.textContent = toyEmoji;
  toy.style.left = `${rect.left + rect.width / 2 - 16}px`;
  toy.style.top = `${rect.top - 40}px`;
  document.body.appendChild(toy);

  // Pet bounces excitedly
  petParts.classList.add("play-bounce");
  await sleep(200);

  // Toy falls down to pet
  toy.style.top = `${rect.top + rect.height * 0.2}px`;
  toy.classList.add("play-toy-bounce");
  await sleep(600);

  // Pet catches toy
  petParts.classList.remove("play-bounce");
  petParts.classList.add("play-catch");
  toy.classList.remove("play-toy-bounce");
  toy.classList.add("play-toy-caught");
  await sleep(300);
  toy.remove();

  // Happy sparkles
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      const emojis = ["⭐", "🌟", "✨", "💫"];
      spawnParticle(emojis[Math.floor(Math.random() * emojis.length)],
        rect.left + Math.random() * rect.width,
        rect.top + Math.random() * rect.height * 0.4
      );
    }, i * 150);
  }

  await sleep(1000);
  petParts.classList.remove("play-catch");
  petParts.dataset.animating = "false";
}

// ---------- 🚀 STARTUP ----------
async function init() {
  // Migrate old localStorage gallery to IndexedDB (one-time)
  await PetDB.migrateFromLocalStorage();

  const hasSave = loadGame();

  if (hasSave && gameState.createdAt) {
    // Restore the pet game screen
    showScreen("pet-game");

    // Position pet in viewport
    positionPet();
    switchRoom(gameState.currentRoom);

    // Apply missed decay
    applyMissedDecay();

    // Load cached image for current level, stripping any leftover background
    if (gameState.cachedImages[gameState.level]) {
      const raw = gameState.cachedImages[gameState.level];
      setPetImageSrc(raw); // show immediately

      if (gameState.bgCleaned && gameState.bgCleaned[gameState.level]) {
        // Already cleaned — skip expensive bg removal
      } else {
        removeImageBackground(raw).then((clean) => {
          setPetImageSrc(clean);
          gameState.cachedImages[gameState.level] = clean;
          if (!gameState.bgCleaned) gameState.bgCleaned = {};
          gameState.bgCleaned[gameState.level] = true;
          saveGame();
        });
      }
    }
    creatureDesc.textContent = buildDescription();

    updateGameDisplay();
    startDecayTimer();
    startIdleFidgets();
    startNeedDecayTimer();

    console.log("🔄 Loaded saved game!", gameState);
  } else {
    // Fresh start — show egg lab
    showScreen("egg-lab");
  }

  // Register Service Worker for offline / PWA
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

// ---------- ⏱️ UTILITY ----------
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Set image src on base + all 13 body-part layers
function setPetImageSrc(src) {
  petImgBase.src = src;
  for (const img of Object.values(petImgs)) {
    img.src = src;
  }
}

// ---------- BREED NAME MODAL ----------
function showBreedNameModal(suggestedName) {
  return new Promise((resolve) => {
    const overlay = $("breed-name-overlay");
    const input = $("breed-name-input");
    const btn = $("breed-name-confirm");
    input.value = suggestedName;
    overlay.classList.remove("hidden");
    overlay.style.display = "flex";
    input.focus();

    function finish() {
      overlay.style.display = "none";
      overlay.classList.add("hidden");
      btn.removeEventListener("click", onConfirm);
      input.removeEventListener("keydown", onKey);
    }
    function onConfirm() {
      const name = sanitizeName(input.value.trim()) || suggestedName;
      finish();
      resolve(name);
    }
    function onKey(e) {
      if (e.key === "Enter") onConfirm();
    }
    btn.addEventListener("click", onConfirm);
    input.addEventListener("keydown", onKey);
  });
}

// ---------- SOUND TOGGLES ----------
for (const id of ["btn-sound-lab", "btn-sound-game"]) {
  const btn = $(id);
  if (btn) {
    // Set initial label
    btn.textContent = PetAudio.enabled ? "🔊" : "🔇";
    btn.addEventListener("click", () => {
      PetAudio.toggle();
      // Sync both buttons
      for (const bid of ["btn-sound-lab", "btn-sound-game"]) {
        const b = $(bid);
        if (b) b.textContent = PetAudio.enabled ? "🔊" : "🔇";
      }
      PetAudio.play("click");
    });
  }
}

// ---------- SETTINGS BUTTONS ----------
for (const id of ["btn-settings", "btn-settings-game"]) {
  const btn = $(id);
  if (btn) {
    btn.addEventListener("click", () => {
      PetAudio.play("click");
    });
  }
}

// ---------- SHARE BUTTON ----------
{
  const btnShare = $("btn-share");
  if (btnShare) {
    btnShare.addEventListener("click", async () => {
      PetAudio.play("click");
      try {
        const img = petImgBase;
        if (!img || !img.src) return;

        // Draw current pet onto a canvas
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(0, 0, 512, 512);
        const tmpImg = new Image();
        tmpImg.crossOrigin = "anonymous";
        tmpImg.src = img.src;
        await new Promise((r) => { tmpImg.onload = r; tmpImg.onerror = r; });
        ctx.drawImage(tmpImg, 56, 56, 400, 400);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(gameState.petName || "My Pet", 256, 490);

        canvas.toBlob(async (blob) => {
          if (!blob) return;
          if (navigator.share && navigator.canShare) {
            const file = new File([blob], "petgrow-pet.png", { type: "image/png" });
            try {
              await navigator.share({ title: "PetGrow", text: `Check out my pet ${gameState.petName}!`, files: [file] });
            } catch { /* user cancelled */ }
          } else {
            // Fallback: download
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "petgrow-pet.png";
            a.click();
            URL.revokeObjectURL(a.href);
          }
        }, "image/png");
      } catch (err) {
        console.error("Share failed:", err);
      }
    });
  }
}

// ---------- GO! ----------
init();
