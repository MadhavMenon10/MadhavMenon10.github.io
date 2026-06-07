/* ===========================================================================
   terminal.ts — interactive terminal intro experience.

   Home page:
     - Starts closed: terminal hidden, centered app icon shown below hero.
     - Portal pattern: a JS-created `position:fixed` div covers the viewport.
       Both the terminal window and the reopen icon live inside it as
       `position:absolute` children.  This is the only reliable way to
       guarantee fixed behaviour regardless of CSS class rules, backdrop-filter
       siblings, or any stacking-context quirks in the rest of the page.
     - Click icon → terminal opens (icon hidden).
     - First open: shows "type learn more" prompt.
     - Return visit (same session): skips prompt, shows content directly.
     - Type "learn more" → content reveals instantly.
     - Red dot  → closes terminal; icon reappears.
     - Yellow dot → animates "clear", resets prompt (clears session flag).
     - Green dot → no-op.
     - Nav / anchor links → auto-open + reveal + scroll within terminal.
     - Arriving at /#hash (from post pages) → same auto-open behavior.

   Non-home pages (writing/project posts):
     - Immediately reveals content; no gate, no fixed overlay.

   No-JS fallback: CSS keeps content always visible.
=========================================================================== */

const SESSION_KEY = 'terminal-revealed';

export function initTerminal(): void {
  const intro   = document.getElementById('term-intro');
  const content = document.getElementById('term-content');

  if (!intro || !content) return;

  // ---- Non-home pages: show terminal and content directly (no gate) ----
  if (window.location.pathname !== '/') {
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

  // ---- Portal: one JS-created position:fixed layer for the whole terminal UI.
  //
  // Why: backdrop-filter on .terminal creates a new stacking context that can
  // corrupt position:fixed on sibling elements in Chrome/Safari.  By wrapping
  // everything in a fresh programmatic element (no CSS class, no backdrop),
  // we guarantee the fixed layer is truly viewport-anchored.
  const portal = document.createElement('div');
  portal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 20;
    pointer-events: none;
  `;
  document.body.appendChild(portal);

  // Move terminal and icon into the portal; collapse the now-empty wrapper.
  portal.appendChild(termEl);
  portal.appendChild(reopenBtn);
  if (wrapper) wrapper.hidden = true;

  // Lock page scroll permanently on the home page.
  // The home page is a fullscreen app — all navigation happens inside the
  // terminal overlay.  Locking scroll here is the most reliable way to keep
  // the icon from drifting regardless of what position:fixed quirks the
  // browser might have with backdrop-filter siblings or Tailwind resets.
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';

  // ---- Initial state: terminal hidden, icon visible ----
  hideTerm(termEl);
  showIcon(reopenBtn);

  let typed    = '';
  let revealed = false;
  let closed   = true;
  let clearing = false;

  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- helpers ----

  function hideTerm(el: HTMLElement): void {
    el.style.cssText = 'display: none;';
    const body = el.querySelector<HTMLElement>('.terminal-body');
    if (body) { body.style.flex = ''; body.style.overflowY = ''; body.style.minHeight = ''; }
  }

  function showTerm(el: HTMLElement): void {
    el.style.cssText = `
      display: flex;
      flex-direction: column;
      position: absolute;
      top: calc(var(--nav-h) + 0.75rem);
      left: 50%;
      transform: translateX(-50%);
      width: calc(100% - 2rem);
      max-width: 48rem;
      height: calc(100% - var(--nav-h) - 1.5rem);
      overflow: hidden;
      pointer-events: auto;
    `;
    const body = el.querySelector<HTMLElement>('.terminal-body');
    if (body) { body.style.flex = '1'; body.style.overflowY = 'auto'; body.style.minHeight = '0'; }
  }

  function showIcon(btn: HTMLButtonElement): void {
    btn.hidden = false;
    btn.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.1rem;
      position: absolute;
      top: 70%;
      left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: auto;
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      z-index: 10;
    `;
  }

  function hideIcon(btn: HTMLButtonElement): void {
    btn.style.cssText = 'display: none;';
  }

  // ---- reveal: show all content ----
  function reveal(): void {
    if (revealed) return;
    revealed = true;
    try { sessionStorage.setItem(SESSION_KEY, 'true'); } catch (_) { /* private mode */ }
    document.removeEventListener('keydown', handleKey);
    intro.classList.add('term-intro-gone');
    content.classList.add('term-shown');
  }

  // ---- open: show terminal as overlay ----
  function openTerm(): void {
    if (!closed) return;
    closed = false;
    showTerm(termEl);
    hideIcon(reopenBtn);
    portal.style.pointerEvents = 'none'; // terminal/button have their own pointer-events
    if (scrollPrompt) scrollPrompt.hidden = false;
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
  }

  // ---- keyboard capture ----
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

  // ---- yellow dot: animate "clear", reset ----
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

    typed = ''; revealed = false; clearing = false;
    typedEl.textContent = '';
    try { sessionStorage.removeItem(SESSION_KEY); } catch (_) { /* */ }
    intro.classList.remove('term-intro-gone');
    content.classList.remove('term-shown');
    document.addEventListener('keydown', handleKey);
  }

  // ---- anchor clicks: auto-open + reveal + scroll ----
  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!a) return;
    const hash = a.getAttribute('href');
    if (!hash || hash === '#') return;
    const target = document.querySelector<HTMLElement>(hash);
    if (!target || !content.contains(target)) return;
    if (!closed && revealed) return;

    e.preventDefault();
    if (closed) openTerm();
    if (!revealed) reveal();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'start' });
      });
    });
  });

  // ---- handle arriving via /#hash (from post page nav) ----
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
