/* ===========================================================================
   terminal.ts — interactive terminal intro experience.

   Home page:
     - Starts closed: terminal hidden, centered app icon + "// click to open".
     - Click icon → terminal opens as a FIXED overlay (stays in place while
       content scrolls inside it — like a real app window).
     - First open: shows "type learn more" prompt.
     - Return visit (same session): skips prompt, shows content directly.
     - Type "learn more" → content reveals instantly.
     - Red dot  → closes terminal, icon reappears.
     - Yellow dot → animates "clear", resets to empty prompt (clears session).
     - Green dot → no-op.
     - Nav / anchor links → auto-open + reveal + scroll.
     - Arriving at /#hash (from post pages) → same auto-open behavior.

   Non-home pages (writing/project posts):
     - Immediately reveals content; no gate, no fixed overlay.

   No-JS fallback: CSS keeps content visible; no terminal gate.
=========================================================================== */

const SESSION_KEY = 'terminal-revealed';

export function initTerminal(): void {
  const intro   = document.getElementById('term-intro');
  const content = document.getElementById('term-content');

  if (!intro || !content) return;

  // ---- Non-home pages: always show content directly ----
  if (window.location.pathname !== '/') {
    intro.classList.add('term-intro-gone');
    content.classList.add('term-shown');
    return;
  }

  // ---- Home page setup ----
  const wrapper      = document.getElementById('terminal-wrapper');
  const termEl       = document.getElementById('main-terminal');
  const typedEl      = document.getElementById('term-typed');
  const closeDot     = document.getElementById('term-close');
  const clearDot     = document.getElementById('term-clear');
  const reopenBtn    = document.getElementById('term-reopen') as HTMLButtonElement | null;
  const scrollPrompt = document.getElementById('scroll-prompt');

  if (!termEl || !typedEl || !closeDot || !clearDot || !reopenBtn) return;

  // Mark home page so CSS can scope the fixed-overlay rules.
  document.body.classList.add('is-home');

  // Lift both elements to <body> so they are never trapped inside a
  // hidden ancestor. position:fixed anchors them to the viewport regardless.
  document.body.appendChild(termEl);
  document.body.appendChild(reopenBtn);

  // The wrapper is now empty — collapse it permanently.
  if (wrapper) wrapper.hidden = true;

  let typed    = '';
  let revealed = false;
  let closed   = true;
  let clearing = false;

  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Apply initial closed state.
  reopenBtn.hidden = false;

  // ---- reveal: show all content ----
  function reveal(): void {
    if (revealed) return;
    revealed = true;
    try { sessionStorage.setItem(SESSION_KEY, 'true'); } catch (_) { /* private mode */ }
    document.removeEventListener('keydown', handleKey);
    intro.classList.add('term-intro-gone');
    content.classList.add('term-shown');
  }

  // ---- open: show terminal as a fixed overlay ----
  function openTerm(): void {
    if (!closed) return;
    closed = false;
    termEl.classList.add('term-window-open');
    reopenBtn.hidden = true;
    if (scrollPrompt) scrollPrompt.hidden = false;

    let wasRevealed = false;
    try { wasRevealed = sessionStorage.getItem(SESSION_KEY) === 'true'; } catch (_) { /* */ }

    if (wasRevealed) {
      reveal();
    } else {
      document.addEventListener('keydown', handleKey);
    }
  }

  // ---- red dot: close terminal, show icon ----
  function closeTerm(): void {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', handleKey);
    typed = '';
    typedEl.textContent = '';
    termEl.classList.remove('term-window-open');
    reopenBtn.hidden = false;
    if (scrollPrompt) scrollPrompt.hidden = true;
  }

  // ---- keyboard capture (home page, open, unrevealed) ----
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

  // ---- yellow dot: animate "clear", reset to empty prompt ----
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

  // ---- in-page anchor clicks: auto-open + reveal + scroll within terminal ----
  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!a) return;
    const hash = a.getAttribute('href');
    if (!hash || hash === '#') return;
    const target = document.querySelector<HTMLElement>(hash);
    if (!target || !content.contains(target)) return;
    if (!closed && revealed) return; // already open, let internal scroll handle it

    e.preventDefault();
    if (closed) openTerm();
    if (!revealed) reveal();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'start' });
      });
    });
  });

  // ---- handle arriving via /#hash (e.g. nav link from a post page) ----
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
