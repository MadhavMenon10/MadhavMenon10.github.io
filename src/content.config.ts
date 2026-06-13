import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/* "writing" collection.
   Add a post by dropping a Markdown file into src/content/writing/ — its body
   becomes a page at /writing/<filename>. */
const writing = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    blurb: z.string(),
    /** Optional external URL: links the list item out instead of to a page. */
    link: z.string().url().optional(),
    /** Drafts are hidden in production builds. */
    draft: z.boolean().default(false),
  }),
});

/* "projects" collection.
   Frontmatter drives the card; the Markdown body is the "read more" page at
   /projects/<filename>. Add a project by dropping a Markdown file in
   src/content/projects/. */
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()).default([]),
    /** Repo URL — shows the GitHub icon on the card. */
    github: z.string().url().optional(),
    /** Optional demo / paper link. */
    link: z.string().url().optional(),
    /** Optional preview image shown on the card — a path served from /public. */
    image: z.string().optional(),
    /** Alt text for the preview image (defaults to the title). */
    imageAlt: z.string().optional(),
    /** How the preview image fills its frame: 'cover' crops to fill, 'contain'
        shows the whole image (letterboxed). Defaults to 'cover'. */
    imageFit: z.enum(['cover', 'contain']).default('cover'),
    /** GPU core type(s), for the interactive SM-diagram filter. */
    units: z.array(z.enum(['int', 'fp32', 'fp64', 'tensor'])).optional(),
    /** Lower numbers sort first. */
    order: z.number().default(0),
    draft: z.boolean().default(false),
  }),
});

export const collections = { writing, projects };
