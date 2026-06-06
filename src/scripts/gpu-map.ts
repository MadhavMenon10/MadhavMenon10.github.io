/* ===========================================================================
   gpu-map.ts — makes the SM diagram an interactive map of the site.

   - hover/focus a unit  -> highlight all instances of that type + echo its
     command in the terminal readout
   - click a unit:
       kind="filter"  -> filter the project grid to that core type (toggle)
       kind="section" -> smooth-scroll to the anchor
       kind="mailto"  -> open an email
   Progressive enhancement: representative units are real links, so navigation
   still works with JS disabled; this only adds highlight + filtering.
=========================================================================== */

export function initGpuMap(): void {
  const diagram = document.querySelector<HTMLElement>('.gpu');
  if (!diagram) return;

  const cmdEl = diagram.querySelector<HTMLElement>('.gpu-cmd');
  const grid = document.getElementById('project-grid');
  const filterBar = document.getElementById('project-filter');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const IDLE = '// hover a unit · click to run';

  let activeFilter: string | null = null;

  const els = (unit: string) =>
    diagram.querySelectorAll<HTMLElement>(`[data-unit="${unit}"]`);

  const highlight = (unit: string | null) => {
    diagram.querySelectorAll('.unit-active').forEach((e) => e.classList.remove('unit-active'));
    if (unit) els(unit).forEach((e) => e.classList.add('unit-active'));
  };

  const cmdForFilter = () =>
    activeFilter
      ? diagram.querySelector<HTMLElement>(`[data-unit="${activeFilter}"]`)?.dataset.cmd ?? IDLE
      : IDLE;

  const setReadout = (text: string) => {
    if (cmdEl) cmdEl.textContent = text;
  };

  const scrollTo = (sel: string) =>
    document.querySelector(sel)?.scrollIntoView({
      behavior: reduce ? 'auto' : 'smooth',
      block: 'start',
    });

  const clearFilter = () => {
    activeFilter = null;
    grid?.querySelectorAll('.is-hidden').forEach((e) => e.classList.remove('is-hidden'));
    diagram.querySelectorAll('.unit-selected').forEach((e) => e.classList.remove('unit-selected'));
    if (filterBar) {
      filterBar.replaceChildren();
      filterBar.hidden = true;
    }
    highlight(null);
    setReadout(IDLE);
  };

  const renderChip = (shown: number) => {
    if (!filterBar) return;
    if (!activeFilter) {
      filterBar.replaceChildren();
      filterBar.hidden = true;
      return;
    }
    const desc =
      diagram.querySelector<HTMLElement>(`[data-unit="${activeFilter}"]`)?.dataset.desc ?? '';
    filterBar.hidden = false;

    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.innerHTML =
      `filter: <b>${activeFilter}</b> · ${desc} · ${shown} project${shown === 1 ? '' : 's'} `;

    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'chip-x';
    clear.setAttribute('aria-label', 'Clear project filter');
    clear.textContent = '✕';
    clear.addEventListener('click', clearFilter);

    chip.appendChild(clear);
    filterBar.replaceChildren(chip);
  };

  const applyFilter = (unit: string) => {
    if (!grid) {
      scrollTo('#projects');
      return;
    }
    activeFilter = activeFilter === unit ? null : unit; // toggle off if same

    diagram.querySelectorAll('.unit-selected').forEach((e) => e.classList.remove('unit-selected'));
    if (activeFilter) els(activeFilter).forEach((e) => e.classList.add('unit-selected'));

    const cards = grid.querySelectorAll<HTMLElement>('[data-units]');
    let shown = 0;
    cards.forEach((card) => {
      const tags = (card.dataset.units ?? '').split(/\s+/).filter(Boolean);
      const show = !activeFilter || tags.includes(activeFilter);
      card.classList.toggle('is-hidden', !show);
      if (show) shown += 1;
    });

    renderChip(shown);
    highlight(activeFilter);
    setReadout(cmdForFilter());
    scrollTo('#projects');
  };

  // ---- hover / focus: highlight type + preview its command ----
  const onEnter = (e: Event) => {
    const el = (e.target as Element).closest<HTMLElement>('.gpu-u');
    if (!el) return;
    highlight(el.dataset.unit ?? null);
    setReadout(el.dataset.cmd ?? IDLE);
  };
  const onLeave = () => {
    highlight(activeFilter);
    setReadout(cmdForFilter());
  };

  diagram.addEventListener('pointerover', onEnter);
  diagram.addEventListener('focusin', onEnter);
  diagram.addEventListener('pointerleave', onLeave);
  diagram.addEventListener('focusout', onLeave);

  // ---- click / activate ----
  diagram.addEventListener('click', (e) => {
    const el = (e.target as Element).closest<HTMLElement>('.gpu-u');
    if (!el) return;
    e.preventDefault();
    const { kind, target = '' } = el.dataset;
    if (kind === 'filter') applyFilter(target);
    else if (kind === 'mailto') window.location.href = `mailto:${target}`;
    else scrollTo(target); // section anchor
  });
}
