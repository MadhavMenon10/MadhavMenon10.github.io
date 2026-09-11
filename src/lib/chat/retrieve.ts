/* ===========================================================================
   retrieve.ts — the offline half of the Ask widget.

   Runs entirely in the browser over the JSON index served at /chat-index.json.
   Scoring is BM25 over three weighted fields (title, keywords, body) with a
   small synonym expansion on the query, which is what turns "where does he
   work" into a hit on the experience entries.

   This file is deliberately dependency-free: the whole index is a few dozen
   chunks, so a full scan per keystroke-free query costs well under a
   millisecond and there's no reason to ship a search library for it.
=========================================================================== */

export interface Chunk {
  id: string;
  /** Where the answer came from, e.g. "Experience" — shown as a tag. */
  section: string;
  /** Heading for the answer, e.g. "Software Engineer Intern — Valeo". */
  title: string;
  /** The prose quoted back to the reader. */
  text: string;
  /** Match terms that don't appear in `text` — synonyms, tech names, aliases. */
  keywords?: string[];
  /** Where to send the reader for the full version. */
  href?: string;
  /** Set on `href`s that leave the site. */
  external?: boolean;
}

export interface Reply {
  /** Sentence shown above the results. Empty for a single confident hit. */
  lead: string;
  /** Chunks to render, best first. Empty means nothing matched. */
  items: Chunk[];
}

/* ---------------------------------------------------------------------------
   Tokenising
--------------------------------------------------------------------------- */

// Words carrying no signal in a question about a person. "who"/"what"/"where"
// stay in — they're mapped to real terms by the synonym table below.
const STOP = new Set([
  'a', 'an', 'and', 'any', 'are', 'as', 'at', 'be', 'been', 'but', 'by', 'can',
  'did', 'do', 'does', 'for', 'from', 'get', 'got', 'had', 'has', 'have', 'he',
  'her', 'him', 'his', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'just', 'me',
  'my', 'of', 'on', 'or', 'she', 'so', 'some', 'tell', 'that', 'the', 'their',
  'them', 'then', 'there', 'they', 'this', 'to', 'us', 'was', 'we', 'were',
  'will', 'with', 'would', 'you', 'your',
]);

/**
 * Morphological variants: the same word, so they carry full weight. Kept
 * separate from SYNONYMS below, which relates *different* words and is
 * deliberately worth less. There's no stemmer here — 41 chunks don't justify
 * one, and a real stemmer conflates "course"/"courses" against an index that
 * contains both spellings. Add variants here as they come up.
 */
const INFLECTIONS: Record<string, string> = {
  interned: 'intern',
  interning: 'intern',
  internship: 'intern',
  internships: 'intern',
  engineering: 'engineer',
  engineers: 'engineer',
  presently: 'present',
  scholarships: 'scholarship',
  honors: 'honours',
  honor: 'honours',
  honour: 'honours',
};

/**
 * Question words. They expand — "where" implies location, "who" implies the
 * bio — but score nothing themselves: matching the literal word "where" is
 * how "where has he interned" ends up answering "where is he from".
 */
const QUESTION = new Set(['who', 'what', 'where', 'when', 'why', 'how', 'which', 'whose']);

/**
 * Query-side expansion. A question rarely uses the site's own vocabulary —
 * "job" never appears under Experience, "class" never under Courses — so each
 * query token also contributes the terms the index actually contains.
 * Index-side text is never expanded, which keeps the IDF statistics honest.
 */
