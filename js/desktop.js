// Рабочий стол: обои, большие часы, значки главного экрана, верхний остров и экран приложений.
BOS.runDesktop = function () {
  const { h, icon, mark, state } = BOS;

  const chips = new Map();
  const layer = h('div', { class: 'win-layer' });
  const wm = BOS.createWM(layer, syncIsland);
  BOS.wm = wm;

  const hello = h('p', { class: 'poster-hello' });
  const bigTime = h('b', { class: 'poster-time' });
  const longDate = h('p', { class: 'poster-date' });

  const avatar = h('span', { class: 'avatar' });
  const profileName = h('b');
  const accountLine = h('small');
  function syncProfile() {
    avatar.textContent = BOS.initial();
    profileName.textContent = BOS.displayName();
    accountLine.textContent = BOS.accountLabel();
    hello.dataset.i18n = 'desk.hello';
    hello.i18nVars = { name: BOS.displayName() };
    BOS.applyI18nTo(hello);
  }
  BOS.on('profile', syncProfile);
  BOS.on('lang', syncProfile);
  syncProfile();

  const open = (id) => {
    toggleLauncher(false);
    wm.open(id);
  };

  const lockButton = h('button', {
    type: 'button',
    class: 'btn ghost',
    onclick: () => {
      toggleLauncher(false);
      BOS.lockScreen();
    },
  }, icon('lock'), h('span', { i18n: 'power.lock' }));
  const syncLockButton = () => { lockButton.hidden = !state.lock; };
  BOS.on('lock', syncLockButton);
  syncLockButton();

  // Значки на экране «Приложения» пересобираются, когда в B Store что-то ставят или удаляют.
  const appGrid = h('nav', { class: 'launcher-grid' });
  const search = BOS.appSearch(appGrid);
  let launcherEdit = null;
  const fillGrid = () => {
    appGrid.replaceChildren(...BOS.availableApps().map((id) => BOS.appIcon(id, () => open(id))));
    search.reset();
    if (launcherEdit) launcherEdit.refresh();
  };
  BOS.on('apps', fillGrid);
  fillGrid();
  const launcher = h('div', { class: 'launcher', hidden: true, role: 'dialog', 'aria-modal': 'true' },
    h('div', { class: 'launcher-head' },
      avatar,
      h('div', { class: 'launcher-who' }, profileName, accountLine),
      h('button', { type: 'button', class: 'btn primary edit-done', i18n: 'apps.done', onclick: () => launcherEdit.stop() }),
      h('button', { type: 'button', class: 'round', i18nTitle: 'win.close', onclick: () => toggleLauncher(false) }, icon('close'))),
    search.field,
    h('div', { class: 'launcher-body' }, appGrid, search.empty),
    h('div', { class: 'launcher-foot' },
      BOS.guestSession ? BOS.exitGuestButton() : lockButton,
      h('button', { type: 'button', class: 'btn ghost', onclick: () => location.reload() }, icon('restart'), h('span', { i18n: 'power.restart' })),
      h('button', { type: 'button', class: 'btn ghost', onclick: BOS.powerOff }, icon('power'), h('span', { i18n: 'power.shutdown' }))));
  launcherEdit = BOS.editableGrid(appGrid, { container: launcher, onReorder: BOS.setOrder });

  const home = h('button', { type: 'button', class: 'island-home', onclick: () => toggleLauncher(true) },
    mark(), h('span', { i18n: 'start.apps' }));

  function toggleLauncher(isOpen) {
    if (launcher.hidden === !isOpen) return;
    launcher.hidden = !isOpen;
    if (isOpen) {
      search.reset();
      search.input.focus({ preventScroll: true });
    } else {
      launcherEdit.stop();
      home.focus({ preventScroll: true });
    }
  }

  const running = h('div', { class: 'island-chips' }, [...BOS.APP_ORDER, ...BOS.STORE_APPS].map((id) => {
    const chip = h('button', {
      type: 'button',
      class: 'chip',
      hidden: true,
      onclick: () => wm.toggle(id),
    }, BOS.appTile(id, 'tile-xs'), h('span', { i18n: BOS.apps[id].title }));
    chips.set(id, chip);
    return chip;
  }));

  function syncIsland() {
    let anyOpen = false;
    chips.forEach((chip, id) => {
      const isOpen = wm.isOpen(id);
      anyOpen = anyOpen || isOpen;
      chip.hidden = !isOpen;
      chip.classList.toggle('active', wm.isActive(id));
    });
    island.classList.toggle('busy', anyOpen);
  }

  // Рабочий стол: значки приложений (их добавляют в Браузере) и папки стоят там, куда их перетащили.
  // Значок без своего места встаёт в первую свободную клетку снизу слева.
  const homeGrid = h('nav', { class: 'home-grid' });
  let homeEdit = null;
  let homeVersion = 0;
  const keyOf = (button) => button.dataset.key;

  function placeIcons() {
    const icons = [...homeGrid.children];
    if (!icons.length) return;
    const width = homeGrid.clientWidth;
    const height = homeGrid.clientHeight;
    const itemW = icons[0].offsetWidth || 84;
    const itemH = icons[0].offsetHeight || 96;
    const roomX = Math.max(width - itemW, 0);
    const roomY = Math.max(height - itemH, 0);
    const taken = [];
    const free = [];
    icons.forEach((button) => {
      const pos = state.deskPos[keyOf(button)];
      if (!pos) { free.push(button); return; }
      const x = Math.round(Math.min(Math.max(pos[0], 0), 1) * roomX);
      const y = Math.round(Math.min(Math.max(pos[1], 0), 1) * roomY);
      taken.push([x, y]);
      Object.assign(button.style, { left: `${x}px`, top: `${y}px` });
    });
    const margin = Math.min(72, Math.max(12, width * 0.05));
    const stepX = itemW + 4;
    const stepY = itemH + 8;
    const busy = (x, y) => taken.some(([ox, oy]) => Math.abs(ox - x) < itemW * 0.7 && Math.abs(oy - y) < itemH * 0.7);
    let col = 0;
    let row = 0;
    free.forEach((button) => {
      let x;
      let y;
      for (let guard = 0; guard < 400; guard++) {
        x = margin + col * stepX;
        y = height - 18 - itemH - row * stepY;
        col++;
        if (x + itemW > width - 12) { col = 0; row++; }
        if (y < 0 || !busy(x, y)) break;
      }
      taken.push([x, y]);
      Object.assign(button.style, { left: `${Math.round(x)}px`, top: `${Math.max(Math.round(y), 0)}px` });
    });
  }

  function savePlace(button, left, top) {
    const roomX = Math.max(homeGrid.clientWidth - button.offsetWidth, 1);
    const roomY = Math.max(homeGrid.clientHeight - button.offsetHeight, 1);
    BOS.setDeskPos(keyOf(button), [+(left / roomX).toFixed(4), +(top / roomY).toFixed(4)]);
  }

  function folderIcon(folder) {
    const button = h('button', {
      type: 'button',
      class: 'app-icon desk-folder',
      'data-key': `f:${folder.id}`,
      onclick: () => BOS.openFolder(folder.id),
      oncontextmenu: (e) => {
        e.preventDefault();
        e.stopPropagation();
        showMenu(e, [
          ['folder', 'desk.open', () => BOS.openFolder(folder.id)],
          ['edit', 'files.rename', () => renameFolder(folder.id)],
          ['trash', 'files.delete', () => askDeleteFolder(folder)],
        ]);
      },
    }, BOS.artTile('folder'), h('span', { class: 'app-label' }, folder.name));
    return button;
  }

  async function syncHome() {
    // Пока значок тащат, его не пересоздаём, иначе он выскользнет из-под мыши.
    if (homeGrid.querySelector('.dragging')) {
      window.addEventListener('pointerup', () => setTimeout(syncHome), { once: true });
      return;
    }
    const version = ++homeVersion;
    let folders = [];
    try { folders = await BOS.deskFolders(); } catch { folders = []; }
    if (version !== homeVersion) return;
    folders.sort((a, b) => a.added - b.added);
    homeGrid.replaceChildren(
      ...state.home.filter(BOS.isAvailable).map((id) => {
        const button = BOS.appIcon(id, () => wm.open(id));
        button.dataset.key = id;
        return button;
      }),
      ...folders.map(folderIcon));
    placeIcons();
    if (homeEdit) homeEdit.refresh();
  }
  ['home', 'apps', 'files', 'files-changed'].forEach((event) => BOS.on(event, syncHome));
  new ResizeObserver(placeIcons).observe(homeGrid);
  syncHome();

  function renameFolder(id) {
    const button = homeGrid.querySelector(`[data-key="f:${id}"]`);
    if (!button) return;
    const label = button.querySelector('.app-label');
    let finished = false;
    const finish = (keep) => {
      if (finished) return;
      finished = true;
      const name = input.value.trim();
      label.hidden = false;
      input.remove();
      if (keep && name && name !== label.textContent) {
        label.textContent = name;
        BOS.renameFolder(id, name);
      }
    };
    const input = h('input', {
      class: 'desk-rename',
      value: label.textContent,
      maxLength: 60,
      onkeydown: (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') finish(true);
        if (e.key === 'Escape') finish(false);
      },
      onblur: () => finish(true),
      onclick: (e) => e.stopPropagation(),
    });
    label.hidden = true;
    button.append(input);
    input.focus();
    input.select();
  }

  function askDeleteFolder(folder) {
    const box = h('div', { class: 'app-confirm', role: 'dialog', 'aria-modal': 'true' },
      h('div', {},
        BOS.artTile('folder'),
        h('b', { i18n: 'files.confirm', i18nVars: { name: folder.name } }),
        h('p', { i18n: 'desk.deleteNote' }),
        h('div', { class: 'sec-actions' },
          h('button', { type: 'button', class: 'btn ghost', i18n: 'common.cancel', onclick: () => box.remove() }),
          h('button', {
            type: 'button',
            class: 'btn danger',
            i18n: 'files.delete',
            onclick: () => {
              box.remove();
              BOS.setDeskPos(`f:${folder.id}`, null);
              BOS.deleteFolder(folder.id);
            },
          }))));
    box.addEventListener('pointerdown', (e) => { if (e.target === box) box.remove(); });
    document.querySelector('.desktop').append(box);
  }

  // Меню правой кнопки мыши на пустом месте рабочего стола.
  let menu = null;
  function hideMenu() {
    if (menu) menu.remove();
    menu = null;
  }
  function showMenu(e, entries) {
    hideMenu();
    menu = h('div', { class: 'b-pop desk-menu', role: 'menu' }, entries.map(([iconName, key, run]) => h('button', {
      type: 'button',
      role: 'menuitem',
      onclick: () => { hideMenu(); run(); },
    }, icon(iconName), h('span', { i18n: key }))));
    area.append(menu);
    const box = area.getBoundingClientRect();
    const x = Math.min(e.clientX - box.left, box.width - menu.offsetWidth - 8);
    const y = Math.min(e.clientY - box.top, box.height - menu.offsetHeight - 8);
    Object.assign(menu.style, { left: `${Math.max(x, 8)}px`, top: `${Math.max(y, 8)}px` });
    menu.querySelector('button').focus({ preventScroll: true });
  }
  async function newFolderAt(clientX, clientY) {
    const folder = await BOS.createDeskFolder();
    const box = homeGrid.getBoundingClientRect();
    const roomX = Math.max(box.width - 84, 1);
    const roomY = Math.max(box.height - 96, 1);
    const fx = Math.min(Math.max((clientX - box.left - 42) / roomX, 0), 1);
    const fy = Math.min(Math.max((clientY - box.top - 30) / roomY, 0), 1);
    BOS.setDeskPos(`f:${folder.id}`, [+fx.toFixed(4), +fy.toFixed(4)]);
    await syncHome();
    renameFolder(folder.id);
  }
  BOS.newDeskFolder = () => {
    const box = homeGrid.getBoundingClientRect();
    return newFolderAt(box.left + box.width / 2, box.top + box.height / 2);
  };

  const themeIcon = h('span');
  const syncThemeIcon = () => themeIcon.replaceChildren(icon(state.theme === 'light' ? 'moon' : 'sun'));
  BOS.on('theme', syncThemeIcon);
  syncThemeIcon();

  const airplane = h('button', {
    type: 'button',
    class: 'round',
    i18nTitle: 'set.airplane',
    onclick: () => BOS.setAirplane(!state.airplane),
  }, icon('plane'));
  function syncAirplane() {
    airplane.classList.toggle('on', state.airplane);
    airplane.setAttribute('aria-pressed', String(state.airplane));
  }
  BOS.on('airplane', syncAirplane);
  syncAirplane();

  const langCode = h('span', { class: 'island-lang' });
  const smallTime = h('b', { class: 'island-time' });
  function syncClock() {
    const now = new Date();
    const time = BOS.fmtTime(now);
    smallTime.textContent = time;
    bigTime.textContent = time;
    longDate.textContent = BOS.fmtDate(now);
    langCode.textContent = state.lang.toUpperCase();
  }
  BOS.on('lang', syncClock);
  BOS.on('region', syncClock);
  syncClock();
  setInterval(syncClock, 1000);

  const island = h('header', { class: 'island' },
    home,
    running,
    h('div', { class: 'island-tray' },
      smallTime,
      langCode,
      airplane,
      h('button', {
        type: 'button',
        class: 'round',
        i18nTitle: 'tray.theme',
        onclick: () => BOS.setTheme(state.theme === 'light' ? 'dark' : 'light'),
      }, themeIcon)));

  const poster = h('div', { class: 'poster' }, hello, bigTime, longDate);
  const area = h('div', {
    class: 'desk',
    onpointerdown: (e) => {
      if (menu && !menu.contains(e.target)) hideMenu();
      if (e.target === area || e.target === layer || e.target === homeGrid) {
        wm.blur();
        homeEdit.stop();
      }
    },
    oncontextmenu: (e) => {
      if (e.target.closest('.win, .app-icon, .b-pop, input, textarea, [contenteditable]')) return;
      e.preventDefault();
      showMenu(e, [
        ['folder', 'desk.newFolder', () => newFolderAt(e.clientX, e.clientY)],
        ['arrange', 'desk.arrange', () => BOS.arrangeDesk()],
      ]);
    },
  }, poster, homeGrid,
    h('button', { type: 'button', class: 'btn primary edit-done home-done', i18n: 'apps.done', onclick: () => homeEdit.stop() }),
    layer);
  homeEdit = BOS.editableGrid(homeGrid, { container: area, onPlace: savePlace });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    hideMenu();
    if (launcherEdit.isEditing()) launcherEdit.stop();
    else toggleLauncher(false);
    homeEdit.stop();
  });

  BOS.show(h('div', { class: 'desktop enter-fade' }, BOS.createWall(), island, area, launcher));
};
