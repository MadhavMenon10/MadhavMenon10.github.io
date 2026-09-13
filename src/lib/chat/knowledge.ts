/* ===========================================================================
   knowledge.ts — assembles the Ask widget's index at build time.

   Everything the widget can say comes from here, and everything here comes
   from content that already exists: src/data/site.ts, the Markdown
   collections, the hand-written facts in src/data/chat.ts, the resume PDF in
   public/, the pasted LinkedIn material in src/data/linkedin.md, and the
   public GitHub listing with each repo's README. Nothing is written twice, so
   adding a job or a project to the site teaches the widget about it with no
   extra step — and uploading a new resume teaches it whatever changed.

   One chunk is one answer. They're sized to be quoted whole — a paragraph,
   not a page — because the offline widget shows retrieved text verbatim
   rather than summarising it.
=========================================================================== */

import { getCollection } from 'astro:content';
import { site, experience, awards, courses, notes } from '../../data/site';
import { facts, githubUser, githubMaxRepos } from '../../data/chat';
import { fetchRepos } from './github';
import { resumeChunks } from './resume';
import { linkedinChunks } from './linkedin';
import type { Chunk } from './retrieve';

/** Markdown to plain prose: enough to stop syntax leaking into an answer. */
function strip(markdown: string): string {
  return markdown
    .replace(/^---[\s\S]*?\n---\n/, '') // frontmatter, if the loader left it
    .replace(/```[\s\S]*?```/g, ' ') // fenced code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links -> their text
    .replace(/^#{1,6}\s+/gm, '') // headings
    .replace(/[*_`>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** First `max` characters, cut at a sentence or word boundary. */
function excerpt(text: string, max = 420): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const sentence = cut.lastIndexOf('. ');
  if (sentence > max * 0.5) return cut.slice(0, sentence + 1);
  return cut.slice(0, cut.lastIndexOf(' ')) + '…';
}

/** Strip the anchor tags `site.tagline` carries, leaving readable text. */
function detag(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

export async function buildIndex(): Promise<Chunk[]> {
  const chunks: Chunk[] = [];

  /* --- Identity ------------------------------------------------------- */
  chunks.push({
    id: 'about',
    section: 'About',
    title: site.name,
    text: `${site.role}. ${detag(site.tagline)}. ${site.bio}`,
    keywords: [
      'about', 'bio', 'who', 'madhav', 'menon', 'introduction', 'summary',
      'background', 'student', 'uiuc', 'junior',
    ],
    href: '/#about',
  });

  chunks.push({
    id: 'contact',
    section: 'Links',
    title: 'Getting in touch',
    text:
      `Email is the best way to reach Madhav: ${site.email}. He's also on ` +
      `LinkedIn and GitHub, and his resume is linked from the top of this page.`,
    keywords: [
      'contact', 'email', 'reach', 'hire', 'hiring', 'recruit', 'message',
      'linkedin', 'github', 'connect', 'talk', 'dm', 'mail',
    ],
    href: `mailto:${site.email}`,
    external: true,
  });

  chunks.push({
    id: 'resume',
    section: 'Links',
    title: 'Resume',
    text: 'Madhav’s resume is available as a PDF, linked at the top of this page.',
    keywords: ['resume', 'cv', 'pdf', 'download'],
    href: '/Madhav_Anand_Menon_Resume.pdf',
    external: true,
  });

  /* --- Experience ----------------------------------------------------- */
  for (const [i, item] of experience.entries()) {
    const current = /present/i.test(item.period);
    chunks.push({
      id: `experience-${i}`,
      section: 'Experience',
      title: `${item.role} — ${item.org}`,
      text:
        `${item.role} at ${item.org}, ${item.period}.` +
        (item.description ? ` ${item.description}` : ''),
      keywords: [
        'experience', 'intern', 'role', 'job', 'work', 'engineer',
        item.org.toLowerCase(),
        ...(current ? ['present', 'current', 'currently', 'now'] : ['past', 'previous', 'former']),
      ],
      href: '/#experience',
    });
  }

  /* --- Projects (Markdown collection) --------------------------------- */
  const projects = (await getCollection('projects', ({ data }) => !data.draft)).sort(
    (a, b) => a.data.order - b.data.order
  );

  for (const project of projects) {
    // A project's body opens with a fuller version of its own card blurb, so
    // concatenating the two reads as a stutter. Prefer the body where there is
    // one; its wording covers the blurb's terms for retrieval anyway.
    const body = strip(project.body ?? '');
    const prose = body.length > 140 ? body : `${project.data.description} ${body}`.trim();
    chunks.push({
      id: `project-${project.id}`,
      section: 'Projects',
      title: project.data.title,
      text: excerpt(prose, 480),
      keywords: [
        'project', 'projects', 'built', 'made',
        ...project.data.tags.map((t) => t.toLowerCase()),
        ...(project.data.github ? ['github', 'repo', 'source', 'code'] : []),
      ],
      href: `/projects/${project.id}`,
    });
  }

  /* --- Awards --------------------------------------------------------- */
  for (const [i, award] of awards.entries()) {
    chunks.push({
      id: `award-${i}`,
      section: 'Awards',
      title: award.title,
      text:
        `${award.title}, awarded by ${award.org} — ${award.period}.` +
        (award.description ? ` ${award.description}` : ''),
      keywords: ['award', 'awards', 'honour', 'honours', 'scholarship', 'prize', 'recognition', award.org.toLowerCase()],
      href: '/#awards',
    });
  }

  /* --- Courses -------------------------------------------------------- */
  // One chunk per group rather than per course: "what is he taking this
  // semester" wants the whole list, and a single course is rarely the answer.
  for (const institution of courses) {
    for (const [i, group] of institution.groups.entries()) {
      const list = group.courses
        .map((c) => (c.code ? `${c.code} ${c.title}` : c.title))
        .join(', ');
      chunks.push({
        id: `courses-${institution.name}-${group.label}`.replace(/\s+/g, '-').toLowerCase(),
        section: 'Courses',
        title: `${group.label} — ${institution.name}`,
        text: `${group.label}${group.note ? ` (${group.note})` : ''} at ${institution.name}: ${list}.`,
        keywords: [
          'course', 'courses', 'class', 'classes', 'took', 'studying', 'curriculum',
          institution.name.toLowerCase(),
          // Groups are newest first, so the first one is what "this semester"
          // means. Without this every group scores alike and the shortest wins.
          ...(i === 0 ? ['current', 'now', 'present', 'semester', 'taking'] : ['past', 'previous']),
        ],
        href: '/#courses',
      });
    }
  }

  /* --- Notes ---------------------------------------------------------- */
  const published = notes.filter((n) => n.pdf);
  if (published.length) {
    chunks.push({
      id: 'notes',
      section: 'Notes',
      title: 'Course notes',
      text:
        'Madhav publishes typed notes for courses he has taken: ' +
        published.map((n) => `${n.code} ${n.title} (${n.term} ${n.year})`).join(', ') +
        '. Each links to a PDF.',
      keywords: ['notes', 'note', 'pdf', 'lecture', 'latex', 'typed'],
      href: '/#notes',
    });
  }

  /* --- Writing -------------------------------------------------------- */
  const posts = (await getCollection('writing', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );

  for (const post of posts) {
    chunks.push({
      id: `writing-${post.id}`,
      section: 'Writing',
      title: post.data.title,
      text: excerpt(`${post.data.blurb} ${strip(post.body ?? '')}`.trim(), 400),
      keywords: ['writing', 'blog', 'post', 'article', 'wrote'],
      href: post.data.link ?? `/writing/${post.id}`,
      external: Boolean(post.data.link),
    });
  }

  /* --- Hand-written facts (the LinkedIn-only material) ---------------- */
  for (const [i, fact] of facts.entries()) {
    chunks.push({
      id: `fact-${i}`,
      section: 'About',
      title: fact.title,
      text: fact.text,
      keywords: fact.keywords ?? [],
      href: '/#about',
    });
  }

  /* --- Public GitHub repositories ------------------------------------- */
  const repos = await fetchRepos(githubUser, githubMaxRepos);
  for (const repo of repos) {
    chunks.push({
      id: `repo-${repo.name}`,
      section: 'GitHub',
      title: repo.name,
      text:
        // Metadata first so a short answer has the facts, then the README's
        // own words, which are the only part that explains what it does.
        `${repo.description}` +
        (repo.language ? ` Written mainly in ${repo.language}.` : '') +
        (repo.stars ? ` ${repo.stars} star${repo.stars === 1 ? '' : 's'}.` : '') +
        ` Last pushed ${repo.pushedAt}.` +
        (repo.readme ? ` From its README: ${repo.readme}` : ''),
      keywords: [
        'github', 'repo', 'repository', 'code', 'source', 'open source',
        ...(repo.language ? [repo.language.toLowerCase()] : []),
        ...repo.topics,
      ],
      href: repo.url,
      external: true,
    });
  }

  /* --- Resume PDF ----------------------------------------------------- */
  // Pushed last of the site-derived material but indexed the same: the bullets
  // carry numbers ("3.9-6.8x below XGBoost", "GPA 3.97") that exist nowhere
  // else, and they're what a recruiter actually asks about.
  chunks.push(...(await resumeChunks()));

  /* --- LinkedIn (hand-pasted; see src/data/linkedin.md) ---------------- */
  chunks.push(...(await linkedinChunks()));

  return chunks;
}
