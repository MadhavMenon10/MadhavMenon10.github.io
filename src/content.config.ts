import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/* "writing" collection.
   Add a post by dropping a Markdown file into src/content/writing/ — no
   component changes needed. Writing.astro lists these sorted by date. */
const writing = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    blurb: z.string(),
    /** Optional external URL (link out to the post). */
    link: z.string().url().optional(),
    /** Drafts are hidden in production builds. */
    draft: z.boolean().default(false),
  }),
});

export const collections = { writing };
