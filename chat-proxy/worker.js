// Cotton × ENSO Explorer — chat proxy (Cloudflare Worker)
// Keeps the Groq API key secret, only answers the dashboard's own web address,
// caps request size, and falls back to a second model when the first is rate-limited.
//
// Secrets / settings (see README.md):
//   GROQ_API_KEY     (secret, required)   wrangler secret put GROQ_API_KEY
//   ALLOWED_ORIGINS  (var)  comma list, default https://leoanish.github.io
//   MODELS           (var)  comma list tried in order, default openai/gpt-oss-120b,openai/gpt-oss-20b
//   LIMITER          (optional rate-limit binding, see wrangler.toml)

const GROQ = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_BODY = 96_000;        // bytes
const MAX_MESSAGES = 40;
const MAX_TOOLS = 16;
const MAX_OUT_TOKENS = 1500;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || 'https://leoanish.github.io').split(',').map(s => s.trim()).filter(Boolean);
    const okOrigin = allowed.includes(origin) ||
      (env.ALLOW_LOCALHOST === '1' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
    const cors = {
      'Access-Control-Allow-Origin': okOrigin ? origin : allowed[0],
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Expose-Headers': 'retry-after, x-model',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };
    const json = (obj, status = 200, extra = {}) =>
      new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json', ...extra } });
    const models = (env.MODELS || 'openai/gpt-oss-120b,openai/gpt-oss-20b').split(',').map(s => s.trim()).filter(Boolean);
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return new Response(null, { status: okOrigin ? 204 : 403, headers: cors });
    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health'))
      return json({ ok: true, service: 'cotton-enso-chat', models, keyConfigured: !!env.GROQ_API_KEY });
    if (request.method !== 'POST' || url.pathname !== '/chat') return json({ error: 'not found' }, 404);
    if (!okOrigin) return json({ error: 'origin not allowed' }, 403);
    if (!env.GROQ_API_KEY) return json({ error: 'GROQ_API_KEY secret is not set on the worker' }, 500);

    if (env.LIMITER) {
      const ip = request.headers.get('CF-Connecting-IP') || 'anon';
      const { success } = await env.LIMITER.limit({ key: ip });
      if (!success) return json({ error: 'Too many requests from this address — wait a minute.' }, 429, { 'retry-after': '30' });
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY) return json({ error: 'request too large' }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ error: 'invalid JSON' }, 400); }
    const msgs = body.messages;
    if (!Array.isArray(msgs) || !msgs.length || msgs.length > MAX_MESSAGES) return json({ error: 'bad messages' }, 400);
    for (const m of msgs) {
      if (!m || !['system', 'user', 'assistant', 'tool'].includes(m.role)) return json({ error: 'bad role' }, 400);
      if (m.content != null && typeof m.content !== 'string') return json({ error: 'content must be text' }, 400);
    }
    const tools = Array.isArray(body.tools) ? body.tools.slice(0, MAX_TOOLS) : undefined;
    const maxOut = Math.min(MAX_OUT_TOKENS, Math.max(64, +body.max_tokens || 1100));

    let last = null;
    for (const model of models) {
      const payload = { model, messages: msgs, temperature: 0.2, max_completion_tokens: maxOut };
      if (tools && tools.length) { payload.tools = tools; payload.tool_choice = body.tool_choice === 'none' ? 'none' : 'auto'; }
      if (model.startsWith('openai/gpt-oss')) payload.reasoning_effort = 'low';
      const r = await fetch(GROQ, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.GROQ_API_KEY}` },
        body: JSON.stringify(payload),
      });
      if (r.status === 429 || r.status >= 500) { last = { status: r.status, retry: r.headers.get('retry-after'), text: await r.text() }; continue; }
      return new Response(r.body, { status: r.status, headers: { ...cors, 'Content-Type': 'application/json', 'x-model': model } });
    }
    return new Response(last ? last.text : JSON.stringify({ error: 'no model available' }), {
      status: last ? last.status : 502,
      headers: { ...cors, 'Content-Type': 'application/json', ...(last && last.retry ? { 'retry-after': last.retry } : {}) },
    });
  },
};
