// Ядро BOS: состояние, события, форматирование и построение DOM.
window.BOS = (function () {
  const STATE_KEY = 'bos.state.v1';
  const IDS_KEY = 'bos.ids.v1';
  const PHOTO_KEY = 'bos.wallphoto.v1';
  const ID_RULE = /^[a-z0-9][a-z0-9._]{2,19}$/;
  const ID_SUFFIX = '@bid';

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  // Гостевой сеанс живёт до выхода из него и ничего не сохраняет: данные владельца ему не видны.
  const GUEST_KEY = 'bos.guest';
  const guestSession = (() => {
    try { return sessionStorage.getItem(GUEST_KEY) === '1'; } catch { return false; }
  })();

  const saved = read(STATE_KEY) || {};
  const state = Object.assign(
    {
      setupDone: false, lang: 'ru', region: null, theme: 'light', font: 'system', id: null, name: '', notes: '',
      wallpaper: 'bos02', wallpaperPicked: false, textColor: 'auto', airplane: false, best: {},
      home: ['files', 'browser', 'store', 'assistant', 'music', 'notes', 'games'], textSize: 'm', lock: null, guest: false, playlists: [],
      installed: [], removed: [], order: [], deskPos: {}, clock: 'auto', timeZone: null,
      cursor: 'aurora', volume: 0.8, brightness: 1, kbLangs: null,
    },
    guestSession ? { setupDone: true, guest: true, lang: saved.lang || 'ru', region: saved.region || null } : saved
  );
  const save = () => { if (!guestSession) write(STATE_KEY, state); };
  // Обои BOS 02 — новые обои по умолчанию; выбранные вручную не трогаем.
  if (!state.wallpaperPicked) state.wallpaper = 'bos02';

  const displayName = () => (state.guest ? BOS.t('guest.name') : state.name);
  const accountLabel = () => (state.id ? state.id + ID_SUFFIX : BOS.t('guest.label'));

  const listeners = {};
  function on(event, fn) {
    (listeners[event] = listeners[event] || new Set()).add(fn);
    return () => listeners[event].delete(fn);
  }
  function emit(event) {
    (listeners[event] || []).forEach((fn) => fn());
  }

  function setTheme(theme) {
    state.theme = theme;
    document.documentElement.dataset.theme = theme;
    applyTextColor();
    save();
    emit('theme');
  }

  // Готовые цвета заданы парами, чтобы текст читался и в светлой, и в тёмной теме.
  const TEXT_COLORS = {
    red: ['#c81e1e', '#ff8080'],
    orange: ['#b45309', '#fdba74'],
    green: ['#15803d', '#6ee7a0'],
    teal: ['#0f766e', '#5eead4'],
    blue: ['#1d4ed8', '#93b4ff'],
    violet: ['#6d28d9', '#c4b5fd'],
    pink: ['#be185d', '#f9a8d4'],
  };

  function applyTextColor() {
    const root = document.documentElement.style;
    const choice = state.textColor;
    if (choice === 'auto') {
      ['--ink', '--ink-2', '--ink-3'].forEach((name) => root.removeProperty(name));
      return;
    }
    const color = TEXT_COLORS[choice] ? TEXT_COLORS[choice][state.theme === 'dark' ? 1 : 0] : choice;
    root.setProperty('--ink', color);
    root.setProperty('--ink-2', `color-mix(in srgb, ${color} 80%, var(--bg))`);
    root.setProperty('--ink-3', `color-mix(in srgb, ${color} 62%, var(--bg))`);
  }

  function setTextColor(color) {
    state.textColor = color;
    applyTextColor();
    save();
    emit('textColor');
  }

  const TEXT_SIZES = { s: 0.9, m: 1, l: 1.15, xl: 1.3 };
  function applyTextSize() {
    document.documentElement.style.setProperty('--ts', TEXT_SIZES[state.textSize] || 1);
  }
  function setTextSize(size) {
    state.textSize = size;
    applyTextSize();
    save();
    emit('textSize');
  }

  // Главный экран: приложения, которые закреплены из Браузера.
  function setPinned(id, pinned) {
    state.home = state.home.filter((x) => x !== id);
    if (pinned) state.home.push(id);
    save();
    emit('home');
  }

  // Пароль хранится как SHA-256 с солью. Без защищённого контекста
  // (например, http по локальной сети) хеш считается своей функцией.
  function sha256(bytes) {
    const primes = [];
    for (let n = 2; primes.length < 64; n++) if (primes.every((p) => n % p)) primes.push(n);
    const frac = (x) => ((x - Math.floor(x)) * 2 ** 32) >>> 0;
    const K = primes.map((p) => frac(Math.cbrt(p)));
    const H = primes.slice(0, 8).map((p) => frac(Math.sqrt(p)));
    const padded = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6);
    padded.set(bytes);
    padded[bytes.length] = 0x80;
    const view = new DataView(padded.buffer);
    view.setUint32(padded.length - 8, Math.floor(bytes.length / 2 ** 29));
    view.setUint32(padded.length - 4, (bytes.length * 8) >>> 0);
    const w = new Uint32Array(64);
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let offset = 0; offset < padded.length; offset += 64) {
      for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      let [a, b, c, d, e, f, g, k] = H;
      for (let i = 0; i < 64; i++) {
        const t1 = (k + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
        const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        k = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      [a, b, c, d, e, f, g, k].forEach((value, i) => { H[i] = (H[i] + value) | 0; });
    }
    const out = new Uint8Array(32);
    const outView = new DataView(out.buffer);
    H.forEach((value, i) => outView.setUint32(i * 4, value >>> 0));
    return out;
  }
  const toHex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  async function digest(text) {
    const bytes = new TextEncoder().encode(text);
    return toHex(crypto.subtle ? new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)) : sha256(bytes));
  }
  async function setPassword(password) {
    if (password === null) {
      state.lock = null;
    } else {
      const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
      state.lock = { salt, hash: await digest(`${salt}:${password}`) };
    }
    save();
    emit('lock');
  }
  async function checkPassword(password) {
    return Boolean(state.lock) && (await digest(`${state.lock.salt}:${password}`)) === state.lock.hash;
  }

  function setWallpaper(id) {
    state.wallpaper = id;
    state.wallpaperPicked = true;
    save();
    emit('wallpaper');
  }

  // BOS 02: мышка, громкость и яркость.
  function setCursor(id) {
    state.cursor = id;
    save();
    emit('cursor');
  }
  function setVolume(value) {
    state.volume = Math.max(0, Math.min(1, value));
    save();
    emit('volume');
  }
  function applyBrightness() {
    const screen = document.getElementById('screen');
    if (screen) screen.style.filter = state.brightness < 1 ? `brightness(${state.brightness})` : '';
  }
  function setBrightness(value) {
    state.brightness = Math.max(0.3, Math.min(1, value));
    applyBrightness();
    save();
    emit('brightness');
  }

  // Языки клавиатуры BOS MOBILE. Пока их не выбрали, это английский и язык системы.
  function kbLangs() {
    const known = BOS.KB_LAYOUTS || {};
    const list = (state.kbLangs || ['en', state.lang]).filter((code, i, all) => known[code] && all.indexOf(code) === i);
    return list.length ? list : ['en'];
  }
  function setKbLangs(list) {
    state.kbLangs = list;
    save();
    emit('kbLangs');
  }

  let guestPhoto = null;
  function getPhoto() {
    if (guestSession) return guestPhoto;
    try { return localStorage.getItem(PHOTO_KEY); } catch { return null; }
  }
  function savePhoto(url) {
    if (guestSession) { guestPhoto = url; return true; }
    try { localStorage.setItem(PHOTO_KEY, url); return true; } catch { return false; }
  }

  // Авиарежим отключает сеть внутри BOS. Wi-Fi компьютера браузер выключить не может.
  function setAirplane(on) {
    state.airplane = on;
    save();
    emit('airplane');
  }
  function netStatus() {
    if (state.airplane) return 'net.airplane';
    return navigator.onLine ? 'net.on' : 'net.off';
  }
  window.addEventListener('online', () => emit('net'));
  window.addEventListener('offline', () => emit('net'));

  // Только шрифты самого устройства: BOS не скачивает ничего из сети.
  const FONTS = ['system', 'soft', 'serif', 'mono', 'type'];
  function setFont(font) {
    state.font = font;
    document.documentElement.dataset.font = font;
    save();
  }

  function setLang(lang) {
    state.lang = lang;
    document.documentElement.lang = lang;
    BOS.applyI18n(document);
    save();
    emit('lang');
  }

  function setRegion(region) {
    state.region = region;
    save();
    emit('region');
  }

  // Реестр B ID, известных этому устройству. Сброс системы его не трогает.
  const knownIds = () => read(IDS_KEY) || {};
  function rememberId(id, name) {
    if (guestSession) return;
    const ids = knownIds();
    ids[id] = { name };
    write(IDS_KEY, ids);
  }
  const normalizeId = (value) => value.trim().toLowerCase().replace(/@bid$/, '');
  const isValidId = (id) => ID_RULE.test(id);

  function deleteDatabasesThenReload(names) {
    let reloaded = false;
    let left = names.length;
    const reload = () => {
      if (reloaded) return;
      reloaded = true;
      location.reload();
    };
    const oneDone = () => { if (--left === 0) reload(); };
    names.forEach((name) => {
      try {
        const request = indexedDB.deleteDatabase(name);
        request.onsuccess = oneDone;
        request.onerror = oneDone;
      } catch {
        oneDone();
      }
    });
    setTimeout(reload, 1500);
  }

  function factoryReset() {
    // Из гостевого сеанса стереть данные владельца нельзя: сброс просто завершает сеанс.
    if (guestSession) { endGuest(); return; }
    emit('reset');
    try {
      localStorage.removeItem(STATE_KEY);
      localStorage.removeItem(PHOTO_KEY);
    } catch {}
    deleteDatabasesThenReload(['bos-files', 'bos-data']);
  }

  function startGuest() {
    try { sessionStorage.setItem(GUEST_KEY, '1'); } catch {}
    deleteDatabasesThenReload(['bos-guest-files', 'bos-guest-data']);
  }
  function endGuest() {
    emit('reset');
    try { sessionStorage.removeItem(GUEST_KEY); } catch {}
    deleteDatabasesThenReload(['bos-guest-files', 'bos-guest-data']);
  }

  function uses12h(region) {
    try {
      const locale = new Intl.Locale('und', { region }).maximize().toString();
      return new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hour12 === true;
    } catch {
      return false;
    }
  }

  // Часовой пояс и формат часов выбираются в Настройках → Основные → Дата и время.
  function fmt(date, options, region = state.region) {
    const locale = region ? `${state.lang}-${region}` : state.lang;
    try {
      return new Intl.DateTimeFormat(locale, state.timeZone ? { ...options, timeZone: state.timeZone } : options).format(date);
    } catch {
      return new Intl.DateTimeFormat(locale, options).format(date);
    }
  }
  const hour12 = (region) => (state.clock === 'auto' ? uses12h(region) : state.clock === '12');
  const fmtTime = (date, region = state.region) =>
    fmt(date, { hour: '2-digit', minute: '2-digit', hour12: hour12(region) }, region);
  function setClock(clock) {
    state.clock = clock;
    save();
    emit('clock');
  }
  function setTimeZone(zone) {
    state.timeZone = zone;
    save();
    emit('clock');
  }
  const fmtDate = (date, region = state.region) =>
    fmt(date, { day: 'numeric', month: 'short', year: 'numeric' }, region);
  const fmtLong = (date, region = state.region) =>
    fmt(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }, region) + ', ' + fmtTime(date, region);

  const REGION_CODES = 'AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI KH CM CA CV CF TD CL CN CO KM CG CD CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HK HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG MK NO OM PK PW PS PA PG PY PE PH PL PT PR QA RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA SS ES LK SD SR SE CH SY TW TJ TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VA VE VN YE ZM ZW'.split(' ');

  function regions(lang = state.lang) {
    const local = new Intl.DisplayNames([lang], { type: 'region' });
    const english = new Intl.DisplayNames(['en'], { type: 'region' });
    return REGION_CODES
      .map((code) => ({ code, name: local.of(code), english: english.of(code) }))
      .sort((a, b) => a.name.localeCompare(b.name, lang));
  }
  const regionName = (code, lang = state.lang) => new Intl.DisplayNames([lang], { type: 'region' }).of(code);

  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(props || {})) {
      if (value === null || value === undefined) continue;
      if (key === 'class') el.className = value;
      else if (key === 'i18n') el.dataset.i18n = value;
      else if (key === 'i18nVars') el.i18nVars = value;
      else if (key === 'i18nTitle') el.dataset.i18nTitle = value;
      else if (key === 'i18nPh') el.dataset.i18nPh = value;
      else if (key === 'html') el.innerHTML = value;
      else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
      else if (key in el && !key.includes('-')) el[key] = value;
      else if (value !== false) el.setAttribute(key, value);
    }
    el.append(...children.flat().filter((c) => c !== null && c !== undefined && c !== false));
    if (props && (props.i18n || props.i18nTitle || props.i18nPh)) BOS.applyI18nTo(el);
    return el;
  }

  const ICONS = {
    settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    notes: '<path d="M6 3h9l4 4v14H6z"/><path d="M9.5 11h6M9.5 14.5h6M9.5 18h3.5"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16.5h.01M12 16.5h.01M15.5 16.5h.01"/>',
    terminal: '<rect x="3" y="4.5" width="18" height="15" rx="2"/><path d="m7 9.5 3 2.5-3 2.5M12.5 15H17"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3 7 7M17 17l1.7 1.7M5.3 18.7 7 17M17 7l1.7-1.7"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
    power: '<path d="M12 3v9M6.6 6.6a8 8 0 1 0 10.8 0"/>',
    restart: '<path d="M4 12a8 8 0 1 0 2.6-5.9L4 8.5"/><path d="M4 3.5v5h5"/>',
    minimize: '<path d="m6.5 9.5 5.5 5.5 5.5-5.5"/>',
    maximize: '<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    left: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    right: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    games: '<rect x="2.5" y="7" width="19" height="11" rx="5"/><path d="M7.5 11v3M6 12.5h3M15 11.5h.01M17.5 14h.01"/>',
    plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    slides: '<rect x="3.5" y="4.5" width="17" height="12" rx="1.5"/><path d="M12 16.5V20M8.5 20h7M7.5 9h6M7.5 12h9"/>',
    image: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17 5-5 4 4 2.5-2.5L20 17"/>',
    film: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M3.5 9h17M3.5 15h17M8 5v4M16 5v4M8 15v4M16 15v4"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    folder: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2.5h6.5A2.5 2.5 0 0 1 21 10v7.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/>',
    file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
    grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
    download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5L18 7M9 7V4.5h6V7"/>',
    edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    music: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
    pause: '<rect x="7" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="13.5" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none"/>',
    next: '<path d="M6 6l9 6-9 6z" fill="currentColor"/><path d="M18 6v12"/>',
    prev: '<path d="M18 6l-9 6 9 6z" fill="currentColor"/><path d="M6 6v12"/>',
    shuffle: '<path d="M4 7h3.5c4 0 5 10 9 10H20M4 17h3.5c1.6 0 2.7-1.6 3.6-3.4M14 9.4C14.9 8 15.9 7 17.5 7H20M17.5 4.5 20 7l-2.5 2.5M17.5 14.5 20 17l-2.5 2.5"/>',
    repeat: '<path d="M17 4.5 19.5 7 17 9.5M4.5 12V10a3 3 0 0 1 3-3h12M7 19.5 4.5 17 7 14.5M19.5 12v2a3 3 0 0 1-3 3h-12"/>',
    volume: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>',
    spark: '<path d="M12 3.5c.6 4.4 2.6 6.4 7 7-4.4.6-6.4 2.6-7 7-.6-4.4-2.6-6.4-7-7 4.4-.6 6.4-2.6 7-7z"/><path d="M19 3v3M17.5 4.5h3"/>',
    arrange: '<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>',
    update: '<path d="M20 12a8 8 0 1 1-2.6-5.9L20 8.5"/><path d="M20 3.5v5h-5M12 8v4.5l3 2"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>',
    backspace: '<path d="M9 5h10.5A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5H9l-6-7z"/><path d="m11.5 9.5 5 5M16.5 9.5l-5 5"/>',
    enter: '<path d="M19 5v6.5a2.5 2.5 0 0 1-2.5 2.5H5M9.5 9.5 5 14l4.5 4.5"/>',
    camera: '<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.6-2.2h5.2L16.2 7h2.3A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="12.8" r="3.6"/>',
    flip: '<path d="M4 10a8 8 0 0 1 14.3-3.4M20 14a8 8 0 0 1-14.3 3.4"/><path d="M18.5 3v4h-4M5.5 21v-4h4"/>',
    wall: '<rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="m3.5 16 5-4.5 4 3.5 3-2.5 5 4"/>',
    logout: '<path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15M10 16l-4-4 4-4M6 12h10"/>',
  };
  function icon(name) {
    return h('span', {
      class: 'ic',
      'aria-hidden': 'true',
      html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`,
    });
  }

  function mark(className = 'mark') {
    return h('span', {
      class: className,
      'aria-hidden': 'true',
      html: '<svg viewBox="0 0 32 32"><rect class="mark-a" x="5" y="2" width="5" height="28" rx="2.5"/><circle class="mark-ring" cx="17" cy="20" r="8"/><circle class="mark-b" cx="17" cy="20" r="3"/></svg>',
    });
  }

  // Порядок приложений на экране «Приложения» и в Браузере.
  const APP_ORDER = ['settings', 'files', 'browser', 'store', 'assistant', 'music', 'notes', 'calc', 'terminal', 'games'];

  // Приложения из B Store появляются в системе только после установки.
  // Встроенные можно удалить и вернуть через B Store, кроме Настроек и трёх, без которых их не вернуть.
  const STORE_APPS = ['slides', 'montage'];
  // Камера и Фото есть только в BOS MOBILE.
  const MOBILE_APPS = ['camera', 'photos'];
  const CORE_APPS = ['settings', 'browser', 'files', 'store'];
  const canRemove = (id) => !CORE_APPS.includes(id);
  // Настройки раньше можно было удалить: если так и сделали, они возвращаются.
  state.removed = state.removed.filter(canRemove);
  const isInstalled = (id) => (STORE_APPS.includes(id) ? state.installed.includes(id) : !state.removed.includes(id));
  function availableApps() {
    const list = [...APP_ORDER, ...(BOS.mobile ? MOBILE_APPS : []), ...STORE_APPS].filter(isInstalled);
    const rank = new Map(list.map((id, i) => {
      const placed = state.order.indexOf(id);
      return [id, placed < 0 ? 1000 + i : placed];
    }));
    return list.sort((a, b) => rank.get(a) - rank.get(b));
  }
  const isAvailable = (id) => Boolean(BOS.apps[id]) && availableApps().includes(id);
  function install(id) {
    if (STORE_APPS.includes(id)) {
      if (!state.installed.includes(id)) state.installed.push(id);
    } else {
      state.removed = state.removed.filter((other) => other !== id);
    }
    setPinned(id, true);
    emit('apps');
  }
  // Удаление убирает приложение из системы, а его документы остаются на устройстве.
  function uninstall(id) {
    if (!canRemove(id)) return;
    if (BOS.wm && BOS.wm.isOpen(id)) BOS.wm.close(id);
    if (STORE_APPS.includes(id)) state.installed = state.installed.filter((other) => other !== id);
    else if (!state.removed.includes(id)) state.removed.push(id);
    setPinned(id, false);
    emit('apps');
  }
  // Порядок значков на экране «Приложения» и на главном экране.
  function setOrder(ids) {
    state.order = ids;
    save();
    emit('apps');
  }
  function setHomeOrder(ids) {
    state.home = ids;
    save();
    emit('home');
  }
  // Места значков на рабочем столе: доли ширины и высоты, чтобы они не съезжали при смене размера окна.
  function setDeskPos(key, pos) {
    if (pos) state.deskPos[key] = pos;
    else delete state.deskPos[key];
    save();
  }
  function arrangeDesk() {
    state.deskPos = {};
    save();
    emit('home');
  }

  // Сам цветной логотип рисует js/art.js (BOS.appTile).
  function appIcon(id, onclick) {
    return h('button', { type: 'button', class: 'app-icon', 'data-app': id, onclick },
      BOS.appTile(id),
      h('span', { class: 'app-label', i18n: BOS.apps[id].title }));
  }

  // Поиск на экране «Приложения»: прячет значки с неподходящим названием, Enter открывает первый найденный.
  function appSearch(grid) {
    const empty = h('p', { class: 'launcher-empty', hidden: true, i18n: 'search.none' });
    const input = h('input', { type: 'search', i18nPh: 'search.apps', autocomplete: 'off', spellcheck: false });
    input.setAttribute('aria-label', BOS.t('search.apps'));
    function filter() {
      const query = input.value.trim().toLowerCase();
      let first = null;
      [...grid.children].forEach((button) => {
        const match = !query || button.dataset.app.includes(query) || button.textContent.toLowerCase().includes(query);
        button.hidden = !match;
        if (match && !first) first = button;
      });
      empty.hidden = Boolean(first);
      return first;
    }
    input.addEventListener('input', filter);
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const first = filter();
      if (first) first.click();
    });
    return {
      field: h('label', { class: 'launcher-search' }, icon('search'), input),
      empty,
      input,
      reset() {
        input.value = '';
        filter();
      },
    };
  }

  function show(node) {
    const screen = document.getElementById('screen');
    screen.replaceChildren(node);
  }

  function powerOff() {
    show(h('button', { type: 'button', class: 'off', onclick: () => location.reload() },
      mark('mark big'),
      h('span', { i18n: 'power.on' })));
  }

  return {
    state, save, on, emit,
    setTheme, setLang, setRegion, setFont, FONTS,
    setTextColor, applyTextColor, TEXT_COLORS,
    setWallpaper, getPhoto, savePhoto,
    setAirplane, netStatus,
    setCursor, setVolume, setBrightness, applyBrightness, MOBILE_APPS, kbLangs, setKbLangs,
    setTextSize, applyTextSize, TEXT_SIZES, setPinned,
    setPassword, checkPassword, sha256,
    APP_ORDER, appIcon, appSearch, powerOff,
    STORE_APPS, availableApps, isAvailable, isInstalled, canRemove, install, uninstall, setOrder, setHomeOrder, setDeskPos, arrangeDesk,
    VERSION: '02',
    guestSession, startGuest, endGuest, displayName, accountLabel,
    knownIds, rememberId, normalizeId, isValidId, ID_SUFFIX,
    factoryReset,
    fmt, fmtTime, fmtDate, fmtLong, regions, regionName, setClock, setTimeZone,
    h, icon, mark, show,
    apps: {},
  };
})();
