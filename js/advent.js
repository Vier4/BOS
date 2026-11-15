// BOS 03 New Year Edition: Адвент-календарь. 31 дверца — с 1 по 31 декабря.
// Дверца открывается в свой день (или раньше, если включить «Открывать раньше срока»).
// За каждой — подарок: факт, задание, шутка или новогоднее чудо (снег, салют).
(function () {
  if (!BOS.isNY) return;
  const { h, icon, state, t } = BOS;
  const isRu = () => ['ru', 'uk', 'kk'].includes(state.lang);

  // [подарок, русский текст, английский текст, действие]
  const DOORS = [
    ['❄️', 'Ни одна снежинка не похожа на другую: у каждой свой узор из шести лучей.', 'No two snowflakes are alike: each has its own six-pointed pattern.'],
    ['🎨', 'Задание: нарисуйте снежинку в Калейдоскопе и сохраните её в Файлы.', 'Task: draw a snowflake in Kaleidoscope and save it to Files.'],
    ['🐧', 'Шутка: почему пингвины всегда нарядные? Они даже дома ходят во фраках!', 'Joke: what do penguins wear to a party? A tux, of course!'],
    ['🍊', 'В России мандарины стали новогодним символом, потому что зимой их привозили как раз к празднику.', 'Tangerines became a New Year symbol in many countries because they arrived just in time for winter holidays.'],
    ['⛄', 'Задание: слепите снеговика — настоящего или из подушек!', 'Task: build a snowman — a real one or out of pillows!'],
    ['🌨️', 'Сегодня в BOS идёт снег погуще. Нажмите кнопку, чтобы включить снегопад.', 'It’s snowing in BOS today. Tap the button to turn on the snowfall.', 'snow'],
    ['🎶', 'Задание: спойте любимую новогоднюю песню. Можно включить Битбокс для ритма.', 'Task: sing your favourite holiday song. Beat Box can keep the rhythm.'],
    ['🦌', 'Северные олени — единственные олени, у которых рога есть и у самцов, и у самок.', 'Reindeer are the only deer where both males and females grow antlers.'],
    ['📮', 'Задание: напишите письмо себе в Тайм-капсулу и откройте его 1 января.', 'Task: write a letter in Time Capsule and open it on January 1st.'],
    ['🎁', 'Шутка: что дарит снеговик на Новый год? Снегодарки!', 'Joke: what does a snowman eat for breakfast? Frosted flakes!'],
    ['🕯️', 'Раньше ёлки украшали настоящими свечами. Сейчас — гирляндами, это безопаснее.', 'Christmas trees used to be lit with real candles. Today we use safe string lights.'],
    ['🎆', 'Репетиция праздника! Нажмите кнопку — будет салют.', 'Holiday rehearsal! Tap the button for fireworks.', 'fireworks'],
    ['🧦', 'Задание: найдите самые тёплые носки и наденьте их весь вечер.', 'Task: find your warmest socks and wear them all evening.'],
    ['🌍', 'Новый год первыми встречают на островах Кирибати, а последними — на острове Бейкер.', 'The first place to welcome the New Year is Kiribati, and one of the last is Baker Island.'],
    ['🍪', 'Задание: испеките или нарисуйте печенье в форме звезды.', 'Task: bake or draw a star-shaped cookie.'],
    ['🐻‍❄️', 'Шутка: почему белый медведь не боится холода? У него шуба по размеру!', 'Joke: why don’t polar bears mind the cold? Their coats fit perfectly!'],
    ['🔔', 'Самый большой колокол в мире — Царь-колокол в Москве. Он весит около 200 тонн.', 'One of the biggest bells in the world, the Tsar Bell in Moscow, weighs about 200 tonnes.'],
    ['🧣', 'Задание: подарите кому-нибудь доброе слово — это лучший тёплый шарф.', 'Task: give someone a kind word — it’s the warmest scarf there is.'],
    ['⭐', 'Звезду на верхушку ёлки ставят в честь самой яркой звезды на небе.', 'The star on top of the tree stands for the brightest star in the sky.'],
    ['🛷', 'Задание: придумайте имя для своего питомца Блопа и поиграйте с ним.', 'Task: give your Pixel Pet a festive name and play with it.'],
    ['🌌', 'Северное сияние появляется, когда частицы от Солнца встречаются с воздухом Земли.', 'The northern lights appear when particles from the Sun meet Earth’s air.'],
    ['🎄', 'Шутка: почему ёлка не умеет вязать? Потому что у неё одни иголки!', 'Joke: why can’t Christmas trees knit? They keep dropping their needles!'],
    ['📜', 'Задание: составьте список из трёх желаний на следующий год.', 'Task: make a list of three wishes for next year.'],
    ['🌟', 'Сегодня в BOS особенно празднично — запускайте салют!', 'BOS is extra festive today — launch the fireworks!', 'fireworks'],
    ['🥛', 'Задание: выпейте тёплого какао и посмотрите на огоньки гирлянды.', 'Task: drink some warm cocoa and watch the string lights.'],
    ['🎅', 'Дед Мороз живёт в Великом Устюге, а у него есть внучка — Снегурочка.', 'Ded Moroz, the Russian Father Frost, lives in Veliky Ustyug with his granddaughter Snegurochka.'],
    ['🧩', 'Задание: решите Судоку из Магазина игр за один подход.', 'Task: solve a Sudoku from the Game Store in one go.'],
    ['☃️', 'Шутка: как снеговики узнают новости? Из снежного телевидения — по сугробному каналу!', 'Joke: what’s a snowman’s favourite drink? Iced tea!'],
    ['🎀', 'Задание: красиво упакуйте подарок для кого-нибудь из близких.', 'Task: wrap a present beautifully for someone you love.'],
    ['🕰️', 'Куранты бьют 12 раз — успейте загадать желание, пока они звучат!', 'The clock strikes twelve — make a wish before the last chime!'],
    ['🥳', 'С Новым годом! Пусть он будет добрым, весёлым и полным чудес!', 'Happy New Year! May it be kind, joyful and full of wonders!', 'grand'],
  ];

  const season = (now = new Date()) => (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());
  function record() {
    if (!state.advent || state.advent.season !== season()) state.advent = { season: season(), opened: [] };
    return state.advent;
  }
  // Можно ли открыть дверцу с номером day (1–31)?
  function openable(day, now = new Date()) {
    if (state.adventEarly) return true;
    if (now.getMonth() === 0) return true;
    return now.getMonth() === 11 && now.getDate() >= day;
  }
  // Дверцы стоят не по порядку, как в настоящем календаре.
  const ORDER = [17, 4, 26, 9, 31, 13, 2, 22, 7, 28, 15, 1, 19, 11, 24, 6, 30, 3, 20, 14, 27, 8, 23, 16, 5, 29, 10, 18, 25, 12, 21];
  const COLORS = ['#dc2626', '#15803d', '#b45309', '#1d4ed8', '#7c3aed'];

  BOS.apps.advent = {
    title: 'app.advent', icon: 'advent', width: 640, height: 640, minWidth: 340, minHeight: 440,
    mount(body, win) {
      const grid = h('div', { class: 'adv-grid' });
      const sub = h('p', { class: 'b3-sub' });
      const gifts = h('div', { class: 'adv-gifts' });
      const count = h('b', { class: 'adv-count' });
      const card = h('div', { class: 'adv-card', hidden: true });
      const root = h('div', { class: 'b3 adv' });
      const toast = BOS.b03 ? BOS.b03.toaster(root) : () => {};
      const early = h('input', { type: 'checkbox', checked: Boolean(state.adventEarly), onchange: () => { state.adventEarly = early.checked; BOS.save(); paint(); } });

      function jingle() {
        if (!BOS.b03) return;
        [784, 784, 784, 784, 784, 784, 784, 988, 659, 698, 784].forEach((f, i) => BOS.b03.tone(f, 0.25, 'triangle', 0.12, i * 0.16));
      }
      function showCard(day) {
        const [gift, ru, en, action] = DOORS[day - 1];
        const actionButton = action === 'snow'
          ? h('button', { type: 'button', class: 'btn primary', onclick: () => BOS.ny.setSnow(true) }, '❄ ', h('span', { i18n: 'adv.snow' }))
          : action ? h('button', { type: 'button', class: 'btn primary', onclick: () => BOS.ny.fireworks(action === 'grand' ? 12000 : 6000) }, '🎆 ', h('span', { i18n: 'ny.fireworks' })) : null;
        card.replaceChildren(h('div', { class: 'adv-card-in' },
          h('span', { class: 'adv-card-day ny-title' }, String(day)),
          h('span', { class: 'adv-card-gift' }, gift),
          h('p', {}, isRu() ? ru : en),
          h('div', { class: 'b3-row' }, actionButton,
            h('button', { type: 'button', class: 'btn outline', i18n: 'adv.close', onclick: () => { card.hidden = true; } }))));
        card.hidden = false;
      }
      function open(day, door) {
        const rec = record();
        if (rec.opened.includes(day)) { showCard(day); return; }
        if (!openable(day)) {
          const year = season();
          toast('adv.locked', { date: BOS.fmt(new Date(year, 11, day), { day: 'numeric', month: 'long' }) });
          door.classList.remove('shake');
          void door.offsetWidth;
          door.classList.add('shake');
          return;
        }
        rec.opened.push(day);
        BOS.save();
        door.classList.add('opening');
        jingle();
        setTimeout(() => { paint(); showCard(day); if (day === 31) BOS.ny.fireworks(12000); }, 450);
      }
      function paint() {
        const rec = record();
        const now = new Date();
        grid.replaceChildren(...ORDER.map((day, i) => {
          const opened = rec.opened.includes(day);
          const can = openable(day, now);
          const door = h('button', {
            type: 'button',
            class: `adv-door${opened ? ' open' : ''}${!opened && can ? ' ready' : ''}${!can ? ' locked' : ''}${day === 31 ? ' big' : ''}`,
            style: `--c:${COLORS[i % COLORS.length]}`,
            onclick: (e) => open(day, e.currentTarget),
          }, opened ? h('span', { class: 'adv-gift' }, DOORS[day - 1][0]) : h('span', { class: 'adv-num ny-title' }, String(day)), !can && !opened ? h('i', { class: 'adv-lock' }, '🔒') : null);
          return door;
        }));
        if (now.getMonth() === 11) { sub.dataset.i18n = 'adv.today'; sub.i18nVars = { n: now.getDate() }; }
        else if (now.getMonth() === 0) { sub.dataset.i18n = 'adv.after'; sub.i18nVars = {}; }
        else {
          const first = new Date(now.getFullYear(), 11, 1);
          sub.dataset.i18n = 'adv.before';
          sub.i18nVars = { n: Math.ceil((first - now) / 86400000) };
        }
        BOS.applyI18nTo(sub);
        count.dataset.i18n = 'adv.count';
        count.i18nVars = { n: rec.opened.length };
        BOS.applyI18nTo(count);
        gifts.replaceChildren(...rec.opened.slice().sort((a, b) => a - b).map((day) => h('button', { type: 'button', class: 'adv-mini', title: String(day), onclick: () => showCard(day) }, DOORS[day - 1][0])));
      }
      win.listen('lang', paint);
      win.listen('nyTick', paint);
      root.prepend(
        h('div', { class: 'adv-head' }, h('h2', { class: 'ny-title', i18n: 'app.advent' }), sub),
        grid,
        h('div', { class: 'adv-foot b3-card' }, count, gifts,
          h('label', { class: 'cs-glow adv-early' }, early, h('span', { i18n: 'adv.early' }))),
        card);
      body.append(root);
      paint();
    },
  };
})();
