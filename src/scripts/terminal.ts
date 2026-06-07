/* ===========================================================================
   terminal.ts — interactive terminal intro experience.

   Home page:
     - Starts closed: terminal hidden, centered app icon shown.
     - Click icon → terminal opens as a fixed overlay that NEVER moves when the
       user scrolls (position: fixed, applied via inline styles to guarantee
       specificity over any Tailwind/CSS overrides).  The terminal-body scrolls
       its own content independently, like a real app window.
     - First open: shows "type learn more" prompt.
     - Return visit (same session): skips prompt, shows content directly.
     - Type "learn more" → content reveals instantly.
     - Red dot  → closes terminal; app icon reappears.
     - Yellow dot → animates "clear", resets prompt (clears session flag).
     - Green dot → no-op.
     - Nav / anchor links → auto-open + reveal + scroll within terminal.
     - Arriving at /#hash (from post pages) → same auto-open behavior.

   Non-home pages (writing/project posts):
     - Immediately reveals content; no gate, no fixed overlay.

   No-JS fallback: CSS keeps content always visible.
=========================================================================== */

const SESSION_KEY = 'terminal-revealed';

/** Inline styles for the terminal when open as a fixed overlay. */
function showTerm(termEl: HTMLElement): void {
  termEl.style.cssText = `
    display: flex;
    flex-direction: column;
    position: fixed;
    top: calc(var(--nav-h) + 0.75rem);
    left: 50%;
    transform: translateX(-50%);
    width: calc(100% - 2rem);
    max-width: 48rem;
    height: calc(100svh - var(--nav-h) - 1.5rem);
    z-index: 20;
    overflow: hidden;
  `;
  const body = termEl.querySelector<HTMLElement>('.terminal-body');
  if (body) {
    body.style.flex = '1';
    body.style.overflowY = 'auto';
    body.style.minHeight = '0';
  }
}

/** Inline styles to hide the terminal. */
function hideTerm(termEl: HTMLElement): void {
  termEl.style.cssText = 'display: none;';
  const body = termEl.querySelector<HTMLElement>('.terminal-body');
  if (body) {
    body.style.flex = '';
    body.style.overflowY = '';
    body.style.minHeight = '';
  }
}

/** Show the reopen icon — fixed center-screen via inline styles. */
function showIcon(btn: HTMLButtonElement): void {
  btn.hidden = false; // remove the HTML hidden attribute so no UA/author rule can block it
  btn.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.1rem;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 50;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
  `;
}

/** Hide the reopen icon. */
function hideIcon(btn: HTMLButtonElement): void {
  btn.style.cssText = 'display: none;';
}

export function initTerminal(): void {
  const intro   = document.getElementById('term-intro');
  const content = document.getElementById('term-content');

  if (!intro || !content) return;

  // ---- Non-home pages: show terminal and content directly (no gate) ----
  if (window.location.pathname !== '/') {
    // CSS hides #main-terminal via html.js rule; override it so it renders
    // normally in document flow on post/project pages.
    const termElPost = document.getElementById('main-terminal');
    if (termElPost) termElPost.style.display = 'block';
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

  // Lift both elements to <body> so no ancestor's display/overflow traps them.
  document.body.appendChild(termEl);
  document.body.appendChild(reopenBtn);

  // Collapse the now-empty wrapper permanently.
  if (wrapper) wrapper.hidden = true;

  // Apply initial state via inline styles (highest priority — beats all CSS).
  hideTerm(termEl);
  showIcon(reopenBtn);

  let typed    = '';
  let revealed = false;
  let closed   = true;
  let clearing = false;

  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- reveal: show all content ----
  function reveal(): void {
    if (revealed) return;
    revealed = true;
    try { sessionStorage.setItem(SESSION_KEY, 'true'); } catch (_) { /* private mode */ }
    document.removeEventListener('keydown', handleKey);
    intro.classList.add('term-intro-gone');
    content.classList.add('term-shown');
  }

  // ---- open: show terminal as fixed overlay ----
  function openTerm(): void {
    if (!closed) return;
    closed = false;
    showTerm(termEl);
    hideIcon(reopenBtn);
    if (scrollPrompt) scrollPrompt.hidden = false;
    // Prevent the page from scrolling behind the fixed terminal.
    document.body.style.overflow = 'hidden';

    let wasRevealed = false;
    try { wasRevealed = sessionStorage.getItem(SESSION_KEY) === 'true'; } catch (_) { /* */ }
    if (wasRevealed) {
      reveal();
    } else {
      document.addEventListener('keydown', handleKey);
    }
  }

  // ---- red dot: close terminal ----
  function closeTerm(): void {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', handleKey);
    typed = '';
    typedEl.textContent = '';
    hideTerm(termEl);
    showIcon(reopenBtn);
    if (scrollPrompt) scrollPrompt.hidden = true;
    // Restore page scroll.
    document.body.style.overflow = '';
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

  // ---- anchor clicks: auto-open + reveal + scroll within terminal ----
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

  // ---- handle arriving via /#hash (from post page nav links) ----
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
