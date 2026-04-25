// ============================================================
//  PetGrow — Gemini API Proxy (Vercel Serverless Function)
//  Keeps the API key secret on the server side.
// ============================================================
export default async function handler(req, res) {
  // Only allow POST
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const headerApiKey = (req.headers['x-gemini-api-key'] || '').toString().trim();
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.API_KEY ||
    headerApiKey;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const ALLOWED_MODELS = [
    'gemini-2.5-flash-image',
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
  ];
  const requestedModel = (req.body?.model || '').toString().trim();
  const model = ALLOWED_MODELS.includes(requestedModel) ? requestedModel : 'gemini-2.5-flash-image';
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    // Forward the request body (minus the model field) to Gemini
    const { model: _model, ...payload } = req.body;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`Gemini API error [model=${model} status=${response.status}]:`, JSON.stringify(data));
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error(`Gemini proxy error [model=${model}]:`, err.message, err.stack);
    return res.status(500).json({ error: 'Proxy error' });
  }
}
