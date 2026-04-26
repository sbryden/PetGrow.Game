// ============================================================
//  PetGrow — Shared Constants
// ============================================================

export const GEMINI_MODEL = 'gemini-2.5-flash-image';
export const GEMINI_URL = '/api/generate';
export const PING_URL = '/api/ping';
export const CLIENT_API_KEY_STORAGE_KEY = 'petgrow_gemini_api_key';
export const LEVEL_BABY = 'Baby';
export const LEVEL_TEEN = 'Teenager';
export const LEVEL_LEGEND = 'Legendary Adult';

export const TEEN_THRESHOLD = 20;
export const LEGEND_THRESHOLD = 50;

export const DECAY_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
export const NEED_MAX = 100;
export const NEED_DECAY_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
export const NEED_DECAY_AMOUNT = 8;
export const NEED_ACTION_RESTORE = 25;
export const NEED_WARN_THRESHOLD = 30;
export const NEED_CRITICAL_THRESHOLD = 15;

export const PLATFORM_ROOM_ID = 'platform';

export const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export const PET_JOBS = [
  { id: 'knight',     name: 'Knight',      emoji: '⚔️',  desc: 'Sworn to protect the realm',             promptMod: 'wearing shining knight armor, a shield on its back, a noble crest, chivalrous warrior vibe' },
  { id: 'chef',       name: 'Chef',        emoji: '👨‍🍳', desc: 'Master of the kitchen arts',              promptMod: 'wearing a chef hat and apron, holding a spatula, surrounded by steam and delicious food' },
  { id: 'wizard',     name: 'Wizard',      emoji: '🧙',  desc: 'Wielder of ancient magic',               promptMod: 'wearing a wizard robe and pointed hat, glowing magic runes, holding a staff crackling with arcane energy' },
  { id: 'mechanic',   name: 'Mechanic',    emoji: '🔧',  desc: 'Can fix anything with bolts and grease', promptMod: 'wearing mechanic overalls covered in grease, holding a wrench, gears and cogs floating around, steampunk vibe' },
  { id: 'musician',   name: 'Musician',    emoji: '🎸',  desc: 'Rocks the stage with epic tunes',        promptMod: 'holding an electric guitar, wearing rockstar outfit, musical notes and sound waves floating around, stage lights' },
  { id: 'explorer',   name: 'Explorer',    emoji: '🧭',  desc: 'Charting unknown lands',                 promptMod: 'wearing an explorer hat and adventurer gear, binoculars around neck, a treasure map, jungle vines background' },
  { id: 'scientist',  name: 'Scientist',   emoji: '🔬',  desc: 'Pushing the boundaries of knowledge',    promptMod: 'wearing a lab coat and safety goggles, holding a bubbling test tube, surrounded by beakers and formulas' },
  { id: 'artist',     name: 'Artist',      emoji: '🎨',  desc: 'Paints masterpieces with flair',         promptMod: 'wearing a paint-splattered beret, holding a paintbrush and palette, colorful paint splatters everywhere' },
  { id: 'gardener',   name: 'Gardener',    emoji: '🌻',  desc: 'Grows the most beautiful flowers',       promptMod: 'wearing a straw hat, holding a watering can, flowers and vines growing all around, butterflies nearby' },
  { id: 'healer',     name: 'Healer',      emoji: '💚',  desc: 'Mends wounds with gentle magic',         promptMod: 'wearing a white healer robe with green glowing hands, surrounded by healing sparkles, gentle angelic aura' },
  { id: 'blacksmith', name: 'Blacksmith',  emoji: '🔨',  desc: 'Forges legendary weapons',               promptMod: 'wearing a leather blacksmith apron, holding a glowing hammer near an anvil, sparks flying, molten metal' },
  { id: 'pirate',     name: 'Pirate',      emoji: '🏴‍☠️', desc: 'Sails the seven seas for treasure',      promptMod: 'wearing a pirate hat and eyepatch, a cutlass in hand, pirate ship wheel behind, ocean waves' },
  { id: 'detective',  name: 'Detective',   emoji: '🔍',  desc: 'No mystery goes unsolved',               promptMod: 'wearing a detective trench coat and deerstalker hat, holding a magnifying glass, clue board with strings' },
  { id: 'athlete',    name: 'Athlete',     emoji: '🏅',  desc: 'Strongest and fastest of all',           promptMod: 'wearing athletic gear and a gold medal, muscular pose, stadium lights, champion energy' },
  { id: 'scholar',    name: 'Scholar',     emoji: '📚',  desc: 'Knows every secret of the world',        promptMod: 'wearing reading glasses and a scholar robe, surrounded by floating ancient books, quill pen, glowing wisdom runes' },
  { id: 'jester',     name: 'Jester',      emoji: '🃏',  desc: 'The funniest creature alive',            promptMod: 'wearing a colorful jester hat with bells, juggling balls, confetti everywhere, silly grin, party vibe' },
  { id: 'ranger',     name: 'Ranger',      emoji: '🏹',  desc: 'Guardian of the wild forests',           promptMod: 'wearing a green ranger cloak, holding a bow and arrow, a wolf companion beside, forest canopy' },
  { id: 'alchemist',  name: 'Alchemist',   emoji: '⚗️',  desc: 'Turns base metals into gold',            promptMod: 'wearing an alchemist robe, surrounded by glowing potions and flasks, transmutation circles, mystical smoke' },
  { id: 'ninja',      name: 'Ninja',       emoji: '🥷',  desc: 'Silent and deadly in the shadows',       promptMod: 'wearing a dark ninja outfit and mask, holding shuriken, shadow clones behind, smoke bombs, stealthy' },
  { id: 'astronaut',  name: 'Astronaut',   emoji: '🚀',  desc: 'Boldly exploring the cosmos',            promptMod: 'wearing a space suit and helmet, floating in zero gravity, stars and planets behind, rocket ship nearby' },
];

