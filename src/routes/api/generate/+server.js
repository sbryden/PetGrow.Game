// ============================================================
//  PetGrow — Gemini API Proxy (SvelteKit server route)
//  Replaces api/generate.js. Keeps the API key secret server-side.
// ============================================================
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const ALLOWED_MODELS = [
  'gemini-2.5-flash-image',
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

// Loose shape check for a Google API key. Real keys start with `AIza` and
// are typically 39 chars; we accept anything from that prefix that's at
// least 20 chars of url-safe base64 to avoid false rejections on future
// key formats. This isn't a security check (Gemini does the real auth) —
// it's a "don't forward obvious garbage" filter so users get a clean 400
// instead of a confusing upstream 400 buried in a JSON blob.
const GEMINI_KEY_RE = /^AIza[A-Za-z0-9_-]{20,}$/;

/**
 * SECURITY NOTE — Bring-Your-Own-Key (BYOK) support
 * --------------------------------------------------
 * If `GEMINI_API_KEY` (or aliases) is configured server-side, that key is
 * always used and the `x-gemini-api-key` request header is IGNORED.
 *
 * If no server key is configured, this proxy falls back to the user-
 * supplied `x-gemini-api-key` header. This is intentional: the deployed
 * site is a personal Tamagotchi toy, and users who want to play without
 * the maintainer paying for inference can bring their own free Gemini key.
 *
 * Tradeoffs you should understand if you fork:
 *  - The supplied key is interpolated into the upstream URL query string
 *    (`?key=...`), which is how Google's REST API accepts it. URL query
 *    strings can land in HTTP server access logs, CDN logs, and stack
 *    traces. We don't log the URL ourselves, but downstream infra might.
 *  - There is NO auth, NO rate-limit, and NO quota tracking on this
 *    endpoint. A public deploy is effectively a free Gemini relay if the
 *    server key is unset. Add one to lock it down.
 */
export async function POST({ request }) {
  const rawHeaderKey = (request.headers.get('x-gemini-api-key') || '').trim();
  // Reject obviously-malformed BYOK values up front (clear 400 instead of
  // forwarding garbage upstream and getting a confusing 400 from Gemini).
  if (rawHeaderKey && !GEMINI_KEY_RE.test(rawHeaderKey)) {
    return json({ error: 'Invalid x-gemini-api-key format' }, { status: 400 });
  }
  const headerApiKey = rawHeaderKey;

  // Read keys from $env/dynamic/private only — this works for both
  // .env.local in dev and Vercel/runtime env in production. Do NOT fall
  // back to process.env: in `vite dev`, .env.local is not loaded into
  // process.env, so any process.env.* fallback would be a misleading
  // dead branch.
  const apiKey =
    env.GEMINI_API_KEY ||
    env.GOOGLE_API_KEY ||
    env.API_KEY ||
    headerApiKey;

  if (!apiKey) {
    return json({ error: 'API key not configured' }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const requestedModel = (body?.model || '').toString().trim();
  const model = ALLOWED_MODELS.includes(requestedModel) ? requestedModel : 'gemini-2.5-flash-image';
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const { model: _model, ...payload } = body;
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`Gemini API error [model=${model} status=${response.status}]:`, JSON.stringify(data));
      return json(data, { status: response.status });
    }

    return json(data);
  } catch (err) {
    console.error(`Gemini proxy error [model=${model}]:`, err.message, err.stack);
    return json({ error: 'Proxy error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
