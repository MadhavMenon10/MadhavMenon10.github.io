/* ===========================================================================
   Ask worker — the optional LLM half of the site's chat widget.

   Deploy this to Cloudflare Workers (see ../README.md), set
   PUBLIC_CHAT_ENDPOINT on the site to the worker's URL, and the widget upgrades
   from quoting the site to answering in prose. Without it the widget still
   works; this only exists because a static GitHub Pages deploy has nowhere to
   keep an API key.

   The browser sends the question plus the passages it already retrieved from
   /chat-index.json, so this stays stateless and always sees the current site
   content without redeploying.
=========================================================================== */

import Anthropic from '@anthropic-ai/sdk';

export interface Env {
  /** `npx wrangler secret put ANTHROPIC_API_KEY` — never a plain var. */
  ANTHROPIC_API_KEY: string;
  /** Comma-separated origins allowed to call this worker. */
  ALLOWED_ORIGINS: string;
}

/* The key is the only thing standing between this worker and someone else's
   bill, so cap the obvious levers before spending a token on a request. */
const LIMITS = {
  question: 500,
  context: 12_000,
  turns: 10,
};

const SYSTEM = `You answer questions about Madhav Anand Menon on his personal website, in a small chat widget.

Rules:
- Answer only from the SITE CONTENT given in the user message. It is drawn from Madhav's own site: his bio, experience, projects, courses, awards, writing and public GitHub repositories.
- If the site content does not answer the question, say so plainly and suggest emailing him. Never guess, never fill a gap from general knowledge, and never infer things about him that are not written down — a wrong fact about a real person on his own site is worse than an unanswered question.
- Two or three sentences. This is a widget, not an essay; a visitor is skimming.
- Write about him in the third person, plainly and without salesmanship. No "passionate", no "cutting-edge", no exclamation marks.
- Decline anything that isn't a question about Madhav or his work.`;

function corsHeaders(origin: string | null, allowed: string[]): Record<string, string> {
  // Echo the origin only when it's on the list — a bare "*" would let any page
  // on the internet spend this worker's budget.
  const ok = origin && allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : allowed[0] ?? '',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

interface Body {
  messages?: { role: 'user' | 'assistant'; content: string }[];
  context?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const allowed = (env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    const origin = request.headers.get('Origin');
    const cors = corsHeaders(origin, allowed);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: cors });
    }

    if (allowed.length && (!origin || !allowed.includes(origin))) {
      return new Response('Forbidden', { status: 403, headers: cors });
    }

    let body: Body;
    try {
      body = (await request.json()) as Body;
    } catch {
      return new Response('Bad request', { status: 400, headers: cors });
    }

    const turns = (body.messages ?? []).slice(-LIMITS.turns);
    const last = turns.at(-1);
    if (!last || last.role !== 'user' || !last.content.trim()) {
      return new Response('Bad request', { status: 400, headers: cors });
    }

    // Cap what the caller can put in front of the model. The widget sends far
    // less than this; anything larger is someone else's experiment.
    const messages: Anthropic.MessageParam[] = turns.map((m) => ({
      role: m.role,
      content: m.content.slice(0, LIMITS.question),
    }));

    const context = (body.context ?? '').slice(0, LIMITS.context);
    messages[messages.length - 1] = {
      role: 'user',
      content: `SITE CONTENT\n${context || '(nothing on the site matched this question)'}\n\nQUESTION\n${last.content.slice(0, LIMITS.question)}`,
    };

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

    try {
      const stream = client.beta.messages.stream({
        model: 'claude-opus-5',
        max_tokens: 4096,
        // Short factual answers over a small context — low effort keeps the
        // widget snappy without turning thinking off, which on Opus 5 has its
        // own failure modes. Raise this if answers feel shallow.
        output_config: { effort: 'low' },
        system: SYSTEM,
        messages,
        // If a request is declined on policy grounds, retry it on Opus 4.8
        // inside the same call rather than leaving the widget blank. Drop
        // these two lines if you'd rather not run the beta.
        betas: ['server-side-fallback-2026-06-01'],
        fallbacks: [{ model: 'claude-opus-4-8' }],
      });

      // Plain text out, streamed: the widget appends deltas straight into the
      // bubble, so there's no event format to agree on.
      const encoder = new TextEncoder();
      const out = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            for await (const event of stream) {
              if (
                event.type === 'content_block_delta' &&
                event.delta.type === 'text_delta'
              ) {
                controller.enqueue(encoder.encode(event.delta.text));
              }
            }
          } catch (err) {
            console.error('stream failed', err);
          } finally {
            controller.close();
          }
        },
      });

      return new Response(out, {
        headers: {
          ...cors,
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    } catch (err) {
      // The widget treats any non-2xx as "fall back to the offline answer",
      // so a bad key or a rate limit degrades rather than breaking.
      console.error('anthropic request failed', err);
      return new Response('Upstream error', { status: 502, headers: cors });
    }
  },
};
