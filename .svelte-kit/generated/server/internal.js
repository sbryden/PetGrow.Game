
import root from '../root.js';
import { set_building, set_prerendering } from '__sveltekit/environment';
import { set_assets } from '$app/paths/internal/server';
import { set_manifest, set_read_implementation } from '__sveltekit/server';
import { set_private_env, set_public_env } from '../../../node_modules/@sveltejs/kit/src/runtime/shared-server.js';

export const options = {
	app_template_contains_nonce: false,
	async: false,
	csp: {"mode":"auto","directives":{"upgrade-insecure-requests":false,"block-all-mixed-content":false},"reportOnly":{"upgrade-insecure-requests":false,"block-all-mixed-content":false}},
	csrf_check_origin: true,
	csrf_trusted_origins: [],
	embedded: false,
	env_public_prefix: 'PUBLIC_',
	env_private_prefix: '',
	hash_routing: false,
	hooks: null, // added lazily, via `get_hooks`
	preload_strategy: "modulepreload",
	root,
	service_worker: false,
	service_worker_options: undefined,
	server_error_boundaries: false,
	templates: {
		app: ({ head, body, assets, nonce, env }) => "<!DOCTYPE html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"UTF-8\" />\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n    <meta name=\"theme-color\" content=\"#00d2ff\" />\n    <title>PetGrow — Egg Mixer</title>\n    <link rel=\"icon\" href=\"" + assets + "/icon.svg\" type=\"image/svg+xml\" />\n    <link rel=\"manifest\" href=\"" + assets + "/manifest.webmanifest\" />\n    <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\" />\n    <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin />\n    <link href=\"https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Pixelify+Sans:wght@400;500;700&display=swap\" rel=\"stylesheet\" />\n    " + head + "\n  <style>\n    #boot-loading {\n      position: fixed;\n      inset: 0;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      background: #0c0e14;\n      z-index: 9999;\n      transition: opacity 0.4s ease;\n    }\n    #boot-loading.fade-out {\n      opacity: 0;\n      pointer-events: none;\n    }\n    .boot-loading-card {\n      width: min(100%, 420px);\n      display: flex;\n      flex-direction: column;\n      align-items: center;\n      gap: 18px;\n      padding: 28px 24px;\n      border: 2px solid rgba(0, 210, 255, 0.25);\n      border-radius: 24px;\n      background:\n        radial-gradient(circle at top, rgba(0, 210, 255, 0.18), transparent 55%),\n        rgba(10, 16, 28, 0.88);\n      box-shadow:\n        0 18px 42px rgba(0, 0, 0, 0.45),\n        0 0 28px rgba(0, 210, 255, 0.16);\n    }\n    .boot-loading-animation {\n      position: relative;\n      width: 124px;\n      height: 124px;\n      display: grid;\n      place-items: center;\n    }\n    .boot-loading-ring {\n      position: absolute;\n      inset: 0;\n      border: 3px solid rgba(0, 210, 255, 0.14);\n      border-top-color: #00d2ff;\n      border-radius: 50%;\n      animation: boot-spin 1.2s linear infinite;\n    }\n    .boot-loading-ring-delay {\n      inset: 14px;\n      border-color: rgba(255, 215, 0, 0.14);\n      border-top-color: #ffd700;\n      animation-direction: reverse;\n      animation-duration: 1.6s;\n    }\n    .boot-loading-core {\n      font-size: 2.8rem;\n      filter: drop-shadow(0 0 14px rgba(255, 215, 0, 0.35));\n      animation: boot-pulse 1.1s ease-in-out infinite;\n    }\n    .boot-loading-title {\n      font-family: 'Pixelify Sans', 'Press Start 2P', monospace;\n      font-size: 1.6rem;\n      color: #00d2ff;\n      text-shadow: 0 0 12px rgba(0, 210, 255, 0.5);\n      margin: 0;\n    }\n    .boot-loading-text {\n      font-family: 'Pixelify Sans', 'Press Start 2P', monospace;\n      font-size: 0.85rem;\n      color: #8899bb;\n      text-align: center;\n    }\n    @keyframes boot-spin {\n      from { transform: rotate(0deg); }\n      to { transform: rotate(360deg); }\n    }\n    @keyframes boot-pulse {\n      0%, 100% { transform: scale(0.96); opacity: 0.85; }\n      50% { transform: scale(1.04); opacity: 1; }\n    }\n  </style>\n  </head>\n  <body data-sveltekit-preload-data=\"off\">\n    <div id=\"boot-loading\" aria-live=\"polite\">\n      <div class=\"boot-loading-card\">\n        <div class=\"boot-loading-animation\" aria-hidden=\"true\">\n          <span class=\"boot-loading-ring\"></span>\n          <span class=\"boot-loading-ring boot-loading-ring-delay\"></span>\n          <span class=\"boot-loading-core\">🥚</span>\n        </div>\n        <h1 class=\"boot-loading-title\">PetGrow</h1>\n        <p class=\"boot-loading-text\">Loading your creatures...</p>\n      </div>\n    </div>\n    " + body + "\n  </body>\n</html>\n",
		error: ({ status, message }) => "<!doctype html>\n<html lang=\"en\">\n\t<head>\n\t\t<meta charset=\"utf-8\" />\n\t\t<title>" + message + "</title>\n\n\t\t<style>\n\t\t\tbody {\n\t\t\t\t--bg: white;\n\t\t\t\t--fg: #222;\n\t\t\t\t--divider: #ccc;\n\t\t\t\tbackground: var(--bg);\n\t\t\t\tcolor: var(--fg);\n\t\t\t\tfont-family:\n\t\t\t\t\tsystem-ui,\n\t\t\t\t\t-apple-system,\n\t\t\t\t\tBlinkMacSystemFont,\n\t\t\t\t\t'Segoe UI',\n\t\t\t\t\tRoboto,\n\t\t\t\t\tOxygen,\n\t\t\t\t\tUbuntu,\n\t\t\t\t\tCantarell,\n\t\t\t\t\t'Open Sans',\n\t\t\t\t\t'Helvetica Neue',\n\t\t\t\t\tsans-serif;\n\t\t\t\tdisplay: flex;\n\t\t\t\talign-items: center;\n\t\t\t\tjustify-content: center;\n\t\t\t\theight: 100vh;\n\t\t\t\tmargin: 0;\n\t\t\t}\n\n\t\t\t.error {\n\t\t\t\tdisplay: flex;\n\t\t\t\talign-items: center;\n\t\t\t\tmax-width: 32rem;\n\t\t\t\tmargin: 0 1rem;\n\t\t\t}\n\n\t\t\t.status {\n\t\t\t\tfont-weight: 200;\n\t\t\t\tfont-size: 3rem;\n\t\t\t\tline-height: 1;\n\t\t\t\tposition: relative;\n\t\t\t\ttop: -0.05rem;\n\t\t\t}\n\n\t\t\t.message {\n\t\t\t\tborder-left: 1px solid var(--divider);\n\t\t\t\tpadding: 0 0 0 1rem;\n\t\t\t\tmargin: 0 0 0 1rem;\n\t\t\t\tmin-height: 2.5rem;\n\t\t\t\tdisplay: flex;\n\t\t\t\talign-items: center;\n\t\t\t}\n\n\t\t\t.message h1 {\n\t\t\t\tfont-weight: 400;\n\t\t\t\tfont-size: 1em;\n\t\t\t\tmargin: 0;\n\t\t\t}\n\n\t\t\t@media (prefers-color-scheme: dark) {\n\t\t\t\tbody {\n\t\t\t\t\t--bg: #222;\n\t\t\t\t\t--fg: #ddd;\n\t\t\t\t\t--divider: #666;\n\t\t\t\t}\n\t\t\t}\n\t\t</style>\n\t</head>\n\t<body>\n\t\t<div class=\"error\">\n\t\t\t<span class=\"status\">" + status + "</span>\n\t\t\t<div class=\"message\">\n\t\t\t\t<h1>" + message + "</h1>\n\t\t\t</div>\n\t\t</div>\n\t</body>\n</html>\n"
	},
	version_hash: "17hienk"
};

export async function get_hooks() {
	let handle;
	let handleFetch;
	let handleError;
	let handleValidationError;
	let init;
	

	let reroute;
	let transport;
	

	return {
		handle,
		handleFetch,
		handleError,
		handleValidationError,
		init,
		reroute,
		transport
	};
}

export { set_assets, set_building, set_manifest, set_prerendering, set_private_env, set_public_env, set_read_implementation };
