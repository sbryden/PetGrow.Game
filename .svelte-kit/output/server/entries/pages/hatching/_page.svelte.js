import { a as attr_class } from "../../../chunks/root.js";
import { o as onDestroy } from "../../../chunks/index-server.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/state.svelte.js";
import "../../../chunks/GameState.svelte.js";
import "../../../chunks/audio.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let dotTimer;
    onDestroy(() => {
      clearInterval(dotTimer);
    });
    $$renderer2.push(`<div class="hatching screen svelte-u9dp4z"><div class="card svelte-u9dp4z"><div${attr_class("egg-anim svelte-u9dp4z", void 0, { "done": true })}><div class="glow-ring svelte-u9dp4z"></div> <div class="egg-pulse svelte-u9dp4z">🥚</div></div> <h2 class="title svelte-u9dp4z">`);
    {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`Creature born!`);
    }
    $$renderer2.push(`<!--]--></h2> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div></div>`);
  });
}
export {
  _page as default
};
