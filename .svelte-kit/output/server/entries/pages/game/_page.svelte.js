import { e as escape_html, d as ensure_array_like, h as attr_style, a as attr_class, i as clsx, c as attr, f as derived, b as stringify } from "../../../chunks/root.js";
import { o as onDestroy } from "../../../chunks/index-server.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/state.svelte.js";
import { R as ROOMS, g as gameStore, T as TRANSPARENT_PIXEL, P as PLATFORM_ROOM_ID, N as NEED_CRITICAL_THRESHOLD, a as NEED_WARN_THRESHOLD } from "../../../chunks/GameState.svelte.js";
import { i as isEnabled } from "../../../chunks/audio.js";
import { B as BackendStatus } from "../../../chunks/BackendStatus.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let petImage = derived(() => gameStore.data.cachedImages?.[gameStore.data.level] ?? gameStore.data.cachedImages?.raw ?? TRANSPARENT_PIXEL);
    let currentRoomId = derived(() => gameStore.data.currentRoom || PLATFORM_ROOM_ID);
    let currentRoom = derived(() => ROOMS.find((r) => r.id === currentRoomId()) || ROOMS[0]);
    let actions = derived(() => currentRoom()?.actions || []);
    let needs = derived(() => gameStore.data.needs || { hunger: 100, cleanliness: 100, fun: 100, energy: 100 });
    let petName = derived(() => gameStore.data.petName || "");
    let level = derived(() => gameStore.data.level || "Baby");
    let clicks = derived(() => gameStore.data.clicks || 0);
    let job = derived(() => gameStore.data.job);
    let labFloor = derived(() => gameStore.data.labFloor ?? 1);
    let roomBgClass = derived(() => `room-bg room-${currentRoomId()}${currentRoomId() === "lab" && labFloor() === 2 ? " lab-floor-2" : ""}`);
    let audioOn = isEnabled();
    let rafId;
    let needTimer;
    function needColor(v) {
      return v <= NEED_CRITICAL_THRESHOLD ? "#e94560" : v <= NEED_WARN_THRESHOLD ? "#ffd700" : "#00e676";
    }
    onDestroy(() => {
      clearInterval(needTimer);
      cancelAnimationFrame(rafId);
    });
    $$renderer2.push(`<div class="pet-game screen svelte-4p1id7"><header class="top-bar svelte-4p1id7"><div class="header-left svelte-4p1id7"><button class="btn-icon svelte-4p1id7" title="Gallery">🐾</button> `);
    BackendStatus($$renderer2);
    $$renderer2.push(`<!----></div> <div class="pet-info svelte-4p1id7"><span class="pet-name svelte-4p1id7">${escape_html(petName())}</span> <span class="pet-level svelte-4p1id7">${escape_html(level())}${escape_html(job() ? ` · ${job().emoji} ${job().name}` : "")}</span></div> <button class="btn-icon svelte-4p1id7" title="Toggle sound">${escape_html(audioOn ? "🔊" : "🔇")}</button></header> <div class="needs-bar svelte-4p1id7"><!--[-->`);
    const each_array = ensure_array_like([
      ["🍖", needs().hunger],
      ["🧼", needs().cleanliness],
      ["🎾", needs().fun],
      ["😴", needs().energy]
    ]);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let [icon, val] = each_array[$$index];
      $$renderer2.push(`<div class="need svelte-4p1id7"><span class="need-icon svelte-4p1id7">${escape_html(icon)}</span> <div class="need-track svelte-4p1id7"><div class="need-fill svelte-4p1id7"${attr_style(`width: ${stringify(val)}%; background: ${stringify(needColor(val))};`)}></div></div> <span class="need-val svelte-4p1id7"${attr_style(`color: ${stringify(needColor(val))}`)}>${escape_html(val)}</span></div>`);
    }
    $$renderer2.push(`<!--]--></div> <div class="game-world svelte-4p1id7" role="application" aria-label="Game world"><div class="scene-root svelte-4p1id7"><div${attr_class(clsx(roomBgClass()), "svelte-4p1id7")}></div> <div class="room-props svelte-4p1id7"></div> <div class="pet-parts svelte-4p1id7"><img class="pet-part-img svelte-4p1id7"${attr("src", petImage())}${attr("alt", petName())}/></div></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> `);
    if (actions().length > 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="action-bar svelte-4p1id7"><!--[-->`);
      const each_array_1 = ensure_array_like(actions());
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let action = each_array_1[$$index_1];
        $$renderer2.push(`<button class="btn-action svelte-4p1id7">${escape_html(action === "feed" ? "🍖 Feed" : action === "clean" ? "🧼 Clean" : action === "play" ? "🎾 Play" : action === "sleep" ? "😴 Sleep" : action === "breed" ? "🥚 Breed" : action)}</button>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <nav class="room-nav svelte-4p1id7"><div class="room-scroll svelte-4p1id7"><!--[-->`);
    const each_array_2 = ensure_array_like(ROOMS);
    for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
      let room = each_array_2[$$index_2];
      $$renderer2.push(`<button${attr_class("room-btn svelte-4p1id7", void 0, { "active": room.id === currentRoomId() })}><span class="room-emoji svelte-4p1id7">${escape_html(room.emoji)}</span> <span class="room-name svelte-4p1id7">${escape_html(room.name)}</span></button>`);
    }
    $$renderer2.push(`<!--]--></div></nav> <footer class="bottom-bar svelte-4p1id7"><span class="clicks-label svelte-4p1id7">⭐ ${escape_html(clicks())} clicks</span> <button class="btn-hibernate svelte-4p1id7">Hibernate</button></footer></div>`);
  });
}
export {
  _page as default
};
