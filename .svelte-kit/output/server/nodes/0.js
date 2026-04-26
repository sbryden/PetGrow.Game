

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export const universal = {
  "ssr": false,
  "prerender": false
};
export const universal_id = "src/routes/+layout.js";
export const imports = ["_app/immutable/nodes/0.BY1InQty.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/JE11dUaq.js","_app/immutable/chunks/DIeogL5L.js","_app/immutable/chunks/PMhZEVWn.js","_app/immutable/chunks/BWQsIKAJ.js","_app/immutable/chunks/B4qkNomF.js","_app/immutable/chunks/BltaUxeX.js"];
export const stylesheets = ["_app/immutable/assets/0.BsUNqzeH.css"];
export const fonts = [];
