// Верхняя шторка BOS 02: яркость, громкость, авиарежим, тема и музыка.
// На телефоне её вытягивают вниз из строки состояния, на компьютере открывают по часам на острове.
BOS.createShade = function () {
  const { h, icon, state } = BOS;

  // Высокая овальная «капсула»: тянешь вверх-вниз — меняется значение, чёрная черта показывает уровень.
  function pill(kind, iconName, labelKey, get, set, min) {
    const el = h('div', {
      class: `shade-pill ${kind}`,
      role: 'slider',
      tabIndex: 0,
      'aria-valuemin': Math.round(min * 100),
      'aria-valuemax': 100,
      i18nTitle: labelKey,
    }, h('i', { class: 'shade-pill-line' }), icon(iconName));
    const paint = () => {
      const value = get();
      el.style.setProperty('--v', String((value - min) / (1 - min)));
      el.setAttribute('aria-valuenow', String(Math.round(value * 100)));
    };
    const fromPointer = (e) => {
      const rect = el.getBoundingClientRect();
      const share = 1 - (e.clientY - rect.top) / rect.height;
      set(min + Math.max(0, Math.min(1, share)) * (1 - min));
    };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      el.setPointerCapture(e.pointerId);
      fromPointer(e);
      const move = (ev) => fromPointer(ev);
      const up = () => {
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', up);
        el.removeEventListener('pointercancel', up);
      };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
    });
    el.addEventListener('keydown', (e) => {
      const step = { ArrowUp: 0.1, ArrowRight: 0.1, ArrowDown: -0.1, ArrowLeft: -0.1 }[e.key];
      if (!step) return;
      e.preventDefault();
      set(get() + step);
    });
    return { el, paint };
  }

  const brightness = pill('bright', 'sun', 'shade.bright', () => state.brightness, BOS.setBrightness, 0.3);
  const volume = pill('volume', 'volume', 'shade.volume', () => state.volume, BOS.setVolume, 0);
  BOS.on('brightness', brightness.paint);
  BOS.on('volume', volume.paint);
  brightness.paint();
  volume.paint();

  const plane = h('button', { type: 'button', class: 'shade-tog', i18nTitle: 'set.airplane', onclick: () => BOS.setAirplane(!state.airplane) }, icon('plane'));
  const syncPlane = () => {
    plane.classList.toggle('on', state.airplane);
    plane.setAttribute('aria-pressed', String(state.airplane));
  };
  BOS.on('airplane', syncPlane);
  syncPlane();

  const theme = h('button', { type: 'button', class: 'shade-tog', i18nTitle: 'tray.theme', onclick: () => BOS.setTheme(state.theme === 'light' ? 'dark' : 'light') });
  const syncTheme = () => theme.replaceChildren(icon(state.theme === 'light' ? 'moon' : 'sun'));
  BOS.on('theme', syncTheme);
  syncTheme();

  // Музыка: если плеер закрыт, кнопка «Играть» откроет Музыку и включит первую песню.
  const time = h('b', { class: 'shade-time' });
  const song = h('p', { class: 'shade-song' });
  const playButton = h('button', { type: 'button', class: 'shade-ctl main', onclick: () => {
    if (BOS.player) { BOS.player.toggle(); return; }
    if (!BOS.isAvailable('music') || !BOS.wm) return;
    BOS.wm.open('music');
    if (BOS.player) BOS.player.toggle();
  } });
  const prevButton = h('button', { type: 'button', class: 'shade-ctl', i18nTitle: 'shade.prev', onclick: () => BOS.player && BOS.player.previous() }, icon('prev'));
  const nextButton = h('button', { type: 'button', class: 'shade-ctl', i18nTitle: 'shade.next', onclick: () => BOS.player && BOS.player.next() }, icon('next'));
  function syncPlayer() {
    const player = BOS.player;
    const title = player && player.title();
    const playing = Boolean(player && player.playing());
    if (title) {
      delete song.dataset.i18n;
      song.textContent = title;
    } else {
      song.dataset.i18n = 'shade.nothing';
      BOS.applyI18nTo(song);
    }
    playButton.replaceChildren(icon(playing ? 'pause' : 'play'));
    playButton.dataset.i18nTitle = playing ? 'music.pause' : 'music.play';
    BOS.applyI18nTo(playButton);
    prevButton.disabled = !title;
    nextButton.disabled = !title;
  }
  BOS.on('player', syncPlayer);
  BOS.on('lang', syncPlayer);
  syncPlayer();

  const syncClock = () => { time.textContent = BOS.fmtTime(new Date()); };
  BOS.on('lang', syncClock);
  BOS.on('clock', syncClock);
  syncClock();
  setInterval(syncClock, 1000);

  // New Year Edition: снег и салют прямо из шторки.
  function nyToggles() {
    if (!BOS.ny) return [];
    const snow = h('button', { type: 'button', class: 'shade-tog', i18nTitle: 'ny.snow', onclick: () => BOS.ny.setSnow(state.snow === false) }, '❄');
    const syncSnow = () => {
      snow.classList.toggle('on', state.snow !== false);
      snow.setAttribute('aria-pressed', String(state.snow !== false));
    };
    BOS.on('snow', syncSnow);
    syncSnow();
    const fire = h('button', { type: 'button', class: 'shade-tog ny-fire', i18nTitle: 'ny.fireworks', onclick: () => { close(); BOS.ny.fireworks(); } }, '🎆');
    return [snow, fire];
  }

  const sheet = h('div', { class: 'shade-sheet' },
    h('div', { class: 'shade-panel' },
      brightness.el,
      volume.el,
      h('div', { class: 'shade-side' },
        h('div', { class: 'shade-toggles' }, plane, theme, ...nyToggles()),
        h('div', { class: 'shade-media' },
          time,
          song,
          h('div', { class: 'shade-ctls' }, prevButton, playButton, nextButton)))),
    h('i', { class: 'shade-grip' }));

  const el = h('div', { class: 'shade', hidden: true, role: 'dialog', i18nTitle: 'shade.title' }, sheet);

  function open() {
    if (!el.hidden) return;
    el.hidden = false;
    el.classList.remove('closing');
  }
  function close() {
    if (el.hidden || el.classList.contains('closing')) return;
    el.classList.add('closing');
    setTimeout(() => {
      el.hidden = true;
      el.classList.remove('closing');
    }, 180);
  }
  const isOpen = () => !el.hidden && !el.classList.contains('closing');

  // Тап мимо панели или смахивание вверх закрывают шторку.
  el.addEventListener('pointerdown', (e) => {
    if (!sheet.contains(e.target)) { close(); return; }
    if (e.target.closest('button, .shade-pill')) return;
    const startY = e.clientY;
    const up = (ev) => {
      window.removeEventListener('pointerup', up);
      if (startY - ev.clientY > 30) close();
    };
    window.addEventListener('pointerup', up);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  // Ручка: смахивание вниз по этому элементу (или тап) открывает шторку.
  function attachHandle(handle) {
    handle.addEventListener('pointerdown', (e) => {
      const startY = e.clientY;
      let done = false;
      const move = (ev) => {
        if (!done && ev.clientY - startY > 24) { done = true; open(); }
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        if (!done) (isOpen() ? close : open)();
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
  }

  return { el, open, close, isOpen, toggle: () => (isOpen() ? close() : open()), attachHandle };
};
