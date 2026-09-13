# Ask worker — optional

The Ask widget on the site works without this. Out of the box it runs a BM25
search over `/chat-index.json` and quotes the matching passages back: no key,
no server, no running cost, which is the only thing that fits on GitHub Pages.

Deploy this worker and the widget upgrades. The same search still runs first,
but the question, the passages it found, and a one-line outline of the whole
index are handed to Claude, which answers in prose, cites the passages
underneath, asks a question back when yours was too vague to answer well, and
suggests two or three things to ask next. The worker exists because **a static
site has nowhere to keep an API key** — put one in the page and it is scraped
off your bundle within hours, and the bill is yours.

Until it is deployed the widget stays in offline mode. That is the difference
between a chat widget and a search box with a speech bubble on it, and no
amount of site content changes it — the model is the part that lives here.

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

Three levers, all in `wrangler.toml` rather than the code:

- **Model.** `CHAT_MODEL`. The default is `claude-opus-5`. `claude-haiku-4-5`
  ($1 / $5) is a fraction of the cost, noticeably faster, and perfectly capable
  of "answer this question from these eight paragraphs"; it is a real tradeoff
  in answer quality, so it's left as your call rather than made for you. The
  worker sends a per-model request shape — `output_config.effort` is correct on
  Opus 5 and a **400 error** on Haiku 4.5 — so switching is just the variable.
- **Effort.** Opus-family only, already at `low`, which is the right setting for
  a short answer over a small context. Raise it in `tuning()` if answers feel
  shallow; it costs latency as well as tokens.
- **Speed.** `CHAT_FAST = "1"` runs Opus 5 in fast mode: up to 2.5x the output
  tokens per second at double the per-token price. Worth trying, but measure
  before you keep it — most of the wait on a two-sentence answer is the model
  thinking before it types, which fast mode doesn't shorten.

The widget also pre-fetches `/chat-index.json` when the browser goes idle, so
the first question isn't waiting on that round trip. That part is free.

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
length, context length, outline length, and turns per request — in the `LIMITS`
object.

## Failure behaviour

The widget treats any non-2xx, timeout, or empty stream as "fall back to the
offline answer". A worker that is down, out of credit, or rate limited makes
the chat quieter, not broken. Worth knowing when you're wondering why an answer
suddenly looks like a quotation.
