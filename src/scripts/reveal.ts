/* ===========================================================================
   reveal.ts — adds `.in-view` to [data-reveal] elements as they scroll in.
   Drives the section fade-ins and the GPU-pipeline animation (CSS-only).
   Degrades safely: no IO / reduced motion -> everything is shown immediately.
=========================================================================== */

export function initReveal(): void {
  const els = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (!els.length) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('in-view'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target); // reveal once
        }
      }
    },
    { threshold: 0.2, rootMargin: '0px 0px -10% 0px' }
  );

  els.forEach((el) => io.observe(el));
}
