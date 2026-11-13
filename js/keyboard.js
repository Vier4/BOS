// Клавиатура BOS 02 для BOS MOBILE: синяя, буквы QWERTY, красный «!» — заглавные,
// внизу «#&1», микрофон, пробел «QWERTY», глобус (смена раскладки) и Ввод.
BOS.createKeyboard = function (root) {
  const { h, icon, state } = BOS;
  const LAYOUTS = {
    en: { name: 'QWERTY', rows: ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'] },
    ru: { name: 'ЙЦУКЕН', rows: ['йцукенгшщзх', 'фывапролджэ', 'ячсмитьбю'] },
    sym: { name: 'QWERTY', rows: ['1234567890', '-/:;()₽&@"', '.,?!\'#%*+='] },
  };
  const TEXT_TYPES = ['text', 'search', 'email', 'url', 'tel', 'password', 'number'];
  let layout = 'en';
  let letters = 'en';
  let shift = false;
  let field = null;

  const isTextField = (el) => Boolean(el) && !el.disabled && !el.readOnly && (
    el.isContentEditable
    || el.tagName === 'TEXTAREA'
    || (el.tagName === 'INPUT' && TEXT_TYPES.includes(el.type)));

  const rowsEl = h('div', { class: 'kb-rows' });
  const space = h('button', { type: 'button', class: 'kb-space', 'data-act': 'space' });
  const mic = h('button', { type: 'button', class: 'kb-fn kb-mic', 'data-act': 'mic', i18nTitle: 'kb.voice' }, icon('mic'));
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Speech) mic.disabled = true;
  const el = h('div', { class: 'kb', hidden: true, 'aria-hidden': 'true' },
    rowsEl,
    h('div', { class: 'kb-bottom' },
      h('button', { type: 'button', class: 'kb-fn kb-sym', 'data-act': 'sym' }, '#&1'),
      mic,
      space,
      h('button', { type: 'button', class: 'kb-fn kb-globe', 'data-act': 'globe', i18nTitle: 'kb.layout' }, icon('globe')),
      h('button', { type: 'button', class: 'kb-enter', 'data-act': 'enter', i18nTitle: 'kb.enter' }, icon('enter'))));

  function render() {
    const { rows } = LAYOUTS[layout];
    const keys = (row) => [...row].map((ch) => {
      const text = shift ? ch.toUpperCase() : ch;
      return h('button', { type: 'button', class: 'kb-key', 'data-key': text }, text);
    });
    rowsEl.replaceChildren(
      h('div', { class: 'kb-row' }, keys(rows[0])),
      h('div', { class: 'kb-row' }, keys(rows[1])),
      h('div', { class: 'kb-row' },
        h('button', { type: 'button', class: `kb-shift${shift ? ' on' : ''}`, 'data-act': 'shift', i18nTitle: 'kb.shift', hidden: layout === 'sym' }, '!'),
        keys(rows[2]),
        h('button', { type: 'button', class: 'kb-back', 'data-act': 'back', i18nTitle: 'kb.back' }, icon('backspace'))));
    space.textContent = LAYOUTS[letters].name;
    el.querySelector('.kb-sym').textContent = layout === 'sym' ? 'ABC' : '#&1';
  }

  // Ввод в поле: обычные поля через setRangeText, редактируемые блоки через insertText.
  function insert(text) {
    if (!field) return;
    if (field.isContentEditable) { document.execCommand('insertText', false, text); return; }
    if (field.maxLength > 0 && field.value.length >= field.maxLength && field.selectionStart === field.selectionEnd) return;
    try {
      field.setRangeText(text, field.selectionStart, field.selectionEnd, 'end');
    } catch {
      field.value += text;
    }
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function backspace() {
    if (!field) return;
    if (field.isContentEditable) { document.execCommand('delete'); return; }
    try {
      const start = field.selectionStart;
      const end = field.selectionEnd;
      if (start !== end) field.setRangeText('', start, end, 'end');
      else if (start > 0) field.setRangeText('', start - 1, start, 'end');
      else return;
    } catch {
      field.value = field.value.slice(0, -1);
    }
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function enter() {
    if (!field) return;
    if (field.tagName === 'TEXTAREA') { insert('\n'); return; }
    if (field.isContentEditable) { document.execCommand('insertParagraph'); return; }
    const options = { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true };
    const go = field.dispatchEvent(new KeyboardEvent('keydown', options));
    field.dispatchEvent(new KeyboardEvent('keyup', options));
    if (go && field.form) field.form.requestSubmit();
  }
  function listen() {
    const recognition = new Speech();
    recognition.lang = letters === 'ru' ? 'ru-RU' : (BOS.LANGS.find((l) => l.code === state.lang) ? `${state.lang}-${BOS.LANGS.find((l) => l.code === state.lang).region}` : 'en-US');
    recognition.onresult = (e) => insert(e.results[0][0].transcript);
    recognition.onend = () => mic.classList.remove('on');
    mic.classList.add('on');
    try { recognition.start(); } catch { mic.classList.remove('on'); }
  }

  // Нажатия не забирают фокус у поля ввода.
  el.addEventListener('pointerdown', (e) => e.preventDefault());
  el.addEventListener('mousedown', (e) => e.preventDefault());
  el.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (!button || button.disabled) return;
    if (button.dataset.key) {
      insert(button.dataset.key);
      if (shift) { shift = false; render(); }
      return;
    }
    const act = button.dataset.act;
    if (act === 'space') insert(' ');
    else if (act === 'back') backspace();
    else if (act === 'enter') enter();
    else if (act === 'mic') listen();
    else if (act === 'shift') { shift = !shift; render(); }
    else if (act === 'sym') { layout = layout === 'sym' ? letters : 'sym'; shift = false; render(); }
    else if (act === 'globe') { letters = letters === 'en' ? 'ru' : 'en'; layout = letters; shift = false; render(); }
  });

  function show(target) {
    field = target;
    el.hidden = false;
    root.classList.add('kb-open');
    requestAnimationFrame(() => {
      if (field && field.scrollIntoView) field.scrollIntoView({ block: 'nearest' });
    });
  }
  function hide() {
    field = null;
    el.hidden = true;
    root.classList.remove('kb-open');
  }

  // Своя клавиатура вместо системной: полю ставится inputmode="none" ещё до того, как оно получит фокус.
  const quiet = (target) => { if (isTextField(target) && !target.isContentEditable) target.setAttribute('inputmode', 'none'); };
  root.addEventListener('pointerdown', (e) => { if (!el.contains(e.target)) quiet(e.target); }, true);
  root.addEventListener('focusin', (e) => {
    if (!isTextField(e.target)) return;
    quiet(e.target);
    show(e.target);
  });
  root.addEventListener('focusout', () => {
    setTimeout(() => {
      const active = document.activeElement;
      if (isTextField(active) && root.contains(active)) show(active);
      else hide();
    }, 0);
  });
  BOS.on('lang', render);

  render();
  return { el, hide };
};