const SYNONYMS: Record<string, string[]> = {
  // Identity
  who: ['about', 'bio', 'madhav'],
  about: ['bio'],
  background: ['about', 'bio', 'experience'],
  introduce: ['about', 'bio'],
  intro: ['about', 'bio'],
  bio: ['about'],

  // Work
  job: ['experience', 'intern', 'engineer', 'role'],
  jobs: ['experience', 'intern', 'engineer', 'role'],
  work: ['experience', 'intern', 'engineer', 'role'],
  works: ['experience', 'intern', 'engineer', 'role'],
  worked: ['experience', 'intern', 'engineer', 'role'],
  working: ['experience', 'intern', 'engineer', 'role'],
  employment: ['experience', 'intern', 'role'],
  employer: ['experience', 'company', 'org'],
  career: ['experience', 'role'],
  company: ['org', 'experience'],
  companies: ['org', 'experience'],
  internship: ['intern', 'experience'],
  internships: ['intern', 'experience'],
  interned: ['intern', 'experience'],
  interning: ['intern', 'experience'],
  intern: ['experience'],
  role: ['experience', 'intern'],
  currently: ['present', 'now', 'current', 'experience'],
  now: ['present', 'current', 'currently'],
  current: ['present', 'now'],
  latest: ['current', 'present', 'now'],
  recent: ['current', 'present', 'now'],
  recently: ['current', 'present', 'now'],

  // Study
  study: ['courses', 'course', 'uiuc', 'major'],
  studies: ['courses', 'course', 'uiuc', 'major'],
  studying: ['courses', 'course', 'uiuc', 'major'],
  studied: ['courses', 'course', 'uiuc'],
  class: ['course', 'courses'],
  classes: ['course', 'courses'],
  subject: ['course', 'courses'],
  subjects: ['course', 'courses'],
  took: ['course', 'courses'],
  taking: ['course', 'courses', 'current'],
  major: ['courses', 'degree', 'uiuc'],
  degree: ['courses', 'uiuc', 'major'],
  school: ['uiuc', 'university', 'courses'],
  uni: ['uiuc', 'university'],
  university: ['uiuc'],
  college: ['uiuc', 'university'],
  illinois: ['uiuc'],
  gpa: ['awards', 'dean'],
  semester: ['courses', 'course', 'current'],
  term: ['courses', 'course', 'current'],
  fall: ['courses', 'course'],
  spring: ['courses', 'course'],

  // Sections
  award: ['awards', 'honours', 'scholarship'],
  honor: ['awards', 'honours'],
  honors: ['awards', 'honours'],
  honour: ['awards'],
  honours: ['awards'],
  prize: ['awards'],
  achievement: ['awards'],
  achievements: ['awards'],
  scholarship: ['awards'],
  note: ['notes'],
  notes: ['note', 'pdf', 'lecture'],
  pdf: ['notes'],
  lecture: ['notes'],
  blog: ['writing'],
  post: ['writing'],
  posts: ['writing'],
  article: ['writing'],
  writes: ['writing'],
  wrote: ['writing'],
  project: ['projects', 'built'],
  projects: ['project', 'built'],
  built: ['project', 'projects'],
  build: ['project', 'projects'],
  made: ['project', 'projects'],
  portfolio: ['project', 'projects'],
  repo: ['github', 'project'],
  repos: ['github', 'project'],
  repositories: ['github', 'project'],
  repository: ['github', 'project'],
  code: ['github', 'project'],

  // Contact
  contact: ['email', 'links', 'reach'],
  reach: ['email', 'contact', 'links'],
  hire: ['email', 'contact', 'resume'],
  hiring: ['email', 'contact', 'resume'],
  recruit: ['email', 'contact', 'resume'],
  recruiter: ['email', 'contact', 'resume'],
  message: ['email', 'contact'],
  touch: ['contact', 'email', 'reach'],
  talk: ['contact', 'email'],
  available: ['contact', 'email'],
  availability: ['contact', 'email'],
  opportunity: ['contact', 'email', 'intern'],
  connect: ['linkedin', 'email', 'contact'],
  cv: ['resume'],
  resume: ['cv'],

  // Domain vocabulary
  gpu: ['cuda', 'kernel', 'nvidia'],
  gpus: ['cuda', 'kernel', 'nvidia'],
  cuda: ['gpu', 'kernel'],
  kernel: ['cuda', 'gpu'],
  nvidia: ['cuda', 'gpu'],
  hpc: ['gpu', 'cuda', 'performance', 'parallel'],
  parallel: ['gpu', 'cuda'],
  ml: ['machine', 'learning', 'ai'],
  machine: ['ml', 'ai'],
  learning: ['ml', 'ai'],
  research: ['llm', 'ai'],
  ai: ['ml', 'llm', 'machine'],
  llm: ['ai', 'ml', 'research'],
  llms: ['ai', 'ml', 'research'],
  quant: ['trading', 'finance', 'orderbook'],
  trading: ['quant', 'orderbook', 'hft'],
  hft: ['trading', 'quant'],
  finance: ['quant', 'trading'],
  physics: ['phys'],
  math: ['maths', 'mathematics'],
  maths: ['math', 'mathematics'],
  mathematics: ['math'],
  language: ['languages', 'speak'],
  languages: ['language', 'speak'],
  speak: ['languages'],
  speaks: ['languages'],
  where: ['based', 'location', 'from'],
  live: ['based', 'location'],
  lives: ['based', 'location'],
  based: ['location'],
};

