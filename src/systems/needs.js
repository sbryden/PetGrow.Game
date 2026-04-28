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
  NEED_MAX_MISSED_TICKS,
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

/** Apply one tick of need decay, capped at NEED_MAX_MISSED_TICKS. */
export function applyNeedDecay(needs, missedTicks = 1) {
  // Floor at 0 (negatives would *raise* needs via subtraction sign-flip)
  // and cap at NEED_MAX_MISSED_TICKS (prevents one offline week from
  // zeroing every need on return).
  const safe = Math.max(0, Math.min(missedTicks, NEED_MAX_MISSED_TICKS));
  return {
    hunger:      clampNeed(needs.hunger      - NEED_DECAY_AMOUNT * safe),
    cleanliness: clampNeed(needs.cleanliness - NEED_DECAY_AMOUNT * safe),
    fun:         clampNeed(needs.fun         - NEED_DECAY_AMOUNT * safe),
    energy:      clampNeed(needs.energy      - NEED_DECAY_AMOUNT * safe),
  };
}

/** Calculate missed need decay ticks from the last decay timestamp. */
export function calcMissedNeedTicks(lastNeedDecayTime) {
  // Guard against future timestamps (clock skew, system clock changes,
  // restoring a save from a device whose clock was ahead). A negative
  // elapsed value would otherwise become a negative tick count which the
  // caller then clamps with Math.min, leaking a negative through to
  // applyNeedDecay and *increasing* needs.
  const elapsed = Date.now() - lastNeedDecayTime;
  if (!Number.isFinite(elapsed) || elapsed <= 0) return 0;
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
  return { needs: newNeeds, clicks: newClicks, tooSad: cv < 1 };
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
  return { needs: newNeeds, clicks: newClicks, tooSad: cv < 1 };
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
  return { needs: newNeeds, clicks: newClicks, tooSad: cv < 1 };
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
  return { needs: newNeeds, clicks: newClicks, tooSad: cv < 1 };
}
