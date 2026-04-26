// ============================================================
//  PetGrow — Needs System
//  Pure JS — no Svelte imports.
// ============================================================
import {
  NEED_MAX,
  NEED_DECAY_AMOUNT,
  NEED_DECAY_INTERVAL_MS,
  NEED_ACTION_RESTORE,
  NEED_CRITICAL_THRESHOLD,
} from './constants.js';

// ---------- Helpers ----------

export function clampNeed(value) {
  return Math.max(0, Math.min(NEED_MAX, Math.round(value)));
}

export function getClickValue(needs) {
  const minNeed = Math.min(...Object.values(needs));
  if (minNeed === 0) return 0;
  if (minNeed <= NEED_CRITICAL_THRESHOLD) return 0.5;
  return 1;
}

/** Apply one tick of need decay, capped at NEED_MAX missed ticks. */
export function applyNeedDecay(needs, missedTicks = 1) {
  const capped = Math.min(missedTicks, 20);
  return {
    hunger:      clampNeed(needs.hunger      - NEED_DECAY_AMOUNT * capped),
    cleanliness: clampNeed(needs.cleanliness - NEED_DECAY_AMOUNT * capped),
    fun:         clampNeed(needs.fun         - NEED_DECAY_AMOUNT * capped),
    energy:      clampNeed(needs.energy      - NEED_DECAY_AMOUNT * capped),
  };
}

/** Calculate missed need decay ticks from the last decay timestamp. */
export function calcMissedNeedTicks(lastNeedDecayTime) {
  const elapsed = Date.now() - lastNeedDecayTime;
  return Math.floor(elapsed / NEED_DECAY_INTERVAL_MS);
}

// ---------- Action resolvers (return updated state slices) ----------

export function doFeed(needs, clicks) {
  const cv = getClickValue(needs);
  const newNeeds = {
    ...needs,
    hunger: clampNeed(needs.hunger + NEED_ACTION_RESTORE),
    energy: clampNeed(needs.energy - 3),
  };
  let newClicks = clicks;
  if (cv >= 1) newClicks += 1;
  else if (cv > 0 && Math.random() < cv) newClicks += 1;
  return { needs: newNeeds, clicks: newClicks, tooSad: cv <= 0 };
}

export function doClean(needs, clicks) {
  const cv = getClickValue(needs);
  const newNeeds = {
    ...needs,
    cleanliness: clampNeed(needs.cleanliness + NEED_ACTION_RESTORE),
    energy: clampNeed(needs.energy - 3),
  };
  let newClicks = clicks;
  if (cv >= 1) newClicks += 1;
  else if (cv > 0 && Math.random() < cv) newClicks += 1;
  return { needs: newNeeds, clicks: newClicks, tooSad: cv <= 0 };
}

export function doPlay(needs, clicks) {
  const cv = getClickValue(needs);
  const newNeeds = {
    ...needs,
    fun: clampNeed(needs.fun + NEED_ACTION_RESTORE),
    energy: clampNeed(needs.energy - 5),
  };
  let newClicks = clicks;
  if (cv >= 1) newClicks += 1;
  else if (cv > 0 && Math.random() < cv) newClicks += 1;
  return { needs: newNeeds, clicks: newClicks, tooSad: cv <= 0 };
}

export function doSleep(needs, clicks) {
  const cv = getClickValue(needs);
  const newNeeds = {
    ...needs,
    energy: clampNeed(needs.energy + NEED_ACTION_RESTORE + 10),
    hunger: clampNeed(needs.hunger - 3),
  };
  let newClicks = clicks;
  if (cv >= 1) newClicks += 1;
  else if (cv > 0 && Math.random() < cv) newClicks += 1;
  return { needs: newNeeds, clicks: newClicks, tooSad: cv <= 0 };
}
