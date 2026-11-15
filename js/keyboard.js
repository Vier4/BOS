// Клавиатура BOS 02 для BOS MOBILE: синяя, красный «!» — заглавные, внизу «#&1», эмодзи, микрофон,
// пробел с названием раскладки, глобус (следующий язык из Настроек → Основные → Клавиатура) и Ввод.
(function () {
  // Раскладки. Последний ряд — тот, где по краям «!» и «Стереть»; лишний ряд сверху — буквы с диакритикой.
  BOS.KB_LAYOUTS = {
    en: { label: 'QWERTY', rows: ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'] },
    ru: { label: 'ЙЦУКЕН', rows: ['йцукенгшщзхъ', 'фывапролджэ', 'ячсмитьбюё'] },
    uk: { label: 'Українська', rows: ['йцукенгшщзхї', 'фівапролджє', 'ячсмитьбюґ'] },
    de: { label: 'QWERTZ', rows: ['qwertzuiopü', 'asdfghjklöä', 'yxcvbnmß'] },
    es: { label: 'Español', rows: ['qwertyuiopé', 'asdfghjklñó', 'zxcvbnmáíú'] },
    fr: { label: 'AZERTY', rows: ['azertyuiopé', 'qsdfghjklmè', 'wxcvbnàçù'] },
    it: { label: 'Italiano', rows: ['qwertyuiopè', 'asdfghjklòà', 'zxcvbnmùì'] },
    pt: { label: 'Português', rows: ['qwertyuiopá', 'asdfghjklçã', 'zxcvbnméêõ'] },
    pl: { label: 'Polski', rows: ['ąćęłńóśźż', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'] },
    nl: { label: 'Nederlands', rows: ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'] },
    tr: { label: 'Türkçe', rows: ['qwertyuıopğü', 'asdfghjklşi', 'zxcvbnmöç'] },
    kk: { label: 'Қазақша', rows: ['әіңғүұқөһ', 'йцукенгшщзх', 'фывапролджэ', 'ячсмитьбю'] },
  };
  const SYMBOLS = ['1234567890', '-/:;()₽&@"', '.,?!\'#%*+='];

  const EMOJI = [
    ['😀', 'emo.smileys', '😀😃😄😁😆😅🤣😂🙂🙃😉😊😇🥰😍🤩😘😋😛😜🤪😝🤗🤭🤫🤔😐😑😶😏😒🙄😬😌😔😪😴😷🤒🤕🥵🥶😵🤯🤠🥳😎🤓🧐😕😟🙁😮😯😲😳🥺😦😧😨😰😥😢😭😱😖😣😞😓😩😫🥱😤😡😠🤬😈👿💀💩🤡👻👽🤖'],
    ['👍', 'emo.people', '👋🤚🖐✋🖖👌🤌🤏✌🤞🤟🤘🤙👈👉👆👇☝👍👎✊👊🤛🤜👏🙌👐🤲🙏✍💅💪🦵🦶👂👃🧠👀👁👅👄👶🧒👦👧🧑👱👨👩🧓👴👵🙋🙆🙅🤷🤦💃🕺👫👭👬💏👪'],
    ['🐶', 'emo.animals', '🐶🐱🐭🐹🐰🦊🐻🐼🐨🐯🦁🐮🐷🐸🐵🙈🙉🙊🐔🐧🐦🐤🦆🦅🦉🦇🐺🐗🐴🦄🐝🐛🦋🐌🐞🐜🐢🐍🦎🐙🦑🦀🐡🐠🐟🐬🐳🐋🦈🐊🐅🐆🦓🦍🐘🦒🦘🐪🐄🐎🐖🐑🐐🦌🐕🐈🐓🦃🕊🐇🌵🎄🌲🌳🌴🌱🌿🍀🍁🍂🍃🌷🌹🌺🌸🌼🌻🌞🌝🌛⭐🌟✨⚡🔥🌈☀⛅☁🌧⛄❄💧🌊'],
    ['🍎', 'emo.food', '🍏🍎🍐🍊🍋🍌🍉🍇🍓🫐🍈🍒🍑🥭🍍🥥🥝🍅🍆🥑🥦🥬🥒🌶🌽🥕🧄🧅🥔🍠🥐🥯🍞🥖🧀🥚🍳🧈🥞🧇🥓🥩🍗🍖🌭🍔🍟🍕🥪🌮🌯🥗🍝🍜🍲🍛🍣🍱🥟🍤🍙🍚🍘🍥🍦🍧🍨🍩🍪🎂🍰🧁🍫🍬🍭🍮🍯🥛☕🍵🧃🥤🧋🍹🍾'],
    ['⚽', 'emo.activity', '⚽🏀🏈⚾🥎🎾🏐🏉🥏🎱🏓🏸🏒🥍🏏🥅⛳🏹🎣🥊🥋🛹⛸🎿🏂🏋🤸⛹🤺🏇🧘🏄🏊🚴🏆🥇🥈🥉🏅🎖🎗🎫🎪🎭🎨🎬🎤🎧🎼🎹🥁🎷🎺🎸🎻🎲♟🎯🎳🎮🕹🧩'],
    ['🚗', 'emo.travel', '🚗🚕🚙🚌🚎🏎🚓🚑🚒🚐🛻🚚🚛🚜🛵🏍🚲🛴🚨🚔🚍🚘🚖🚡🚠🚟🚃🚋🚞🚝🚄🚅🚈🚂🚆🚇🚊✈🛫🛬🛩🚀🛸🚁⛵🚤🛥🛳⛴🚢⚓🗺🗿🗽🗼🏰🏯🏟🎡🎢🎠⛲🏖🏝🏜🌋⛰🏔🗻🏕🏠🏡🏘🏢🏬🏣🏥🏦🏨🏪🏫⛪🕌'],
    ['💡', 'emo.objects', '⌚📱💻⌨🖥🖨🖱💾💿📀📷📸📹🎥📞☎📺📻🎙⏰⏳📡🔋🔌💡🔦🕯🧯💸💵💴💶💷💰💳💎⚖🧰🔧🔨⚒🛠⛏🔩⚙🧱⛓🧲🔫💣🧨🔪🗡⚔🛡🔮📿🧿💈🔭🔬💊💉🧬🦠🧪🌡🧹🧺🧻🚽🛁🧼🪥🧽🔑🗝🚪🛋🛏🧸🖼🛍🛒🎁🎈🎏🎀🎊🎉✉📩📦📝📚📖🔖📎✂🖊🖌🖍📌📍'],
    ['❤', 'emo.symbols', '❤🧡💛💚💙💜🖤🤍🤎💔❣💕💞💓💗💖💘💝💟☮✝☪🕉☸✡🔯☯☦🛐⛎♈♉♊♋♌♍♎♏♐♑♒♓🆔⚛🉑☢☣📴📳✴🆚💮🉐㊙㊗🈴🈵🈹🈲🅰🅱🆎🆑🅾🆘❌⭕🛑⛔📛🚫💯💢♨🚷🚯🚳🚱🔞📵🚭❗❕❓❔‼⁉🔅🔆〽⚠🚸🔱⚜🔰♻✅🈯💹❇✳❎🌐💠Ⓜ🌀💤🏧🚾♿🅿🈳🈂🛂🛃🛄🛅'],
  ];
  // New Year Edition: первая вкладка эмодзи — новогодняя.
  if (BOS.isNY) EMOJI.unshift(['🎄', 'emo.newyear', '🎄🎅🤶🧑‍🎄⛄☃️❄️🌨️🎁🎀🎉🎊🎆🎇✨⭐🌟🔔🕯️🧦🍪🥛🍊🍬🍭🥂🍾🦌🐧🐻‍❄️🏔️🛷⛸️🎿🧣🧤🎶🎵💫🌙🏠🔥☕🎂🥳❤️💚💛']);
  const segment = (text) => (window.Intl && Intl.Segmenter
    ? [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(text)].map((part) => part.segment)
    : [...text]);

  BOS.createKeyboard = function (root) {
    const { h, icon, state } = BOS;
    const TEXT_TYPES = ['text', 'search', 'email', 'url', 'tel', 'password', 'number'];
    let langAt = 0;
    let mode = 'letters'; // letters | sym | emoji
    let emojiTab = 0;
    let shift = false;
    let field = null;

    const currentLang = () => {
      const langs = BOS.kbLangs();
      if (langAt >= langs.length) langAt = 0;
      return langs[langAt];
    };

    const isTextField = (el) => Boolean(el) && !el.disabled && !el.readOnly && (
      el.isContentEditable
      || el.tagName === 'TEXTAREA'
      || (el.tagName === 'INPUT' && TEXT_TYPES.includes(el.type)));

    const rowsEl = h('div', { class: 'kb-rows' });
    const space = h('button', { type: 'button', class: 'kb-space', 'data-act': 'space' });
    const symButton = h('button', { type: 'button', class: 'kb-fn kb-sym', 'data-act': 'sym' });
    const emojiButton = h('button', { type: 'button', class: 'kb-fn kb-emoji', 'data-act': 'emoji', i18nTitle: 'kb.emoji' }, '😊');
    const globe = h('button', { type: 'button', class: 'kb-fn kb-globe', 'data-act': 'globe', i18nTitle: 'kb.layout' }, icon('globe'));
    const mic = h('button', { type: 'button', class: 'kb-fn kb-mic', 'data-act': 'mic', i18nTitle: 'kb.voice' }, icon('mic'));
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) mic.disabled = true;
    const el = h('div', { class: 'kb', hidden: true, 'aria-hidden': 'true' },
      rowsEl,
      h('div', { class: 'kb-bottom' },
        symButton,
        emojiButton,
        mic,
        space,
        globe,
        h('button', { type: 'button', class: 'kb-enter', 'data-act': 'enter', i18nTitle: 'kb.enter' }, icon('enter'))));

    const backKey = () => h('button', { type: 'button', class: 'kb-back', 'data-act': 'back', i18nTitle: 'kb.back' }, icon('backspace'));

    function renderEmoji() {
      const tabs = h('div', { class: 'kb-emoji-tabs' },
        EMOJI.map(([face, key], i) => h('button', { type: 'button', class: `kb-emoji-tab${i === emojiTab ? ' on' : ''}`, 'data-tab': i, i18nTitle: key }, face)),
        backKey());
      const grid = h('div', { class: 'kb-emoji-grid' },
        segment(EMOJI[emojiTab][2]).map((face) => h('button', { type: 'button', class: 'kb-emoji-key', 'data-key': face }, face)));
      rowsEl.replaceChildren(tabs, grid);
    }

    function render() {
      const lang = currentLang();
      const layout = BOS.KB_LAYOUTS[lang];
      el.classList.toggle('emoji-mode', mode === 'emoji');
      symButton.textContent = mode === 'letters' ? '#&1' : 'ABC';
      emojiButton.hidden = mode === 'emoji';
      space.textContent = layout.label;
      globe.hidden = BOS.kbLangs().length < 2;
      if (mode === 'emoji') { renderEmoji(); syncHeight(); return; }
      const rows = mode === 'sym' ? SYMBOLS : layout.rows;
      const keys = (row) => [...row].map((ch) => {
        const text = shift ? ch.toLocaleUpperCase(lang) : ch;
        return h('button', { type: 'button', class: 'kb-key', 'data-key': text }, text);
      });
      const last = rows.length - 1;
      rowsEl.replaceChildren(...rows.map((row, i) => (i < last
        ? h('div', { class: 'kb-row' }, keys(row))
        : h('div', { class: 'kb-row' },
          h('button', { type: 'button', class: `kb-shift${shift ? ' on' : ''}`, 'data-act': 'shift', i18nTitle: 'kb.shift', hidden: mode === 'sym' }, '!'),
          keys(row),
          backKey()))));
      syncHeight();
    }

    // Окна поднимаются ровно на высоту клавиатуры (у раскладок разное число рядов).
    function syncHeight() {
      if (!el.hidden) root.style.setProperty('--kb-h', `${el.offsetHeight}px`);
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
    // «Стереть» убирает целый символ, даже если это эмодзи из нескольких частей.
    function backspace() {
      if (!field) return;
      if (field.isContentEditable) { document.execCommand('delete'); return; }
      try {
        const start = field.selectionStart;
        const end = field.selectionEnd;
        if (start !== end) field.setRangeText('', start, end, 'end');
        else if (start > 0) {
          const parts = segment(field.value.slice(0, start));
          field.setRangeText('', start - parts[parts.length - 1].length, start, 'end');
        } else return;
      } catch {
        field.value = segment(field.value).slice(0, -1).join('');
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
      const lang = currentLang();
      const info = BOS.LANGS.find((l) => l.code === lang);
      const recognition = new Speech();
      recognition.lang = info ? `${lang}-${info.region}` : 'en-US';
      recognition.onresult = (e) => insert(e.results[0][0].transcript);
      recognition.onend = () => mic.classList.remove('on');
      mic.classList.add('on');
      try { recognition.start(); } catch { mic.classList.remove('on'); }
    }

    // Нажатия не забирают фокус у поля ввода.
    el.addEventListener('pointerdown', (e) => { if (!e.target.closest('.kb-emoji-grid')) e.preventDefault(); });
    el.addEventListener('mousedown', (e) => e.preventDefault());
    el.addEventListener('click', (e) => {
      const button = e.target.closest('button');
      if (!button || button.disabled) return;
      if (button.dataset.key) {
        insert(button.dataset.key);
        if (shift) { shift = false; render(); }
        return;
      }
      if (button.dataset.tab) { emojiTab = Number(button.dataset.tab); render(); return; }
      const act = button.dataset.act;
      if (act === 'space') insert(' ');
      else if (act === 'back') backspace();
      else if (act === 'enter') enter();
      else if (act === 'mic') listen();
      else if (act === 'shift') { shift = !shift; render(); }
      else if (act === 'sym') { mode = mode === 'letters' ? 'sym' : 'letters'; shift = false; render(); }
      else if (act === 'emoji') { mode = 'emoji'; shift = false; render(); }
      else if (act === 'globe') {
        langAt = (langAt + 1) % BOS.kbLangs().length;
        mode = 'letters';
        shift = false;
        render();
      }
    });

    function show(target) {
      field = target;
      el.hidden = false;
      root.classList.add('kb-open');
      syncHeight();
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
    BOS.on('kbLangs', () => { langAt = 0; mode = 'letters'; render(); });

    render();
    return { el, hide };
  };
})();
