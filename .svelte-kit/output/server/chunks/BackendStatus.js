import { a as attr_class, c as attr, f as derived, b as stringify } from "./root.js";
function BackendStatus($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let status = "checking";
    let title = derived(() => "Backend: checking…");
    $$renderer2.push(`<span${attr_class(`dot ${stringify(status)}`, "svelte-iwmgw2")}${attr("title", title())}></span>`);
  });
}
export {
  BackendStatus as B
};
