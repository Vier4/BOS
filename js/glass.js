// BOS 03: логотипы в стиле Liquid Glass. Цветная плитка, размытые блики, стеклянная пластина
// с ободком и белый светящийся значок. Работает только после обновления до BOS 03.
(function () {
  if (!BOS.is03) return;

  // Значки, которых нет в общем наборе (24×24, линиями).
  const GLYPHS = {
    gear: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.5"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
    bag: '<path d="M5 8h14l-1.2 11.2a1.5 1.5 0 0 1-1.5 1.3H7.7a1.5 1.5 0 0 1-1.5-1.3z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
    gamestore: '<rect x="2.5" y="9" width="19" height="10" rx="5"/><path d="M7.5 12.5v3M6 14h3"/><path d="M16 10.5c.3 1.6 1 2.3 2.6 2.6-1.6.3-2.3 1-2.6 2.6-.3-1.6-1-2.3-2.6-2.6 1.6-.3 2.3-1 2.6-2.6z"/><path d="M12 9V5.5M10 3.5h4"/>',
    bubbles: '<circle cx="9" cy="14" r="5"/><circle cx="16.5" cy="8" r="3.5"/><circle cx="17.5" cy="17.5" r="2"/><path d="M6.8 12.6a2.4 2.4 0 0 1 2.2-1.8"/>',
    colormix: '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.9 1.4-1.9-.5-1.2.3-2.4 1.6-2.4H17a3.5 3.5 0 0 0 3.5-3.5C20.5 7.2 16.7 3.5 12 3.5z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7.3" r="1.2"/><circle cx="14.5" cy="7.3" r="1.2"/>',
    stars: '<path d="M5 18l5-6 4 3 5-9"/><circle cx="5" cy="18" r="1.6"/><circle cx="10" cy="12" r="1.6"/><circle cx="14" cy="15" r="1.6"/><circle cx="19" cy="6" r="1.6"/>',
    sheep: '<path d="M18 14.5A7 7 0 0 1 9.5 6a7 7 0 1 0 8.5 8.5z"/><path d="M15 3.5h4l-4 4h4"/>',
    kaleido: '<circle cx="12" cy="12" r="2.2"/><path d="M12 9.8C10 6 10.5 3.5 12 3.5s2 2.5 0 6.3zM12 14.2c2 3.8 1.5 6.3 0 6.3s-2-2.5 0-6.3zM9.8 12C6 14 3.5 13.5 3.5 12S6 10 9.8 12zM14.2 12c3.8-2 6.3-1.5 6.3 0s-2.5 2-6.3 0z"/>',
    habits: '<path d="M12 21v-8M12 15l-3-3M12 17l3-3"/><path d="M8 17.5a4.5 4.5 0 0 1-1.6-7.4A5.8 5.8 0 0 1 12 3a5.8 5.8 0 0 1 5.6 7.1A4.5 4.5 0 0 1 16 17.5"/>',
    capsule: '<path d="M7 3.5h10M7 20.5h10M8 3.5c0 4 4 5 4 8.5s-4 4.5-4 8.5M16 3.5c0 4-4 5-4 8.5s4 4.5 4 8.5"/><path d="M10 18.5h4"/>',
    chimes: '<path d="M4 4h16M7 4v9M11 4v13M15 4v10M19 4v7"/><circle cx="12" cy="20.5" r="1.3"/>',
    wheel: '<circle cx="12" cy="13" r="8"/><path d="M12 13V5M12 13l6.9 4M12 13l-6.9 4"/><path d="M10 1.5h4L12 4z"/>',
    pet: '<circle cx="6.5" cy="10" r="1.8"/><circle cx="10" cy="6.3" r="1.8"/><circle cx="14" cy="6.3" r="1.8"/><circle cx="17.5" cy="10" r="1.8"/><path d="M12 12c-3 0-5.5 3.5-5.5 5.5 0 1.7 1.5 2.5 3 2.5 1 0 1.5-.5 2.5-.5s1.5.5 2.5.5c1.5 0 3-.8 3-2.5 0-2-2.5-5.5-5.5-5.5z"/>',
    beats: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/><circle cx="16.5" cy="7.5" r="1.2"/>',
    mood: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01"/>',
    cipher: '<circle cx="8" cy="15" r="4.5"/><path d="M11.2 11.8 20 3M16.5 6.5 19 9M14 9l2 2"/>',
    focus: '<path d="M12 3.5s6.5 7 6.5 11a6.5 6.5 0 0 1-13 0c0-4 6.5-11 6.5-11z"/><path d="M9 15a3 3 0 0 0 3 3"/>',
    tales: '<path d="M3.5 5.5c3-1 6-1 8.5 1 2.5-2 5.5-2 8.5-1v13c-3-1-6-1-8.5 1-2.5-2-5.5-2-8.5-1z"/><path d="M12 6.5v13"/>',
  };

  // Приложение → [цвет 1, цвет 2, значок].
  const LOOK = {
    settings: ['#a5b4c8', '#3f4b5f', 'gear'],
    files: ['#38bdf8', '#1d4ed8', 'folder'],
    browser: ['#22d3ee', '#6d28d9', 'globe'],
    store: ['#60a5fa', '#7c3aed', 'bag'],
    assistant: ['#e879f9', '#06b6d4', 'spark'],
    music: ['#fb7185', '#ea580c', 'music'],
    notes: ['#fde047', '#f59e0b', 'notes'],
    calc: ['#64748b', '#0f172a', 'calc'],
    terminal: ['#4f46e5', '#0b1023', 'terminal'],
    games: ['#f0abfc', '#7c3aed', 'games'],
    slides: ['#fcd34d', '#ea580c', 'slides'],
    montage: ['#fb7185', '#9333ea', 'film'],
    camera: ['#71717a', '#09090b', 'camera'],
    photos: ['#f472b6', '#f59e0b', 'image'],
    gamestore: ['#34d399', '#0369a1', 'gamestore'],
    all: ['#f1f5f9', '#94a3b8', 'grid'],
    folder: ['#7dd3fc', '#2563eb', 'folder'],
    bubbles: ['#7dd3fc', '#a78bfa', 'bubbles'],
    colormix: ['#f472b6', '#fbbf24', 'colormix'],
    stars: ['#3b82f6', '#1e1b4b', 'stars'],
    sheep: ['#6366f1', '#0c4a6e', 'sheep'],
    kaleido: ['#fb7185', '#7c3aed', 'kaleido'],
    habits: ['#86efac', '#15803d', 'habits'],
    capsule: ['#fcd34d', '#b45309', 'capsule'],
    chimes: ['#5eead4', '#0e7490', 'chimes'],
    wheel: ['#fdba74', '#e11d48', 'wheel'],
    pet: ['#fda4af', '#db2777', 'pet'],
    beats: ['#c084fc', '#be185d', 'beats'],
    mood: ['#fde047', '#f43f5e', 'mood'],
    cipher: ['#2dd4bf', '#1e293b', 'cipher'],
    focus: ['#67e8f9', '#1d4ed8', 'focus'],
    tales: ['#c4b5fd', '#be185d', 'tales'],
  };
  BOS.GLASS_LOOK = LOOK;

  const grad = (id, a, b) => `<linearGradient id="g3-${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
  const defs = document.createElement('div');
  defs.innerHTML = `<svg class="art-defs" aria-hidden="true" focusable="false"><defs>
    ${Object.entries(LOOK).map(([id, [a, b]]) => grad(id, a, b)).join('')}
    <linearGradient id="g3-plate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity=".1"/></linearGradient>
    <linearGradient id="g3-rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".5" stop-color="#fff" stop-opacity=".2"/><stop offset="1" stop-color="#fff" stop-opacity=".7"/></linearGradient>
    <linearGradient id="g3-shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <filter id="g3-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
    <filter id="g3-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceAlpha" stdDeviation="1.2"/><feOffset dy="1"/><feComponentTransfer><feFuncA type="linear" slope=".45"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs></svg>`;
  document.body.prepend(defs.firstChild);

  function glassSvg(id) {
    const look = LOOK[id];
    const glyph = GLYPHS[look[2]] || BOS.ICONS[look[2]] || '';
    return `<svg viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" fill="url(#g3-${id})"/>
      <circle cx="12" cy="8" r="22" fill="#fff" opacity=".35" filter="url(#g3-soft)"/>
      <circle cx="56" cy="60" r="20" fill="#000" opacity=".16" filter="url(#g3-soft)"/>
      <rect x="11" y="11" width="42" height="42" rx="14" fill="url(#g3-plate)" stroke="url(#g3-rim)" stroke-width="1.3"/>
      <g transform="translate(14 14) scale(1.5)" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" color="#fff" filter="url(#g3-glow)">${glyph}</g>
      <path d="M0 0h64v20C44 27 20 27 0 19z" fill="url(#g3-shine)"/>
    </svg>`;
  }

  const oldTile = BOS.artTile;
  BOS.artTile = (key, className = '') => (LOOK[key]
    ? BOS.h('span', { class: `tile glass ${className}`, html: glassSvg(key) })
    : oldTile(key, className));
  BOS.appTile = BOS.artTile;
})();
