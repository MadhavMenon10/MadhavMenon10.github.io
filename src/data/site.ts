/* ===========================================================================
   site.ts — single source of truth for page content.

   Edit THIS file (plus the Markdown in src/content/writing/) to update the
   site; no component edits required. Items marked TODO are placeholders —
   replace them with real content.
=========================================================================== */

export interface NavItem {
  label: string;
  href: string;
}

export interface LinkItem {
  /** Short label shown in the links row. */
  label: string;
  /** URL, mailto:, or a path served from /public. */
  href: string;
  /** When true, opens in a new tab with rel="noopener noreferrer". */
  external?: boolean;
}

export interface Project {
  title: string;
  description: string;
  tags: string[];
  /** Project URL (repo, paper, demo). Optional — card is non-clickable if omitted. */
  href?: string;
}

export interface Site {
  name: string;
  role: string;
  tagline: string;
  bio: string;
  email: string;
  nav: NavItem[];
  links: LinkItem[];
  projects: Project[];
}

export const site: Site = {
  // Identity is prefilled from the repo owner; everything else is TODO.
  name: 'Madhav Menon',
  role: 'TODO: role line — e.g. "CS + Physics @ University"',
  tagline: '// TODO: one-line tagline',
  bio: 'TODO: short bio — a few sentences on who you are and what you work on.',
  email: 'madhav4@illinois.edu',

  // Single-page anchor navigation.
  nav: [
    { label: 'about', href: '#about' },
    { label: 'links', href: '#links' },
    { label: 'projects', href: '#projects' },
    { label: 'writing', href: '#writing' },
  ],

  // Prominent links row. Replace '#TODO' with real URLs.
  // resume.pdf lives in /public (relocated from your old assets).
  links: [
    { label: 'Resume', href: '/resume.pdf' },
    { label: 'Email', href: 'mailto:madhav4@illinois.edu' },
    { label: 'LinkedIn', href: '#TODO', external: true },
    { label: 'GitHub', href: '#TODO', external: true },
    { label: 'Transcript', href: '#TODO' },
  ],

  // Scaffolded TODO cards — replace with real projects.
  projects: [
    {
      title: 'TODO: Project One',
      description: 'TODO: one or two sentences on the project and your role.',
      tags: ['TODO', 'tags'],
      href: '#',
    },
    {
      title: 'TODO: Project Two',
      description: 'TODO: one or two sentences on the project and your role.',
      tags: ['TODO', 'tags'],
      href: '#',
    },
    {
      title: 'TODO: Project Three',
      description: 'TODO: one or two sentences on the project and your role.',
      tags: ['TODO', 'tags'],
      href: '#',
    },
  ],
};
