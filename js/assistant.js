// B Помощник: ИИ-помощник BOS. Писать ему нельзя — только нажимать кнопки с тем, что он умеет.
// Всё работает прямо на устройстве и никуда не отправляется.
(function () {
  const { h, icon, t, state } = BOS;

  const next = (list, current) => list[(list.indexOf(current) + 1) % list.length];

  // Открывает приложение, если оно есть, иначе подсказывает, где его вернуть.
  function openApp(id, replyKey) {
    if (!BOS.isAvailable(id)) return { key: 'ai.removed', vars: { name: t(BOS.apps[id].title) } };
    BOS.wm.open(id);
    return { key: replyKey };
  }

  function sizeStep(delta) {
    const sizes = Object.keys(BOS.TEXT_SIZES);
    const index = sizes.indexOf(state.textSize) + delta;
    if (index < 0) return { key: 'ai.smallest' };
    if (index >= sizes.length) return { key: 'ai.biggest' };
    BOS.setTextSize(sizes[index]);
    return { key: delta > 0 ? 'ai.bigger' : 'ai.smaller' };
  }

  const TIPS = ['ai.tip1', 'ai.tip2', 'ai.tip3', 'ai.tip4'];
  let lastTip = -1;

  // Каждая кнопка: значок, подпись и что сделать. run возвращает ответ помощника.
  const ACTIONS = [
    ['wallpaper', 'image', 'ai.do.wallpaper', () => {
      const id = next(BOS.WALLPAPERS, state.wallpaper);
      BOS.setWallpaper(id);
      return { key: 'ai.wallpaper', vars: { name: t(`wall.${id}`) } };
    }],
    ['light', 'sun', 'ai.do.light', () => {
      const already = state.theme === 'light';
      BOS.setTheme('light');
      return { key: already ? 'ai.lightAlready' : 'ai.light' };
    }],
    ['dark', 'moon', 'ai.do.dark', () => {
      const already = state.theme === 'dark';
      BOS.setTheme('dark');
      return { key: already ? 'ai.darkAlready' : 'ai.dark' };
    }],
    ['airplane', 'plane', 'ai.do.airplane', () => {
      BOS.setAirplane(!state.airplane);
      return { key: state.airplane ? 'ai.planeOn' : 'ai.planeOff' };
    }],
    ['bigger', 'plus', 'ai.do.bigger', () => sizeStep(1)],
    ['smaller', 'minus', 'ai.do.smaller', () => sizeStep(-1)],
    ['font', 'edit', 'ai.do.font', () => {
      const font = next(BOS.FONTS, state.font);
      BOS.setFont(font);
      return { key: 'ai.font', vars: { name: t(`font.${font}`) } };
    }],
    ['color', 'spark', 'ai.do.color', () => {
      BOS.setTextColor(next(['auto', ...Object.keys(BOS.TEXT_COLORS)], state.textColor));
      return { key: state.textColor === 'auto' ? 'ai.colorAuto' : 'ai.color' };
    }],
    ['folder', 'folder', 'ai.do.folder', () => {
      BOS.newDeskFolder();
      return { key: 'ai.folder' };
    }],
    ['time', 'restart', 'ai.do.time', () => ({ key: 'ai.time', vars: { time: BOS.fmtTime(new Date()), date: BOS.fmtDate(new Date()) } })],
    ['music', 'music', 'ai.do.music', () => openApp('music', 'ai.music')],
    ['games', 'games', 'ai.do.games', () => openApp('games', 'ai.games')],
    ['tip', 'search', 'ai.do.tip', () => {
      lastTip = (lastTip + 1 + Math.floor(Math.random() * (TIPS.length - 1))) % TIPS.length;
      return { key: TIPS[lastTip] };
    }],
  ];

  BOS.apps.assistant = {
    title: 'app.assistant', icon: 'spark', width: 460, height: 600, minWidth: 320, minHeight: 420,
    mount(body, win) {
      const chat = h('div', { class: 'ai-chat', 'aria-live': 'polite' });
      const timers = new Set();
      win.disposers.push(() => timers.forEach(clearTimeout));

      function bubble(who, key, vars, text) {
        const el = h('div', { class: `ai-msg ${who}` }, text === undefined ? h('p', { i18n: key, i18nVars: vars }) : h('p', {}, text));
        chat.append(el);
        chat.scrollTop = chat.scrollHeight;
        return el;
      }
      // Помощник «печатает» полсекунды, потом отвечает.
      function reply(answer) {
        const typing = h('div', { class: 'ai-msg bot typing' }, h('p', {}, h('i'), h('i'), h('i')));
        chat.append(typing);
        chat.scrollTop = chat.scrollHeight;
        const timer = setTimeout(() => {
          timers.delete(timer);
          typing.remove();
          bubble('bot', answer.key, answer.vars, answer.text);
        }, 550);
        timers.add(timer);
      }

      const usable = ACTIONS.filter(([id]) => id !== 'folder' || BOS.newDeskFolder);
      const buttons = usable.map(([id, iconName, label, run]) => h('button', {
        type: 'button',
        class: 'ai-action',
        'data-action': id,
        onclick: () => {
          bubble('me', label);
          reply(run());
        },
      }, icon(iconName), h('span', { i18n: label })));

      const clear = h('button', {
        type: 'button', class: 'round', i18nTitle: 'ai.clear',
        onclick: () => {
          timers.forEach(clearTimeout);
          timers.clear();
          chat.replaceChildren();
          greet();
        },
      }, icon('trash'));

      function greet() {
        bubble('bot', 'ai.hello', { name: BOS.displayName() });
      }

      // BOS 03: свои фразы. Человек придумывает, что сказать и что ответит помощник, — появляется новая кнопка.
      const own = h('div', { class: 'ai-actions ai-own' });
      const fill = (text) => text
        .replace(/\{name\}/g, BOS.displayName())
        .replace(/\{time\}/g, BOS.fmtTime(new Date()))
        .replace(/\{date\}/g, BOS.fmtDate(new Date()));
      function paintOwn() {
        const phrases = state.aiPhrases || [];
        own.replaceChildren(
          ...phrases.map((phrase) => h('button', {
            type: 'button',
            class: 'ai-action mine',
            onclick: () => {
              bubble('me', null, null, phrase.say);
              reply({ text: fill(phrase.answer) });
            },
          }, icon('spark'), h('span', {}, phrase.say))),
          h('button', { type: 'button', class: 'ai-action add', onclick: () => teach.toggle(true) }, icon('plus'), h('span', { i18n: 'ai.addPhrase' })));
      }
      const teach = (function () {
        const say = h('input', { class: 'input', maxLength: 60, i18nPh: 'ai.sayPh' });
        const answer = h('textarea', { class: 'input ai-answer', maxLength: 400, rows: 3, i18nPh: 'ai.answerPh' });
        const error = h('p', { class: 'field-note err', hidden: true, i18n: 'ai.fillBoth' });
        const list = h('div', { class: 'ai-phrase-list' });
        function paintList() {
          const phrases = state.aiPhrases || [];
          list.replaceChildren(...phrases.map((phrase, i) => h('div', { class: 'ai-phrase' },
            h('div', {}, h('b', {}, phrase.say), h('small', {}, phrase.answer)),
            h('button', {
              type: 'button', class: 'round', i18nTitle: 'docs.delete',
              onclick: () => {
                state.aiPhrases = phrases.filter((_, j) => j !== i);
                BOS.save();
                BOS.emit('aiPhrases');
              },
            }, icon('trash')))));
        }
        const el = h('form', {
          class: 'ai-teach b3-card', hidden: true,
          onsubmit: (e) => {
            e.preventDefault();
            const phrase = { say: say.value.trim(), answer: answer.value.trim() };
            error.hidden = Boolean(phrase.say && phrase.answer);
            if (!error.hidden) return;
            state.aiPhrases = [...(state.aiPhrases || []), phrase];
            BOS.save();
            BOS.emit('aiPhrases');
            say.value = '';
            answer.value = '';
            say.focus();
          },
        },
          h('div', { class: 'ai-teach-head' }, h('b', { i18n: 'ai.teachTitle' }),
            h('button', { type: 'button', class: 'round', i18nTitle: 'win.close', onclick: () => toggle(false) }, icon('close'))),
          h('p', { class: 'set-desc', i18n: 'ai.teachNote' }),
          h('label', { class: 'set-row' }, h('span', { i18n: 'ai.say' }), say),
          h('label', { class: 'set-row' }, h('span', { i18n: 'ai.answer' }), answer),
          error,
          h('button', { type: 'submit', class: 'btn primary' }, icon('plus'), h('span', { i18n: 'ai.savePhrase' })),
          list);
        function toggle(open) {
          el.hidden = !open;
          if (open) { paintList(); say.focus(); }
        }
        win.listen('aiPhrases', () => { paintList(); paintOwn(); });
        return { el, toggle };
      })();
      paintOwn();

      body.append(h('div', { class: 'ai' },
        h('div', { class: 'ai-head' },
          BOS.appTile('assistant'),
          h('div', {}, h('b', { i18n: 'app.assistant' }), h('small', { i18n: 'ai.sub' })),
          clear),
        chat,
        h('div', { class: 'ai-panel' },
          h('p', { class: 'ai-note' }, icon('lock'), h('span', { i18n: 'ai.noTyping' })),
          BOS.is03 ? teach.el : null,
          h('div', { class: 'ai-actions' }, buttons),
          BOS.is03 ? own : null)));
      greet();
    },
  };
})();
