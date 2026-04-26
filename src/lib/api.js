// ============================================================
//  PetGrow — Gemini API Client
//  Thin fetch wrapper for /api/generate.
// ============================================================
import { GEMINI_MODEL, GEMINI_URL, CLIENT_API_KEY_STORAGE_KEY } from '../systems/constants.js';

export function getClientApiKey() {
  try { return (localStorage.getItem(CLIENT_API_KEY_STORAGE_KEY) || '').trim(); }
  catch { return ''; }
}

export function setClientApiKey(value) {
  try {
    const key = (value || '').trim();
    if (key) localStorage.setItem(CLIENT_API_KEY_STORAGE_KEY, key);
    else localStorage.removeItem(CLIENT_API_KEY_STORAGE_KEY);
  } catch { /* ignore */ }
}

function buildPayload(prompt) {
  return {
    model: GEMINI_MODEL,
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: { aspectRatio: '1:1' },
    },
  };
}

function isMissingServerKey(status, text) {
  return status === 500 && /api key not configured|api key missing|missing api key/i.test(text || '');
}

async function callProxy(payload, overrideKey = '') {
  const headers = { 'Content-Type': 'application/json' };
  if (overrideKey) headers['x-gemini-api-key'] = overrideKey;
  return fetch(GEMINI_URL, { method: 'POST', headers, body: JSON.stringify(payload) });
}

/**
 * Fetch a creature image from Gemini via the server proxy.
 * Returns a data URL string.
 * @param {string} prompt
 * @param {function} onMissingKey - called when the server key is missing; should
 *   return a client key string (or '' to abort).
 */
export async function fetchCreatureImage(prompt, onMissingKey) {
  const payload = buildPayload(prompt);
  let response = await callProxy(payload);

  if (!response.ok) {
    const errText = await response.text();
    if (isMissingServerKey(response.status, errText)) {
      let clientKey = getClientApiKey();
      if (!clientKey && onMissingKey) clientKey = await onMissingKey();
      if (clientKey) {
        setClientApiKey(clientKey);
        response = await callProxy(payload, clientKey);
        if (!response.ok) {
          throw new Error(`API error ${response.status}: ${await response.text()}`);
        }
      } else {
        throw new Error('Server API key missing and no browser API key was provided.');
      }
    } else {
      throw new Error(`API error ${response.status}: ${errText}`);
    }
  }

  const data = await response.json();
  for (const part of data?.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      const { data: b64, mimeType = 'image/png' } = part.inlineData;
      return `data:${mimeType};base64,${b64}`;
    }
  }
  throw new Error('No image data in response');
}

/**
 * Remove the solid background from a creature image using a flood-fill from
 * the edges. Samples the background colour from the top-left corner pixel and
 * makes any edge-reachable pixel within `tolerance` distance transparent.
 * @param {string} dataUrl - data URL of the source image
 * @param {number} tolerance - colour distance threshold (0-255)
 * @returns {Promise<string>} data URL of the PNG with transparent background
 */
export function removeBackground(dataUrl, tolerance = 60) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      const w = canvas.width;
      const h = canvas.height;

      // Sample background colour from the top-left corner
      const bgR = d[0], bgG = d[1], bgB = d[2];

      const visited = new Uint8Array(w * h);
      // Use a flat numeric queue: [x0, y0, x1, y1, ...]
      const queue = new Int32Array(w * h * 2);
      let head = 0, tail = 0;

      function enqueue(x, y) {
        const i = y * w + x;
        if (visited[i]) return;
        visited[i] = 1;
        queue[tail++] = x;
        queue[tail++] = y;
      }

      // Seed from all four edges
      for (let x = 0; x < w; x++) { enqueue(x, 0); enqueue(x, h - 1); }
      for (let y = 1; y < h - 1; y++) { enqueue(0, y); enqueue(w - 1, y); }

      while (head < tail) {
        const x = queue[head++];
        const y = queue[head++];
        const pi = (y * w + x) * 4;
        const dr = d[pi] - bgR, dg = d[pi + 1] - bgG, db = d[pi + 2] - bgB;
        if (dr * dr + dg * dg + db * db > tolerance * tolerance) continue;

        d[pi + 3] = 0; // make transparent

        if (x > 0)     enqueue(x - 1, y);
        if (x < w - 1) enqueue(x + 1, y);
        if (y > 0)     enqueue(x, y - 1);
        if (y < h - 1) enqueue(x, y + 1);
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image for background removal'));
    img.src = dataUrl;
  });
}
