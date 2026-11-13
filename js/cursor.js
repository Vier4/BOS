// Курсор BOS 02: мышка-треугольник с градиентом. Вид выбирается в Настройках → Оформление.
// В тексте он становится тонкой чертой, на краях окна — полоской для изменения размера.
(function () {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const STATES = [
    ['.win-rs.se', 'resize-xy'],
    ['.win-rs.e', 'resize-x'],
    ['.win-rs.s', 'resize-y'],
    ['textarea, .term, input:not([type="radio"]):not([type="checkbox"]):not([type="color"]):not([type="range"])', 'text'],
  ];

  // BOS 01: стрелка с белой обводкой и переливающейся заливкой. BOS 02: мышки на выбор.
  const cursor = BOS.is02
    ? BOS.h('div', { class: 'cursor', hidden: true, 'aria-hidden': 'true' },
      BOS.h('div', { class: 'cursor-arrow' }),
      BOS.h('div', { class: 'cursor-beam' }))
    : BOS.h('div', { class: 'cursor v1', hidden: true, 'aria-hidden': 'true' },
      BOS.h('div', { class: 'cursor-arrow' }, BOS.h('i', { class: 'cursor-outline' }), BOS.h('i', { class: 'cursor-fill' })),
      BOS.h('div', { class: 'cursor-beam' }));
  const arrow = cursor.firstChild;
  function paint() {
    if (!BOS.is02) return;
    const id = BOS.CURSORS[BOS.state.cursor] ? BOS.state.cursor : 'aurora';
    arrow.innerHTML = BOS.cursorSvg(id);
    cursor.style.setProperty('--cur-a', BOS.CURSORS[id].a);
    cursor.style.setProperty('--cur-b', BOS.CURSORS[id].b);
    cursor.style.setProperty('--cur-s', String(BOS.CURSOR_SIZES[BOS.state.cursorSize] || 1));
  }
  BOS.on('cursor', paint);
  paint();
  document.body.append(cursor);
  document.documentElement.classList.add('bos-cursor');

  function stateFor(target) {
    if (!target.closest) return '';
    const match = STATES.find(([selector]) => target.closest(selector));
    return match ? match[1] : '';
  }

  window.addEventListener('pointermove', (e) => {
    // Над сайтом в Браузере курсор рисует сам сайт, поэтому стрелку прячем.
    if (e.pointerType !== 'mouse' || e.target.tagName === 'IFRAME' || e.target.tagName === 'WEBVIEW') { cursor.hidden = true; return; }
    cursor.hidden = false;
    cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    cursor.dataset.state = stateFor(e.target);
  }, true);

  window.addEventListener('pointerdown', () => { cursor.dataset.pressed = 'true'; }, true);
  window.addEventListener('pointerup', () => { delete cursor.dataset.pressed; }, true);
  document.documentElement.addEventListener('mouseleave', () => { cursor.hidden = true; });
})();
