// Оконный менеджер. У каждого приложения не больше одного окна.
BOS.createWM = function (layer, onChange) {
  const { h, icon } = BOS;
  const wins = new Map();
  const MARGIN = 12;
  let z = 10;
  let spawned = 0;
  let activeId = null;

  // Узкий экран (телефон или рамка BOS MOBILE): окна всегда во весь экран.
  const isCompact = () => layer.clientWidth <= 640;

  function applyGeometry(win) {
    const { x, y, w, h: height } = win.geometry;
    Object.assign(win.el.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: height + 'px' });
  }

  function clampGeometry(win) {
    const g = win.geometry;
    const W = layer.clientWidth;
    const H = layer.clientHeight;
    g.w = Math.min(g.w, W);
    g.h = Math.min(g.h, H);
    g.x = Math.max(120 - g.w, Math.min(g.x, W - 120));
    g.y = Math.max(0, Math.min(g.y, H - 44));
  }

  function open(id) {
    if (!BOS.isAvailable(id)) return;
    if (wins.has(id)) { restore(id); return; }
    const app = BOS.apps[id];
    const W = layer.clientWidth;
    const H = layer.clientHeight;
    const w = Math.min(app.width, W - MARGIN * 2);
    const height = Math.min(app.height, H - MARGIN * 2);
    const offset = (spawned++ % 6) * 28;

    const body = h('div', { class: 'win-body' });
    const title = h('header', { class: 'win-bar', ondblclick: (e) => { if (!e.target.closest('button')) toggleMax(id); } },
      h('div', { class: 'win-tab' },
        BOS.appTile(id, 'tile-xs'),
        h('span', { class: 'win-title', i18n: app.title })),
      h('div', { class: 'win-ctl' },
        ctl('close', 'win.close', () => close(id)),
        h('span', { class: 'win-max' }, ctl('maximize', 'win.maximize', () => toggleMax(id))),
        ctl('minimize', 'win.minimize', () => minimize(id))));
    const handles = ['e', 's', 'se'].map((edge) => h('div', { class: `win-rs ${edge}` }));
    const el = h('section', { class: 'win', tabIndex: -1, role: 'group' }, title, h('div', { class: 'win-frame' }, body), handles);

    const win = {
      id, app, el, body,
      minimized: false,
      maximized: false,
      geometry: {
        x: Math.max(MARGIN, Math.round((W - w) / 2) - 70 + offset),
        y: Math.max(MARGIN, Math.round((H - height) / 2) - 40 + offset),
        w, h: height,
      },
      disposers: [],
      listen(event, fn) { win.disposers.push(BOS.on(event, fn)); },
    };
    wins.set(id, win);
    clampGeometry(win);
    applyGeometry(win);

    el.addEventListener('pointerdown', () => { if (activeId !== id) focus(id); }, true);
    title.addEventListener('pointerdown', (e) => startDrag(e, win, 'move'));
    handles.forEach((handle) => {
      const edge = handle.classList[1];
      handle.addEventListener('pointerdown', (e) => startDrag(e, win, edge));
    });

    app.mount(body, win);
    layer.append(el);
    focus(id);
  }

  function ctl(iconName, key, action) {
    return h('button', { type: 'button', class: `win-btn ${iconName}`, i18nTitle: key, onclick: action }, icon(iconName));
  }

  function startDrag(e, win, mode) {
    if (e.button !== 0 || e.target.closest('button') || isCompact() || win.maximized) return;
    e.preventDefault();
    const start = { ...win.geometry };
    const { clientX: sx, clientY: sy } = e;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    document.body.classList.add('dragging');

    function move(ev) {
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      const g = win.geometry;
      if (mode === 'move') {
        g.x = start.x + dx;
        g.y = start.y + dy;
      } else {
        if (mode.includes('e')) g.w = Math.max(win.app.minWidth, start.w + dx);
        if (mode.includes('s')) g.h = Math.max(win.app.minHeight, start.h + dy);
      }
      clampGeometry(win);
      applyGeometry(win);
    }
    function up() {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      target.removeEventListener('pointercancel', up);
      document.body.classList.remove('dragging');
    }
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
    target.addEventListener('pointercancel', up);
  }

  function focus(id) {
    const win = wins.get(id);
    activeId = id;
    wins.forEach((w) => w.el.classList.toggle('active', w.id === id));
    win.el.style.zIndex = ++z;
    if (win.app.onFocus) win.app.onFocus(win);
    else win.el.focus({ preventScroll: true });
    onChange();
  }

  function focusTopmost() {
    let top = null;
    wins.forEach((w) => {
      if (!w.minimized && (!top || +w.el.style.zIndex > +top.el.style.zIndex)) top = w;
    });
    if (top) focus(top.id);
    else blur();
  }

  function blur() {
    activeId = null;
    wins.forEach((w) => w.el.classList.remove('active'));
    onChange();
  }

  function minimize(id) {
    const win = wins.get(id);
    win.minimized = true;
    win.el.classList.add('min');
    focusTopmost();
  }

  function restore(id) {
    const win = wins.get(id);
    win.minimized = false;
    win.el.classList.remove('min');
    focus(id);
  }

  function toggleMax(id) {
    const win = wins.get(id);
    win.maximized = !win.maximized;
    win.el.classList.add('animating');
    win.el.classList.toggle('max', win.maximized);
    setTimeout(() => win.el.classList.remove('animating'), 200);
  }

  function close(id) {
    const win = wins.get(id);
    win.disposers.forEach((dispose) => dispose());
    wins.delete(id);
    win.el.classList.add('closing');
    setTimeout(() => win.el.remove(), 130);
    if (activeId === id) focusTopmost();
    else onChange();
  }

  // Клик по значку на панели: открыть, поднять или свернуть.
  function toggle(id) {
    const win = wins.get(id);
    if (!win) open(id);
    else if (win.minimized || activeId !== id) restore(id);
    else minimize(id);
  }

  window.addEventListener('resize', () => {
    wins.forEach((win) => { clampGeometry(win); applyGeometry(win); });
  });

  function hideAll() {
    wins.forEach((win) => {
      win.minimized = true;
      win.el.classList.add('min');
    });
    blur();
  }

  return {
    open, close, toggle, blur, hideAll,
    isOpen: (id) => wins.has(id),
    isActive: (id) => activeId === id,
  };
};
