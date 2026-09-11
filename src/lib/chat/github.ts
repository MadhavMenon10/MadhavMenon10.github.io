/* ===========================================================================
   github.ts — build-time repository listing for the Ask widget's index.

   Runs on the build machine, never in the browser. Only public data is read,
   so no token is required; one is used if GITHUB_TOKEN happens to be set,
   purely to lift the unauthenticated rate limit on shared CI runners.

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
  return raw
    .filter((r) => !r.fork && !r.private && !r.archived && r.description)
    .sort((a, b) => b.stargazers_count - a.stargazers_count || b.pushed_at.localeCompare(a.pushed_at))
    .slice(0, limit)
    .map((r) => ({
      name: r.name,
      description: r.description ?? '',
      url: r.html_url,
      language: r.language,
      stars: r.stargazers_count,
      topics: r.topics ?? [],
      pushedAt: r.pushed_at.slice(0, 10),
    }));
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
