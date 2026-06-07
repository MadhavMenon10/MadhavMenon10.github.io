/* ===========================================================================
   terminal.ts — interactive terminal intro experience.

   Flow:
     - On load (JS active): show empty bash prompt, hide all content.
     - User types "learn more" (case-insensitive) → content reveals immediately.
     - Red dot  → collapses the terminal wrapper; floating reopen button appears.
     - Yellow dot → animates typing "clear", then resets to the empty prompt.
     - Green dot → no-op.
   No-JS fallback: handled in CSS (html.js selector) — content always visible.
=========================================================================== */

export function initTerminal(): void {
  const wrapper  = document.getElementById('terminal-wrapper');
  const intro    = document.getElementById('term-intro');
  const content  = document.getElementById('term-content');
  const typedEl  = document.getElementById('term-typed');
  const closeDot = document.getElementById('term-close');
  const clearDot = document.getElementById('term-clear');
  const reopenBtn = document.getElementById('term-reopen');

  if (!intro || !content || !typedEl || !closeDot || !clearDot || !reopenBtn) return;

  let typed    = '';
  let revealed = false;
  let closed   = false;
  let clearing = false;

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
