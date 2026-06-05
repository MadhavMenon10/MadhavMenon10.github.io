# madhavmenon10.github.io

Personal portfolio — a static-first [Astro](https://astro.build) site with a
WebGL2 hero (a star field drifting over a warping "spacetime" grid) and a
schematic, scroll-triggered GPU-pipeline animation. Aesthetic: a fusion of
systems/GPU programming and astrophysics, dark-mode first.

Built to stay fast and accessible:

- **No heavy dependencies** — raw WebGL2 (no three.js), CSS transforms +
  `IntersectionObserver` for scroll effects, Tailwind v4 for styling.
- **60fps-minded** — one shader program, two draw calls; DPR-capped; the render
  loop pauses when offscreen, when the tab is hidden, and in light mode.
- **Works without JS** — the hero falls back to a CSS deep-space gradient and
  all content renders server-side.
- **Respects `prefers-reduced-motion`** — animations are disabled and the
  static gradient is shown.

## Quick start

Requires Node 18.20.8+, 20.3+, or 22+.

```bash
npm install
npm run dev        # local dev server at http://localhost:4321
```

### Scripts

| Command           | Action                                            |
| ----------------- | ------------------------------------------------- |
| `npm run dev`     | Start the dev server                              |
| `npm run build`   | Type-sync content + build static site to `dist/`  |
| `npm run preview` | Preview the production build locally              |
| `npm run check`   | Run `astro check` (type-check `.astro`/`.ts`)     |

## Editing content

All content lives in data/content files — you shouldn't need to touch
components.

- **Bio, role, tagline, links, projects** → [`src/data/site.ts`](src/data/site.ts).
  Items marked `TODO` are placeholders.
- **Writing posts** → add a Markdown file to `src/content/writing/`. Frontmatter:

  ```md
  ---
  title: "Post title"
  date: 2026-02-01
  blurb: "One-line summary shown in the list."
  link: "https://optional-external-url"   # optional
  draft: false                              # drafts are hidden in prod builds
  ---

  Body (Markdown).
  ```

- **Static files** (resume PDF, headshot, logos) live in `public/` and are
  served at the site root (e.g. `/resume.pdf`).

## Theming

Dark is the primary theme; light is a clean inverted variant. The toggle
persists to `localStorage` and respects the OS preference on first load. An
inline script in `Base.astro` sets the theme before first paint (no flash).

Colors are CSS variables in [`src/styles/global.css`](src/styles/global.css)
(`:root` = dark, `[data-theme="light"]` = light) and surfaced as Tailwind
utilities (`bg-bg`, `text-fg`, `text-accent`, …).

## Tuning the hero effect

- **Shader math + uniforms** — [`src/scripts/gl-shaders.ts`](src/scripts/gl-shaders.ts).
  The `warp()` function controls the grid deformation: ambient ripple
  (`u_amp`, `u_freq`, `u_drift`) plus a mouse "gravity well"
  (`u_wellStrength`, `u_wellRadius`).
- **Uniform values, camera, colors, quality tiers** —
  [`src/scripts/hero.ts`](src/scripts/hero.ts). `pickTier()` scales the grid
  resolution and star count by device; `DPR_CAP` limits overdraw.

Degradation: light mode, no WebGL2, low-power devices, and
`prefers-reduced-motion` all fall back to the CSS gradient.

## Project structure

```
src/
├─ data/site.ts            # single source of truth for page content
├─ content/                # "writing" collection (Markdown posts) + schema
├─ layouts/Base.astro      # HTML shell, head, theme bootstrap, nav/footer
├─ components/             # Hero, About, Links, Projects, Writing, Pipeline, …
├─ scripts/                # hero (WebGL2), gl-shaders, gl-math, reveal
├─ styles/global.css       # Tailwind entry + design tokens + keyframes
└─ pages/index.astro       # single-page assembly
public/                    # static assets (favicon, resume, images, .nojekyll)
```

## Deploy

The site builds to a static `dist/` — host it anywhere.

### GitHub Pages (included workflow)

This is a user page (`madhavmenon10.github.io`), served at the domain root.

1. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Push to `main`. The workflow at
   [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds with
   `withastro/action` and deploys with `actions/deploy-pages`.

(`public/.nojekyll` is included so the `_astro/` build output is served.)

### Vercel

Import the repo (framework preset **Astro** is auto-detected: build
`astro build`, output `dist`), or run `npx vercel`.

> If deploying as a *project* page under a sub-path, set `base: '/<repo>'` in
> `astro.config.mjs`. Not needed here (root domain).
