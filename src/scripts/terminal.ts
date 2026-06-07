/* ===========================================================================
   terminal.ts — interactive terminal intro experience.

   Flow:
     - On load: if the user revealed the terminal this session, skip the intro.
     - Otherwise: show empty bash prompt, hide all content.
     - User types "learn more" (case-insensitive) → content reveals immediately.
     - Red dot  → collapses the terminal wrapper; a terminal app icon appears.
     - Yellow dot → animates typing "clear", resets to the empty prompt (and
       clears the session flag so "learn more" is required again).
     - Green dot → no-op.
     - Nav / in-page anchor links → auto-reopen + auto-reveal + scroll.
   No-JS fallback: handled in CSS (html.js selector) — content always visible.
=========================================================================== */

const SESSION_KEY = 'terminal-revealed';

export function initTerminal(): void {
  const wrapper   = document.getElementById('terminal-wrapper');
  const intro     = document.getElementById('term-intro');
  const content   = document.getElementById('term-content');
  const typedEl   = document.getElementById('term-typed');
  const closeDot  = document.getElementById('term-close');
  const clearDot  = document.getElementById('term-clear');
  const reopenBtn = document.getElementById('term-reopen') as HTMLButtonElement | null;

  if (!intro || !content || !typedEl || !closeDot || !clearDot || !reopenBtn) return;

  // Move the reopen button to <body> so it is never inside the hidden wrapper.
  // position:fixed keeps it visually in place regardless of DOM parent.
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
    try { sessionStorage.setItem(SESSION_KEY, 'true'); } catch (_) { /* private browsing */ }
    document.removeEventListener('keydown', handleKey);
    intro.classList.add('term-intro-gone');
    content.classList.add('term-shown');
  }

  // ---- skip intro if user already revealed the terminal this session ----
  let startRevealed = false;
  try { startRevealed = sessionStorage.getItem(SESSION_KEY) === 'true'; } catch (_) { /* */ }
  if (startRevealed) reveal();

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

  // ---- red dot: close terminal, show app icon ----
  function closeTerm(): void {
    if (closed) return;
    closed = true;
    if (wrapper) wrapper.hidden = true;
    reopenBtn.hidden = false;
  }

  // ---- app icon click: restore terminal ----
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

    // Reset to initial state and clear the session flag
    typed    = '';
    revealed = false;
    clearing = false;
    typedEl.textContent = '';
    try { sessionStorage.removeItem(SESSION_KEY); } catch (_) { /* */ }
    intro.classList.remove('term-intro-gone');
    content.classList.remove('term-shown');

    document.addEventListener('keydown', handleKey);
  }

  // ---- in-page anchor links: auto-open + auto-reveal + scroll ----
  // Intercepts any <a href="#..."> whose target section lives inside
  // #term-content. Opens and reveals the terminal if needed, then scrolls.
  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!a) return;

    const hash = a.getAttribute('href');
    if (!hash || hash === '#') return;

    const target = document.querySelector<HTMLElement>(hash);
    if (!target || !content.contains(target)) return;

    // Already open and revealed — nothing to do, let the browser scroll.
    if (!closed && revealed) return;

    e.preventDefault();

    if (closed) reopenTerm();
    if (!revealed) reveal();

    // Wait two frames for display changes and layout recalculation.
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

  // ---- start capturing keys (skip if already revealed) ----
  if (!startRevealed) document.addEventListener('keydown', handleKey);
}
