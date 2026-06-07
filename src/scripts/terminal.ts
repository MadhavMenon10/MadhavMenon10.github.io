/* ===========================================================================
   terminal.ts — interactive terminal intro experience.

   Home page flow:
     - Starts closed: terminal hidden, app icon centered on screen.
     - Click icon → opens terminal.
       · First visit: shows "type learn more" prompt.
       · Return visit (same session): skips prompt, shows content directly.
     - Type "learn more" (case-insensitive) → content reveals immediately.
     - Red dot  → closes terminal, shows centered app icon again.
     - Yellow dot → animates "clear", resets to empty prompt (clears session).
     - Green dot → no-op.
     - Nav / anchor links inside #term-content → auto-open + reveal + scroll.
     - Arriving at /#hash (e.g. from a post page) → same auto-open behavior.

   Non-home pages (writing/project posts):
     - Immediately reveals content; no interactive gate.

   No-JS fallback: CSS (html.js selector) keeps content visible by default.
=========================================================================== */

const SESSION_KEY = 'terminal-revealed';

export function initTerminal(): void {
  const intro   = document.getElementById('term-intro');
  const content = document.getElementById('term-content');

  if (!intro || !content) return;

  // ---- Non-home pages: show content immediately, no gate ----
  if (window.location.pathname !== '/') {
    intro.classList.add('term-intro-gone');
    content.classList.add('term-shown');
    return;
  }

  // ---- Home page setup ----
  const wrapper   = document.getElementById('terminal-wrapper');
  const typedEl   = document.getElementById('term-typed');
  const closeDot  = document.getElementById('term-close');
  const clearDot  = document.getElementById('term-clear');
  const reopenBtn = document.getElementById('term-reopen') as HTMLButtonElement | null;

  if (!typedEl || !closeDot || !clearDot || !reopenBtn) return;

  // Move reopenBtn to <body> so wrapper.hidden never hides it.
  document.body.appendChild(reopenBtn);

  let typed    = '';
  let revealed = false;
  let closed   = true; // starts closed
  let clearing = false;

  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Apply initial closed state immediately.
  if (wrapper) wrapper.hidden = true;
  reopenBtn.hidden = false;

  // ---- reveal: show all site content ----
  function reveal(): void {
    if (revealed) return;
    revealed = true;
    try { sessionStorage.setItem(SESSION_KEY, 'true'); } catch (_) { /* private mode */ }
    document.removeEventListener('keydown', handleKey);
    intro.classList.add('term-intro-gone');
    content.classList.add('term-shown');
  }

  // ---- open terminal (from icon click or hash navigation) ----
  function openTerm(): void {
    if (!closed) return;
    closed = false;
    if (wrapper) wrapper.hidden = false;
    reopenBtn.hidden = true;

    let wasRevealed = false;
    try { wasRevealed = sessionStorage.getItem(SESSION_KEY) === 'true'; } catch (_) { /* */ }

    if (wasRevealed) {
      reveal(); // skip "learn more", go straight to content
    } else {
      document.addEventListener('keydown', handleKey);
    }
  }

  // ---- red dot: close terminal ----
  function closeTerm(): void {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', handleKey);
    // Reset typed buffer so reopening gives a clean prompt
    typed = '';
    typedEl.textContent = '';
    if (wrapper) wrapper.hidden = true;
    reopenBtn.hidden = false;
  }

  // ---- keyboard capture (active only while open and unrevealed) ----
  function handleKey(e: KeyboardEvent): void {
    if (revealed || closed || clearing) return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      typed = typed.slice(0, -1);
      typedEl.textContent = typed;
      return;
    }
    if (e.key === 'Enter') {
      if (typed.trim().toLowerCase() === 'learn more') reveal();
      return;
    }
    if (e.key.length !== 1) return;

    typed += e.key;
    typedEl.textContent = typed;

    if (typed.toLowerCase() === 'learn more') reveal();
  }

  // ---- yellow dot: animate "clear", reset to intro ----
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  async function clearTerm(): Promise<void> {
    if (clearing) return;
    clearing = true;
    document.removeEventListener('keydown', handleKey);

    typed = '';
    typedEl.textContent = '';
    for (let i = 1; i <= 5; i++) {
      typedEl.textContent = 'clear'.slice(0, i);
      await sleep(65);
    }
    await sleep(220);

    typed    = '';
    revealed = false;
    clearing = false;
    typedEl.textContent = '';
    try { sessionStorage.removeItem(SESSION_KEY); } catch (_) { /* */ }
    intro.classList.remove('term-intro-gone');
    content.classList.remove('term-shown');

    document.addEventListener('keydown', handleKey);
  }

  // ---- in-page anchor clicks: auto-open + reveal + scroll ----
  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!a) return;

    const hash = a.getAttribute('href');
    if (!hash || hash === '#') return;

    const target = document.querySelector<HTMLElement>(hash);
    if (!target || !content.contains(target)) return;

    if (!closed && revealed) return; // already open, let browser scroll

    e.preventDefault();
    if (closed) openTerm();
    if (!revealed) reveal();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'start' });
      });
    });
  });

  // ---- handle arriving via /#hash (e.g. "back to writing" link) ----
  const initHash = window.location.hash;
  if (initHash && initHash !== '#') {
    const hashTarget = document.querySelector<HTMLElement>(initHash);
    if (hashTarget && content.contains(hashTarget)) {
      openTerm();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          hashTarget.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'start' });
        });
      });
    }
  }

  // ---- wire up dots ----
  closeDot.addEventListener('click', closeTerm);
  closeDot.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeTerm(); }
  });

  clearDot.addEventListener('click', () => { void clearTerm(); });
  clearDot.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void clearTerm(); }
  });

  reopenBtn.addEventListener('click', openTerm);
}
