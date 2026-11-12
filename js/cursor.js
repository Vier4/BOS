// Курсор BOS: стрелка с белой обводкой и переливающейся разноцветной заливкой.
// В тексте он становится тонкой чертой, на краях окна — полоской для изменения размера.
(function () {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const STATES = [
    ['.win-rs.se', 'resize-xy'],
    ['.win-rs.e', 'resize-x'],
    ['.win-rs.s', 'resize-y'],
    ['textarea, .term, input:not([type="radio"]):not([type="checkbox"]):not([type="color"]):not([type="range"])', 'text'],
  ];

  const cursor = BOS.h('div', { class: 'cursor', hidden: true, 'aria-hidden': 'true' },
    BOS.h('div', { class: 'cursor-arrow' }, BOS.h('i', { class: 'cursor-outline' }), BOS.h('i', { class: 'cursor-fill' })),
    BOS.h('div', { class: 'cursor-beam' }));
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
