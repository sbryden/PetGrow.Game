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

export async function POST({ request }) {
  const headerApiKey = (request.headers.get('x-gemini-api-key') || '').trim();
  const apiKey =
    env.GEMINI_API_KEY ||
    env.GOOGLE_API_KEY ||
    env.API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.API_KEY ||
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
