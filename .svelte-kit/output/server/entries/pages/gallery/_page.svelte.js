import { a as attr_class, b as stringify, c as attr, e as escape_html, d as ensure_array_like, f as derived } from "../../../chunks/root.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/state.svelte.js";
import { c as calculateRarity, T as TRANSPARENT_PIXEL, g as gameStore } from "../../../chunks/GameState.svelte.js";
import { B as BackendStatus } from "../../../chunks/BackendStatus.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let sortBy = "retiredAt";
    let activeCreature = derived(() => gameStore.data.createdAt && gameStore.data.petName ? gameStore.data : null);
    $$renderer2.push(`<div class="gallery screen svelte-16h6p05"><header class="gallery-header svelte-16h6p05"><h1 class="title svelte-16h6p05">My Creatures</h1> <p class="subtitle svelte-16h6p05">Your collection of hatched creatures</p> `);
    BackendStatus($$renderer2);
    $$renderer2.push(`<!----></header> <div class="gallery-body svelte-16h6p05">`);
    if (activeCreature()) {
      $$renderer2.push("<!--[0-->");
      const activeRarity = calculateRarity(activeCreature().ingredients || {});
      $$renderer2.push(`<section class="active-section svelte-16h6p05"><p class="active-label svelte-16h6p05">Current Creature</p> <div${attr_class(`active-card ${stringify(activeRarity.cls)}`, "svelte-16h6p05")}><div class="active-preview svelte-16h6p05"><img class="active-img svelte-16h6p05"${attr("src", activeCreature().cachedImages?.[activeCreature().level] || activeCreature().cachedImages?.raw || TRANSPARENT_PIXEL)}${attr("alt", activeCreature().petName)}/></div> <div class="active-info svelte-16h6p05"><p class="active-name svelte-16h6p05">${escape_html(activeCreature().petName)}</p> <p class="active-meta svelte-16h6p05">Level: ${escape_html(activeCreature().level)}</p> <p class="active-meta svelte-16h6p05">⭐ ${escape_html(activeCreature().clicks || 0)} clicks</p> `);
      if (activeCreature().job) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<p class="active-meta svelte-16h6p05">${escape_html(activeCreature().job.emoji)} ${escape_html(activeCreature().job.name)}</p>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div></div> `);
      if (activeCreature().ingredients) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="active-tags svelte-16h6p05"><!--[-->`);
        const each_array = ensure_array_like(Object.entries({
          animal: "Animal",
          color: "Color",
          wildcard: "Wild Card",
          element: "Element"
        }));
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let [key, label] = each_array[$$index];
          if (activeCreature().ingredients[key]) {
            $$renderer2.push("<!--[0-->");
            $$renderer2.push(`<span class="tag svelte-16h6p05">${escape_html(label)}: ${escape_html(activeCreature().ingredients[key])}</span>`);
          } else {
            $$renderer2.push("<!--[-1-->");
          }
          $$renderer2.push(`<!--]-->`);
        }
        $$renderer2.push(`<!--]--></div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <button class="btn-continue svelte-16h6p05">▶ Continue Current Creature</button></section>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="sort-bar svelte-16h6p05"><span class="sort-label svelte-16h6p05">Sort by:</span> `);
    $$renderer2.select(
      { class: "sort-select", value: sortBy },
      ($$renderer3) => {
        $$renderer3.option({ value: "retiredAt" }, ($$renderer4) => {
          $$renderer4.push(`Newest First`);
        });
        $$renderer3.option({ value: "clicks" }, ($$renderer4) => {
          $$renderer4.push(`Most Clicks`);
        });
        $$renderer3.option({ value: "name" }, ($$renderer4) => {
          $$renderer4.push(`Name`);
        });
      },
      "svelte-16h6p05"
    );
    $$renderer2.push(`</div> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="empty-state svelte-16h6p05">Loading...</div>`);
    }
    $$renderer2.push(`<!--]--></div> <footer class="gallery-footer svelte-16h6p05"><button class="btn-footer btn-footer-primary svelte-16h6p05">Create New Creature</button> <button class="btn-footer btn-footer-secondary svelte-16h6p05">Back</button></footer></div>`);
  });
}
export {
  _page as default
};
