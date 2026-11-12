// Точка входа: экран загрузки, затем настройка или оболочка (компьютер или BOS MOBILE).
(function () {
  const { h, mark, state } = BOS;

  // mobile.html всегда запускает BOS MOBILE, а index.html — только на телефоне.
  const phone = window.matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 600;
  BOS.mobile = document.documentElement.dataset.mode === 'mobile' || phone;
  if (BOS.mobile) document.documentElement.classList.add('phone-mode');

  if (!state.setupDone) {
    state.theme = 'light';
    state.font = 'system';
  }
  document.documentElement.dataset.theme = state.theme;
  document.documentElement.dataset.font = state.font;
  document.documentElement.lang = state.lang;
  BOS.applyTextColor();
  BOS.applyTextSize();

  BOS.show(h('div', { class: 'boot' },
    mark('mark big'),
    h('b', {}, BOS.mobile ? 'BOS MOBILE' : 'BOS'),
    h('div', { class: 'boot-line' }, h('i'))));

  function start() {
    if (BOS.mobile) BOS.runMobile();
    else BOS.runDesktop();
    BOS.lockScreen();
  }

  setTimeout(() => {
    if (state.setupDone) start();
    else BOS.runSetup(start);
  }, 1500);
})();
