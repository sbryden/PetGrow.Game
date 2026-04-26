import { r as root } from "./root.js";
import "./environment.js";
let public_env = {};
function set_private_env(environment) {
}
function set_public_env(environment) {
  public_env = environment;
}
let read_implementation = null;
function set_read_implementation(fn) {
  read_implementation = fn;
}
function set_manifest(_) {
}
const options = {
  app_template_contains_nonce: false,
  async: false,
  csp: { "mode": "auto", "directives": { "upgrade-insecure-requests": false, "block-all-mixed-content": false }, "reportOnly": { "upgrade-insecure-requests": false, "block-all-mixed-content": false } },
  csrf_check_origin: true,
  csrf_trusted_origins: [],
  embedded: false,
  env_public_prefix: "PUBLIC_",
  env_private_prefix: "",
  hash_routing: false,
  hooks: null,
  // added lazily, via `get_hooks`
  preload_strategy: "modulepreload",
  root,
  service_worker: false,
  service_worker_options: void 0,
  server_error_boundaries: false,
  templates: {
    app: ({ head, body, assets, nonce, env }) => '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <meta name="theme-color" content="#00d2ff" />\n    <title>PetGrow — Egg Mixer</title>\n    <link rel="icon" href="' + assets + '/icon.svg" type="image/svg+xml" />\n    <link rel="manifest" href="' + assets + '/manifest.webmanifest" />\n    <link rel="preconnect" href="https://fonts.googleapis.com" />\n    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n    <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Pixelify+Sans:wght@400;500;700&display=swap" rel="stylesheet" />\n    ' + head + `
  <style>
    #boot-loading {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0c0e14;
      z-index: 9999;
      transition: opacity 0.4s ease;
    }
    #boot-loading.fade-out {
      opacity: 0;
      pointer-events: none;
    }
    .boot-loading-card {
      width: min(100%, 420px);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 18px;
      padding: 28px 24px;
      border: 2px solid rgba(0, 210, 255, 0.25);
      border-radius: 24px;
      background:
        radial-gradient(circle at top, rgba(0, 210, 255, 0.18), transparent 55%),
        rgba(10, 16, 28, 0.88);
      box-shadow:
        0 18px 42px rgba(0, 0, 0, 0.45),
        0 0 28px rgba(0, 210, 255, 0.16);
    }
    .boot-loading-animation {
      position: relative;
      width: 124px;
      height: 124px;
      display: grid;
      place-items: center;
    }
    .boot-loading-ring {
      position: absolute;
      inset: 0;
      border: 3px solid rgba(0, 210, 255, 0.14);
      border-top-color: #00d2ff;
      border-radius: 50%;
      animation: boot-spin 1.2s linear infinite;
    }
    .boot-loading-ring-delay {
      inset: 14px;
      border-color: rgba(255, 215, 0, 0.14);
      border-top-color: #ffd700;
      animation-direction: reverse;
      animation-duration: 1.6s;
    }
    .boot-loading-core {
      font-size: 2.8rem;
      filter: drop-shadow(0 0 14px rgba(255, 215, 0, 0.35));
      animation: boot-pulse 1.1s ease-in-out infinite;
    }
    .boot-loading-title {
      font-family: 'Pixelify Sans', 'Press Start 2P', monospace;
      font-size: 1.6rem;
      color: #00d2ff;
      text-shadow: 0 0 12px rgba(0, 210, 255, 0.5);
      margin: 0;
    }
    .boot-loading-text {
      font-family: 'Pixelify Sans', 'Press Start 2P', monospace;
      font-size: 0.85rem;
      color: #8899bb;
      text-align: center;
    }
    @keyframes boot-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes boot-pulse {
      0%, 100% { transform: scale(0.96); opacity: 0.85; }
      50% { transform: scale(1.04); opacity: 1; }
    }
  </style>
  </head>
  <body data-sveltekit-preload-data="off">
    <div id="boot-loading" aria-live="polite">
      <div class="boot-loading-card">
        <div class="boot-loading-animation" aria-hidden="true">
          <span class="boot-loading-ring"></span>
          <span class="boot-loading-ring boot-loading-ring-delay"></span>
          <span class="boot-loading-core">🥚</span>
        </div>
        <h1 class="boot-loading-title">PetGrow</h1>
        <p class="boot-loading-text">Loading your creatures...</p>
      </div>
    </div>
    ` + body + "\n  </body>\n</html>\n",
    error: ({ status, message }) => '<!doctype html>\n<html lang="en">\n	<head>\n		<meta charset="utf-8" />\n		<title>' + message + `</title>

		<style>
			body {
				--bg: white;
				--fg: #222;
				--divider: #ccc;
				background: var(--bg);
				color: var(--fg);
				font-family:
					system-ui,
					-apple-system,
					BlinkMacSystemFont,
					'Segoe UI',
					Roboto,
					Oxygen,
					Ubuntu,
					Cantarell,
					'Open Sans',
					'Helvetica Neue',
					sans-serif;
				display: flex;
				align-items: center;
				justify-content: center;
				height: 100vh;
				margin: 0;
			}

			.error {
				display: flex;
				align-items: center;
				max-width: 32rem;
				margin: 0 1rem;
			}

			.status {
				font-weight: 200;
				font-size: 3rem;
				line-height: 1;
				position: relative;
				top: -0.05rem;
			}

			.message {
				border-left: 1px solid var(--divider);
				padding: 0 0 0 1rem;
				margin: 0 0 0 1rem;
				min-height: 2.5rem;
				display: flex;
				align-items: center;
			}

			.message h1 {
				font-weight: 400;
				font-size: 1em;
				margin: 0;
			}

			@media (prefers-color-scheme: dark) {
				body {
					--bg: #222;
					--fg: #ddd;
					--divider: #666;
				}
			}
		</style>
	</head>
	<body>
		<div class="error">
			<span class="status">` + status + '</span>\n			<div class="message">\n				<h1>' + message + "</h1>\n			</div>\n		</div>\n	</body>\n</html>\n"
  },
  version_hash: "1kkmfqy"
};
async function get_hooks() {
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
export {
  set_public_env as a,
  set_read_implementation as b,
  set_manifest as c,
  get_hooks as g,
  options as o,
  public_env as p,
  read_implementation as r,
  set_private_env as s
};
