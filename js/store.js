// B Store: магазин приложений BOS. Приложения уже лежат внутри системы,
// поэтому «установка» включает их на этом устройстве, а не скачивает из интернета.
// Здесь же возвращаются удалённые встроенные приложения.
(function () {
  const { h, icon } = BOS;

  BOS.apps.store = {
    title: 'app.store', icon: 'grid', width: 820, height: 600, minWidth: 360, minHeight: 400,
    mount(body, win) {
      const timers = new Set();
      win.disposers.push(() => timers.forEach((timer) => clearInterval(timer)));

      // Кнопки для одного приложения: «Установить» с полоской или «Открыть» и «Удалить».
      function actionsFor(id) {
        const actions = h('div', { class: 'bstore-actions' });
        function paint() {
          if (BOS.isInstalled(id)) {
            actions.replaceChildren(
              h('button', { type: 'button', class: 'btn primary', i18n: 'store.open', onclick: () => BOS.wm.open(id) }),
              BOS.canRemove(id) && h('button', { type: 'button', class: 'btn ghost', i18n: 'store.remove', onclick: () => BOS.uninstall(id) }));
          } else {
            actions.replaceChildren(h('button', { type: 'button', class: 'btn primary', i18n: 'store.install', onclick: install }));
          }
        }
        function install() {
          const bar = h('i');
          actions.replaceChildren(h('span', { class: 'bstore-bar' }, bar), h('span', { class: 'bstore-state', i18n: 'store.installing' }));
          let progress = 0;
          const timer = setInterval(() => {
            progress = Math.min(100, progress + 8 + Math.random() * 14);
            bar.style.width = `${progress}%`;
            if (progress < 100) return;
            clearInterval(timer);
            timers.delete(timer);
            BOS.install(id);
          }, 120);
          timers.add(timer);
        }
        win.listen('apps', paint);
        paint();
        return actions;
      }

      const cards = BOS.STORE_APPS.map((id) => h('article', { class: 'bstore-card' },
        h('div', { class: 'bstore-head' },
          BOS.appTile(id),
          h('div', {}, h('b', { i18n: BOS.apps[id].title }), h('small', { i18n: 'store.free' }))),
        h('p', { i18n: `store.desc.${id}` }),
        actionsFor(id)));

      const builtIn = [...BOS.APP_ORDER, ...(BOS.mobile ? BOS.MOBILE_APPS : [])].filter(BOS.canRemove).map((id) => h('div', { class: 'bstore-row' },
        BOS.appTile(id),
        h('b', { i18n: BOS.apps[id].title }),
        actionsFor(id)));

      body.append(h('div', { class: 'bstore' },
        h('div', { class: 'bstore-hero' },
          BOS.appTile('store'),
          h('div', {}, h('h2', { i18n: 'app.store' }), h('p', { i18n: 'store.sub' }))),
        h('h3', { i18n: 'store.new' }),
        h('div', { class: 'bstore-grid' }, cards),
        h('h3', { i18n: 'store.builtIn' }),
        h('div', {}, builtIn)));
    },
  };
})();
