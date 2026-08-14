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

/* ===========================================================================
   Experience (Experience.astro).

   One entry per role, newest first — the list renders in array order, so
   reorder here to reorder the section. `description` is optional: leave it off
   and the row shows just the role and organisation.
=========================================================================== */
export interface ExperienceItem {
  /** Job title or role, e.g. "Software Engineering Intern". */
  role: string;
  /** Company, lab, or organisation. */
  org: string;
  /** Date range, shown verbatim in the left column, e.g. "May — Sep 2026". */
  period: string;
  /** Optional prose about the work. Omit for a role you'd rather just list. */
  description?: string;
}

// Newest first, by start date.
export const experience: ExperienceItem[] = [
  { role: 'Software Engineer Intern',       org: 'Valeo',         period: 'Jun — Aug 2026' },
  { role: 'Software Engineer',              org: 'Disruption Lab', period: 'Feb 2026 — Present' },
  { role: 'LLM Research Intern',            org: 'Algoverse.AI',  period: 'Sep 2025 — May 2026' },
  { role: 'Software Engineer Intern',       org: 'DigiAlert',     period: 'Jun — Aug 2025' },
  { role: 'CS 124 Honours Project Manager', org: 'UIUC',          period: 'Feb 2025 — Present' },
];

/* ===========================================================================
   Awards and honours (Awards.astro).

   Same shape as experience, minus the role/org split. An award held more than
   once lists every occasion in `period` — the column wraps rather than
   truncating. The section hides itself entirely while this list is empty.
=========================================================================== */
export interface AwardItem {
  /** Name of the award, scholarship, or honour. */
  title: string;
  /** Who granted it. */
  org: string;
  /** Year or date range, shown verbatim in the left column. */
  period: string;
  /** Optional prose — what it recognised, how competitive it was, etc. */
  description?: string;
}

// Newest first, by most recent time awarded.
export const awards: AwardItem[] = [
  {
    title: "Dean's List",
    org: 'UIUC',
    period: 'Fall 2024, Spring 2025, Spring 2026',
  },
  {
    title: 'Grainger Engineering Merit Scholarships',
    org: 'Grainger College of Engineering, UIUC',
    period: 'May 2025, May 2026',
  },
  {
    title: 'Ruth and Hayward Scholarship',
    org: 'Tau Beta Pi',
    period: 'May 2026',
  },
  {
    title: 'Yee Seung Ng Award',
    org: 'Department of Physics, UIUC',
    period: 'Apr 2026',
  },
  {
    title: 'James Scholar Honours',
    org: 'Grainger College of Engineering, UIUC',
    period: 'Jan 2025',
  },
  {
    title: "Outstanding Cambridge Learner's Award",
    org: 'Cambridge Assessment International Education',
    period: 'Jan 2023',
    description: 'Top in India for the Coordinated Science exam.',
  },
];

/* ===========================================================================
   Courses taken (Courses.astro).

   Nested three deep: institution -> group -> course. A group is a semester at
   university or a whole programme at school, so the same shape covers both.
   Everything renders in array order — newest first — rather than being sorted,
   because "Fall 2026" and "Cambridge IGCSE" have no common sort key.
=========================================================================== */
export interface CourseEntry {
  /** Course code, e.g. "CS 374". Omit where the school doesn't use codes. */
  code?: string;
  /** Course title, e.g. "Intro to Algorithms and Models of Computation". */
  title: string;
}

export interface CourseGroup {
  /** Semester or programme, e.g. "Fall 2026" or "Cambridge IGCSE". */
  label: string;
  /** Optional aside under the label — a date range, "Upcoming", etc. */
  note?: string;
  courses: CourseEntry[];
}

export interface CourseInstitution {
  /** School name, shown as the heading above its groups. */
  name: string;
  /** Optional date range for the whole institution, shown beside the name. */
  detail?: string;
  /** Newest group first. */
  groups: CourseGroup[];
}

