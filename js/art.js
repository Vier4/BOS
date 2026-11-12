// Цветные логотипы приложений BOS. Градиенты лежат в одном общем <defs> на странице,
// поэтому значки рисуются правильно, даже если первый такой значок спрятан.
(function () {
  const gradient = (id, from, to, x2 = 1, y2 = 1) =>
    `<linearGradient id="bos-art-${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>`;

  const DEFS = [
    gradient('settings', '#ffb07a', '#ff4d2e'),
    gradient('files', '#e0f2fe', '#93c5fd'),
    gradient('folder', '#60a5fa', '#2563eb', 0, 1),
    gradient('browser', '#f0f9ff', '#c7d2fe'),
    '<radialGradient id="bos-art-globe" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#67e8f9"/><stop offset="1" stop-color="#2563eb"/></radialGradient>',
    gradient('notes', '#fffbeb', '#fde68a'),
    gradient('calc', '#4b5563', '#111827'),
    gradient('terminal', '#312e81', '#0f172a'),
    gradient('games', '#e879f9', '#7c3aed'),
    gradient('music', '#fb7185', '#f97316'),
    gradient('store', '#38bdf8', '#4f46e5'),
    gradient('slides', '#fcd34d', '#ea580c'),
    gradient('montage', '#f43f5e', '#9333ea'),
    gradient('assistant', '#22d3ee', '#8b5cf6'),
    gradient('deskfolder', '#7dd3fc', '#3b82f6', 0, 1),
    gradient('all', '#f8fafc', '#cbd5e1'),
  ].join('');

  const defs = document.createElement('div');
  defs.innerHTML = `<svg class="art-defs" aria-hidden="true" focusable="false"><defs>${DEFS}</defs></svg>`;
  document.body.prepend(defs.firstChild);

  const ART = {
    settings: `<rect width="64" height="64" fill="url(#bos-art-settings)"/>
      <path d="M15 20h34M15 32h34M15 44h34" stroke="#fff" stroke-opacity=".55" stroke-width="4" stroke-linecap="round"/>
      <circle cx="38" cy="20" r="6.5" fill="#fde047" stroke="#fff" stroke-width="2.5"/>
      <circle cx="24" cy="32" r="6.5" fill="#67e8f9" stroke="#fff" stroke-width="2.5"/>
      <circle cx="42" cy="44" r="6.5" fill="#a7f3d0" stroke="#fff" stroke-width="2.5"/>`,
    files: `<rect width="64" height="64" fill="url(#bos-art-files)"/>
      <path d="M11 21a4 4 0 0 1 4-4h11l4.5 5H49a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H15a4 4 0 0 1-4-4z" fill="#1d4ed8"/>
      <rect x="17" y="21" width="31" height="20" rx="2" fill="#fff" transform="rotate(-5 32 31)"/>
      <path d="M11 29a4 4 0 0 1 4-4h34a4 4 0 0 1 4 4v17a4 4 0 0 1-4 4H15a4 4 0 0 1-4-4z" fill="url(#bos-art-folder)"/>
      <path d="M23 38h18" stroke="#fff" stroke-opacity=".75" stroke-width="3" stroke-linecap="round"/>`,
    browser: `<rect width="64" height="64" fill="url(#bos-art-browser)"/>
      <circle cx="32" cy="32" r="19" fill="url(#bos-art-globe)"/>
      <path d="M24 21c4 1 6 4 5 7s-5 3-6 6 1 6-1 9c-3-2-7-7-7-12 0-4 4-9 9-10zM39 17c5 2 9 7 10 12-3 0-5-2-7-1s-2 5-5 5-3-4-2-7 4-4 4-9z" fill="#4ade80" fill-opacity=".92"/>
      <ellipse cx="32" cy="32" rx="27" ry="9" fill="none" stroke="#f97316" stroke-width="3" transform="rotate(-24 32 32)"/>
      <circle cx="56.5" cy="21" r="3.5" fill="#facc15"/>`,
    notes: `<rect width="64" height="64" fill="url(#bos-art-notes)"/>
      <rect x="15" y="11" width="34" height="43" rx="5" fill="#fff" stroke="#f5d58a" stroke-width="1.5"/>
      <path d="M15 16a5 5 0 0 1 5-5h24a5 5 0 0 1 5 5v5H15z" fill="#f59e0b"/>
      <path d="M21 30h22M21 37h22M21 44h12" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M41 50l11-11 4.5 4.5-11 11-5.5 1z" fill="#ec4899"/>
      <path d="M41 50l-1 5.5 5.5-1z" fill="#1f2937"/>`,
    calc: `<rect width="64" height="64" fill="url(#bos-art-calc)"/>
      <rect x="13" y="11" width="38" height="13" rx="3" fill="#a7f3d0"/>
      <path d="M38 17.5h8" stroke="#065f46" stroke-width="3" stroke-linecap="round"/>
      <g fill="#e5e7eb"><circle cx="18" cy="33" r="4.4"/><circle cx="28" cy="33" r="4.4"/><circle cx="38" cy="33" r="4.4"/>
      <circle cx="18" cy="43" r="4.4"/><circle cx="28" cy="43" r="4.4"/><circle cx="38" cy="43" r="4.4"/>
      <circle cx="18" cy="53" r="4.4"/><circle cx="28" cy="53" r="4.4"/><circle cx="38" cy="53" r="4.4"/></g>
      <circle cx="48" cy="33" r="4.4" fill="#fb923c"/><circle cx="48" cy="43" r="4.4" fill="#fb923c"/><circle cx="48" cy="53" r="4.4" fill="#22c55e"/>`,
    terminal: `<rect width="64" height="64" fill="url(#bos-art-terminal)"/>
      <path d="M14 13h36" stroke="#818cf8" stroke-opacity=".6" stroke-width="3" stroke-linecap="round"/>
      <path d="M16 25l9 8-9 8" fill="none" stroke="#4ade80" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M30 43h16" stroke="#f472b6" stroke-width="4.5" stroke-linecap="round"/>`,
    games: `<rect width="64" height="64" fill="url(#bos-art-games)"/>
      <path d="M20 22h24c6 0 10 5 11 11l2 9c1 5-4 8-8 4l-5-5H20l-5 5c-4 4-9 1-8-4l2-9c1-6 5-11 11-11z" fill="#fff"/>
      <path d="M21 29v8M17 33h8" stroke="#334155" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="43" cy="29" r="2.7" fill="#ef4444"/><circle cx="48" cy="33" r="2.7" fill="#22c55e"/>
      <circle cx="43" cy="37" r="2.7" fill="#3b82f6"/><circle cx="38" cy="33" r="2.7" fill="#facc15"/>`,
    music: `<rect width="64" height="64" fill="url(#bos-art-music)"/>
      <path d="M12 50h6M12 44h6M46 50h6M46 42h6M46 34h6" stroke="#fde68a" stroke-opacity=".75" stroke-width="3" stroke-linecap="round"/>
      <path d="M27 43V19l17-4v24" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>
      <path d="M27 19l17-4v6l-17 4z" fill="#fff"/>
      <ellipse cx="22" cy="44" rx="6" ry="5" fill="#fff" transform="rotate(-20 22 44)"/>
      <ellipse cx="39" cy="40" rx="6" ry="5" fill="#fff" transform="rotate(-20 39 40)"/>`,
    store: `<rect width="64" height="64" fill="url(#bos-art-store)"/>
      <path d="M24 24v-3a8 8 0 0 1 16 0v3" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M15 24h34l-3 26a4 4 0 0 1-4 3.5H22a4 4 0 0 1-4-3.5z" fill="#fff"/>
      <rect x="28.5" y="31" width="3.6" height="15" rx="1.8" fill="#4f46e5"/>
      <circle cx="35" cy="41" r="5.2" fill="none" stroke="#4f46e5" stroke-width="3.6"/>
      <circle cx="35" cy="41" r="1.6" fill="#f97316"/>`,
    slides: `<rect width="64" height="64" fill="url(#bos-art-slides)"/>
      <path d="M32 46v9M24 55h16" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>
      <rect x="11" y="13" width="42" height="33" rx="4" fill="#fff"/>
      <rect x="18" y="31" width="6" height="9" rx="1.5" fill="#22c55e"/>
      <rect x="28" y="25" width="6" height="15" rx="1.5" fill="#3b82f6"/>
      <rect x="38" y="20" width="6" height="20" rx="1.5" fill="#ec4899"/>
      <path d="M18 19h10" stroke="#ea580c" stroke-width="3" stroke-linecap="round"/>`,
    montage: `<rect width="64" height="64" fill="url(#bos-art-montage)"/>
      <rect x="11" y="22" width="42" height="30" rx="5" fill="#1f1235"/>
      <path d="M11 22l40-9 1.6 6.5-40 9z" fill="#fff"/>
      <path d="M17 20.6l5 5.4M27 18.4l5 5.4M37 16.1l5 5.4" stroke="#1f1235" stroke-width="3"/>
      <path d="M28 30v14l12-7z" fill="#fff"/>
      <path d="M15 48h8M41 48h8" stroke="#f9a8d4" stroke-width="2.5" stroke-linecap="round"/>`,
    assistant: `<rect width="64" height="64" fill="url(#bos-art-assistant)"/>
      <path d="M14 18a6 6 0 0 1 6-6h24a6 6 0 0 1 6 6v18a6 6 0 0 1-6 6H29l-9 8v-8a6 6 0 0 1-6-6z" fill="#fff"/>
      <path d="M32 16c.9 5.6 3.4 8.1 9 9-5.6.9-8.1 3.4-9 9-.9-5.6-3.4-8.1-9-9 5.6-.9 8.1-3.4 9-9z" fill="#8b5cf6"/>
      <circle cx="43" cy="17.5" r="2.2" fill="#22d3ee"/><circle cx="21" cy="34" r="1.6" fill="#f472b6"/>`,
    folder: `<path d="M6 16a5 5 0 0 1 5-5h14l5 6h23a5 5 0 0 1 5 5v26a5 5 0 0 1-5 5H11a5 5 0 0 1-5-5z" fill="#2563eb"/>
      <path d="M6 25a5 5 0 0 1 5-5h42a5 5 0 0 1 5 5v23a5 5 0 0 1-5 5H11a5 5 0 0 1-5-5z" fill="url(#bos-art-deskfolder)"/>
      <path d="M14 27h36" stroke="#fff" stroke-opacity=".45" stroke-width="2.5" stroke-linecap="round"/>`,
    all: `<rect width="64" height="64" fill="url(#bos-art-all)"/>
      <rect x="14" y="14" width="16" height="16" rx="5" fill="#3b82f6"/><rect x="34" y="14" width="16" height="16" rx="5" fill="#f97316"/>
      <rect x="14" y="34" width="16" height="16" rx="5" fill="#22c55e"/><rect x="34" y="34" width="16" height="16" rx="5" fill="#a855f7"/>`,
  };

  BOS.artTile = (key, className = '') => BOS.h('span', {
    class: `tile ${className}`,
    html: `<svg viewBox="0 0 64 64" aria-hidden="true">${ART[key]}</svg>`,
  });
  BOS.appTile = BOS.artTile;
})();