export const NO_JOB = {
  id: 'none',
  name: 'No Job',
  emoji: '🦥',
  desc: 'Just vibing... no ambition whatsoever',
  promptMod: 'looking lazy and slobby, messy unkempt fur/skin, crumbs and stains, slouching posture, bags under eyes, wearing a stained oversized t-shirt, couch potato energy, crusty and disheveled',
};

export const ROOMS = [
  { id: PLATFORM_ROOM_ID, name: 'The House',     emoji: '🏠', actions: [] },
  { id: 'lab',            name: 'Lab',           emoji: '🧪', actions: [] },
  { id: 'lab-science',    name: 'Science Room',  emoji: '🔬', actions: [] },
  { id: 'lab-mix',        name: "Mix N' Mix",    emoji: '🧬', actions: [] },
  { id: 'lab-breeding',   name: 'Breeding',      emoji: '💕', actions: [] },
  { id: 'lab-potions',    name: 'Potions Room',  emoji: '⚗️', actions: [] },
  { id: 'lab-enhancement',name: 'Enhancement',   emoji: '⬆️', actions: [] },
  { id: 'feeding',        name: 'Feeding Room',  emoji: '🍖', actions: ['feed'] },
  { id: 'bathroom',       name: 'Bathroom',      emoji: '🧼', actions: ['clean'] },
  { id: 'playroom',       name: 'Playroom',      emoji: '🎾', actions: ['play'] },
  { id: 'bedroom',        name: 'Bedroom',       emoji: '🛏️', actions: ['sleep'] },
  { id: 'breeding',       name: 'Breeding Room', emoji: '🥚', actions: ['breed'] },
];

export const RARITY_LEVELS = [
  { name: 'Common',   cls: 'common',   min: 1 },
  { name: 'Uncommon', cls: 'uncommon', min: 2 },
  { name: 'Rare',     cls: 'rare',     min: 3 },
  { name: 'Epic',     cls: 'epic',     min: 4 },
];

export function calculateRarity(ingredients) {
  const count = Object.values(ingredients).filter(Boolean).length;
  for (let i = RARITY_LEVELS.length - 1; i >= 0; i--) {
    if (count >= RARITY_LEVELS[i].min) return RARITY_LEVELS[i];
  }
  return RARITY_LEVELS[0];
}

export const CREATURE_NAMES = [
  'Blobkin','Fizzwick','Snortleby','Glimmer','Wobblefang','Puffnoodle','Zazzle','Sprocket',
  'Noodle','Chompy','Thistlewig','Grumblix','Snugglepaws','Brindle','Mochi','Cinder',
  'Dazzle','Puddles','Sparky','Fizzbeak','Twixle','Snappy','Gloopster','Rumblefuzz',
  'Pebbletoe','Whumper','Zigzag','Tangle','Clonk','Breezy','Frizzle','Jelly',
  'Blorp','Squish','Doodle','Pipsqueak','Fudge','Bonkers','Quirk','Zippy',
  'Swifty','Crunch','Nuzzle','Tater','Wriggle','Lumpy','Skitter','Bamble',
  'Flicker','Cobble','Murkle','Sprout','Fern','Gust','Ember','Frost',
  'Pebble','Marble','Slate','Flint','Coral','Mossy','Ripple','Glint',
  'Thorn','Wisp','Shadow','Nimbus','Dewdrop','Smolder','Echo','Zephyr',
  'Ruckus','Giggles','Mischief','Chaos','Bandit','Rascal','Pickle','Biscuit',
  'Pretzel','Nacho','Muffin','Donut','Waffles','Churro','Taco','Boba',
  'Suki','Nori','Miso','Tofu','Wasabi','Kiwi','Mango','Papaya',
  'Orbit','Comet','Nova','Quasar','Pulsar','Nebula','Cosmo','Lyra',
  'Pixel','Byte','Glitch','Vector','Matrix','Codec','Neon','Arcade',
  'Pounce','Tumble','Lurch','Galumph','Shamble','Scuttle','Waddly','Prowler',
];

export function createInitialGameState() {
  return {
    ingredients: { animal: null, color: null, wildcard: null, element: null },
    petName: '',
    clicks: 0,
    level: LEVEL_BABY,
    cachedImages: {},
    lastDecayTime: Date.now(),
    createdAt: null,
    petX: null,
    petY: null,
    currentRoom: PLATFORM_ROOM_ID,
    needs: {
      hunger: NEED_MAX,
      cleanliness: NEED_MAX,
      fun: NEED_MAX,
      energy: NEED_MAX,
    },
    lastNeedDecayTime: Date.now(),
    job: null,
    parentJobs: [],
    bgCleaned: {},
    renderModes: {},
    labFloor: 1,
    labElevatorScrolling: false,
  };
}
