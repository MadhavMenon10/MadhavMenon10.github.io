// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // This is a GitHub user/organization Pages repo (madhavmenon10.github.io),
  // so the site is served at the domain root — no `base` needed.
  site: 'https://madhavmenon10.github.io',

  // Tailwind v4 is wired in as a Vite plugin (no separate config file).
  // The `any` cast sidesteps a cosmetic type-version skew between
  // @tailwindcss/vite's Vite types and Astro's bundled Vite — runtime is fine.
  vite: {
    plugins: [/** @type {any} */ (tailwindcss())],
  },
});
