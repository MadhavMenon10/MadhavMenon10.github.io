/* ===========================================================================
   chat.ts — configuration for the "Ask" widget (Chat.astro).

   The widget answers questions about Madhav from a knowledge base assembled at
   build time out of this site's own content (see src/lib/chat/knowledge.ts).
   Two things live here rather than being derived: the handful of facts that
   only exist on LinkedIn, and the suggestions shown before the first message.
=========================================================================== */

/* ---------------------------------------------------------------------------
   Facts the site itself doesn't state.

   Everything in src/data/site.ts and src/content/ is already indexed, so don't
   repeat it here — this list is for the things that only live on LinkedIn or
   in your head: what you're looking for, tools you use, anything a visitor
   would reasonably ask that the page doesn't answer.

   LinkedIn can't be scraped (it blocks bots, and its terms forbid it), so
   anything from there has to be copied across by hand. Paste a profile line
   in as its own entry; keep each one to a sentence or two so a retrieved
   answer stays short.
--------------------------------------------------------------------------- */
export interface Fact {
  /** Short heading, shown above the answer. */
  title: string;
  /** The answer itself, in your own voice — it's quoted back verbatim. */
  text: string;
  /** Extra words that should match this fact but don't appear in `text`. */
  keywords?: string[];
}

export const facts: Fact[] = [
  {
    title: 'Languages',
    text:
      'Madhav speaks five languages: Malayalam, Tamil, Hindi, English and Spanish. ' +
      'The Greek glyph in the navbar is a nod to the physics rather than a sixth language.',
    keywords: ['language', 'speak', 'spoken', 'multilingual', 'malayalam', 'tamil', 'hindi', 'spanish', 'greek'],
  },
  {
    title: 'Where he is from',
    text:
      'Madhav has lived in India and Singapore and is now based in the United States, ' +
      'studying at the University of Illinois Urbana-Champaign.',
    keywords: ['based', 'location', 'country', 'hometown', 'india', 'singapore', 'usa', 'america', 'urbana', 'champaign', 'illinois'],
  },
  {
    title: 'Interests',
    text:
      'High performance computing — GPU programming especially — along with ML and AI, ' +
      'scientific computing, and quantitative development. Outside of that, competitive ' +
      'programming and poker.',
    keywords: ['interest', 'interested', 'focus', 'passion', 'hobby', 'hobbies', 'cuda', 'hpc', 'quant', 'trading', 'poker', 'competitive programming'],
  },

  // Add your own below. A few worth having, if they're true:
  //
  // {
  //   title: 'What he is looking for',
  //   text: 'Madhav is looking for Summer 2027 internships in ... . The best way to reach him is email.',
  //   keywords: ['hiring', 'available', 'internship', 'opportunity', 'recruiting', 'looking'],
  // },
  // {
  //   title: 'Tools and languages',
  //   text: 'Day to day: C++, CUDA, Python, Kotlin, ... .',
  //   keywords: ['skill', 'skills', 'stack', 'tech', 'programming language', 'python', 'c++'],
  // },
];

/* ---------------------------------------------------------------------------
   Prompts offered on the empty panel. Keep them to four — they wrap onto two
   lines at the panel's width, and more than that reads as a menu.
--------------------------------------------------------------------------- */
export const suggestions: string[] = [
  'What is he working on?',
  'Where has he interned?',
  'Tell me about the CUDA projects',
  'How do I get in touch?',
];

/* ---------------------------------------------------------------------------
   GitHub repositories are pulled at build time so answers about them stay
   current without anyone editing this file. Set to null to skip the fetch.
--------------------------------------------------------------------------- */
export const githubUser: string | null = 'MadhavMenon10';

/** Repos below this many stars are only indexed if nothing else fills the list. */
export const githubMaxRepos = 12;
