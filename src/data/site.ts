/* ===========================================================================
   site.ts — site-wide content and config.

   Projects and writing posts are Markdown collections (src/content/projects/
   and src/content/writing/). Everything else — name, tagline, bio, links, and
   the GPU-diagram map — lives here. Items marked TODO are placeholders.
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

/** GPU core type a project "runs on" — drives the interactive SM-diagram filter.
    int = systems/low-level · fp32 = ML/data · fp64 = science · tensor = AI/DL.
    Set per project in its frontmatter (src/content/projects/*.md). */
export type CoreUnit = 'int' | 'fp32' | 'fp64' | 'tensor';

export interface Site {
  name: string;
  role: string;
  tagline: string;
  bio: string;
  email: string;
  nav: NavItem[];
  links: LinkItem[];
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
};

/* ===========================================================================
   Interactive SM-diagram map (GpuDiagram.astro + gpu-map.ts).
   Each GPU unit maps to a destination. Edit freely:
     - kind 'filter'  -> filters the project grid to `target` (a CoreUnit)
     - kind 'section' -> smooth-scrolls to the `target` anchor
     - kind 'mailto'  -> opens an email to `target`
   `cmd` is the terminal command echoed in the readout on hover/click.
=========================================================================== */
export interface GpuUnitDef {
  /** Matches data-unit in the diagram. */
  id: string;
  label: string;
  desc: string;
  cmd: string;
  kind: 'filter' | 'section' | 'mailto';
  target: string;
}

export const gpu: { units: GpuUnitDef[] } = {
  units: [
    { id: 'l1',     label: 'L1 I-Cache',  desc: 'the instruction stream — my background', cmd: 'cat ~/about',                  kind: 'section', target: '#about' },
    { id: 'int',    label: 'INT32',       desc: 'integer & systems / low-level work',     cmd: 'ls projects --domain=systems', kind: 'filter',  target: 'int' },
    { id: 'fp32',   label: 'FP32',        desc: 'single precision — ML & data',           cmd: 'ls projects --domain=ml',      kind: 'filter',  target: 'fp32' },
    { id: 'fp64',   label: 'FP64',        desc: 'double precision — science & cosmology', cmd: 'ls projects --domain=science', kind: 'filter',  target: 'fp64' },
    { id: 'tensor', label: 'Tensor Core', desc: 'tensor cores — deep learning',           cmd: 'ls projects --domain=ai',      kind: 'filter',  target: 'tensor' },
    { id: 'ldst',   label: 'LD/ST',       desc: 'load / store — find me elsewhere',       cmd: 'cat ~/links',                  kind: 'section', target: '#links' },
    { id: 'sfu',    label: 'SFU',         desc: 'special functions — writing',            cmd: 'cat ~/writing',                kind: 'section', target: '#writing' },
    { id: 'tma',    label: 'TMA',         desc: 'tensor memory accelerator — email me',   cmd: 'mail madhav',                  kind: 'mailto',  target: 'madhav4@illinois.edu' },
  ],
};
