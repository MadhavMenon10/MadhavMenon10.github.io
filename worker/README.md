# Ask worker — optional

The Ask widget on the site works without this. Out of the box it runs a BM25
search over `/chat-index.json` and quotes the matching passages back: no key,
no server, no running cost, which is the only thing that fits on GitHub Pages.

Deploy this worker and the widget upgrades. The same search still runs first,
but the question and the passages it found are handed to Claude, which answers
in prose and cites the passages underneath. The worker exists because **a
static site has nowhere to keep an API key** — put one in the page and it is
scraped off your bundle within hours, and the bill is yours.

## Deploy

```sh
cd worker
npm install
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY   # paste your key when prompted
npx wrangler deploy
```

`wrangler deploy` prints a URL like `https://ask-madhav.<subdomain>.workers.dev`.

Then point the site at it. In the repository: **Settings → Secrets and
variables → Actions → Variables → New repository variable**

| Name                   | Value                                        |
| ---------------------- | -------------------------------------------- |
| `PUBLIC_CHAT_ENDPOINT` | `https://ask-madhav.<subdomain>.workers.dev` |

The next deploy picks it up. Locally, put the same line in `.env`:

```
PUBLIC_CHAT_ENDPOINT=https://ask-madhav.<subdomain>.workers.dev
```

Unset the variable and redeploy to go back to offline mode.

## What it costs

Every question is one Claude request: the question, ~5 retrieved passages, and
a short system prompt in; two or three sentences out. That is roughly 1–2k input
tokens and a couple hundred output tokens per question. At `claude-opus-5`
rates ($5 / $25 per million) that is well under a cent each — but it is
*your* cent, charged to the key in the worker, for anyone who opens the widget.

Two levers if that matters:

- **Model.** `src/index.ts` sets `model: 'claude-opus-5'`. `claude-haiku-4-5`
  ($1 / $5) is a fraction of the cost and perfectly capable of "answer this
  question from these five paragraphs"; this is a real tradeoff, so it's left
  as your call rather than made for you.
- **Effort.** Already at `low`, which is the right setting for short answers
  over a small context. Raise it if answers feel shallow.

## Guarding the key

`wrangler.toml` sets `ALLOWED_ORIGINS`. Requests from anything else get a 403,
so the key can't be spent from someone else's page. Keep your real domain in
that list, drop `http://localhost:4321` once you're done developing.

That check is an origin header, which an origin header can also forge — it
stops casual reuse, not a determined person. If the widget ever gets real
traffic, add rate limiting by IP with
[Cloudflare Rate Limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
or a KV counter. It is deliberately not in here: a per-IP limiter that nobody
needs is just a thing that can break.

The worker also caps what any caller can put in front of the model — question
length, context length, and turns per request — in the `LIMITS` object.

## Failure behaviour

The widget treats any non-2xx, timeout, or empty stream as "fall back to the
offline answer". A worker that is down, out of credit, or rate limited makes
the chat quieter, not broken. Worth knowing when you're wondering why an answer
suddenly looks like a quotation.