/** Lowercase, split on non-letters/digits, drop stop words and single chars. */
export function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

/**
 * A query's tokens plus their synonyms, weighted. Words the visitor actually
 * typed count for more than words we inferred — without this, "where has he
 * interned" scores the location fact above the jobs, because "where" expands
 * to "from" and outvotes the one term that mattered.
 */
const EXPANSION_WEIGHT = 0.45;

function expand(tokens: string[]): Map<string, number> {
  const out = new Map<string, number>();

  for (const t of tokens) {
    if (!QUESTION.has(t)) out.set(t, 1);
    const base = INFLECTIONS[t];
    if (base) out.set(base, 1);
  }

  for (const t of tokens) {
    for (const extra of SYNONYMS[t] ?? []) {
      if (!out.has(extra)) out.set(extra, EXPANSION_WEIGHT);
    }
  }

  return out;
}

/* ---------------------------------------------------------------------------
   Scoring

   BM25 over a synthetic document per chunk: the title repeated FIELD.title
   times, the keywords FIELD.keywords times, then the body once. Repetition is
   how the field weighting reaches BM25's term-frequency saturation — a term in
   the title counts for more, but three of them in the title still don't
   outrank a genuinely relevant body.
--------------------------------------------------------------------------- */

const K1 = 1.4; // term-frequency saturation
const B = 0.6; // length normalisation — chunks vary a lot, so not the full 0.75
const FIELD = { title: 3, keywords: 2, body: 1 };

interface Indexed {
  chunk: Chunk;
  /** token -> count in the weighted synthetic document */
  tf: Map<string, number>;
  length: number;
}

interface Index {
  docs: Indexed[];
  /** token -> number of documents containing it */
  df: Map<string, number>;
  avgLength: number;
}

function indexChunks(chunks: Chunk[]): Index {
  const docs: Indexed[] = chunks.map((chunk) => {
    const tf = new Map<string, number>();
    const add = (text: string, weight: number) => {
      for (const token of tokenize(text)) {
        tf.set(token, (tf.get(token) ?? 0) + weight);
      }
    };

    add(chunk.title, FIELD.title);
    add((chunk.keywords ?? []).join(' '), FIELD.keywords);
    add(chunk.section, FIELD.keywords);
    add(chunk.text, FIELD.body);

    let length = 0;
    for (const n of tf.values()) length += n;
    return { chunk, tf, length };
  });

  const df = new Map<string, number>();
  for (const doc of docs) {
    for (const token of doc.tf.keys()) df.set(token, (df.get(token) ?? 0) + 1);
  }

  const avgLength = docs.reduce((sum, d) => sum + d.length, 0) / (docs.length || 1);
  return { docs, df, avgLength };
}

