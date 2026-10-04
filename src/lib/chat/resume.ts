/* ===========================================================================
   resume.ts — build-time text extraction from the resume PDF.

   The resume is the densest thing on this site and, until now, the chat widget
   could only say "there is a PDF". It carries the GPA, the dates, the metrics
   in every bullet and the whole skills list — none of which appear in
   src/data/site.ts. Reading it at build time means the widget learns whatever
   the next resume upload says, with no second place to edit.

   Runs on the build machine only (Node, via astro build). unpdf is a
   devDependency for exactly this reason; nothing here ships to the browser.

   Every failure path is non-fatal: a missing file, a scanned PDF with no text
   layer, or an unpdf that throws costs the index its resume chunks and nothing
   else.
=========================================================================== */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Chunk } from './retrieve';

/** Public path of the resume — the same URL the page links to. */
export const RESUME_HREF = '/Madhav_Anand_Menon_Resume.pdf';
// Resolved against the project root rather than import.meta.url: Vite rewrites
// this module's URL during the build, so a relative walk lands somewhere else.
const RESUME_FILE = join(process.cwd(), 'public', RESUME_HREF);

/* The headings the LaTeX template emits, in the order it emits them. Anything
   not on this list is treated as body text belonging to the heading above it,
   so a renamed section degrades into a longer chunk rather than vanishing. */
const HEADINGS = ['Education', 'Experience', 'Projects', 'Skills'] as const;

interface Entry {
  /** Organisation or project name — the entry's own heading. */
  title: string;
  /** The line under the heading: role and location, or '' on a project. */
  subtitle: string;
  /** Everything under that, bullets flattened into prose. */
  body: string[];
  /** Date range, when the entry carries one. */
  period: string;
}

/** A date range at the end of an entry's first line: "Jun. 2026 - Aug. 2026". */
const MONTH = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?';
const DATE_TAIL = new RegExp(
  `\\s*(${MONTH}\\s+\\d{4}\\s*[-\u2013\u2014]\\s*(?:Present|${MONTH}\\s*\\d{4}))\\s*$`,
  'i'
);

const BULLET = /^[\u2022\u00b7\u25aa-]\s*/;

/** True for a line that opens a new entry rather than continuing the last one. */
function isHeader(line: string): boolean {
  if (BULLET.test(line)) return false;
  // Either a role with dates (Experience) or a name with a stack (Projects).
  return DATE_TAIL.test(line) || line.includes('|');
}

/**
 * Resume text arrives as one page of hard-wrapped lines. Rejoin the wraps so a
 * bullet reads as a sentence, while keeping the lines that structure the page
 * — entry headers, and the role/location line that always follows one — apart
 * from the prose around them. Getting this wrong merges four jobs into one
 * chunk, so the three cases are spelled out rather than inferred.
 */
function unwrap(lines: string[]): string[] {
  const out: string[] = [];
  let afterHeader = false;

  for (const line of lines) {
    const bullet = BULLET.test(line);
    const header = isHeader(line);
    // The line straight after an entry header is its role and location, never a
    // continuation of the header — keep it whole.
    const standalone = bullet || header || afterHeader || !out.length;

    if (standalone) out.push(line.replace(BULLET, ''));
    else out[out.length - 1] += ' ' + line;

    afterHeader = header;
  }

  return out.map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

/** Split one section's unwrapped lines into entries. */
function entries(lines: string[]): Entry[] {
  const out: Entry[] = [];

  for (const line of lines) {
    if (isHeader(line) || !out.length) {
      const period = line.match(DATE_TAIL)?.[1] ?? '';
      out.push({ title: line.replace(DATE_TAIL, '').trim(), subtitle: '', body: [], period });
      continue;
    }

    const entry = out[out.length - 1];
    // An Experience entry's second line is its role and location, e.g.
    // "Software Engineer Intern Chennai, TN, India". It is kept verbatim rather
    // than split: every rule for telling a job title from a city name breaks on
    // a two-word city, and the whole line reads fine in an answer.
    if (!entry.subtitle && !entry.body.length && entry.period) {
      entry.subtitle = line;
      continue;
    }

    entry.body.push(line);
  }

  return out;
}

/**
 * Split the page into its headed sections. Everything *above* the first heading
 * — the name, phone number, email and profile links — is dropped on purpose:
 * the PDF is public either way, but a chat widget that reads a phone number out
 * to anyone who types "how do I contact him" is a different thing from a phone
 * number on page one of a PDF. The `contact` chunk gives the email instead.
 */
function sections(text: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  let current = '';
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const heading = HEADINGS.find((h) => line.toLowerCase() === h.toLowerCase());
    if (heading) {
      current = heading;
      map.set(heading, []);
      continue;
    }
    if (current) map.get(current)!.push(line);
  }
  return map;
}

