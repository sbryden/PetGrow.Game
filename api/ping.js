// ============================================================
//  PetGrow — Health check (Vercel Serverless Function)
//  Returns 200 { ok: true } so the frontend can verify the
//  API layer is reachable without triggering a Gemini call.
// ============================================================
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ ok: true });
}
