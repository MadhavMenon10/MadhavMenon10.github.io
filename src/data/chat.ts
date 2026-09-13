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

   Longer LinkedIn material now has a better home: src/data/linkedin.md, which
   takes plain Markdown under `##` headings and needs no code. (LinkedIn itself
   can't be read by the build — it blocks bots and its terms forbid scraping —
   so either way it is copied across by hand.) Use this array for short facts
   that want their own match terms, and that file for prose.
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
    // Titled "Spoken" and stripped of the bare word "language" on purpose:
    // with either in place, "what languages does he program in?" retrieves this
    // entry ahead of the resume's skills list and answers with Malayalam.
    title: 'Spoken languages',
    text:
      'Madhav speaks five languages: Malayalam, Tamil, Hindi, English and Spanish. ' +
      'The Greek glyph in the navbar is a nod to the physics rather than a sixth language.',
    keywords: ['speak', 'speaks', 'spoken', 'multilingual', 'bilingual', 'fluent', 'malayalam', 'tamil', 'hindi', 'spanish', 'greek'],
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

  // Nothing about skills, tools, education or what he's looking for needs to go
  // here — the resume PDF supplies the first three and src/data/linkedin.md the
  // last. Add an entry only for something neither of those covers.
];

/* ---------------------------------------------------------------------------
   Prompts offered on the empty panel. Keep them to four — they wrap onto two
   lines at the panel's width, and more than that reads as a menu.
--------------------------------------------------------------------------- */
export const suggestions: string[] = [
  'What is he working on?',
  'Where has he interned?',
  'What is he good at?',
  'How do I get in touch?',
];

/* ---------------------------------------------------------------------------
   GitHub repositories are pulled at build time so answers about them stay
   current without anyone editing this file. Set to null to skip the fetch.
--------------------------------------------------------------------------- */
export const githubUser: string | null = 'MadhavMenon10';

/** Repos below this many stars are only indexed if nothing else fills the list. */
export const githubMaxRepos = 12;
