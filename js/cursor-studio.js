// BOS 03: 12 готовых мышек и редактор своей мышки (форма, два цвета, обводка, свечение, размер).
// Выбор и своя мышка хранятся отдельно от профиля — только на этом устройстве.
(function () {
  if (!BOS.is03) return;
  const { h, icon } = BOS;
  const KEY = 'bos.device.cursor.v1';

  // Формы: у всех кончик в точке (3, 3) — туда и попадает клик.
  const SHAPES = {
    tri: 'M3 3L24 11.4Q25.6 12.1 24 12.9L15.6 15.6 12.9 24Q12.1 25.6 11.4 24z',
    arrow: 'M3 3V22.5L8.2 17.6 11.7 25.3 15.1 23.8 11.6 16.2H18.6z',
    drop: 'M3 3L14.5 6.2A8.6 8.6 0 1 1 6.2 14.5z',
    wing: 'M3 3Q19 4.5 25 15.5Q15.5 13.5 12 25.5Q8.5 12 3 3z',
  };
  const PRESETS = {
    aurora: { shape: 'tri', a: '#38bdf8', b: '#a855f7', line: '#e5e7eb', glow: false },
    sunset: { shape: 'tri', a: '#8b5cf6', b: '#f97316', line: '#e5e7eb', glow: false },
    night: { shape: 'tri', a: '#4f46e5', b: '#0f0b3d', line: '#09090b', glow: false },
    lagoon: { shape: 'tri', a: '#7c3aed', b: '#34d399', line: '#09090b', glow: false },
    mint: { shape: 'arrow', a: '#a7f3d0', b: '#10b981', line: '#ffffff', glow: false },
    fire: { shape: 'drop', a: '#fde047', b: '#ef4444', line: '#7c2d12', glow: true },
    ocean: { shape: 'wing', a: '#67e8f9', b: '#1d4ed8', line: '#ffffff', glow: false },
    candy: { shape: 'drop', a: '#f9a8d4', b: '#c084fc', line: '#ffffff', glow: false },
    gold: { shape: 'arrow', a: '#fef08a', b: '#b45309', line: '#422006', glow: true },
    mono: { shape: 'arrow', a: '#ffffff', b: '#cbd5e1', line: '#0f172a', glow: false },
    neon: { shape: 'wing', a: '#a3e635', b: '#22d3ee', line: '#052e16', glow: true },
    glass: { shape: 'tri', a: '#ffffff', b: '#bae6fd', line: '#ffffff', glow: true },
  };
  const DEFAULT_CUSTOM = { shape: 'drop', a: '#f472b6', b: '#6366f1', line: '#ffffff', glow: true };

  function readDevice() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (saved && typeof saved === 'object') return saved;
    } catch {}
    // Первый запуск BOS 03: берём мышку и размер, выбранные раньше.
    return { active: PRESETS[BOS.state.cursor] ? BOS.state.cursor : 'aurora', size: BOS.state.cursorSize || 'm', custom: { ...DEFAULT_CUSTOM } };
  }
  let device = readDevice();
  function writeDevice() {
    try { localStorage.setItem(KEY, JSON.stringify(device)); } catch {}
    BOS.emit('cursor');
  }

  let uid = 0;
  // Рисует мышку по описанию. У каждого рисунка свой id градиента, чтобы превью не мешали друг другу.
  function svg(def) {
    const id = `cur3-${++uid}`;
    return `<svg viewBox="0 0 28 28" aria-hidden="true"><defs><linearGradient id="${id}" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${def.a}"/><stop offset="1" stop-color="${def.b}"/></linearGradient></defs>
      <path d="${SHAPES[def.shape] || SHAPES.tri}" fill="url(#${id})" stroke="${def.line}" stroke-width="2.2" stroke-linejoin="round" paint-order="stroke"/>
      <path d="${SHAPES[def.shape] || SHAPES.tri}" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width=".8" transform="translate(1.2 1.2) scale(.92)"/></svg>`;
  }
  const current = () => (device.active === 'custom' ? device.custom : PRESETS[device.active] || PRESETS.aurora);

  BOS.cursor3 = {
    SHAPES, PRESETS, svg, current,
    size: () => device.size || 'm',
    active: () => device.active,
    custom: () => device.custom,
    choose(id) { device.active = id; writeDevice(); },
    setSize(size) { device.size = size; writeDevice(); },
    edit(patch) { device.custom = { ...device.custom, ...patch }; device.active = 'custom'; writeDevice(); },
    reset() { device.custom = { ...DEFAULT_CUSTOM }; writeDevice(); },
  };

  // Блок «Мышка» в Настройках → Оформление: готовые мышки, своя мышка и её редактор.
  BOS.cursorStudio = function (win) {
    const picks = h('div', { class: 'cursor-picks cs-picks', role: 'radiogroup' });
    const preview = h('div', { class: 'cs-preview' });
    function paintPicks() {
      picks.replaceChildren(...[...Object.keys(PRESETS), 'custom'].map((id) => {
        const def = id === 'custom' ? device.custom : PRESETS[id];
        const input = h('input', { type: 'radio', name: 'cs-pick', value: id, checked: device.active === id, onchange: () => BOS.cursor3.choose(id) });
        return h('label', { class: `cursor-pick${id === 'custom' ? ' cs-custom' : ''}`, i18nTitle: `cur.p.${id}` },
          input,
          h('span', { class: def.glow ? 'glow' : '', style: `--glow:${def.a}`, html: svg(def) }));
      }));
      preview.replaceChildren(h('span', { class: current().glow ? 'glow' : '', style: `--glow:${current().a};--cur-s:${BOS.CURSOR_SIZES[device.size] || 1}`, html: svg(current()) }));
    }

    // Редактор своей мышки.
    const shapeButtons = Object.keys(SHAPES).map((shape) => h('button', {
      type: 'button', class: 'cs-shape', i18nTitle: `cur.shape.${shape}`,
      onclick: () => BOS.cursor3.edit({ shape }),
      html: svg({ ...device.custom, shape }),
    }));
    const color = (key, labelKey) => {
      const input = h('input', { type: 'color', value: device.custom[key], oninput: () => BOS.cursor3.edit({ [key]: input.value }) });
      return { input, el: h('label', { class: 'cs-color' }, input, h('span', { i18n: labelKey })) };
    };
    const colorA = color('a', 'cur.colorA');
    const colorB = color('b', 'cur.colorB');
    const line = color('line', 'cur.line');
    const glow = h('input', { type: 'checkbox', onchange: () => BOS.cursor3.edit({ glow: glow.checked }) });
    const sizeInputs = Object.keys(BOS.CURSOR_SIZES).map((size) => h('input', {
      type: 'radio', name: 'cs-size', value: size, i18nTitle: `size.${size}`, onchange: () => BOS.cursor3.setSize(size),
    }));
    const sizes = h('div', { class: 'segs cursor-sizes' }, sizeInputs.map((input) => h('label', { class: 'seg' }, input, h('span'))));

    function syncEditor() {
      const c = device.custom;
      shapeButtons.forEach((button, i) => {
        const shape = Object.keys(SHAPES)[i];
        button.innerHTML = svg({ ...c, shape });
        button.classList.toggle('on', c.shape === shape);
      });
      if (document.activeElement !== colorA.input) colorA.input.value = c.a;
      if (document.activeElement !== colorB.input) colorB.input.value = c.b;
      if (document.activeElement !== line.input) line.input.value = c.line;
      glow.checked = Boolean(c.glow);
      sizeInputs.forEach((input) => { input.checked = input.value === (device.size || 'm'); });
      sizes.querySelectorAll('.seg span').forEach((span, i) => {
        span.innerHTML = svg(current());
        span.style.setProperty('--cur-s', String(BOS.CURSOR_SIZES[sizeInputs[i].value]));
      });
    }
    function sync() {
      paintPicks();
      syncEditor();
    }
    win.listen('cursor', sync);
    sync();

    return h('div', { class: 'cs' },
      picks,
      h('div', { class: 'cs-editor b3-card' },
        h('div', { class: 'cs-editor-head' }, preview, h('div', {}, h('b', { i18n: 'cur.edit' }), h('p', { class: 'set-desc cs-device' }, icon('lock'), h('span', { i18n: 'cur.device' })))),
        h('div', { class: 'cs-row' }, h('span', { i18n: 'cur.shape' }), h('div', { class: 'cs-shapes' }, shapeButtons)),
        h('div', { class: 'cs-row cs-colors' }, colorA.el, colorB.el, line.el,
          h('label', { class: 'cs-glow' }, glow, h('span', { i18n: 'cur.glow' }))),
        h('div', { class: 'cs-row' }, h('span', { i18n: 'set.cursorSize' }), sizes),
        h('button', { type: 'button', class: 'btn ghost', onclick: () => BOS.cursor3.reset() }, icon('restart'), h('span', { i18n: 'cur.reset' }))));
  };
})();
