// ============================================================
//  PetGrow — Health check (SvelteKit server route)
//  Replaces api/ping.js.
// ============================================================
export function GET() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