// Building the index is cheap but not free, and the chunk array is a module
// constant once loaded — so key the cache on identity and rebuild only if the
// widget is ever handed a different index.
let cached: { chunks: Chunk[]; index: Index } | null = null;
function getIndex(chunks: Chunk[]): Index {
  if (!cached || cached.chunks !== chunks) {
    cached = { chunks, index: indexChunks(chunks) };
  }
  return cached.index;
}

export interface Hit {
  chunk: Chunk;
  score: number;
}

/** Top `limit` chunks for `query`, best first. Zero-scoring chunks are dropped. */
export function search(query: string, chunks: Chunk[], limit = 3): Hit[] {
  const terms = expand(tokenize(query));
  if (!terms.size) return [];

  const { docs, df, avgLength } = getIndex(chunks);
  const n = docs.length;

  const hits: Hit[] = [];
  for (const doc of docs) {
    let score = 0;
    for (const [term, weight] of terms) {
      const tf = doc.tf.get(term);
      if (!tf) continue;
      // BM25's probabilistic IDF, floored at zero so a term present in every
      // chunk contributes nothing rather than a negative.
      const docs_with = df.get(term) ?? 0;
      const idf = Math.max(0, Math.log(1 + (n - docs_with + 0.5) / (docs_with + 0.5)));
      const norm = tf + K1 * (1 - B + (B * doc.length) / avgLength);
      score += weight * idf * ((tf * (K1 + 1)) / norm);
    }
    if (score > 0) hits.push({ chunk: doc.chunk, score });
  }

  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}

/* ---------------------------------------------------------------------------
   Composing a reply
--------------------------------------------------------------------------- */

// Below this the best match is noise — BM25 scores here land around 2-8 for a
// real hit, and a stray token match on a long chunk lands near 1.
const FLOOR = 1.6;
/** Secondary hits are only shown if they're within this fraction of the best. */
const RELATIVE = 0.58;
/** A single hit this far clear of the runner-up is answered without a preamble. */
const DECISIVE = 1.5;

const GREETING = /^\s*(hi|hey|hello|yo|sup|howdy|good (morning|afternoon|evening))\b/i;
const META =
  /\b(who|what)\s+(are|is)\s+(you|this)\b|\bare you (a |an )?(bot|ai|robot|llm|human|real)\b|\bhow (do|does) (you|this|it) work\b/i;

function pick(chunks: Chunk[], id: string): Chunk | undefined {
  return chunks.find((c) => c.id === id);
}

/**
 * Turn a question into something to render. Handles the two cases retrieval
 * can't — a greeting, and a question about the widget itself — then falls
 * through to BM25.
 */
export function reply(query: string, chunks: Chunk[]): Reply {
  const q = query.trim();
  if (!q) return { lead: '', items: [] };

  if (GREETING.test(q) && q.length < 24) {
    const about = pick(chunks, 'about');
    return {
      lead: 'Hello. Ask me about Madhav’s work, projects, courses or awards — I answer from what’s on this site.',
      items: about ? [about] : [],
    };
  }

  if (META.test(q)) {
    return {
      lead:
        'I’m a small search over this site — Madhav’s experience, projects, ' +
        'courses, awards, writing and public GitHub repositories, indexed when the ' +
        'site was built. I quote what’s written rather than paraphrasing it, so ' +
        'if something isn’t on the page I won’t invent it.',
      items: [],
    };
  }

  const hits = search(q, chunks, 4);
  if (!hits.length || hits[0].score < FLOOR) {
    const contact = pick(chunks, 'contact');
    return {
      lead:
        'Nothing on the site covers that. Try asking about his experience, projects, ' +
        'courses, awards or notes — or ask him directly.',
      items: contact ? [contact] : [],
    };
  }

  const best = hits[0].score;
  const items = hits.filter((h) => h.score >= best * RELATIVE).slice(0, 3).map((h) => h.chunk);

  const decisive = items.length === 1 || (hits[1] && best >= hits[1].score * DECISIVE);
  return { lead: decisive ? '' : 'A few things on the site match that:', items };
}
