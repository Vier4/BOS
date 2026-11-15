// BOS MOBILE: оболочка для телефона. Главный экран, док и приложения во весь экран.
BOS.runMobile = function () {
  const { h, icon, state } = BOS;
  const DOCK = ['browser', 'files', 'settings'];

  const layer = h('div', { class: 'win-layer' });
  const wm = BOS.createWM(layer, () => {});
  BOS.wm = wm;

  const statusTime = h('b');
  const bigTime = h('b', { class: 'm-clock-time' });
  const date = h('p', { class: 'm-clock-date' });
  function syncClock() {
    const now = new Date();
    statusTime.textContent = BOS.fmtTime(now);
    bigTime.textContent = BOS.fmtTime(now);
    date.textContent = BOS.fmtDate(now);
  }
  BOS.on('lang', syncClock);
  BOS.on('region', syncClock);
  syncClock();
  setInterval(syncClock, 1000);

  const planeMark = h('span', { class: 'm-plane' }, icon('plane'));
  const planeButton = h('button', { type: 'button', class: 'round', i18nTitle: 'set.airplane', onclick: () => BOS.setAirplane(!state.airplane) }, icon('plane'));
  function syncAirplane() {
    planeMark.hidden = !state.airplane;
    planeButton.classList.toggle('on', state.airplane);
    planeButton.setAttribute('aria-pressed', String(state.airplane));
  }
  BOS.on('airplane', syncAirplane);
  syncAirplane();

  const themeButton = h('button', { type: 'button', class: 'round', i18nTitle: 'tray.theme', onclick: () => BOS.setTheme(state.theme === 'light' ? 'dark' : 'light') });
  const syncTheme = () => themeButton.replaceChildren(icon(state.theme === 'light' ? 'moon' : 'sun'));
  BOS.on('theme', syncTheme);
  syncTheme();

  const open = (id) => {
    toggleLibrary(false);
    wm.open(id);
  };

  const grid = h('nav', { class: 'm-grid' });
  let homeEdit = null;
  const syncGrid = () => {
    grid.replaceChildren(...state.home
      .filter(BOS.isAvailable)
      .map((id) => BOS.appIcon(id, () => open(id))));
    if (homeEdit) homeEdit.refresh();
  };
  BOS.on('home', syncGrid);
  BOS.on('apps', syncGrid);
  syncGrid();

  const dock = h('nav', { class: 'm-dock' },
    DOCK.map((id) => BOS.appIcon(id, () => open(id))),
    h('button', { type: 'button', class: 'app-icon', onclick: () => toggleLibrary(true) },
      BOS.artTile('all'),
      h('span', { class: 'app-label', i18n: 'mobile.all' })));

  const avatar = h('span', { class: 'avatar' });
  const profileName = h('b');
  const accountLine = h('small');
  function syncProfile() {
    avatar.textContent = BOS.initial();
    profileName.textContent = BOS.displayName();
    accountLine.textContent = BOS.accountLabel();
  }
  BOS.on('profile', syncProfile);
  BOS.on('lang', syncProfile);
  syncProfile();

  const lockButton = h('button', {
    type: 'button',
    class: 'btn ghost',
    onclick: () => {
      toggleLibrary(false);
      BOS.lockScreen();
    },
  }, icon('lock'), h('span', { i18n: 'power.lock' }));
  const syncLockButton = () => { lockButton.hidden = !state.lock; };
  BOS.on('lock', syncLockButton);
  syncLockButton();

  const appGrid = h('nav', { class: 'launcher-grid' });
  const search = BOS.appSearch(appGrid);
  let libraryEdit = null;
  const fillGrid = () => {
    appGrid.replaceChildren(...BOS.availableApps().map((id) => BOS.appIcon(id, () => open(id))));
    search.reset();
    if (libraryEdit) libraryEdit.refresh();
  };
  BOS.on('apps', fillGrid);
  fillGrid();
  const library = h('div', { class: 'm-library', hidden: true, role: 'dialog', 'aria-modal': 'true' },
    h('div', { class: 'launcher-head' },
      avatar,
      h('div', { class: 'launcher-who' }, profileName, accountLine),
      h('button', { type: 'button', class: 'btn primary edit-done', i18n: 'apps.done', onclick: () => libraryEdit.stop() }),
      planeButton,
      themeButton,
      h('button', { type: 'button', class: 'round', i18nTitle: 'win.close', onclick: () => toggleLibrary(false) }, icon('close'))),
    search.field,
    h('div', { class: 'launcher-body' }, appGrid, search.empty),
    h('div', { class: 'launcher-foot' },
      BOS.guestSession ? BOS.exitGuestButton() : lockButton,
      h('button', { type: 'button', class: 'btn ghost', onclick: () => location.reload() }, icon('restart'), h('span', { i18n: 'power.restart' })),
      h('button', { type: 'button', class: 'btn ghost', onclick: BOS.powerOff }, icon('power'), h('span', { i18n: 'power.shutdown' }))));

  libraryEdit = BOS.editableGrid(appGrid, { container: library, onReorder: BOS.setOrder });

  function toggleLibrary(isOpen) {
    if (isOpen) search.reset();
    else libraryEdit.stop();
    library.hidden = !isOpen;
  }

  // Верхняя шторка: смахните вниз по строке состояния.
  // В BOS 01 шторки нет.
  const shade = BOS.is02 ? BOS.createShade() : null;
  const statusBar = h('header', { class: 'm-status' }, statusTime, h('span', { class: 'm-status-right' }, BOS.wifi ? BOS.wifi.mark('m-wifi') : null, planeMark, h('span', {}, BOS.is02 ? `BOS ${BOS.VERSION}` : 'BOS')));
  if (shade) shade.attachHandle(statusBar);

  // Полоска внизу — кнопка «Домой»: сворачивает приложения и показывает главный экран.
  const homeBar = h('button', {
    type: 'button',
    class: 'm-homebar',
    i18nTitle: 'mobile.home',
    onclick: () => {
      toggleLibrary(false);
      if (shade) shade.close();
      homeEdit.stop();
      wm.hideAll();
    },
  }, h('i'));

  const homeMain = h('main', { class: 'm-home' },
    h('button', { type: 'button', class: 'btn primary edit-done home-done', i18n: 'apps.done', onclick: () => homeEdit.stop() }),
    h('div', { class: 'm-clock' }, bigTime, date),
    grid);
  homeEdit = BOS.editableGrid(grid, { container: homeMain, onReorder: BOS.setHomeOrder });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (libraryEdit.isEditing()) libraryEdit.stop();
    else toggleLibrary(false);
    homeEdit.stop();
  });

  // Камера и Фото появились в BOS 02: один раз кладём их на главный экран.
  if (BOS.is02 && !state.home02) {
    state.home02 = true;
    BOS.MOBILE_APPS.forEach((id) => { if (!state.home.includes(id)) state.home.push(id); });
    BOS.save();
    syncGrid();
  }

  const root = h('div', { class: 'mobile enter-fade' });
  // Своя клавиатура — часть BOS 02; в BOS 01 работает клавиатура телефона.
  const keyboard = BOS.is02 ? BOS.createKeyboard(root) : null;
  root.append(...[
    BOS.createWall(),
    statusBar,
    homeMain,
    dock,
    homeBar,
    layer,
    library,
    shade && shade.el,
    keyboard && keyboard.el,
  ].filter(Boolean));
  BOS.show(root);
};
