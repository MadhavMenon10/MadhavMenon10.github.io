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
  name: 'Madhav Anand Menon',
  role: 'Computer Science & Physics + Mathematics @ UIUC',
  tagline: 'Currently interning @ <a href="https://www.valeo.com/en/" target="_blank" rel="noopener noreferrer">Valeo</a>',
  bio: 'Hi, I\'m Madhav! I am currently a rising junior at UIUC. I am interested in high performance computing (particularly GPU programming), ML/AI, scientific computing, and quantitative development (Quant Dev). I have recently been getting into competitive programming and poker. I\'ve lived in India and Singapore, and now live in the US. I speak five languages (hover over my name in the navbar to see which! Note that I do not formally know Greek, it is rather a homage to all the physics I have studied). I am currently interning at Valeo.',
  email: 'madhavanandmenon@gmail.com',

  // Single-page anchor navigation.
  nav: [
    { label: 'About', href: '#about' },
    { label: 'Links', href: '#links' },
    { label: 'Projects', href: '#projects' },
    { label: 'Writing', href: '#writing' },
    { label: 'Notes', href: '#notes' },
  ],

  // Prominent links row. Replace '#TODO' with real URLs.
  // resume.pdf lives in /public (relocated from your old assets).
  links: [
    { label: 'Resume', href: '/resume.pdf', external: true },
    { label: 'Email', href: 'mailto:madhavanandmenon@gmail.com' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/madhav-anand-menon/', external: true },
    { label: 'GitHub', href: 'https://github.com/MadhavMenon10', external: true },
  ],
};

/* ===========================================================================
   Course notes (Notes.astro).
   One entry per course. The card links its title to the notes PDF in /public
   when `pdf` is set; courses without a PDF render as "coming soon".
=========================================================================== */
export interface CourseNote {
  /** Course code / name, e.g. "MATH 241". */
  code: string;
  /** Full course title, e.g. "Calculus III". */
  title: string;
  /** Term taken — Spring sorts before Fall within a year. */
  term: 'Spring' | 'Fall';
  /** Calendar year taken. */
  year: number;
  /** Path to the notes PDF served from /public, or omit if not uploaded yet. */
  pdf?: string;
}

export const notes: CourseNote[] = [
  { code: 'MATH 461',  title: 'Probability Theory',              term: 'Spring', year: 2026, pdf: '/notes/MATH_461__Probability_Theory.pdf' },
  { code: 'PHYS 325',  title: 'Classical Mechanics I',           term: 'Spring', year: 2026, pdf: '/notes/PHYS_325__Classical_Mechanics_I.pdf' },
  { code: 'MATH 416H', title: 'Honours Abstract Linear Algebra', term: 'Fall',   year: 2025, pdf: '/notes/MATH_416__Abstract_Linear_Algebra.pdf' },
  { code: 'MATH 441',  title: 'Differential Equations',          term: 'Fall',   year: 2025, pdf: '/notes/MATH_441__Differential_Equations.pdf' },
  { code: 'MATH 241',  title: 'Calculus III',                    term: 'Spring', year: 2025, pdf: '/notes/MATH_241_Calculus_III.pdf' },
];

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
    { id: 'l1',     label: '~/about',   desc: 'my background · who I am',              cmd: 'cat ~/about',         kind: 'section', target: '#about' },
    { id: 'int',    label: 'systems',   desc: 'low-level · OS · compilers · C/C++',   cmd: 'ls ~/projects --sys', kind: 'filter',  target: 'int' },
    { id: 'fp32',   label: 'ml & data', desc: 'machine learning · data science',       cmd: 'ls ~/projects --ml',  kind: 'filter',  target: 'fp32' },
    { id: 'fp64',   label: 'science',   desc: 'physics · cosmology · simulation',      cmd: 'ls ~/projects --sci', kind: 'filter',  target: 'fp64' },
    { id: 'tensor', label: 'ai & dl',   desc: 'deep learning · neural nets · LLMs',   cmd: 'ls ~/projects --ai',  kind: 'filter',  target: 'tensor' },
    { id: 'ldst',   label: '~/links',   desc: 'load / store · find me elsewhere',      cmd: 'open ~/links',        kind: 'section', target: '#links' },
    { id: 'sfu',    label: '~/write',   desc: 'special function · blog & essays',      cmd: 'cat ~/writing',       kind: 'section', target: '#writing' },
    { id: 'tma',    label: 'contact',   desc: 'high-bandwidth async comms · email me', cmd: 'mail madhav',         kind: 'mailto',  target: 'madhav4@illinois.edu' },
  ],
};