/** "Valeo — Software Engineer Intern" -> "valeo-software-engineer-intern" */
function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

/** Every capitalised word and acronym in a line — a cheap keyword harvest. */
function terms(text: string): string[] {
  const found = text.match(/\b[A-Z][A-Za-z0-9+#.]{1,}\b/g) ?? [];
  return [...new Set(found.map((t) => t.toLowerCase()))].slice(0, 24);
}

async function read(): Promise<string> {
  // unpdf is imported lazily so a site build that never reaches this function
  // (or a deploy where the dependency is missing) doesn't pay for it.
  const { extractText, getDocumentProxy } = await import('unpdf');
  const bytes = new Uint8Array(await readFile(RESUME_FILE));
  const { text } = await extractText(await getDocumentProxy(bytes), { mergePages: true });
  return text;
}

// One extraction per build, shared across every page render.
let inFlight: Promise<Chunk[]> | null = null;

async function build(): Promise<Chunk[]> {
  const text = await read();
  const parts = sections(text);
  const chunks: Chunk[] = [];

  const push = (chunk: Chunk) => {
    // A one-line entry with no bullets carries less than the site already says.
    if (chunk.text.length > 60) chunks.push(chunk);
  };

  /* --- Education: one chunk. It's short, and "what's his GPA" wants all of
         it — degree, dates, honours and coursework together. -------------- */
  const education = unwrap(parts.get('Education') ?? []);
  if (education.length) {
    push({
      id: 'resume-education',
      section: 'Resume',
      title: 'Education',
      text: education.join(' '),
      keywords: [
        'education', 'degree', 'gpa', 'major', 'minor', 'university', 'college',
        'school', 'graduate', 'graduation', 'studying', 'coursework', 'honours',
        'resume', ...terms(education.join(' ')),
      ],
      href: RESUME_HREF,
      external: true,
    });
  }

  /* --- Experience: one chunk per role. The bullets are the reason this file
         exists — they're the only place the numbers live. ----------------- */
  for (const entry of entries(unwrap(parts.get('Experience') ?? []))) {
    push({
      id: `resume-experience-${slug(entry.title)}`,
      section: 'Resume',
      // Just the organisation. The role sits in the text, and the site's own
      // Experience chunks already carry "<role> — <org>" headings — repeating
      // the pattern here only makes two cards look like the same answer twice.
      title: entry.title,
      text:
        (entry.subtitle ? `${entry.subtitle}. ` : '') +
        `At ${entry.title}${entry.period ? `, ${entry.period}` : ''}. ` +
        entry.body.join(' '),
      keywords: [
        'experience', 'intern', 'internship', 'role', 'job', 'work', 'resume',
        entry.title.toLowerCase(),
        ...terms(`${entry.title} ${entry.subtitle} ${entry.body.join(' ')}`),
      ],
      href: RESUME_HREF,
      external: true,
    });
  }

  /* --- Projects: same again. These overlap the Markdown project pages, but
         the resume states results the write-ups leave implicit. ----------- */
  for (const entry of entries(unwrap(parts.get('Projects') ?? []))) {
    const [name, stack = ''] = entry.title.split('|');
    push({
      id: `resume-project-${slug(name)}`,
      section: 'Resume',
      title: name.trim(),
      text: (stack.trim() ? `Built with ${stack.trim()}. ` : '') + entry.body.join(' '),
      keywords: [
        'project', 'projects', 'built', 'resume',
        ...terms(`${entry.title} ${entry.body.join(' ')}`),
      ],
      href: RESUME_HREF,
      external: true,
    });
  }

  /* --- Skills: the flat lists. "Does he know Rust" is one of the most likely
         questions a visitor has, and nowhere else answers it. ------------- */
  const skills = unwrap(parts.get('Skills') ?? []);
  if (skills.length) {
    push({
      id: 'resume-skills',
      section: 'Resume',
      title: 'Skills and tools',
      text: skills.join(' '),
      keywords: [
        'skill', 'skills', 'stack', 'tech', 'technologies', 'tools', 'language',
        'languages', 'programming', 'program', 'code', 'coding', 'framework',
        'frameworks', 'library', 'libraries', 'know', 'knows', 'use', 'uses',
        'experienced', 'proficient', 'resume', ...terms(skills.join(' ')),
      ],
      href: RESUME_HREF,
      external: true,
    });
  }

  return chunks;
}

/**
 * Resume chunks for the index. Resolves to [] on any failure — a portfolio
 * build shouldn't fall over because a PDF changed shape.
 */
export function resumeChunks(): Promise<Chunk[]> {
  inFlight ??= build().catch((err: unknown) => {
    console.warn(
      `[chat] resume omitted from the index — ${err instanceof Error ? err.message : String(err)}`
    );
    return [];
  });
  return inFlight;
}
