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
    // BOS 02: новые логотипы.
    '<linearGradient id="bos-art-browser2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b5cf6"/><stop offset=".5" stop-color="#3b82f6"/><stop offset="1" stop-color="#10b981"/></linearGradient>',
    '<radialGradient id="bos-art-planet" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#3730a3"/><stop offset="1" stop-color="#0b0b3b"/></radialGradient>',
    gradient('assistant2', '#a855f7', '#22d3ee'),
    '<radialGradient id="bos-art-spark" cx=".5" cy=".5" r=".5"><stop offset=".15" stop-color="#fde047"/><stop offset=".55" stop-color="#38bdf8"/><stop offset="1" stop-color="#1d4ed8"/></radialGradient>',
    gradient('settings2', '#e2e8f0', '#94a3b8', 0, 1),
    gradient('gear', '#6366f1', '#2563eb'),
    gradient('camera', '#2a2a2e', '#050506', 0, 1),
    '<radialGradient id="bos-art-lens" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#4b5563"/><stop offset="1" stop-color="#050506"/></radialGradient>',
    '<linearGradient id="bos-art-photos" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9333ea"/><stop offset=".55" stop-color="#f97316"/><stop offset="1" stop-color="#facc15"/></linearGradient>',
    gradient('photos-green', '#bef264', '#65a30d', 0, 1),
    gradient('photos-red', '#ef4444', '#f97316', 1, 1),
    gradient('photos-blue', '#22d3ee', '#2563eb', 0, 1),
    // Мышки BOS 02.
    gradient('cur-aurora', '#38bdf8', '#a855f7', 0, 1),
    '<linearGradient id="bos-art-cur-sunset" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8b5cf6"/><stop offset=".5" stop-color="#f472b6"/><stop offset="1" stop-color="#f97316"/></linearGradient>',
    gradient('cur-night', '#4f46e5', '#0f0b3d', 1, 1),
    '<linearGradient id="bos-art-cur-lagoon" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c3aed"/><stop offset=".5" stop-color="#2563eb"/><stop offset="1" stop-color="#34d399"/></linearGradient>',
  ].join('');

  // Четырёхлучевая звёздочка: так нарисованы искры на новых логотипах.
  const star = (cx, cy, r, fill) =>
    `<path d="M${cx} ${cy - r}Q${cx} ${cy} ${cx + r} ${cy}Q${cx} ${cy} ${cx} ${cy + r}Q${cx} ${cy} ${cx - r} ${cy}Q${cx} ${cy} ${cx} ${cy - r}Z" fill="${fill}"/>`;

  // Шестерёнка с зубцами для логотипа Настроек.
  function gear(cx, cy, outer, inner, teeth) {
    let d = '';
    for (let i = 0; i < teeth * 2; i++) {
      const r = i % 2 ? inner : outer;
      const a0 = ((i - 0.5) / (teeth * 2)) * Math.PI * 2;
      const a1 = ((i + 0.5) / (teeth * 2)) * Math.PI * 2;
      d += `${i ? 'L' : 'M'}${(cx + r * Math.cos(a0)).toFixed(1)} ${(cy + r * Math.sin(a0)).toFixed(1)}L${(cx + r * Math.cos(a1)).toFixed(1)} ${(cy + r * Math.sin(a1)).toFixed(1)}`;
    }
    return d + 'Z';
  }

  const defs = document.createElement('div');
  defs.innerHTML = `<svg class="art-defs" aria-hidden="true" focusable="false"><defs>${DEFS}</defs></svg>`;
  document.body.prepend(defs.firstChild);

  const ART = {
    settings: `<rect width="64" height="64" fill="url(#bos-art-settings2)"/>
      <path d="${gear(32, 32, 25, 20, 10)}" fill="url(#bos-art-gear)" stroke="#1e3a8a" stroke-width="1.5" stroke-linejoin="round"/>
      <circle cx="32" cy="32" r="14" fill="#93c5fd"/>
      <g fill="#1e1b4b">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => {
        const a = (i / 10) * Math.PI * 2;
        return `<circle cx="${(32 + 17.5 * Math.cos(a)).toFixed(1)}" cy="${(32 + 17.5 * Math.sin(a)).toFixed(1)}" r="1.6"/>`;
      }).join('')}</g>
      <path d="M22 42l14-14" stroke="#eef2ff" stroke-width="6" stroke-linecap="round"/>
      <circle cx="38.5" cy="25.5" r="7" fill="#eef2ff"/>
      <path d="M40 18.5l5.5 5.5-3.5 3.5-5.5-5.5z" fill="#93c5fd"/>`,
    files: `<rect width="64" height="64" fill="url(#bos-art-files)"/>
      <path d="M11 21a4 4 0 0 1 4-4h11l4.5 5H49a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H15a4 4 0 0 1-4-4z" fill="#1d4ed8"/>
      <rect x="17" y="21" width="31" height="20" rx="2" fill="#fff" transform="rotate(-5 32 31)"/>
      <path d="M11 29a4 4 0 0 1 4-4h34a4 4 0 0 1 4 4v17a4 4 0 0 1-4 4H15a4 4 0 0 1-4-4z" fill="url(#bos-art-folder)"/>
      <path d="M23 38h18" stroke="#fff" stroke-opacity=".75" stroke-width="3" stroke-linecap="round"/>`,
    browser: `<rect width="64" height="64" fill="url(#bos-art-browser2)"/>
      <path d="M6 35A26 8 0 0 1 58 35" fill="none" stroke="#f5ecd0" stroke-width="4" transform="rotate(-10 32 34)"/>
      <circle cx="32" cy="32" r="16" fill="url(#bos-art-planet)"/>
      <path d="M6 35A26 8 0 0 0 58 35" fill="none" stroke="#f5ecd0" stroke-width="4" transform="rotate(-10 32 34)"/>
      <path d="M6 35A26 8 0 0 0 58 35" fill="none" stroke="#a8a29e" stroke-width="1.2" transform="rotate(-10 32 34) translate(0 1.6)"/>
      ${star(37, 24, 5, '#fde047')}${star(30, 40, 4, '#fde047')}${star(11, 11, 6, '#fde047')}${star(54, 10, 4, '#fde047')}${star(12, 53, 4.5, '#fde047')}${star(53, 53, 5, '#fde047')}`,
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
    assistant: `<rect width="64" height="64" fill="url(#bos-art-assistant2)"/>
      <path d="M32 9C33.5 25 37 30.5 54 33 37 35.5 33.5 41 32 57 30.5 41 27 35.5 10 33 27 30.5 30.5 25 32 9z" fill="url(#bos-art-spark)"/>
      ${star(47, 16, 5.5, '#67e8f9')}${star(17, 48, 3.5, '#67e8f9')}${star(16, 18, 2.5, '#e0f2fe')}
      <circle cx="50" cy="47" r="1.6" fill="#e0f2fe"/>`,
    camera: `<rect width="64" height="64" fill="url(#bos-art-camera)"/>
      <circle cx="30" cy="35" r="22" fill="#18181b" stroke="#52525b" stroke-width="2"/>
      <circle cx="30" cy="35" r="17" fill="url(#bos-art-lens)"/>
      <circle cx="30" cy="35" r="13" fill="none" stroke="#a1a1aa" stroke-width="1.5"/>
      <circle cx="30" cy="35" r="9" fill="none" stroke="#71717a" stroke-width="2"/>
      <circle cx="30" cy="35" r="5" fill="#09090b"/>
      ${star(24, 29, 9, '#ffffff')}
      <rect x="47" y="4" width="10" height="10" rx="2.5" fill="#22c55e"/>
      <rect x="44" y="9" width="10" height="10" rx="2.5" fill="#ef4444"/>
      <rect x="41" y="15" width="9" height="9" rx="2.5" fill="#3b82f6"/>`,
    photos: `<rect width="64" height="64" fill="url(#bos-art-photos)"/>
      <rect x="11" y="10" width="45" height="24" rx="12" fill="url(#bos-art-photos-green)"/>
      <rect x="8" y="27" width="38" height="25" rx="12.5" fill="url(#bos-art-photos-red)"/>
      <ellipse cx="17" cy="50" rx="10" ry="7" fill="url(#bos-art-photos-blue)"/>`,
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

  // Мышки BOS 02. Первая — та, что стоит по умолчанию.
  BOS.CURSORS = {
    aurora: { line: '#e5e7eb', a: '#38bdf8', b: '#a855f7' },
    sunset: { line: '#e5e7eb', a: '#8b5cf6', b: '#f97316' },
    night: { line: '#09090b', a: '#4f46e5', b: '#0f0b3d' },
    lagoon: { line: '#09090b', a: '#7c3aed', b: '#34d399' },
  };
  BOS.cursorSvg = (id) => `<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M3 3L24 11.4Q25.6 12.1 24 12.9L15.6 15.6 12.9 24Q12.1 25.6 11.4 24z" fill="url(#bos-art-cur-${id})" stroke="${BOS.CURSORS[id].line}" stroke-width="2.4" stroke-linejoin="round" paint-order="stroke"/></svg>`;
})();
