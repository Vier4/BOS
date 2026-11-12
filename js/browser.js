// Браузер со вкладками. В программе BOS для компьютера (Electron) сайты открываются в настоящем webview,
// а в обычном браузере — во встроенной рамке; сайты, которые это запрещают, открываются отдельным окном.
(function () {
  const { h, icon, state, t } = BOS;
  const START = 'bos://apps';
  const NATIVE = Boolean(window.bosNative);
  const WEB_PARTITION = 'persist:bos-web';

  // Эти сайты отказываются показываться внутри чужих страниц (X-Frame-Options / CSP).
  const FRAME_BLOCKED = /(^|\.)(google\.[a-z.]+|youtube\.com|youtu\.be|yandex\.[a-z]+|ya\.ru|vk\.com|ok\.ru|mail\.ru|dzen\.ru|rutube\.ru|kinopoisk\.ru|avito\.ru|ozon\.ru|wildberries\.ru|instagram\.com|facebook\.com|x\.com|twitter\.com|tiktok\.com|github\.com|reddit\.com|amazon\.[a-z.]+|linkedin\.com|twitch\.tv|discord\.com|telegram\.org|whatsapp\.com|netflix\.com|microsoft\.com|live\.com|apple\.com|spotify\.com|chatgpt\.com|openai\.com|claude\.ai|pinterest\.com|stackoverflow\.com|duckduckgo\.com)$/i;

  const QUICK = [
    { name: 'Google', url: () => 'https://www.google.com', color: '#4285f4' },
    { name: 'YouTube', url: () => 'https://www.youtube.com', color: '#ff0033' },
    { name: 'Wikipedia', url: () => `https://${state.lang}.wikipedia.org`, color: '#54595d' },
    { name: 'GitHub', url: () => 'https://github.com', color: '#24292f' },
    { name: 'OpenStreetMap', url: () => 'https://www.openstreetmap.org', color: '#5f9c4a' },
    { name: 'DuckDuckGo', url: () => 'https://duckduckgo.com', color: '#de5833' },
  ];

  const hostOf = (url) => {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
  };

  function searchUrl(query) {
    const q = encodeURIComponent(query);
    return NATIVE ? `https://www.google.com/search?q=${q}` : `https://${state.lang}.wikipedia.org/w/index.php?search=${q}`;
  }

  function resolve(text) {
    const value = text.trim();
    if (!value || value === 'bos://' || value === START) return START;
    if (/^bos:\/\//i.test(value)) return value.toLowerCase();
    if (/^https?:\/\//i.test(value)) return value;
    if (/^[^\s/]+\.[^\s]{2,}$/.test(value)) return `https://${value}`;
    return searchUrl(value);
  }

  function openExternal(url) {
    if (NATIVE) window.bosNative.openExternal(url);
    else window.open(url, '_blank', 'noopener,noreferrer');
  }
  const openPopup = (url) => window.open(url, '_blank', 'noopener,noreferrer,popup,width=1100,height=760');

  // Ссылки «в новом окне» из сайтов приходят из Electron и открываются новой вкладкой.
  let openTabHandler = null;
  if (NATIVE) {
    window.bosNative.onOpenTab((url) => {
      if (openTabHandler) openTabHandler(url);
    });
  }

  BOS.apps.browser = {
    title: 'app.browser', icon: 'globe', width: 980, height: 660, minWidth: 360, minHeight: 380,
    mount(body, win) {
      const tabs = [];
      let active = null;

      const navButton = (iconName, key, run) => h('button', { type: 'button', class: 'round', i18nTitle: key, onclick: run }, icon(iconName));
      const back = navButton('left', 'common.back', () => active && goBack(active));
      const forward = navButton('right', 'browser.forward', () => active && goForward(active));
      const reload = navButton('restart', 'browser.reload', () => active && reloadTab(active));
      const external = navButton('external', 'browser.external', () => active && openExternal(active.url));
      const siteIcon = h('span', { class: 'browser-site' });
      const address = h('input', {
        class: 'browser-address',
        type: 'text',
        i18nPh: 'browser.ph',
        autocapitalize: 'none',
        autocomplete: 'off',
        spellcheck: false,
        onfocus: () => address.select(),
      });
      address.setAttribute('aria-label', t('browser.ph'));

      const newTabButton = h('button', { type: 'button', class: 'browser-newtab', i18nTitle: 'browser.newTab', onclick: () => select(createTab()) }, icon('plus'));
      const tabStrip = h('div', { class: 'browser-tabs', role: 'tablist' }, newTabButton);
      const pages = h('div', { class: 'browser-view' });

      body.append(h('div', { class: 'browser' },
        h('div', { class: 'browser-top' }, tabStrip),
        h('form', {
          class: 'browser-bar',
          onsubmit: (e) => {
            e.preventDefault();
            if (!active) return;
            visit(active, resolve(address.value));
            address.blur();
          },
        }, back, forward, reload, h('label', { class: 'browser-field' }, siteIcon, address), external),
        pages));

      function createTab(url = START) {
        const tab = {
          url: START, title: '', favicon: '', loading: false,
          history: [], position: -1, syncers: [], webview: null, ready: false,
          slot: h('div', { class: 'browser-slot' }),
          badge: h('span', { class: 'browser-tab-icon' }),
          label: h('span', { class: 'browser-tab-title' }),
        };
        tab.page = h('div', { class: 'browser-page', hidden: true }, tab.slot);
        tab.button = h('div', { class: 'browser-tab', role: 'tab' },
          h('button', { type: 'button', class: 'browser-tab-main', onclick: () => select(tab) }, tab.badge, tab.label),
          h('button', { type: 'button', class: 'browser-tab-close', i18nTitle: 'browser.closeTab', onclick: () => closeTab(tab) }, icon('close')));
        tabs.push(tab);
        tabStrip.insertBefore(tab.button, newTabButton);
        pages.append(tab.page);
        visit(tab, url);
        return tab;
      }

      function select(tab) {
        active = tab;
        tabs.forEach((other) => {
          other.page.hidden = other !== tab;
          other.button.classList.toggle('active', other === tab);
          other.button.setAttribute('aria-selected', String(other === tab));
        });
        tab.button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        syncBar();
        if (tab.url === START) {
          const search = tab.slot.querySelector('.start-search input');
          if (search) search.focus({ preventScroll: true });
        }
      }

      function closeTab(tab) {
        const index = tabs.indexOf(tab);
        tabs.splice(index, 1);
        tab.button.remove();
        tab.page.remove();
        if (!tabs.length) select(createTab());
        else if (active === tab) select(tabs[Math.min(index, tabs.length - 1)]);
      }

      function visit(tab, url) {
        const app = url.startsWith('bos://') && url.slice(6);
        if (app && app !== 'apps' && BOS.isAvailable(app)) {
          BOS.wm.open(app);
          return;
        }
        tab.history.splice(tab.position + 1);
        tab.history.push(url.startsWith('bos://') ? START : url);
        tab.position = tab.history.length - 1;
        show(tab, tab.history[tab.position]);
      }

      const webviewOn = (tab) => tab.webview && !tab.webview.hidden && tab.ready;

      function goBack(tab) {
        if (webviewOn(tab) && tab.webview.canGoBack()) tab.webview.goBack();
        else if (tab.position > 0) show(tab, tab.history[--tab.position]);
      }

      function goForward(tab) {
        if (webviewOn(tab) && tab.webview.canGoForward()) tab.webview.goForward();
        else if (tab.position < tab.history.length - 1) show(tab, tab.history[++tab.position]);
      }

      function reloadTab(tab) {
        if (webviewOn(tab)) {
          if (tab.loading) tab.webview.stop();
          else tab.webview.reload();
        } else {
          show(tab, tab.url);
        }
      }

      function show(tab, url) {
        tab.url = url;
        tab.title = '';
        tab.favicon = '';
        tab.syncers = [];
        const isSite = url !== START;
        const online = !state.airplane && navigator.onLine;
        if (tab.webview) tab.webview.hidden = !(NATIVE && isSite && online);
        tab.slot.hidden = false;

        if (!isSite) startPage(tab);
        else if (state.airplane) notice(tab, 'plane', 'browser.airplane', h('button', { type: 'button', class: 'btn primary', i18n: 'browser.airplaneOff', onclick: () => BOS.setAirplane(false) }));
        else if (!navigator.onLine) notice(tab, 'globe', 'browser.offline');
        else if (NATIVE) nativePage(tab, url);
        else if (FRAME_BLOCKED.test(hostOf(url))) popupPage(tab, url);
        else framePage(tab, url);

        paintTab(tab);
        if (tab === active) syncBar();
      }

      function notice(tab, iconName, key, extra) {
        tab.slot.replaceChildren(h('div', { class: 'browser-notice' }, icon(iconName), h('p', { i18n: key }), extra));
      }

      function framePage(tab, url) {
        tab.slot.replaceChildren(
          h('p', { class: 'browser-note' },
            h('span', { i18n: 'browser.frameNote' }),
            h('button', { type: 'button', class: 'lock-link', i18n: 'browser.external', onclick: () => openPopup(url) })),
          h('iframe', {
            class: 'browser-frame',
            src: url,
            title: hostOf(url),
            sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups',
            referrerPolicy: 'no-referrer',
          }));
      }

      function popupPage(tab, url) {
        tab.slot.replaceChildren(h('div', { class: 'browser-notice' },
          icon('external'),
          h('b', {}, hostOf(url)),
          h('p', { i18n: 'browser.popup' }),
          h('button', { type: 'button', class: 'btn primary', i18n: 'browser.popupAgain', onclick: () => openPopup(url) }),
          h('p', { class: 'start-note', i18n: 'browser.nativeHint' })));
        openPopup(url);
      }

      function nativePage(tab, url) {
        tab.slot.hidden = true;
        if (!tab.webview) {
          createWebview(tab, url);
          return;
        }
        tab.webview.hidden = false;
        if (tab.ready && tab.webview.getURL() !== url) tab.webview.loadURL(url);
      }

      function createWebview(tab, url) {
        const view = document.createElement('webview');
        view.className = 'browser-frame';
        view.setAttribute('partition', WEB_PARTITION);
        view.setAttribute('allowpopups', '');
        view.setAttribute('src', url);
        view.addEventListener('dom-ready', () => { tab.ready = true; syncIfActive(tab); });
        view.addEventListener('did-start-loading', () => { tab.loading = true; paintTab(tab); syncIfActive(tab); });
        view.addEventListener('did-stop-loading', () => { tab.loading = false; paintTab(tab); syncIfActive(tab); });
        const onNavigate = (e) => {
          if (e.isMainFrame === false) return;
          tab.url = e.url;
          syncIfActive(tab);
        };
        view.addEventListener('did-navigate', onNavigate);
        view.addEventListener('did-navigate-in-page', onNavigate);
        view.addEventListener('page-title-updated', (e) => { tab.title = e.title; paintTab(tab); });
        view.addEventListener('page-favicon-updated', (e) => { tab.favicon = e.favicons[0] || ''; paintTab(tab); });
        tab.webview = view;
        tab.page.append(view);
      }

      function startPage(tab) {
        const search = h('input', { type: 'search', i18nPh: 'browser.ph', autocomplete: 'off', spellcheck: false });
        search.setAttribute('aria-label', t('browser.ph'));
        const quick = QUICK.map((site) => h('button', { type: 'button', class: 'quick', onclick: () => visit(tab, site.url()) },
          h('span', { class: 'quick-tile', style: `--c:${site.color}` }, site.name[0]),
          h('span', { class: 'quick-name' }, site.name)));
        const apps = BOS.availableApps().map((id) => {
          const pin = h('button', { type: 'button', class: 'round pin', onclick: () => BOS.setPinned(id, !state.home.includes(id)) });
          const syncPin = () => {
            const pinned = state.home.includes(id);
            pin.replaceChildren(icon(pinned ? 'check' : 'plus'));
            pin.dataset.i18nTitle = pinned ? 'browser.unpin' : 'browser.pin';
            pin.classList.toggle('on', pinned);
            BOS.applyI18nTo(pin);
          };
          tab.syncers.push(syncPin);
          syncPin();
          return h('div', { class: 'store-card' },
            h('button', { type: 'button', class: 'store-open', onclick: () => BOS.wm.open(id) },
              BOS.appTile(id),
              h('span', { class: 'store-text' }, h('b', { i18n: BOS.apps[id].title }), h('small', {}, `bos://${id}`))),
            pin);
        });

        tab.slot.replaceChildren(h('div', { class: 'start' },
          h('div', { class: 'start-hero' },
            BOS.mark('mark start-mark'),
            h('h1', { i18n: 'app.browser' }),
            h('form', {
              class: 'start-search',
              onsubmit: (e) => {
                e.preventDefault();
                if (search.value.trim()) visit(tab, resolve(search.value));
              },
            }, icon('search'), search, h('button', { type: 'submit', class: 'round primary', i18nTitle: 'browser.open' }, icon('right')))),
          h('section', {}, h('h2', { i18n: 'browser.quick' }), h('div', { class: 'quick-grid' }, quick)),
          h('section', {},
            h('h2', { i18n: 'browser.home' }),
            h('p', { class: 'start-sub', i18n: 'browser.homeSub' }),
            h('div', { class: 'store-grid' }, apps)),
          !NATIVE && h('p', { class: 'start-note', i18n: 'browser.nativeHint' })));
      }

      function paintTab(tab) {
        if (tab.loading) {
          tab.badge.className = 'browser-tab-icon loading';
          tab.badge.replaceChildren();
        } else {
          tab.badge.className = 'browser-tab-icon';
          tab.badge.replaceChildren(tab.favicon
            ? h('img', { src: tab.favicon, alt: '', onerror: () => { tab.favicon = ''; paintTab(tab); } })
            : icon(tab.url === START ? 'grid' : 'globe'));
        }
        if (tab.url === START) {
          tab.label.dataset.i18n = 'browser.newTab';
          BOS.applyI18nTo(tab.label);
        } else {
          delete tab.label.dataset.i18n;
          tab.label.textContent = tab.title || hostOf(tab.url);
        }
        tab.button.title = tab.label.textContent;
      }

      function syncIfActive(tab) {
        if (tab === active) syncBar();
      }

      function syncBar() {
        const tab = active;
        const isSite = tab.url !== START;
        if (document.activeElement !== address) address.value = isSite ? tab.url : '';
        siteIcon.replaceChildren(icon(!isSite ? 'grid' : tab.url.startsWith('https:') ? 'lock' : 'globe'));
        const live = webviewOn(tab);
        back.disabled = !(tab.position > 0 || (live && tab.webview.canGoBack()));
        forward.disabled = !(tab.position < tab.history.length - 1 || (live && tab.webview.canGoForward()));
        reload.replaceChildren(icon(live && tab.loading ? 'close' : 'restart'));
        external.hidden = !isSite;
      }

      openTabHandler = (url) => select(createTab(url));
      win.disposers.push(() => { openTabHandler = null; });
      win.listen('home', () => tabs.forEach((tab) => tab.syncers.forEach((sync) => sync())));
      win.listen('airplane', () => tabs.forEach((tab) => show(tab, tab.url)));
      win.listen('net', () => tabs.forEach((tab) => show(tab, tab.url)));
      win.listen('lang', () => tabs.forEach(paintTab));
      select(createTab());
    },
  };
})();
