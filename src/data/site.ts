/* ===========================================================================
   site.ts — site-wide content and config.

   Projects and writing posts are Markdown collections (src/content/projects/
   and src/content/writing/). Everything else — name, role, tagline, bio, links,
   and course notes — lives here.
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

  // Prominent links row. The resume PDF is served from /public.
  links: [
    { label: 'Resume', href: '/Madhav_Anand_Menon_Resume.pdf', external: true },
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