export const courses: CourseInstitution[] = [
  {
    name: 'UIUC',
    detail: 'Fall 2024 — Present',
    groups: [
      {
        label: 'Fall 2026',
        note: 'Upcoming',
        courses: [
          { code: 'CS 374',   title: 'Intro to Algorithms and Models of Computation' },
          { code: 'CS 411',   title: 'Databases' },
          { code: 'CS 357',   title: 'Numerical Methods I' },
          { code: 'PHYS 435', title: 'Electromagnetic Fields I' },
          { code: 'MACS 100', title: 'Intro to Popular TV and Movies' },
        ],
      },
      {
        label: 'Spring 2026',
        courses: [
          { code: 'CS 233',   title: 'Computer Architecture' },
          { code: 'CS 222',   title: 'Software Design Lab' },
          { code: 'MATH 442', title: 'Intro to Partial Differential Equations' },
          { code: 'MATH 461', title: 'Probability Theory' },
          { code: 'PHYS 325', title: 'Classical Mechanics I' },
          { code: 'PHYS 246', title: 'Intro to Computational Physics' },
        ],
      },
      {
        label: 'Fall 2025',
        courses: [
          { code: 'CS 225 H',   title: 'Honours Data Structures' },
          { code: 'MATH 416 H', title: 'Honours Abstract Linear Algebra' },
          { code: 'MATH 441',   title: 'Differential Equations' },
          { code: 'PHYS 225',   title: 'Relativity and Math Methods' },
          { code: 'PHYS 213',   title: 'University Physics: Thermodynamics' },
          { code: 'PHYS 214',   title: 'University Physics: Quantum Physics' },
        ],
      },
      {
        label: 'Spring 2025',
        courses: [
          { code: 'CS 128',     title: 'Intro to Computer Science II (C++)' },
          { code: 'MATH 314 H', title: 'Honours Intro to Higher Math' },
          { code: 'MATH 241',   title: 'Calculus III' },
          { code: 'PHYS 212',   title: 'University Physics: Electricity and Magnetism' },
        ],
      },
      {
        label: 'Fall 2024',
        courses: [
          { code: 'CS 124 H',   title: 'Honours Intro to Computer Science I (Kotlin)' },
          { code: 'MATH 231 E', title: 'Engineering Calculus II' },
          { code: 'PHYS 211',   title: 'University Physics: Mechanics' },
          { code: 'LING 115',   title: 'Language and Culture in India' },
        ],
      },
    ],
  },
  {
    name: 'KC High International',
    detail: 'Jul 2020 — May 2024',
    groups: [
      {
        label: 'IB Diploma Programme',
        note: 'Jul 2022 — May 2024',
        courses: [
          { title: 'Higher Level Physics' },
          { title: 'Higher Level Mathematics' },
          { title: 'Higher Level Chemistry' },
          { title: 'Standard Level Economics' },
          { title: 'Standard Level English Language and Literature' },
          { title: 'Standard Level Spanish' },
        ],
      },
      {
        label: 'Cambridge IGCSE',
        note: 'Jul 2020 — May 2022',
        courses: [
          { title: 'Computer Science' },
          { title: 'Additional Mathematics' },
          { title: 'International Mathematics' },
          { title: 'Coordinated Science' },
          { title: 'Economics' },
          { title: 'Business Studies' },
          { title: 'English — First Language' },
          { title: 'Spanish — Foreign Language' },
        ],
      },
    ],
  },
];

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
  tagline: 'Previous SWE intern @ <a href="https://www.valeo.com/en/" target="_blank" rel="noopener noreferrer">Valeo</a>',
  bio: 'Hi, I\'m Madhav! I am currently a rising junior at UIUC. I am interested in high performance computing (particularly GPU programming), ML/AI, scientific computing, and quantitative development (Quant Dev). I have recently been getting into competitive programming and poker. I\'ve lived in India and Singapore, and now live in the US. I speak five languages (hover over my name in the navbar to see which! Note that I do not formally know Greek, it is rather a homage to all the physics I have studied). I am currently interning at Valeo.',
  email: 'madhavanandmenon@gmail.com',

  // Single-page anchor navigation. Experience and Awards drop out of the nav
  // while their lists are empty, so a link never points at a hidden section.
  // There's no Links entry — `links` below renders in the hero instead.
  nav: [
    { label: 'About', href: '#about' },
    ...(experience.length ? [{ label: 'Experience', href: '#experience' }] : []),
    { label: 'Projects', href: '#projects' },
    ...(awards.length ? [{ label: 'Awards', href: '#awards' }] : []),
    { label: 'Courses', href: '#courses' },
    { label: 'Writing', href: '#writing' },
    { label: 'Notes', href: '#notes' },
  ],

  // Rendered as the links row in the hero, above the fold. The resume PDF is
  // served from /public.
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
  /** Term or stage taken. 'Spring' sorts before 'Fall' within a year; any
      other label sorts alongside 'Fall'. */
  term: string;
  /** Year taken, shown after the term. A number for a single year, or a
      quoted range for something spanning several. Quote the range — an
      unquoted `2022 - 2024` is subtraction, and evaluates to -2. Sorting uses
      the latest year found in it. */
  year: number | string;
  /** Link to the notes — a PDF path served from /public, or any external URL.
      Omit if nothing is uploaded yet. */
  pdf?: string;
}

export const notes: CourseNote[] = [
  { code: 'MATH 461',  title: 'Probability Theory',              term: 'Spring', year: 2026, pdf: '/notes/MATH_461__Probability_Theory.pdf' },
  { code: 'PHYS 325',  title: 'Classical Mechanics I',           term: 'Spring', year: 2026, pdf: '/notes/PHYS_325__Classical_Mechanics_I.pdf' },
  { code: 'MATH 416H', title: 'Honours Abstract Linear Algebra', term: 'Fall',   year: 2025, pdf: '/notes/MATH_416__Abstract_Linear_Algebra.pdf' },
  { code: 'MATH 441',  title: 'Differential Equations',          term: 'Fall',   year: 2025, pdf: '/notes/MATH_441__Differential_Equations.pdf' },
  { code: 'MATH 241',  title: 'Calculus III',                    term: 'Spring', year: 2025, pdf: '/notes/MATH_241_Calculus_III.pdf' },
  { code: 'IB',        title: 'International Baccalaureate',     term: 'High School', year: '2022-2024', pdf: 'https://github.com/MadhavMenon10/my-ib-stuff' },
];

