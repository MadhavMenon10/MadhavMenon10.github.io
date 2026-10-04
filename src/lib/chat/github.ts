/* ===========================================================================
   github.ts — build-time repository listing for the Ask widget's index.

   Runs on the build machine, never in the browser. Only public data is read,
   so no token is required; one is used if GITHUB_TOKEN happens to be set,
   purely to lift the unauthenticated rate limit on shared CI runners.

   Two calls per build, plus one README per repo. A repo description is a
   single sentence and answers almost nothing ("what does the order book
   project actually do?"), so the README's opening prose is pulled in too —
   that's where the real explanation lives.

   Every failure path here is non-fatal. A rate limit, a DNS failure, or a
   build with no network at all costs the index its GitHub chunks and nothing
   else — the widget still answers from the site's own content.
=========================================================================== */

export interface Repo {
  name: string;
  description: string;
  url: string;
  language: string | null;
  stars: number;
  topics: string[];
  pushedAt: string;
  /** First prose of the repo's README, if it has one. '' when it doesn't. */
  readme: string;
}

interface ApiRepo {
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  topics?: string[];
  pushed_at: string;
  fork: boolean;
  archived: boolean;
  private: boolean;
}

// Astro renders every page in one process, and each render asks for the index.
// Memoising the promise keeps that to a single request per build.
let inFlight: Promise<Repo[]> | null = null;

/** Markdown -> plain prose, and only the part a reader would call the intro. */
function readmeProse(markdown: string, max = 900): string {
  const text = markdown
    .replace(/^---[\s\S]*?\n---\n/, '') // frontmatter
    .replace(/<!--[\s\S]*?-->/g, ' ') // HTML comments
    .replace(/```[\s\S]*?```/g, ' ') // fenced code
    .replace(/^\s*[|+][-|+: ]*[|+]\s*$/gm, ' ') // table rules
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images (badges, mostly)
    .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, ' ') // linked badges
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links -> their text
    .replace(/<[^>]+>/g, ' ') // stray HTML
    .replace(/^#{1,6}\s+/gm, '') // headings
    .replace(/[*_`>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const sentence = cut.lastIndexOf('. ');
  return sentence > max * 0.5 ? cut.slice(0, sentence + 1) : cut.slice(0, cut.lastIndexOf(' ')) + '\u2026';
}

/** A repo's README as prose, or '' if it has none or the call fails. */
async function fetchReadme(
  user: string,
  repo: string,
  headers: Record<string, string>
): Promise<string> {
  try {
    // The `readme` endpoint finds the file whatever it's called or cased, and
    // the `.raw` media type skips a base64 round-trip.
    const res = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(user)}/${encodeURIComponent(repo)}/readme`,
      {
        headers: { ...headers, Accept: 'application/vnd.github.raw+json' },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return ''; // 404 just means no README.

    // The `.raw` media type should give Markdown back, but a proxy or an error
    // response can hand over JSON with a 200 — and a rate-limit message
    // indexed as README prose is worse than no README at all.
    if (!(res.headers.get('Content-Type') ?? '').startsWith('application/json')) {
      return readmeProse(await res.text());
    }

    // Some responses honour the endpoint's JSON shape instead: base64 content.
    const json = (await res.json()) as { content?: string; encoding?: string };
    if (json.encoding === 'base64' && json.content) {
      return readmeProse(Buffer.from(json.content, 'base64').toString('utf8'));
    }
    return '';
  } catch {
    return '';
  }
}

async function request(user: string, limit: number): Promise<Repo[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'madhavmenon10.github.io-build',
  };

  // Optional: only lifts the rate limit. Public repos read fine without it.
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(
    `https://api.github.com/users/${encodeURIComponent(user)}/repos?per_page=100&sort=pushed`,
    { headers, signal: AbortSignal.timeout(8000) }
  );

  if (!res.ok) throw new Error(`GitHub API responded ${res.status}`);

  const raw = (await res.json()) as ApiRepo[];
  const picked = raw
    .filter((r) => !r.fork && !r.private && !r.archived)
    .sort((a, b) => b.stargazers_count - a.stargazers_count || b.pushed_at.localeCompare(a.pushed_at))
    .slice(0, limit);

  // One README per repo, in parallel. `limit` is 12 by default, which is well
  // inside even the unauthenticated 60/hour budget.
  const readmes = await Promise.all(picked.map((r) => fetchReadme(user, r.name, headers)));

  return picked
    .map((r, i) => ({
      name: r.name,
      description: r.description ?? '',
      url: r.html_url,
      language: r.language,
      stars: r.stargazers_count,
      topics: r.topics ?? [],
      pushedAt: r.pushed_at.slice(0, 10),
      readme: readmes[i],
    }))
    // A repo with neither a description nor a README has nothing to answer
    // with; indexing its name alone only produces confident-looking noise.
    .filter((r) => r.description || r.readme);
}

/** Public, non-fork repositories for `user`. Resolves to [] on any failure. */
export function fetchRepos(user: string | null, limit: number): Promise<Repo[]> {
  if (!user) return Promise.resolve([]);

  inFlight ??= request(user, limit).catch((err: unknown) => {
    // Warn rather than throw: a portfolio build shouldn't fail because
    // api.github.com had a bad minute.
    console.warn(
      `[chat] GitHub repositories omitted from the index — ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return [];
  });

  return inFlight;
}
