// Мастер первого запуска: язык, регион, B ID, необязательный выбор темы и шрифт.
BOS.runSetup = function (done) {
  const { h, t, state, icon, mark } = BOS;

  BOS.setTheme('light');
  BOS.setFont('system');

  const draft = { region: null, mode: 'create', name: '', created: '', existing: '', theme: 'light' };
  const suggestedRegion = () => BOS.LANGS.find((l) => l.code === state.lang).region;
  const effectiveRegion = () => draft.region || suggestedRegion();

  const steps = [stepLanguage, stepRegion, stepBid, stepTheme, stepFont];
  let index = 0;
  let current = null;

  const stepLabel = h('span', { class: 'setup-count' });
  const progress = h('div', { class: 'setup-progress', 'aria-hidden': 'true' },
    steps.map(() => h('i')));
  const main = h('main', { class: 'setup-main' });
  const back = h('button', { class: 'btn ghost', type: 'button', onclick: goBack },
    icon('left'), h('span', { i18n: 'common.back' }));
  const skip = h('button', { class: 'btn ghost', type: 'button', onclick: skipTheme, i18n: 'common.skip' });
  const nextText = h('span');
  const next = h('button', { class: 'btn primary', type: 'button', onclick: goNext }, nextText, icon('right'));

  const root = h('div', { class: 'setup' },
    h('header', { class: 'setup-head' },
      h('div', { class: 'brand' }, mark(), h('b', {}, BOS.mobile ? 'BOS MOBILE' : 'BOS')),
      progress,
      stepLabel),
    main,
    h('footer', { class: 'setup-foot' }, back, h('div', { class: 'grow' }), skip, next));

  showWelcome(() => {
    BOS.show(root);
    render();
  });

  // BOS 02: перед настройкой — «Привет» и «Продолжить», которые по очереди сменяются на всех языках системы.
  function showWelcome(onContinue) {
    const WORDS = {
      ru: ['Привет', 'Продолжить'],
      en: ['Hello', 'Continue'],
      uk: ['Привіт', 'Продовжити'],
      de: ['Hallo', 'Weiter'],
      es: ['Hola', 'Continuar'],
      fr: ['Bonjour', 'Continuer'],
      it: ['Ciao', 'Continua'],
      pt: ['Olá', 'Continuar'],
      pl: ['Cześć', 'Dalej'],
      nl: ['Hoi', 'Doorgaan'],
      tr: ['Merhaba', 'Devam'],
      kk: ['Сәлем', 'Жалғастыру'],
      zh: ['你好', '继续'],
      ja: ['こんにちは', '続ける'],
      ko: ['안녕하세요', '계속'],
    };
    const codes = BOS.LANGS.map((l) => l.code).filter((code) => WORDS[code]);
    let at = Math.max(0, codes.indexOf(state.lang));
    const hello = h('h1', { class: 'welcome-hello' });
    const label = h('span');
    const go = h('button', { type: 'button', class: 'btn primary welcome-go' }, label, icon('right'));
    function paint() {
      const code = codes[at];
      hello.lang = code;
      label.lang = code;
      hello.textContent = WORDS[code][0];
      label.textContent = WORDS[code][1];
      hello.classList.remove('swap');
      label.classList.remove('swap');
      void hello.offsetWidth;
      hello.classList.add('swap');
      label.classList.add('swap');
    }
    paint();
    const timer = setInterval(() => {
      at = (at + 1) % codes.length;
      paint();
    }, 1800);
    go.addEventListener('click', () => {
      clearInterval(timer);
      onContinue();
    });
    BOS.show(h('div', { class: 'welcome enter-fade' },
      BOS.createWall(),
      h('div', { class: 'welcome-center' },
        mark('mark big'),
        hello,
        h('p', { class: 'welcome-ver' }, `${BOS.mobile ? 'BOS MOBILE' : 'BOS'} ${BOS.VERSION}`)),
      h('div', { class: 'welcome-foot' }, go)));
    go.focus({ preventScroll: true });
  }

  function render() {
    current = steps[index]();
    stepLabel.dataset.i18n = 'setup.step';
    stepLabel.i18nVars = { n: index + 1, total: steps.length };
    BOS.applyI18nTo(stepLabel);
    [...progress.children].forEach((bar, i) => bar.classList.toggle('on', i <= index));

    main.replaceChildren(h('div', { class: 'setup-intro enter' },
      h('h1', { i18n: current.title }),
      h('p', { i18n: current.sub })),
      h('div', { class: 'setup-body enter' + (current.fixed ? ' fixed' : '') }, current.body));

    back.hidden = index === 0;
    skip.hidden = !current.skippable;
    nextText.dataset.i18n = index === steps.length - 1 ? 'common.start' : 'common.next';
    BOS.applyI18nTo(nextText);
    if (current.afterRender) current.afterRender();
  }

  function goBack() {
    if (index > 0) { index--; render(); }
  }

  function goNext() {
    if (current.validate && !current.validate()) return;
    if (index === steps.length - 1) { finish(); return; }
    index++;
    render();
  }

  function skipTheme() {
    BOS.setTheme('light');
    index++;
    render();
  }

  function radioRow(group, value, checked, onchange, content) {
    return h('label', { class: 'opt' },
      h('input', { type: 'radio', name: group, value, checked, onchange }),
      h('span', { class: 'opt-body' }, content, icon('check')));
  }

  function stepLanguage() {
    const secondary = new Map();
    const refreshSecondary = () => {
      const names = new Intl.DisplayNames([state.lang], { type: 'language' });
      secondary.forEach((el, code) => { el.textContent = code === state.lang ? '' : names.of(code); });
    };
    const rows = BOS.LANGS.map((lang) => {
      const note = h('small');
      secondary.set(lang.code, note);
      return radioRow('lang', lang.code, lang.code === state.lang, () => {
        BOS.setLang(lang.code);
        refreshSecondary();
      }, [h('span', { lang: lang.code }, lang.name), note]);
    });
    refreshSecondary();
    return {
      title: 'lang.title',
      sub: 'lang.sub',
      body: h('div', { class: 'opts large', role: 'radiogroup' }, rows),
    };
  }

  function stepRegion() {
    const suggested = suggestedRegion();
    const all = BOS.regions();
    all.sort((a, b) => (b.code === suggested) - (a.code === suggested));

    const preview = h('p', { class: 'region-preview' });
    const showPreview = () => { preview.textContent = BOS.fmtLong(new Date(), effectiveRegion()); };

    const rows = all.map((region) => ({
      region,
      haystack: `${region.name} ${region.english} ${region.code}`.toLowerCase(),
      el: radioRow('region', region.code, region.code === effectiveRegion(), () => {
        draft.region = region.code;
        showPreview();
      }, [h('span', {}, region.name), h('small', {}, region.code)]),
    }));

    const empty = h('p', { class: 'opts-empty', hidden: true, i18n: 'region.empty' });
    const search = h('input', {
      class: 'input',
      type: 'search',
      autocomplete: 'off',
      i18nPh: 'region.search',
      oninput: () => {
        const query = search.value.trim().toLowerCase();
        let visible = 0;
        rows.forEach(({ haystack, el }) => {
          const match = haystack.includes(query);
          el.hidden = !match;
          if (match) visible++;
        });
        empty.hidden = visible > 0;
      },
    });
    search.setAttribute('aria-label', t('region.search'));

    const list = h('div', { class: 'opts scroll', role: 'radiogroup' }, rows.map((r) => r.el), empty);
    showPreview();

    return {
      title: 'region.title',
      sub: 'region.sub',
      fixed: true,
      body: h('div', { class: 'region' }, h('div', { class: 'search' }, icon('search'), search), list, preview),
      afterRender: () => {
        const checked = list.querySelector('input:checked');
        if (checked) checked.closest('.opt').scrollIntoView({ block: 'nearest' });
      },
    };
  }

  function stepBid() {
    if (draft.mode === 'guest') draft.mode = 'create';
    const nameInput = h('input', { class: 'input', id: 'bid-name', maxLength: 40, autocomplete: 'given-name', value: draft.name });
    const nameError = h('p', { class: 'field-note err', hidden: true, i18n: 'bid.errName' });
    const idLabel = h('label', { for: 'bid-id' });
    const idInput = h('input', {
      id: 'bid-id',
      autocapitalize: 'none',
      autocomplete: 'off',
      spellcheck: false,
      maxLength: 40,
      placeholder: 'yourname',
    });
    const status = h('p', { class: 'field-note', 'aria-live': 'polite' });
    const nameField = h('div', { class: 'field' }, h('label', { for: 'bid-name', i18n: 'bid.name' }), nameInput, nameError);

    function setStatus(key, kind, vars) {
      status.dataset.i18n = key;
      status.i18nVars = vars;
      status.className = 'field-note' + (kind ? ' ' + kind : '');
      BOS.applyI18nTo(status);
    }

    // Возвращает true, если введённый B ID можно принять.
    function checkId(strict) {
      const id = BOS.normalizeId(idInput.value);
      const known = BOS.knownIds()[id];
      if (!BOS.isValidId(id)) {
        const typedBadChars = id && /[^a-z0-9._]/.test(id);
        setStatus('bid.rule', strict || typedBadChars ? 'err' : '');
        return false;
      }
      if (draft.mode === 'create') {
        if (known) { setStatus('bid.errTaken', 'err'); return false; }
        setStatus('bid.free', 'ok');
        return true;
      }
      if (known) setStatus('bid.known', 'ok', { name: known.name });
      else setStatus('bid.unknown', '');
      return true;
    }

    function applyMode() {
      nameField.hidden = draft.mode !== 'create';
      idInput.value = draft.mode === 'create' ? draft.created : draft.existing;
      idLabel.dataset.i18n = draft.mode === 'create' ? 'bid.idNew' : 'bid.idExisting';
      BOS.applyI18nTo(idLabel);
      nameError.hidden = true;
      checkId(false);
    }

    const mode = (value, key) => h('label', { class: 'seg' },
      h('input', {
        type: 'radio',
        name: 'bid-mode',
        value,
        checked: draft.mode === value,
        onchange: () => { draft.mode = value; applyMode(); idInput.focus(); },
      }),
      h('span', { i18n: key }));

    nameInput.addEventListener('input', () => {
      draft.name = nameInput.value;
      nameError.hidden = true;
    });
    idInput.addEventListener('input', () => {
      if (draft.mode === 'create') draft.created = idInput.value;
      else draft.existing = idInput.value;
      checkId(false);
    });

    const form = h('form', {
      class: 'bid',
      novalidate: true,
      onsubmit: (e) => { e.preventDefault(); goNext(); },
    },
      h('div', { class: 'segs', role: 'radiogroup' }, mode('create', 'bid.modeCreate'), mode('existing', 'bid.modeExisting')),
      nameField,
      h('div', { class: 'field' },
        idLabel,
        h('div', { class: 'input id-input' }, idInput, h('span', {}, BOS.ID_SUFFIX)),
        status),
      h('button', { type: 'submit', hidden: true, tabIndex: -1 }),
      h('button', {
        type: 'button',
        class: 'btn ghost guest-btn',
        onclick: () => {
          draft.mode = 'guest';
          goNext();
        },
      }, icon('user'), h('span', { i18n: 'guest.enter' })));

    applyMode();

    return {
      title: 'bid.title',
      sub: 'bid.sub',
      body: form,
      afterRender: () => (draft.mode === 'create' ? nameInput : idInput).focus({ preventScroll: true }),
      validate: () => {
        if (draft.mode === 'guest') return true;
        const nameOk = draft.mode !== 'create' || draft.name.trim().length > 0;
        nameError.hidden = nameOk;
        const idOk = checkId(true);
        if (!nameOk) nameInput.focus();
        else if (!idOk) idInput.focus();
        return nameOk && idOk;
      },
    };
  }

  function stepTheme() {
    const card = (value, key) => h('label', { class: 'theme-card' },
      h('input', {
        type: 'radio',
        name: 'theme',
        value,
        checked: state.theme === value,
        onchange: () => BOS.setTheme(value),
      }),
      h('span', { class: 'theme-face' },
        h('span', { class: 'mini', 'data-theme': value },
          h('span', { class: 'mini-win' }, h('i'), h('i'), h('i')),
          h('span', { class: 'mini-bar' })),
        h('span', { class: 'theme-name' }, h('span', { i18n: key }), icon('check'))));
    return {
      title: 'theme.title',
      sub: 'theme.sub',
      skippable: true,
      body: h('div', { class: 'themes', role: 'radiogroup' }, card('light', 'theme.light'), card('dark', 'theme.dark')),
    };
  }

  function stepFont() {
    const rows = BOS.FONTS.map((font) => radioRow('font', font, state.font === font, () => BOS.setFont(font), [
      h('span', { 'data-font': font, i18n: `font.${font}` }),
      h('small', { 'data-font': font }, 'Aa 123'),
    ]));
    return {
      title: 'font.title',
      sub: 'font.sub',
      body: h('div', { class: 'opts large', role: 'radiogroup' }, rows),
    };
  }

  function finish() {
    // Гость пользуется BOS без B ID и может подключить его позже в настройках.
    const guest = draft.mode === 'guest';
    const id = guest ? null : BOS.normalizeId(draft.mode === 'create' ? draft.created : draft.existing);
    let name = '';
    if (draft.mode === 'create') name = draft.name.trim();
    else if (!guest) name = (BOS.knownIds()[id] || { name: id }).name;
    state.guest = guest;
    state.id = id;
    state.name = name;
    state.region = effectiveRegion();
    state.setupDone = true;
    BOS.save();
    if (!guest) BOS.rememberId(id, name);

    BOS.show(h('div', { class: 'done' },
      mark('mark big'),
      h('h1', { i18n: 'done.title', i18nVars: { name: BOS.displayName() } }),
      h('p', { i18n: 'done.sub' })));
    setTimeout(done, 1400);
  }
};
