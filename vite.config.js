import { defineConfig, loadEnv } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

// Dev-only plugin: serves the Vercel serverless handler at /api/generate
function localApiPlugin() {
  return {
    name: 'local-api',
    apply: 'serve',
    config(_, { mode }) {
      // Load all env vars (including non-VITE_ ones) into process.env for the dev server
      const env = loadEnv(mode, process.cwd(), '');
      Object.assign(process.env, env);
    },
    configureServer(server) {
      server.middlewares.use('/api/ping', async (_req, res) => {
        const { default: handler } = await import('./api/ping.js');
        await handler(_req, { status(c) { this._s = c; return this; }, setHeader(k, v) { res.setHeader(k, v); }, json(o) { res.writeHead(this._s ?? 200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); } });
      });

      server.middlewares.use('/api/generate', async (req, res) => {
        // Collect request body
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const bodyText = Buffer.concat(chunks).toString();

        // Build a minimal req/res shim for the Vercel handler
        let parsedBody = {};
        try {
          parsedBody = bodyText ? JSON.parse(bodyText) : {};
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON body' }));
          return;
        }
        const shimReq = {
          method: req.method,
          headers: req.headers,
          body: parsedBody,
        };
        const shimRes = {
          _status: 200,
          _headers: {},
          status(code) { this._status = code; return this; },
          setHeader(k, v) { res.setHeader(k, v); return this; },
          json(obj) {
            res.writeHead(this._status, { 'Content-Type': 'application/json', ...this._headers });
            res.end(JSON.stringify(obj));
          },
          end() { res.writeHead(this._status); res.end(); },
        };

        const { default: handler } = await import('./api/generate.js');
        await handler(shimReq, shimRes);
      });
    },
  };
}

export default defineConfig({
  plugins: [
    localApiPlugin(),
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // Never cache API calls
            urlPattern: /^\/api\//,
            handler: 'NetworkOnly',
          },
        ],
      },
      manifest: {
        name: 'PetGrow — Egg Mixer',
        short_name: 'PetGrow',
        description: 'Mix ingredients into an egg and hatch unique virtual pet creatures!',
        start_url: '/',
        display: 'standalone',
        background_color: '#0c0e14',
        theme_color: '#00d2ff',
        orientation: 'portrait',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
    }),
  ],
  build: {
    outDir: 'dist',
  },
});
