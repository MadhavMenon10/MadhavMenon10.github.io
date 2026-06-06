# madhavmenon10.github.io

My personal site. It's an Astro project with a WebGL background and a few
interactive pieces, but it's static underneath, so it loads fast and still works
with JavaScript turned off.

The idea is a terminal sitting out in deep space. A point cloud and a warping
grid draw on a canvas behind everything, and the actual content sits in a tinted
terminal window on top of it. Dark mode is the default. Light mode flips the grid
to black so it still reads against a white page.

## Running it locally

You need Node 18.20+, 20.3+, or 22.

```
npm install
npm run dev
```

That serves the site at http://localhost:4321. The other commands:

```
npm run build     # write a static site to dist/
npm run preview   # serve what you just built
npm run check     # astro check, for types
```

## Editing content

The basics live in one file, `src/data/site.ts`: name, tagline, bio, and the row
of links. Anything labelled TODO is a placeholder.

Projects and writing are Markdown collections, one file per item, so you add to
them without touching any components. A writing post is a file in
`src/content/writing/`. Its frontmatter is the list entry and its body becomes
the page the title links to. Newest first:

```
---
title: "Some post"
date: 2026-02-01
blurb: "The one line that shows up in the list."
link: "https://example.com/the-post"   # optional, sends the title somewhere
draft: false
---
```

Projects work the same way in `src/content/projects/`. The frontmatter has
`title`, `description`, `tags`, an optional `github` link, and `units` (the GPU
core types it belongs to, used by the diagram filter). The card shows that, plus
a github icon and a "read more" link, and the body is the page "read more" opens.

Drafts stay hidden in production builds. Resume, headshot, and anything else
static go in `public/` and are served from the root, so `public/resume.pdf` is
just `/resume.pdf`.

## The GPU diagram

The streaming multiprocessor diagram under Projects is not only a picture. Each
unit actually does something. Hover one and the matching command shows up in the
little prompt underneath. Click a core column (INT32, FP32, FP64, Tensor Core)
and the project grid filters down to that kind of work. The other blocks move you
around the page: the L1 cache goes to About, the load/store units go to Links,
the SFU goes to Writing, and the memory accelerator opens an email.

If you want to rewire any of that, the `gpu` block at the bottom of
`src/data/site.ts` is where the unit to destination mapping lives. To file a
project under a core type, set `units` in its frontmatter, for example
`units: ["fp64"]`.

None of it depends on JavaScript. The units are real links, so with JS off they
still navigate and you only lose the filtering. It's keyboard friendly too.

## The background

The canvas is plain WebGL2. No three.js, one vertex shader and one fragment
shader. Both are commented in `src/scripts/gl-shaders.ts` if you want to poke at
them. The `warp()` function is where the grid bends. The uniforms above it set
the ripple and the small gravity well that follows your cursor.

A few things worth knowing, all in `src/scripts/hero.ts`:

- particle counts drop on weaker hardware, see `pickTier()`
- `DPR_CAP` stops it from cooking high density screens
- it pauses when the tab is in the background, and it turns off entirely for
  anyone with reduced motion set, falling back to a plain gradient

Colours and the terminal tint are CSS variables in `src/styles/global.css`
(`--term-*` and `--sm-*`), one set for dark and one for light.

## Deploying

It builds to a static `dist/`, so anything that serves files will host it.

For GitHub Pages there's a workflow in `.github/workflows/deploy.yml`. Switch it
on once under Settings, then Pages, then set the source to GitHub Actions. After
that, every push to `main` builds and publishes. The `.nojekyll` file in
`public/` keeps Pages from ignoring the `_astro` folder.

For Vercel, import the repo and it recognises Astro on its own, or run
`npx vercel` from the project.

## Stack

Astro, Tailwind v4, and a little vanilla TypeScript for the canvas and the
diagram. No UI framework and no animation library.
