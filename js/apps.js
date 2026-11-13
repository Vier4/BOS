// Встроенные приложения BOS.
(function () {
  const { h, t, state, mark } = BOS;

  BOS.apps.settings = {
    title: 'app.settings', icon: 'settings', width: 700, height: 480, minWidth: 420, minHeight: 320,
    mount(body, win) {
      const panes = {};
      const nav = h('nav', { class: 'set-nav' });
      const content = h('div', { class: 'set-content' });

      function section(id, key, build) {
        panes[id] = h('div', { class: 'set-pane' }, h('h2', { i18n: key }), build());
        nav.append(h('button', { type: 'button', class: 'set-link', 'data-pane': id, onclick: () => showPane(id), i18n: key }));
      }
      function showPane(id) {
        // Скрытые разделы не в DOM, поэтому смена языка их не затрагивает.
        BOS.applyI18n(panes[id]);
        content.replaceChildren(panes[id]);
        nav.querySelectorAll('.set-link').forEach((b) => b.classList.toggle('on', b.dataset.pane === id));
      }
      const row = (labelKey, control) => h('div', { class: 'set-row' }, h('label', { i18n: labelKey }), control);

      section('appearance', 'set.appearance', () => {
        const inputs = ['light', 'dark'].map((value) => h('input', {
          type: 'radio', name: 'set-theme', value,
          onchange: () => BOS.setTheme(value),
        }));
        const syncTheme = () => inputs.forEach((i) => { i.checked = i.value === state.theme; });
        win.listen('theme', syncTheme);
        syncTheme();
        const font = h('select', { class: 'input', onchange: () => BOS.setFont(font.value) },
          BOS.FONTS.map((f) => h('option', { value: f, selected: f === state.font, i18n: `font.${f}` })));

        const colorInputs = ['auto', ...Object.keys(BOS.TEXT_COLORS)].map((color) => h('input', {
          type: 'radio', name: 'set-text', value: color,
          onchange: () => BOS.setTextColor(color),
        }));
        const swatches = colorInputs.map((input) => {
          const pair = BOS.TEXT_COLORS[input.value];
          return h('label', pair ? { class: 'swatch', title: input.value } : { class: 'swatch auto', i18nTitle: 'color.auto' },
            input,
            h('span', pair ? { style: `--c-light:${pair[0]};--c-dark:${pair[1]}` } : {}));
        });
        const custom = h('input', { type: 'color', oninput: () => BOS.setTextColor(custom.value) });
        const customSwatch = h('label', { class: 'swatch custom', i18nTitle: 'color.custom' }, custom, h('span'));
        const syncColor = () => {
          colorInputs.forEach((input) => { input.checked = input.value === state.textColor; });
          const isCustom = state.textColor.startsWith('#');
          customSwatch.classList.toggle('on', isCustom);
          if (isCustom) custom.value = state.textColor;
        };
        win.listen('textColor', syncColor);
        syncColor();

        const GLYPH_PX = { s: 13, m: 16, l: 19, xl: 23 };
        const sizeInputs = Object.keys(BOS.TEXT_SIZES).map((size) => h('input', {
          type: 'radio', name: 'set-size', value: size,
          checked: state.textSize === size,
          i18nTitle: `size.${size}`,
          onchange: () => BOS.setTextSize(size),
        }));
        const sizes = h('div', { class: 'segs' }, sizeInputs.map((input) => h('label', { class: 'seg' },
          input,
          h('span', { style: `font-size:${GLYPH_PX[input.value]}px` }, 'A'))));

        // Мышка BOS 02: на телефоне её нет, поэтому и выбора нет.
        const cursorInputs = Object.keys(BOS.CURSORS).map((id) => h('input', {
          type: 'radio', name: 'set-cursor', value: id,
          onchange: () => BOS.setCursor(id),
        }));
        const syncCursor = () => cursorInputs.forEach((input) => { input.checked = input.value === state.cursor; });
        win.listen('cursor', syncCursor);
        syncCursor();
        const cursors = h('div', { class: 'cursor-picks', role: 'radiogroup' }, cursorInputs.map((input) =>
          h('label', { class: 'cursor-pick', title: input.value }, input, h('span', { html: BOS.cursorSvg(input.value) }))));

        return [
          BOS.mobile ? null : row('set.cursor', cursors),
          row('set.textSize', sizes),
          row('set.theme', h('div', { class: 'segs' },
            h('label', { class: 'seg' }, inputs[0], h('span', { i18n: 'theme.light' })),
            h('label', { class: 'seg' }, inputs[1], h('span', { i18n: 'theme.dark' })))),
          row('set.font', font),
          row('set.textColor', h('div', { class: 'swatches' }, swatches, customSwatch)),
        ];
      });

      section('wallpaper', 'set.wallpaper', () => {
        const grid = h('div', { class: 'wall-grid', role: 'radiogroup' });
        const error = h('p', { class: 'field-note err', hidden: true, i18n: 'wall.error' });
        const card = (id, thumb) => h('label', { class: 'wall-card' },
          h('input', {
            type: 'radio', name: 'set-wall', value: id,
            checked: state.wallpaper === id,
            onchange: () => BOS.setWallpaper(id),
          }),
          h('span', { class: 'wall-face' }, thumb, h('span', { class: 'wall-name', i18n: `wall.${id}` })));
        function fill() {
          const photo = BOS.getPhoto();
          const cards = BOS.WALLPAPERS.map((id) => card(id, h('span', { class: 'wall-thumb', html: BOS.wallpaperSvg(id, true) })));
          if (photo) cards.push(card('photo', h('img', { class: 'wall-thumb', src: photo, alt: '' })));
          grid.replaceChildren(...cards);
        }
        const file = h('input', {
          type: 'file', accept: 'image/*', hidden: true,
          onchange: async () => {
            const picked = file.files[0];
            file.value = '';
            if (!picked) return;
            error.hidden = await BOS.usePhoto(picked);
            fill();
          },
        });
        fill();
        return [
          grid,
          h('button', { type: 'button', class: 'btn outline wall-upload', onclick: () => file.click() }, BOS.icon('plus'), h('span', { i18n: 'wall.upload' })),
          file,
          error,
        ];
      });

      // «Основные»: язык и регион, а рядом вкладка «Обновление ПО».
      section('general', 'set.general', () => {
        const lang = h('select', { class: 'input', onchange: () => BOS.setLang(lang.value) },
          BOS.LANGS.map((l) => h('option', { value: l.code, selected: l.code === state.lang }, l.name)));
        const region = h('select', { class: 'input', onchange: () => BOS.setRegion(region.value) });
        const format = h('output', { class: 'set-value' });
        const fillRegions = () => {
          region.replaceChildren(...BOS.regions().map((r) =>
            h('option', { value: r.code, selected: r.code === state.region }, r.name)));
        };
        const showFormat = () => { format.textContent = BOS.fmtLong(new Date()); };
        win.listen('lang', () => { fillRegions(); showFormat(); });
        win.listen('region', showFormat);
        fillRegions();
        showFormat();
        const locale = h('div', { class: 'set-sub' }, row('set.language', lang), row('set.region', region), row('set.format', format));

        // Обновлений пока нет: проверка честно сообщает, что стоит последняя версия.
        const updateState = h('p', { class: 'set-desc', i18n: 'upd.current' });
        const checkButton = h('button', {
          type: 'button',
          class: 'btn outline',
          onclick: () => {
            checkButton.disabled = true;
            updateState.dataset.i18n = 'upd.checking';
            BOS.applyI18nTo(updateState);
            setTimeout(() => {
              checkButton.disabled = false;
              updateState.dataset.i18n = 'upd.latest';
              BOS.applyI18nTo(updateState);
            }, 1400);
          },
        }, BOS.icon('update'), h('span', { i18n: 'upd.check' }));
        const update = h('div', { class: 'set-sub', hidden: true },
          h('div', { class: 'about update-card' },
            mark('mark big'),
            h('div', {}, h('b', {}, `${BOS.mobile ? 'BOS MOBILE' : 'BOS'} ${BOS.VERSION}`), h('p', {}, h('span', { i18n: 'set.version' }), ` ${BOS.VERSION}`))),
          h('div', { class: 'upd-new' }, h('b', { i18n: 'upd.new' }), h('p', { class: 'set-desc', i18n: 'upd.notes' })),
          updateState,
          checkButton);

        // Дата и время: живые часы, формат часов и часовой пояс.
        const nowTime = h('b', { class: 'dt-time' });
        const nowDate = h('p', { class: 'dt-date' });
        const tick = () => {
          const now = new Date();
          nowTime.textContent = BOS.fmtTime(now);
          nowDate.textContent = BOS.fmt(now, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        };
        const ticker = setInterval(tick, 1000);
        win.disposers.push(() => clearInterval(ticker));
        win.listen('clock', tick);
        win.listen('lang', tick);
        win.listen('region', tick);
        tick();
        const clockInputs = ['auto', '24', '12'].map((value) => h('input', {
          type: 'radio', name: 'set-clock', value,
          checked: state.clock === value,
          onchange: () => BOS.setClock(value),
        }));
        const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const zones = (Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : [deviceZone]);
        const zone = h('select', { class: 'input', onchange: () => BOS.setTimeZone(zone.value || null) });
        const fillZones = () => zone.replaceChildren(
          h('option', { value: '', selected: !state.timeZone }, t('dt.zoneAuto', { zone: deviceZone.replace(/_/g, ' ') })),
          ...zones.map((name) => h('option', { value: name, selected: name === state.timeZone }, name.replace(/_/g, ' '))));
        win.listen('lang', fillZones);
        fillZones();
        const datetime = h('div', { class: 'set-sub', hidden: true },
          h('div', { class: 'dt-now' }, nowTime, nowDate),
          row('dt.format', h('div', { class: 'segs' },
            clockInputs.map((input) => h('label', { class: 'seg' }, input, h('span', { i18n: `dt.clock.${input.value}` }))))),
          row('dt.zone', zone));

        // Языки клавиатуры BOS MOBILE: какие раскладки переключает глобус.
        const keyboard = h('div', { class: 'set-sub', hidden: true });
        const langName = (code) => (BOS.LANGS.find((l) => l.code === code) || { name: code }).name;
        const layoutNote = (code) => (BOS.KB_LAYOUTS[code].label === langName(code) ? '' : BOS.KB_LAYOUTS[code].label);
        function fillKeyboard() {
          const enabled = BOS.kbLangs();
          const rest = Object.keys(BOS.KB_LAYOUTS).filter((code) => !enabled.includes(code));
          const list = h('div', { class: 'kb-langs' }, enabled.map((code) => h('div', { class: 'kb-lang' },
            h('span', { class: 'kb-lang-name' }, h('b', { lang: code }, langName(code)), layoutNote(code) ? h('small', {}, layoutNote(code)) : null),
            h('button', {
              type: 'button',
              class: 'round',
              i18nTitle: 'kb.remove',
              disabled: enabled.length < 2,
              onclick: () => BOS.setKbLangs(enabled.filter((other) => other !== code)),
            }, BOS.icon('minus')))));
          const pick = h('select', { class: 'input' }, rest.map((code) => h('option', { value: code }, layoutNote(code) ? `${langName(code)} — ${layoutNote(code)}` : langName(code))));
          keyboard.replaceChildren(
            h('p', { class: 'set-desc', i18n: 'kb.note' }),
            h('h3', { class: 'kb-langs-title', i18n: 'kb.langs' }),
            list,
            rest.length
              ? h('div', { class: 'kb-add' }, pick,
                h('button', { type: 'button', class: 'btn outline', onclick: () => BOS.setKbLangs([...enabled, pick.value]) },
                  BOS.icon('plus'), h('span', { i18n: 'kb.add' })))
              : h('p', { class: 'set-desc', i18n: 'kb.allAdded' }));
        }
        win.listen('kbLangs', fillKeyboard);
        win.listen('lang', fillKeyboard);
        fillKeyboard();

        const pages = [['set.langRegion', locale], ['set.datetime', datetime], ...(BOS.mobile ? [['set.keyboard', keyboard]] : []), ['set.update', update]];
        const tabs = pages.map(([key, pane]) => h('button', {
          type: 'button',
          class: 'set-tab',
          role: 'tab',
          i18n: key,
          onclick: () => pages.forEach(([, other], i) => {
            other.hidden = other !== pane;
            tabs[i].classList.toggle('on', other === pane);
          }),
        }));
        tabs[0].classList.add('on');
        return [h('div', { class: 'set-tabs', role: 'tablist' }, tabs), ...pages.map(([, pane]) => pane)];
      });

      section('account', 'set.account', () => {
        const avatar = h('span', { class: 'avatar large' });
        const showAvatar = () => { avatar.textContent = BOS.initial(); };
        const box = h('div');

        function nameInput() {
          const name = h('input', {
            class: 'input', value: state.name, maxLength: 40,
            oninput: () => {
              const value = name.value.trim();
              if (!value) return;
              state.name = value;
              BOS.save();
              BOS.rememberId(state.id, value);
              BOS.emit('profile');
            },
          });
          return name;
        }

        // Тот, кто начал без B ID, может подключить его здесь в любой момент.
        function connectForm() {
          const name = h('input', { class: 'input', maxLength: 40, autocomplete: 'given-name' });
          const id = h('input', { autocapitalize: 'none', autocomplete: 'off', spellcheck: false, maxLength: 40, placeholder: 'yourname' });
          const rule = h('p', { class: 'field-note', i18n: 'bid.rule' });
          return h('form', {
            class: 'sec-form',
            onsubmit: (e) => {
              e.preventDefault();
              const handle = BOS.normalizeId(id.value);
              if (!BOS.isValidId(handle)) {
                rule.className = 'field-note err';
                id.focus();
                return;
              }
              const known = BOS.knownIds()[handle];
              state.guest = false;
              state.id = handle;
              state.name = name.value.trim() || (known && known.name) || handle;
              BOS.save();
              BOS.rememberId(handle, state.name);
              BOS.emit('profile');
              renderBox();
            },
          },
            h('label', { class: 'set-row' }, h('span', { i18n: 'bid.name' }), name),
            h('label', { class: 'set-row' }, h('span', { i18n: 'set.bid' }), h('span', { class: 'input id-input' }, id, h('span', {}, BOS.ID_SUFFIX))),
            rule,
            h('div', { class: 'sec-actions' }, h('button', { type: 'submit', class: 'btn primary', i18n: 'guest.connect' })));
        }

        function renderBox() {
          if (BOS.guestSession) {
            box.replaceChildren(h('p', { class: 'set-desc', i18n: 'guest.session' }), BOS.exitGuestButton());
          } else if (state.guest) {
            box.replaceChildren(h('p', { class: 'set-desc', i18n: 'guest.account' }), connectForm());
          } else {
            box.replaceChildren(
              row('set.name', nameInput()),
              row('set.bid', h('output', { class: 'set-value mono' }, state.id + BOS.ID_SUFFIX)));
          }
        }

        win.listen('profile', showAvatar);
        win.listen('lang', showAvatar);
        showAvatar();
        renderBox();
        return [avatar, box];
      });

      section('network', 'set.network', () => {
        const toggle = h('input', { type: 'checkbox', onchange: () => BOS.setAirplane(toggle.checked) });
        const status = h('output', { class: 'set-value' });
        const sync = () => {
          toggle.checked = state.airplane;
          status.dataset.i18n = BOS.netStatus();
          BOS.applyI18nTo(status);
        };
        win.listen('airplane', sync);
        win.listen('net', sync);
        sync();
        return [h('label', { class: 'set-switch' }, h('span', { i18n: 'set.airplane' }), toggle, h('i')), status];
      });

      if (!BOS.guestSession) section('security', 'set.security', () => {
        const field = (key, input) => h('label', { class: 'set-row' }, h('span', { i18n: key }), input);
        const password = (autocomplete) => h('input', { class: 'input', type: 'password', autocomplete, maxLength: 128 });
        const current = password('current-password');
        const next = password('new-password');
        const repeat = password('new-password');
        const status = h('p', { class: 'set-desc' });
        const message = h('p', { class: 'field-note', 'aria-live': 'polite' });
        const currentField = field('sec.current', current);
        const removeButton = h('button', { type: 'button', class: 'btn outline', i18n: 'sec.remove', onclick: remove });
        const lockButton = h('button', { type: 'button', class: 'btn ghost', onclick: () => BOS.lockScreen() },
          BOS.icon('lock'), h('span', { i18n: 'power.lock' }));

        function say(key, kind) {
          message.dataset.i18n = key;
          message.className = `field-note ${kind}`;
          BOS.applyI18nTo(message);
        }
        function sync() {
          const on = Boolean(state.lock);
          status.dataset.i18n = on ? 'sec.on' : 'sec.off';
          BOS.applyI18nTo(status);
          currentField.hidden = !on;
          removeButton.hidden = !on;
          lockButton.hidden = !on;
          [current, next, repeat].forEach((input) => { input.value = ''; });
        }
        async function currentIsRight() {
          if (!state.lock || await BOS.checkPassword(current.value)) return true;
          say('sec.wrong', 'err');
          current.focus();
          return false;
        }
        async function savePassword(e) {
          e.preventDefault();
          if (next.value.length < 4) { say('sec.short', 'err'); next.focus(); return; }
          if (next.value !== repeat.value) { say('sec.mismatch', 'err'); repeat.focus(); return; }
          if (!(await currentIsRight())) return;
          await BOS.setPassword(next.value);
          sync();
          say('sec.saved', 'ok');
        }
        async function remove() {
          if (!(await currentIsRight())) return;
          await BOS.setPassword(null);
          sync();
          say('sec.removed', 'ok');
        }
        sync();
        return [
          status,
          h('form', { class: 'sec-form', onsubmit: savePassword },
            currentField,
            field('sec.new', next),
            field('sec.repeat', repeat),
            h('div', { class: 'sec-actions' },
              h('button', { type: 'submit', class: 'btn primary', i18n: 'sec.save' }),
              removeButton,
              lockButton)),
          message,
          h('p', { class: 'set-desc', i18n: 'sec.note' }),
        ];
      });

      section('about', 'set.about', () => {
        const reset = h('button', { type: 'button', class: 'btn outline', i18n: 'set.reset', onclick: () => { askBox.hidden = false; reset.hidden = true; } });
        const askBox = h('div', { class: 'reset-ask', hidden: true },
          h('b', { i18n: 'set.resetAsk' }),
          h('button', { type: 'button', class: 'btn ghost', i18n: 'common.cancel', onclick: () => { askBox.hidden = true; reset.hidden = false; } }),
          h('button', { type: 'button', class: 'btn danger', i18n: 'set.resetYes', onclick: BOS.factoryReset }));
        const about = h('div', { class: 'about' }, mark('mark big'), h('div', {}, h('b', {}, BOS.mobile ? 'BOS MOBILE' : 'BOS'), h('p', {}, h('span', { i18n: 'set.version' }), ` ${BOS.VERSION}`)));
        if (BOS.guestSession) return [about, h('p', { class: 'set-desc', i18n: 'guest.session' }), BOS.exitGuestButton()];
        return [
          about,
          h('p', { class: 'set-desc', i18n: 'set.resetDesc' }),
          reset,
          askBox,
        ];
      });

      nav.prepend(nav.querySelector('[data-pane="general"]'));
      body.append(h('div', { class: 'settings' }, nav, content));
      showPane('general');
    },
  };

  BOS.apps.notes = {
    title: 'app.notes', icon: 'notes', width: 520, height: 420, minWidth: 280, minHeight: 200,
    mount(body, win) {
      let timer;
      const status = h('span', { class: 'notes-status', 'aria-live': 'polite' });
      const area = h('textarea', {
        class: 'notes-area',
        value: state.notes,
        i18nPh: 'notes.ph',
        spellcheck: true,
        oninput: () => {
          status.textContent = '';
          clearTimeout(timer);
          timer = setTimeout(() => {
            state.notes = area.value;
            BOS.save();
            status.dataset.i18n = 'notes.saved';
            BOS.applyI18nTo(status);
          }, 300);
        },
      });
      win.area = area;
      body.append(h('div', { class: 'notes' }, area, status));
    },
    onFocus: (win) => win.area.focus({ preventScroll: true }),
  };

  BOS.apps.calc = {
    title: 'app.calc', icon: 'calc', width: 300, height: 440, minWidth: 260, minHeight: 380,
    mount(body, win) {
      let current = '0';
      let stored = null;
      let op = null;
      let fresh = true;
      let failed = false;

      const screen = h('output', { class: 'calc-screen' });
      const clean = (n) => String(parseFloat(n.toPrecision(12)));

      function render() {
        const text = failed ? t('calc.error') : current.replace('.', Number(1.5).toLocaleString(state.lang).charAt(1));
        screen.textContent = text;
        screen.style.fontSize = text.length > 10 ? '26px' : '';
        buttons.forEach((b) => b.classList.toggle('on', fresh && !failed && b.dataset.key === op));
      }
      function clear() {
        current = '0'; stored = null; op = null; fresh = true; failed = false;
      }
      function compute() {
        const b = parseFloat(current);
        const result = op === '+' ? stored + b : op === '-' ? stored - b : op === '*' ? stored * b : stored / b;
        if (!Number.isFinite(result)) { failed = true; return; }
        stored = result;
        current = clean(result);
      }
      function press(key) {
        if (failed && key !== 'AC') clear();
        if (/^\d$/.test(key)) {
          if (fresh) { current = key; fresh = false; }
          else if (current === '0') current = key;
          else if (current.replace(/\D/g, '').length < 12) current += key;
        } else if (key === '.') {
          if (fresh) { current = '0.'; fresh = false; }
          else if (!current.includes('.')) current += '.';
        } else if (key === 'AC') {
          clear();
        } else if (key === 'back') {
          if (!fresh) current = current.length > 1 ? current.slice(0, -1) : '0';
        } else if (key === '+/-') {
          if (current !== '0') current = current.startsWith('-') ? current.slice(1) : '-' + current;
        } else if (key === '%') {
          current = clean(parseFloat(current) / 100);
        } else if (key === '=') {
          if (op) { compute(); op = null; }
          fresh = true;
        } else {
          if (op && !fresh) compute();
          else stored = parseFloat(current);
          if (!failed) op = key;
          fresh = true;
        }
        render();
      }

      const layout = [
        ['AC', 'AC', 'fn'], ['+/-', '±', 'fn'], ['%', '%', 'fn'], ['/', '÷', 'op'],
        ['7', '7'], ['8', '8'], ['9', '9'], ['*', '×', 'op'],
        ['4', '4'], ['5', '5'], ['6', '6'], ['-', '−', 'op'],
        ['1', '1'], ['2', '2'], ['3', '3'], ['+', '+', 'op'],
        ['0', '0', 'wide'], ['.', '.'], ['=', '=', 'eq'],
      ];
      const buttons = layout.map(([key, label, kind]) => h('button', {
        type: 'button', class: 'calc-key ' + (kind || ''), 'data-key': key, onclick: () => press(key),
      }, label));

      win.el.addEventListener('keydown', (e) => {
        if (e.metaKey || e.ctrlKey) return;
        const map = { Enter: '=', Escape: 'AC', Backspace: 'back', ',': '.' };
        const key = map[e.key] || e.key;
        if (/^[\d.+\-*/%=]$/.test(key) || key === 'AC' || key === 'back') {
          e.preventDefault();
          press(key);
        }
      });
      win.listen('lang', render);

      body.append(h('div', { class: 'calc' }, screen, h('div', { class: 'calc-keys' }, buttons)));
      render();
    },
  };

  BOS.apps.terminal = {
    title: 'app.terminal', icon: 'terminal', width: 620, height: 400, minWidth: 320, minHeight: 200,
    mount(body, win) {
      const prompt = `${state.id || 'guest'}@bos ~ $`;
      const output = h('div', { class: 'term-out' });
      const history = [];
      let cursor = 0;

      function print(text, className) {
        output.append(h('div', { class: className || '' }, text));
      }

      const commands = {
        help: () => print(`${t('term.help')}\n${t('term.helpPing')}`),
        ping: () => print(t(BOS.netStatus())),
        whoami: () => print(BOS.accountLabel()),
        date: () => print(BOS.fmtLong(new Date())),
        echo: (args) => print(args.join(' ')),
        uname: () => print(`BOS ${BOS.VERSION}`),
        clear: () => output.replaceChildren(),
        theme: ([value]) => {
          if (value === 'light' || value === 'dark') BOS.setTheme(value);
          else print(t('term.themeUsage'));
        },
        open: ([id]) => {
          if (BOS.isAvailable(id)) BOS.wm.open(id);
          else print(t('term.openUsage'));
        },
      };

      function run(line) {
        print(`${prompt} ${line}`, 'term-echo');
        const [name, ...args] = line.trim().split(/\s+/);
        if (!name) return;
        history.push(line);
        cursor = history.length;
        if (Object.prototype.hasOwnProperty.call(commands, name)) commands[name](args);
        else print(t('term.notFound', { cmd: name }), 'term-err');
      }

      const input = h('input', {
        class: 'term-input',
        autocapitalize: 'none',
        autocomplete: 'off',
        spellcheck: false,
        'aria-label': 'Terminal',
        onkeydown: (e) => {
          if (e.key === 'Enter') {
            run(input.value);
            input.value = '';
            root.scrollTop = root.scrollHeight;
          } else if (e.key === 'ArrowUp' && cursor > 0) {
            e.preventDefault();
            input.value = history[--cursor];
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            cursor = Math.min(cursor + 1, history.length);
            input.value = history[cursor] || '';
          }
        },
      });

      const root = h('div', {
        class: 'term',
        onclick: () => { if (!String(window.getSelection())) input.focus({ preventScroll: true }); },
      }, output, h('div', { class: 'term-line' }, h('span', { class: 'term-prompt' }, prompt), input));

      win.input = input;
      print(t('term.welcome'));
      body.append(root);
    },
    onFocus: (win) => win.input.focus({ preventScroll: true }),
  };

  BOS.initial = () => (BOS.displayName() || state.id || 'B').charAt(0).toUpperCase();

  BOS.exitGuestButton = () => h('button', { type: 'button', class: 'btn outline', onclick: BOS.endGuest },
    BOS.icon('logout'), h('span', { i18n: 'guest.exit' }));
})();
