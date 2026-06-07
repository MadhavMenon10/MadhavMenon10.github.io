/* ===========================================================================
   terminal.ts — interactive terminal intro experience.

   Flow:
     - On load (JS active): show empty bash prompt, hide all content.
     - User types "learn more" (case-insensitive) → content reveals immediately.
     - Red dot  → collapses the terminal wrapper; floating reopen button appears.
     - Yellow dot → animates typing "clear", then resets to the empty prompt.
     - Green dot → no-op.
     - Nav / in-page anchor links → auto-reopen + auto-reveal + scroll to section.
   No-JS fallback: handled in CSS (html.js selector) — content always visible.
=========================================================================== */

export function initTerminal(): void {
  const wrapper   = document.getElementById('terminal-wrapper');
  const intro     = document.getElementById('term-intro');
  const content   = document.getElementById('term-content');
  const typedEl   = document.getElementById('term-typed');
  const closeDot  = document.getElementById('term-close');
  const clearDot  = document.getElementById('term-clear');
  const reopenBtn = document.getElementById('term-reopen') as HTMLButtonElement | null;

  if (!intro || !content || !typedEl || !closeDot || !clearDot || !reopenBtn) return;

  // Move the reopen button to <body> immediately so it is never a descendant
  // of the wrapper that gets hidden. position:fixed keeps it visually fixed.
  document.body.appendChild(reopenBtn);

  let typed    = '';
  let revealed = false;
  let closed   = false;
  let clearing = false;

  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- reveal: instantly show all content ----
  function reveal(): void {
    if (revealed) return;
    revealed = true;
    document.removeEventListener('keydown', handleKey);
    intro.classList.add('term-intro-gone');
    content.classList.add('term-shown');
  }

  // ---- keyboard capture (active only in intro/unrevealed state) ----
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
    if (e.key.length !== 1) return; // ignore Tab, Arrow, Escape, F-keys, etc.

    typed += e.key;
    typedEl.textContent = typed;

    if (typed.toLowerCase() === 'learn more') reveal();
  }

  // ---- red dot: close terminal, show floating reopen button ----
  function closeTerm(): void {
    if (closed) return;
    closed = true;
    if (wrapper) wrapper.hidden = true;
    reopenBtn.hidden = false;
  }

  // ---- reopen button: restore terminal ----
  function reopenTerm(): void {
    closed = false;
    if (wrapper) wrapper.hidden = false;
    reopenBtn.hidden = true;
  }

  // ---- yellow dot: animate "clear" then reset to empty prompt ----
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  async function clearTerm(): Promise<void> {
    if (clearing) return;
    clearing = true;
    document.removeEventListener('keydown', handleKey);

    // Animate typing "clear" into the prompt
    typed = '';
    typedEl.textContent = '';
    for (let i = 1; i <= 5; i++) {
      typedEl.textContent = 'clear'.slice(0, i);
      await sleep(65);
    }
    await sleep(220);

    // Reset to initial state
    typed    = '';
    revealed = false;
    clearing = false;
    typedEl.textContent = '';
    intro.classList.remove('term-intro-gone');
    content.classList.remove('term-shown');

    document.addEventListener('keydown', handleKey);
  }

  // ---- in-page anchor links: auto-open + auto-reveal + scroll ----
  // Intercepts clicks on any <a href="#..."> whose target section lives inside
  // #term-content. If the terminal is closed or in intro mode, we open/reveal
  // it first so the section is actually visible before scrolling.
  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!a) return;

    const hash = a.getAttribute('href');
    if (!hash || hash === '#') return;

    // Only act if the target section is inside the terminal content area.
    const target = document.querySelector<HTMLElement>(hash);
    if (!target || !content.contains(target)) return;

    // Already open and revealed — nothing to do, let the browser scroll.
    if (!closed && revealed) return;

    e.preventDefault();

    if (closed) reopenTerm();
    if (!revealed) reveal();

    // Wait two frames for the browser to apply display changes and recalc layout.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'start' });
      });
    });
  });

  // ---- wire up dots ----
  closeDot.addEventListener('click', closeTerm);
  closeDot.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeTerm(); }
  });

  clearDot.addEventListener('click', () => { void clearTerm(); });
  clearDot.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void clearTerm(); }
  });

  reopenBtn.addEventListener('click', reopenTerm);

  // ---- start capturing keys ----
  document.addEventListener('keydown', handleKey);
}
