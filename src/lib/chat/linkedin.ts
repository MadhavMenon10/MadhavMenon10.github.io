/* ===========================================================================
   linkedin.ts — reads src/data/linkedin.md into the chat index at build time.

   LinkedIn itself is off limits: it blocks automated access and its user
   agreement forbids scraping a profile, so nothing here touches the network.
   Instead this parses a Markdown file the site owner pastes into by hand —
   one `## Heading` per answer — which is the only version of "read my LinkedIn"
   that is both legal and reliable.

   A missing or empty file is normal, not an error.
=========================================================================== */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Chunk } from './retrieve';

// Project-root relative, for the same reason as resume.ts: Vite rewrites
// import.meta.url during the build.
const FILE = join(process.cwd(), 'src', 'data', 'linkedin.md');

/** Words worth matching on, harvested from the section's own prose. */
function terms(text: string): string[] {
  const found = text.toLowerCase().match(/\b[a-z][a-z+#.]{3,}\b/g) ?? [];
  return [...new Set(found)].slice(0, 30);
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

let inFlight: Promise<Chunk[]> | null = null;

async function build(): Promise<Chunk[]> {
  const raw = await readFile(FILE, 'utf8');

  // Strip the instructional HTML comment at the top of the file — it explains
  // the format to a human and would otherwise be indexed as content.
  const body = raw.replace(/<!--[\s\S]*?-->/g, '').trim();

  const chunks: Chunk[] = [];
  // Split on `## ` at the start of a line, keeping the heading with its text.
  for (const block of body.split(/^##\s+/m)) {
    const [head, ...rest] = block.split('\n');
    const title = head.trim();
    const text = rest.join(' ').replace(/\s+/g, ' ').trim();
    if (!title || text.length < 20) continue;

    chunks.push({
      id: `linkedin-${slug(title)}`,
      section: 'About',
      title,
      text,
      keywords: terms(`${title} ${text}`),
      href: '/#about',
    });
  }

  return chunks;
}

/** Hand-written LinkedIn material. Resolves to [] if the file is absent. */
export function linkedinChunks(): Promise<Chunk[]> {
  inFlight ??= build().catch((err: unknown) => {
    console.warn(
      `[chat] src/data/linkedin.md omitted from the index — ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return [];
  });
  return inFlight;
}
