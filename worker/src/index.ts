/* ===========================================================================
   Ask worker — the LLM half of the site's chat widget.

   Deploy this to Cloudflare Workers (see ../README.md), set
   PUBLIC_CHAT_ENDPOINT on the site to the worker's URL, and the widget stops
   quoting the site and starts answering it. Without this worker the widget
   still works, but it is a search box wearing a chat bubble — which is the
   whole reason this file exists: a static GitHub Pages deploy has nowhere to
   keep an API key.

   The browser sends three things, so this stays stateless and always sees the
   current site content without a worker redeploy:

     messages  the conversation so far
     context   the passages BM25 retrieved for the latest question
     outline   one line per chunk in the whole index — the table of contents

   The outline is what stops the answers reading like a search result. With it
   the model knows everything the site holds, not just what a keyword search
   surfaced, so it can count things, say honestly that something isn't covered,
   and ask a follow-up question that is actually answerable.
=========================================================================== */

import Anthropic from '@anthropic-ai/sdk';

export interface Env {
  /** `npx wrangler secret put ANTHROPIC_API_KEY` — never a plain var. */
  ANTHROPIC_API_KEY: string;
  /** Comma-separated origins allowed to call this worker. */
  ALLOWED_ORIGINS: string;
  /** Optional model override. Defaults to MODEL below. */
  CHAT_MODEL?: string;
  /** Optional: "1" to run Claude Opus 5 in fast mode. Costs more; see README. */
  CHAT_FAST?: string;
}

/** Default model. Override with the CHAT_MODEL var — see the README. */
const MODEL = 'claude-opus-5';

/* The key is the only thing standing between this worker and someone else's
   bill, so cap the obvious levers before spending a token on a request. */
const LIMITS = {
  question: 500,
  context: 24_000,
  outline: 6_000,
  turns: 10,
};

/** Marks the suggested follow-up questions at the end of a reply. */
const NEXT = '[[NEXT]]';

const SYSTEM = `You are the chat assistant on Madhav Anand Menon's personal website. Visitors are recruiters, engineers and people who just landed on the page. You answer their questions about him.

WHAT YOU KNOW
Every user message carries a SITE INDEX (one line per thing the site holds — titles only) and SITE CONTENT (the full text of the passages most relevant to the question). Together these are drawn from his own material: bio, experience, projects, courses, awards, writing, resume PDF, and public GitHub repositories.

- Answer from SITE CONTENT. Use SITE INDEX to know what exists — you may say "there are five roles listed" or "the site has nothing on that" from the index alone.
- You may connect and summarise across passages, and draw an obvious conclusion from them (that a project is written in CUDA means he writes CUDA). Do not import anything you happen to know about people with similar names, and do not invent a number, date, employer or claim that isn't in front of you. A wrong fact about a real person on his own site is worse than an unanswered question.
- If SITE CONTENT doesn't cover it but SITE INDEX suggests where it might, say what you can and point there. If nothing covers it, say so plainly and suggest emailing him.

HOW TO ANSWER
- Lead with the answer. Two to four sentences — this is a small panel and the visitor is skimming. No preamble, no restating their question.
- Concrete over vague: name the company, the number, the language. His resume is full of measured results; use them.
- Third person, plain, no salesmanship. Never "passionate", "cutting-edge", "leverages", or an exclamation mark.
- When a question is too vague to answer well (“tell me about him”, “is he any good”), give the best short answer you can AND ask one question that narrows it. Don't ask a question you could have answered yourself.
- When a question is about you, say what you are: a small assistant reading his site, resume and public repositories.
- Decline anything that isn't about Madhav or his work, in one sentence.

ENDING EVERY REPLY
End every reply with a final line, exactly:
${NEXT} first question | second question
Two or three short questions a visitor would plausibly ask next, each answerable from SITE INDEX, each about something you have NOT just covered. Write them in the visitor's voice ("What did he build at Valeo?"), five to nine words. Nothing after that line.`;

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
  outline?: string;
}

/**
 * Per-model request shape. The API rejects parameters a model doesn't take, so
 * these can't all be sent unconditionally — `output_config.effort` is a 400 on
 * Haiku 4.5, which is the one model someone swapping MODEL is most likely to
 * reach for. Anything unrecognised gets the plain request, which every model
 * accepts.
 */
function tuning(model: string): Record<string, unknown> {
  // Opus 5 and the Fable/Sonnet 5 family: thinking is on, depth set by effort.
  // `low` is the right setting for a short factual answer over a small context
  // — and the cheapest thing that keeps time-to-first-token down, since the
  // visitor stares at three dots for the whole thinking phase.
  if (/^claude-(opus-5|opus-4-[678]|sonnet-5|fable-5)/.test(model)) {
    return { output_config: { effort: 'low' } };
  }
  // Haiku 4.5 takes neither `effort` nor adaptive thinking. Omitting `thinking`
  // means it doesn't think at all, which is exactly what makes it fast.
  return {};
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

    const outline = (body.outline ?? '').slice(0, LIMITS.outline);
    const context = (body.context ?? '').slice(0, LIMITS.context);
    messages[messages.length - 1] = {
      role: 'user',
      content:
        `SITE INDEX (everything the site holds)\n${outline || '(unavailable)'}\n\n` +
        `SITE CONTENT (most relevant passages, in full)\n${
          context || '(nothing on the site matched this question)'
        }\n\n` +
        `QUESTION\n${last.content.slice(0, LIMITS.question)}`,
    };

    const model = env.CHAT_MODEL?.trim() || MODEL;
    const fast = env.CHAT_FAST === '1' && /^claude-opus-(5|4-8)/.test(model);
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

    try {
      const stream = client.beta.messages.stream({
        model,
        max_tokens: 4096,
        ...tuning(model),
        // Up to 2.5x the output tokens per second on Opus 5, at premium rates.
        // Off unless CHAT_FAST is set, because it is a real price change.
        ...(fast ? { speed: 'fast' as const } : {}),
        system: SYSTEM,
        messages,
        // If a request is declined on policy grounds, retry it on Opus 4.8
        // inside the same call rather than leaving the widget blank. Drop
        // these two lines if you'd rather not run the betas.
        betas: [
          'server-side-fallback-2026-06-01',
          ...(fast ? ['fast-mode-2026-02-01'] : []),
        ],
        fallbacks: [{ model: 'claude-opus-4-8' }],
      });

      // Plain text out, streamed: the widget appends deltas straight into the
      // bubble, so there's no event format to agree on. The follow-up questions
      // ride along after the NEXT marker on the last line, and the widget
      // holds anything from the marker onwards back out of the bubble.
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
