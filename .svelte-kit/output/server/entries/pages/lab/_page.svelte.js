import { a as attr_class, d as ensure_array_like, c as attr, e as escape_html, b as stringify, h as attr_style, f as derived } from "../../../chunks/root.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/state.svelte.js";
import { I as INGREDIENT_EMOJIS, b as INGREDIENT_OPTIONS } from "../../../chunks/GameState.svelte.js";
import { p as play } from "../../../chunks/audio.js";
import { B as BackendStatus } from "../../../chunks/BackendStatus.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const OPTIONS = INGREDIENT_OPTIONS;
    const EMOJIS = INGREDIENT_EMOJIS;
    function optionLabel(category, opt) {
      const emoji = EMOJIS[category]?.[opt];
      return emoji ? `${emoji} ${opt}` : opt;
    }
    const SERUM_COLORS = [
      "#e94560",
      "#00d2ff",
      "#ffd700",
      "#00e676",
      "#b388ff",
      "#ff6f00",
      "#e040fb",
      "#76ff03",
      "#ff1744",
      "#00e5ff",
      "#ffab00",
      "#651fff",
      "#1de9b6",
      "#f50057",
      "#3d5afe"
    ];
    let petName = "";
    let ingredients = { animal: null, color: null, wildcard: null, element: null };
    let syringeVisible = false;
    let syringeColor = "#00d2ff";
    let syringeAnimating = false;
    let hasAnimal = derived(() => !!ingredients.animal);
    let hasName = derived(() => petName.trim().length > 0);
    let canHatch = derived(() => hasAnimal() && hasName());
    let hasAnyIngredient = derived(() => Object.values(ingredients).some(Boolean));
    let hint = derived(() => {
      if (hasAnimal() && hasName()) return { text: "Ready to hatch!", color: "#00e676" };
      if (hasAnimal()) return { text: "Now give your creature a name!", color: "#ffd700" };
      return {
        text: "Pick at least a Base Animal and give it a name!",
        color: ""
      };
    });
    async function onIngredientChange(category, value) {
      if (value) {
        ingredients = { ...ingredients, [category]: value };
        syringeColor = SERUM_COLORS[Math.floor(Math.random() * SERUM_COLORS.length)];
        syringeVisible = true;
        syringeAnimating = true;
        play("inject");
        await sleep(2200);
        syringeVisible = false;
        syringeAnimating = false;
      } else {
        ingredients = { ...ingredients, [category]: null };
      }
    }
    function sleep(ms) {
      return new Promise((r) => setTimeout(r, ms));
    }
    $$renderer2.push(`<div class="egg-lab screen svelte-9xkyrc"><header class="lab-header svelte-9xkyrc"><h1 class="title svelte-9xkyrc">PetGrow</h1> <div class="header-right svelte-9xkyrc">`);
    BackendStatus($$renderer2);
    $$renderer2.push(`<!----> <button class="btn-icon svelte-9xkyrc" title="My Creatures">🐾</button></div></header> <div class="egg-wrap svelte-9xkyrc"><div${attr_class("egg svelte-9xkyrc", void 0, { "has-ingredients": hasAnyIngredient() })}><div class="egg-shell svelte-9xkyrc"></div> <div class="egg-shine svelte-9xkyrc"></div></div> `);
    if (syringeVisible) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div${attr_class("syringe-overlay svelte-9xkyrc", void 0, { "animating": syringeAnimating })}><div${attr_class("syringe svelte-9xkyrc", void 0, { "inject": syringeAnimating })}><div${attr_class("syringe-serum svelte-9xkyrc", void 0, { "emptying": syringeAnimating })}${attr_style(`background: ${stringify(syringeColor)};`)}></div> <div${attr_class("syringe-plunger-handle svelte-9xkyrc", void 0, { "pushed": syringeAnimating })}></div></div> <div${attr_class("injection-splash svelte-9xkyrc", void 0, { "active": syringeAnimating })}${attr_style(`background: ${stringify(syringeColor)}; box-shadow: 0 0 12px ${stringify(syringeColor)};`)}></div></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <section class="pickers svelte-9xkyrc"><!--[-->`);
    const each_array = ensure_array_like(Object.entries(OPTIONS));
    for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
      let [category, options] = each_array[$$index_1];
      $$renderer2.push(`<div class="picker-row svelte-9xkyrc"><label class="picker-label svelte-9xkyrc"${attr("for", `pick-${stringify(category)}`)}>${escape_html(category === "animal" ? "🐾 Base Animal" : category === "color" ? "🎨 Color / Material" : category === "wildcard" ? "🔮 Wild Card" : "⚡ Element")}</label> `);
      $$renderer2.select(
        {
          id: `pick-${stringify(category)}`,
          class: "ingredient-select",
          value: ingredients[category] || "",
          onchange: (e) => onIngredientChange(category, e.target.value)
        },
        ($$renderer3) => {
          $$renderer3.option({ value: "" }, ($$renderer4) => {
            $$renderer4.push(`— None —`);
          });
          $$renderer3.push(`<!--[-->`);
          const each_array_1 = ensure_array_like(options);
          for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
            let opt = each_array_1[$$index];
            $$renderer3.option({ value: opt }, ($$renderer4) => {
              $$renderer4.push(`${escape_html(optionLabel(category, opt))}`);
            });
          }
          $$renderer3.push(`<!--]-->`);
        },
        "svelte-9xkyrc",
        { "has-value": !!ingredients[category] }
      );
      $$renderer2.push(`</div>`);
    }
    $$renderer2.push(`<!--]--></section> <section class="name-section svelte-9xkyrc"><label class="picker-label svelte-9xkyrc" for="pet-name">✏️ Name your creature</label> <div class="name-row svelte-9xkyrc"><input id="pet-name" class="name-input svelte-9xkyrc" type="text" maxlength="30" placeholder="Give it a name..."${attr("value", petName)}/> <button class="btn-dice svelte-9xkyrc" title="Random name">🎲</button></div></section> <div class="hatch-section svelte-9xkyrc"><p class="hatch-hint svelte-9xkyrc"${attr_style(`color: ${stringify(hint().color || "inherit")}`)}>${escape_html(hint().text)}</p> <button class="btn-hatch svelte-9xkyrc"${attr("disabled", !canHatch(), true)}>HATCH!</button></div></div>`);
  });
}
export {
  _page as default
};
