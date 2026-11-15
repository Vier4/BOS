// BOS 03: вторая половина приложений, которые есть только в B Store.
(function () {
  if (!BOS.is03 || !BOS.b03) return;
  const { h, icon, state, t } = BOS;
  const { tone, copy, toaster, fitCanvas, app, dayKey, rand, pick, save, isRu, audio, noiseBuffer } = BOS.b03;

  // 9. Колесо решений: впишите варианты и крутите колесо.
  app('wheel', [480, 620], (body, win) => {
    const canvas = h('canvas', { class: 'wh-canvas' });
    const options = h('textarea', { class: 'input wh-options', rows: 5, i18nPh: 'wh.ph', oninput: () => { state.wheel = options.value; draw(); } });
    options.value = state.wheel || t('wh.default');
    const result = h('p', { class: 'wh-result' });
    let W = 1;
    let angle = 0;
    let spinning = false;
    const items = () => options.value.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 16);
    function draw() {
      const g = canvas.getContext('2d');
      const list = items();
      const c = W / 2;
      const r = c - 8;
      g.clearRect(0, 0, W, W);
      if (!list.length) return;
      const step = (Math.PI * 2) / list.length;
      list.forEach((label, i) => {
        g.beginPath();
        g.moveTo(c, c);
        g.arc(c, c, r, angle + i * step, angle + (i + 1) * step);
        g.fillStyle = `hsl(${(i * 360) / list.length} 80% 62%)`;
        g.fill();
        g.save();
        g.translate(c, c);
        g.rotate(angle + (i + 0.5) * step);
        g.fillStyle = '#fff';
        g.font = `600 ${Math.max(11, Math.min(16, W / 24))}px system-ui, sans-serif`;
        g.textAlign = 'right';
        g.shadowColor = 'rgba(0,0,0,.35)';
        g.shadowBlur = 3;
        g.fillText(label.length > 16 ? `${label.slice(0, 15)}…` : label, r - 12, 5);
        g.restore();
      });
      g.beginPath();
      g.arc(c, c, 16, 0, Math.PI * 2);
      g.fillStyle = 'rgba(255,255,255,.9)';
      g.fill();
      g.beginPath();
      g.moveTo(W - 4, c - 12);
      g.lineTo(W - 4, c + 12);
      g.lineTo(W - 30, c);
      g.closePath();
      g.fillStyle = '#111';
      g.fill();
    }
    function spin() {
      const list = items();
      if (spinning || list.length < 2) return;
      spinning = true;
      result.textContent = '';
      const start = angle;
      const total = Math.PI * 2 * (5 + Math.random() * 3);
      const began = performance.now();
      const step = (Math.PI * 2) / list.length;
      let lastTick = Math.floor(start / step);
      function frame(now) {
        const k = Math.min(1, (now - began) / 4200);
        angle = start + total * (1 - Math.pow(1 - k, 3));
        const tick = Math.floor(angle / step);
        if (tick !== lastTick) { lastTick = tick; tone(1400, 0.03, 'square', 0.05); }
        draw();
        if (k < 1) { requestAnimationFrame(frame); return; }
        spinning = false;
        // Стрелка смотрит вправо (угол 0): находим сектор под ней.
        const at = ((-angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const winner = list[Math.floor(at / step)];
        result.dataset.i18n = 'wh.result';
        result.i18nVars = { x: winner };
        BOS.applyI18nTo(result);
        tone(784, 0.3, 'triangle', 0.2);
        tone(1046, 0.5, 'triangle', 0.2, 0.15);
        save();
      }
      requestAnimationFrame(frame);
    }
    fitCanvas(canvas, win, (w) => { W = w; draw(); });
    body.append(h('div', { class: 'b3 wh' }, canvas, result,
      h('button', { type: 'button', class: 'btn primary', onclick: spin }, icon('restart'), h('span', { i18n: 'wh.spin' })),
      options));
  });

  // 10. Пиксель-питомец Блоп: кормите, играйте и укладывайте спать. Он живёт и когда приложение закрыто.
  app('pet', [440, 600], (body, win) => {
    const HOUR = 3600000;
    const pet = state.pet || { name: t('pet.default'), hunger: 80, joy: 80, energy: 80, sleeping: false, t: Date.now() };
    state.pet = pet;
    const clamp = (v) => Math.max(0, Math.min(100, v));
    function live() {
      const hours = (Date.now() - pet.t) / HOUR;
      pet.hunger = clamp(pet.hunger - hours * 8);
      pet.joy = clamp(pet.joy - hours * 6);
      pet.energy = clamp(pet.energy + hours * (pet.sleeping ? 25 : -5));
      pet.t = Date.now();
    }
    const creature = h('div', { class: 'pet-blop' });
    const mood = h('p', { class: 'pet-mood' });
    const bars = ['hunger', 'joy', 'energy'].map((key) => {
      const fill = h('i');
      return { key, fill, el: h('div', { class: 'pet-bar' }, h('span', { i18n: `pet.${key}` }), h('span', { class: 'pet-track' }, fill)) };
    });
    const name = h('input', { class: 'input pet-name', maxLength: 16, value: pet.name, oninput: () => { pet.name = name.value.trim() || t('pet.default'); paint(); save(); } });
    const sleepButton = h('button', { type: 'button', class: 'btn outline', onclick: () => { live(); pet.sleeping = !pet.sleeping; save(); paint(); } });
    function act(change, sound) {
      if (pet.sleeping) return;
      live();
      Object.entries(change).forEach(([key, value]) => { pet[key] = clamp(pet[key] + value); });
      tone(sound, 0.15, 'square', 0.08);
      tone(sound * 1.5, 0.2, 'square', 0.08, 0.1);
      creature.classList.remove('hop');
      void creature.offsetWidth;
      creature.classList.add('hop');
      save();
      paint();
    }
    function paint() {
      live();
      const low = ['hunger', 'joy', 'energy'].sort((a, b) => pet[a] - pet[b])[0];
      const look = pet.sleeping ? 'sleep' : pet[low] < 35 ? { hunger: 'hungry', joy: 'bored', energy: 'tired' }[low] : 'happy';
      const hue = look === 'happy' ? 280 : look === 'sleep' ? 230 : 200;
      const eyes = pet.sleeping ? '<path d="M38 52q6 5 12 0M70 52q6 5 12 0" stroke="#1e1b4b" stroke-width="3" fill="none" stroke-linecap="round"/>'
        : '<circle cx="44" cy="50" r="6" fill="#1e1b4b"/><circle cx="76" cy="50" r="6" fill="#1e1b4b"/><circle cx="46" cy="48" r="2" fill="#fff"/><circle cx="78" cy="48" r="2" fill="#fff"/>';
      const mouth = look === 'happy' ? '<path d="M48 66q12 12 24 0" stroke="#1e1b4b" stroke-width="3" fill="none" stroke-linecap="round"/>'
        : look === 'sleep' ? '<circle cx="60" cy="68" r="3" fill="#1e1b4b"/>'
          : '<path d="M48 72q12 -9 24 0" stroke="#1e1b4b" stroke-width="3" fill="none" stroke-linecap="round"/>';
      creature.innerHTML = `<svg viewBox="0 0 120 110"><defs><radialGradient id="pet-g" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="hsl(${hue} 90% 85%)"/><stop offset="1" stop-color="hsl(${hue} 70% 58%)"/></radialGradient></defs>
        <ellipse cx="60" cy="102" rx="34" ry="5" fill="rgba(0,0,0,.15)"/>
        <path d="M60 14C88 14 104 38 104 64C104 90 86 98 60 98C34 98 16 90 16 64C16 38 32 14 60 14z" fill="url(#pet-g)"/>
        <ellipse cx="42" cy="32" rx="12" ry="6" fill="#fff" opacity=".55" transform="rotate(-25 42 32)"/>
        <circle cx="34" cy="64" r="6" fill="#fb7185" opacity=".45"/><circle cx="86" cy="64" r="6" fill="#fb7185" opacity=".45"/>
        ${eyes}${mouth}${pet.sleeping ? '<text x="92" y="24" font-size="16" fill="#6366f1">z</text><text x="102" y="12" font-size="12" fill="#6366f1">z</text>' : ''}</svg>`;
      mood.dataset.i18n = `pet.mood.${look}`;
      mood.i18nVars = { name: pet.name };
      BOS.applyI18nTo(mood);
      bars.forEach(({ key, fill }) => {
        fill.style.width = `${pet[key]}%`;
        fill.style.background = pet[key] < 35 ? '#f43f5e' : pet[key] < 65 ? '#f59e0b' : '#22c55e';
      });
      sleepButton.replaceChildren(icon(pet.sleeping ? 'sun' : 'moon'), h('span', { i18n: pet.sleeping ? 'pet.wake' : 'pet.sleep' }));
    }
    const tick = setInterval(paint, 10000);
    win.disposers.push(() => { clearInterval(tick); save(); });
    body.append(h('div', { class: 'b3 pet' },
      name, creature, mood,
      h('div', { class: 'pet-bars b3-card' }, bars.map((bar) => bar.el)),
      h('div', { class: 'b3-row pet-actions' },
        h('button', { type: 'button', class: 'btn primary', onclick: () => act({ hunger: 30 }, 392) }, '🍎 ', h('span', { i18n: 'pet.feed' })),
        h('button', { type: 'button', class: 'btn primary', onclick: () => act({ joy: 25, energy: -10, hunger: -5 }, 523) }, '🎾 ', h('span', { i18n: 'pet.play' })),
        sleepButton)));
    paint();
  });

  // 11. Битбокс: четыре звука и восемь шагов — соберите свой ритм.
  app('beats', [560, 460], (body, win) => {
    const ROWS = ['kick', 'snare', 'hat', 'clap'];
    const pattern = state.beats || ROWS.map((row) => Array(8).fill(false).map((_, i) => (row === 'kick' && i % 4 === 0) || (row === 'hat' && i % 2 === 0)));
    state.beats = pattern;
    let step = -1;
    let timer = null;
    const tempo = h('input', { type: 'range', min: 70, max: 170, value: state.beatsTempo || 110, oninput: () => { state.beatsTempo = Number(tempo.value); tempoLabel.textContent = tempo.value; if (timer) { stop(); play(); } } });
    const tempoLabel = h('b', {}, String(tempo.value));
    function hit(row) {
      const ctx = audio();
      const at = ctx.currentTime;
      const out = ctx.createGain();
      out.gain.value = BOS.state.volume;
      out.connect(ctx.destination);
      if (row === 'kick') {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.frequency.setValueAtTime(150, at);
        osc.frequency.exponentialRampToValueAtTime(45, at + 0.15);
        g.gain.setValueAtTime(0.9, at);
        g.gain.exponentialRampToValueAtTime(0.001, at + 0.3);
        osc.connect(g).connect(out);
        osc.start(at);
        osc.stop(at + 0.32);
        return;
      }
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer('white');
      const filter = ctx.createBiquadFilter();
      const g = ctx.createGain();
      filter.type = row === 'hat' ? 'highpass' : 'bandpass';
      filter.frequency.value = row === 'hat' ? 7000 : row === 'snare' ? 1800 : 1200;
      const length = row === 'hat' ? 0.05 : row === 'snare' ? 0.18 : 0.12;
      g.gain.setValueAtTime(row === 'hat' ? 0.4 : 0.8, at);
      g.gain.exponentialRampToValueAtTime(0.001, at + length);
      src.connect(filter).connect(g).connect(out);
      src.start(at, Math.random());
      src.stop(at + length + 0.02);
    }
    const cells = pattern.map((row, r) => row.map((on, i) => h('button', {
      type: 'button', class: `bt-cell${on ? ' on' : ''}${i % 4 === 0 ? ' beat' : ''}`,
      onclick: (e) => {
        pattern[r][i] = !pattern[r][i];
        e.currentTarget.classList.toggle('on', pattern[r][i]);
        if (pattern[r][i]) hit(ROWS[r]);
        save();
      },
    })));
    function play() {
      timer = setInterval(() => {
        step = (step + 1) % 8;
        cells.forEach((row) => row.forEach((cell, i) => cell.classList.toggle('now', i === step)));
        pattern.forEach((row, r) => { if (row[step]) hit(ROWS[r]); });
      }, 60000 / Number(tempo.value) / 2);
      paint();
    }
    function stop() {
      clearInterval(timer);
      timer = null;
      paint();
    }
    const playButton = h('button', { type: 'button', class: 'btn primary', onclick: () => (timer ? stop() : play()) });
    const paint = () => playButton.replaceChildren(icon(timer ? 'pause' : 'play'), h('span', { i18n: timer ? 'bt.stop' : 'bt.play' }));
    win.disposers.push(stop);
    body.append(h('div', { class: 'b3 bt' },
      h('div', { class: 'bt-grid' }, ROWS.map((row, r) => [h('span', { class: 'bt-name', i18n: `bt.${row}` }), ...cells[r]])),
      h('div', { class: 'b3-row' }, playButton,
        h('label', { class: 'b3-field' }, h('span', { i18n: 'bt.tempo' }), tempo, tempoLabel),
        h('button', { type: 'button', class: 'btn ghost', i18n: 'bt.clear', onclick: () => {
          pattern.forEach((row) => row.fill(false));
          cells.flat().forEach((cell) => cell.classList.remove('on'));
          save();
        } }))));
    paint();
  });

  // 12. Дневник настроения: одна отметка в день и календарь месяца.
  app('mood', [460, 580], (body, win) => {
    const FACES = ['😄', '🙂', '😐', '😕', '😢', '😡', '🥰', '😴'];
    let month = new Date();
    month.setDate(1);
    const today = h('div', { class: 'md-faces' });
    const title = h('b', { class: 'md-title' });
    const grid = h('div', { class: 'md-grid' });
    const often = h('p', { class: 'b3-sub' });
    function paint() {
      const moods = state.moods || {};
      today.replaceChildren(...FACES.map((face) => h('button', {
        type: 'button', class: `md-face${moods[dayKey()] === face ? ' on' : ''}`,
        onclick: () => { state.moods = { ...moods, [dayKey()]: face }; save(); paint(); },
      }, face)));
      title.textContent = BOS.fmt(month, { month: 'long', year: 'numeric' });
      const first = (month.getDay() + 6) % 7;
      const length = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
      const weekdays = Array.from({ length: 7 }, (_, i) => BOS.fmt(new Date(2024, 0, 1 + i), { weekday: 'narrow' }));
      grid.replaceChildren(
        ...weekdays.map((d) => h('span', { class: 'md-wd' }, d)),
        ...Array.from({ length: first }, () => h('span')),
        ...Array.from({ length }, (_, i) => {
          const key = dayKey(new Date(month.getFullYear(), month.getMonth(), i + 1));
          return h('span', { class: `md-day${key === dayKey() ? ' today' : ''}` }, h('small', {}, String(i + 1)), moods[key] || '');
        }));
      const counts = {};
      Object.values(moods).forEach((face) => { counts[face] = (counts[face] || 0) + 1; });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      often.dataset.i18n = top ? 'md.often' : 'md.empty';
      often.i18nVars = { e: top ? top[0] : '' };
      BOS.applyI18nTo(often);
    }
    const shift = (n) => { month = new Date(month.getFullYear(), month.getMonth() + n, 1); paint(); };
    win.listen('lang', paint);
    body.append(h('div', { class: 'b3 md' },
      h('h3', { i18n: 'md.today' }), today,
      h('div', { class: 'md-head' },
        h('button', { type: 'button', class: 'round', onclick: () => shift(-1) }, icon('left')), title,
        h('button', { type: 'button', class: 'round', onclick: () => shift(1) }, icon('right'))),
      grid, often));
    paint();
  });

  // 13. Шифровальщик: Цезарь, Зеркало, Атбаш и Эмодзи-код.
  app('cipher', [500, 560], (body, win) => {
    const root = h('div', { class: 'b3 cp' });
    const toast = toaster(root);
    const RU = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
    const EN = 'abcdefghijklmnopqrstuvwxyz';
    const EMOJI = [...'🍎🍌🍇🍉🍓🍒🍑🥝🍍🥥🥑🍆🥕🌽🍄🌰🍞🧀🍔🍕🌮🍣🍩🍪🎂🍫🍬🍭🍯🥛☕🍵🧃🐶🐱🐭🐹🐰🦊🐻🐼🐨🐯🦁🐮🐷🐸🐵🐔🐧🐦🐤🦆🦉🐺🐴🦄🐝🐞🦋'];
    const LETTERS = [...EN, ...RU];
    const input = h('textarea', { class: 'input cp-text', rows: 4, i18nPh: 'cp.input' });
    const output = h('textarea', { class: 'input cp-text', rows: 4, readOnly: true });
    const method = h('select', { class: 'input', onchange: () => { shiftField.hidden = method.value !== 'caesar'; } },
      ['caesar', 'mirror', 'atbash', 'emoji'].map((m) => h('option', { value: m, i18n: `cp.${m}` })));
    const shift = h('input', { class: 'input', type: 'number', min: 1, max: 32, value: 3 });
    const shiftField = h('label', { class: 'b3-field' }, h('span', { i18n: 'cp.shift' }), shift);
    // Сдвиг буквы по своему алфавиту с сохранением заглавных.
    const mapLetters = (text, fn) => [...text].map((ch) => {
      const lower = ch.toLowerCase();
      const abc = RU.includes(lower) ? RU : EN.includes(lower) ? EN : null;
      if (!abc) return ch;
      const out = abc[fn(abc.indexOf(lower), abc.length)];
      return ch === lower ? out : out.toUpperCase();
    }).join('');
    function run(decode) {
      const text = input.value;
      const n = Number(shift.value) || 3;
      let out = '';
      if (method.value === 'caesar') out = mapLetters(text, (i, len) => ((i + (decode ? -n : n)) % len + len) % len);
      else if (method.value === 'mirror') out = [...text].reverse().join('');
      else if (method.value === 'atbash') out = mapLetters(text, (i, len) => len - 1 - i);
      else if (!decode) out = [...text].map((ch) => { const i = LETTERS.indexOf(ch.toLowerCase()); return i >= 0 ? EMOJI[i] : ch; }).join('');
      else out = [...text].map((ch) => { const i = EMOJI.indexOf(ch); return i >= 0 ? LETTERS[i] : ch; }).join('');
      output.value = out;
    }
    root.append(input,
      h('div', { class: 'b3-row' }, h('label', { class: 'b3-field' }, h('span', { i18n: 'cp.method' }), method), shiftField),
      h('div', { class: 'b3-row' },
        h('button', { type: 'button', class: 'btn primary', onclick: () => run(false) }, icon('lock'), h('span', { i18n: 'cp.encode' })),
        h('button', { type: 'button', class: 'btn outline', onclick: () => run(true) }, icon('check'), h('span', { i18n: 'cp.decode' }))),
      output,
      h('button', { type: 'button', class: 'btn ghost', onclick: () => { copy(output.value); toast('cp.copied'); } }, icon('external'), h('span', { i18n: 'cp.copy' })));
    body.append(root);
  });

  // 14. Фокус-капля: таймер работы и отдыха. Пока вы работаете, капля наполняется.
  app('focus', [420, 600], (body, win) => {
    const LENGTHS = [15, 25, 45];
    let minutes = state.focusLen || 25;
    let mode = 'focus';
    let left = minutes * 60;
    let timer = null;
    const clock = h('b', { class: 'fc-time' });
    const label = h('p', { class: 'fc-mode' });
    const drop = h('div', { class: 'fc-drop' });
    const count = h('p', { class: 'b3-sub' });
    const startButton = h('button', { type: 'button', class: 'btn primary', onclick: () => (timer ? pause() : start()) });
    const lengths = h('div', { class: 'b3-chips' }, LENGTHS.map((m) => h('button', { type: 'button', class: 'chip', onclick: () => { if (timer) return; minutes = m; state.focusLen = m; save(); reset(); } }, `${m}′`)));
    const total = () => (mode === 'focus' ? minutes : 5) * 60;
    function paint() {
      clock.textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
      label.dataset.i18n = mode === 'focus' ? 'fc.focus' : 'fc.break';
      BOS.applyI18nTo(label);
      const share = 1 - left / total();
      const level = mode === 'focus' ? share : 1 - share;
      drop.innerHTML = `<svg viewBox="0 0 100 130"><defs><clipPath id="fc-clip"><path d="M50 4C50 4 92 52 92 80a42 42 0 0 1-84 0C8 52 50 4 50 4z"/></clipPath>
        <linearGradient id="fc-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#67e8f9"/><stop offset="1" stop-color="#2563eb"/></linearGradient></defs>
        <path d="M50 4C50 4 92 52 92 80a42 42 0 0 1-84 0C8 52 50 4 50 4z" fill="rgba(255,255,255,.25)" stroke="rgba(255,255,255,.8)" stroke-width="2"/>
        <g clip-path="url(#fc-clip)"><rect x="0" y="${(122 - level * 118).toFixed(1)}" width="100" height="130" fill="url(#fc-water)"/>
        <path d="M0 ${(122 - level * 118).toFixed(1)}q12 -5 25 0t25 0t25 0t25 0v4H0z" fill="#a5f3fc" opacity=".8"/></g>
        <ellipse cx="34" cy="62" rx="6" ry="14" fill="#fff" opacity=".4" transform="rotate(20 34 62)"/></svg>`;
      startButton.replaceChildren(icon(timer ? 'pause' : 'play'), h('span', { i18n: timer ? 'fc.pause' : 'fc.start' }));
      const today = state.focusDay === dayKey() ? state.focusCount || 0 : 0;
      count.dataset.i18n = 'fc.today';
      count.i18nVars = { n: today };
      BOS.applyI18nTo(count);
      lengths.querySelectorAll('.chip').forEach((chip, i) => chip.classList.toggle('active', LENGTHS[i] === minutes));
    }
    function start() {
      timer = setInterval(() => {
        left--;
        if (left <= 0) finish();
        paint();
      }, 1000);
      paint();
    }
    function pause() { clearInterval(timer); timer = null; paint(); }
    function reset() { pause(); mode = 'focus'; left = total(); paint(); }
    function finish() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.5, 'sine', 0.2, i * 0.15));
      if (mode === 'focus') {
        state.focusCount = (state.focusDay === dayKey() ? state.focusCount || 0 : 0) + 1;
        state.focusDay = dayKey();
        save();
        mode = 'break';
      } else {
        mode = 'focus';
      }
      left = total();
    }
    win.disposers.push(() => clearInterval(timer));
    body.append(h('div', { class: 'b3 fc' }, label, drop, clock, lengths,
      h('div', { class: 'b3-row' }, startButton, h('button', { type: 'button', class: 'btn ghost', onclick: reset }, icon('restart'), h('span', { i18n: 'fc.reset' }))),
      count));
    reset();
  });

  // 15. Сказочник: каждая сказка собирается заново из героев, мест и чудес.
  app('tales', [520, 600], (body, win) => {
    const root = h('div', { class: 'b3 tl' });
    const toast = toaster(root);
    const WORDS = {
      ru: {
        hero: ['маленькая лисичка Тиша', 'робот Болтик', 'смелая мышка Пуговка', 'дракончик Уголёк', 'девочка Соня', 'ёжик Колючкин', 'кот-изобретатель Мурлин', 'облачко Пушок'],
        place: ['на краю Звёздного леса', 'в городе из стекла', 'на острове говорящих ракушек', 'в старой башне у моря', 'в долине поющих цветов', 'на самой высокой горе'],
        problem: ['пропал весь свет из фонарей', 'замолчали все птицы', 'река перестала течь', 'потерялся ключ от радуги', 'луна застряла за тучей', 'сломались часы, и время остановилось'],
        helper: ['мудрая черепаха', 'весёлый ветер', 'светлячок по имени Искра', 'старая сова', 'добрый великан', 'волшебный компас'],
        item: ['стеклянный колокольчик', 'карту из листьев', 'светящийся камешек', 'перо жар-птицы', 'песню без слов', 'горсть звёздной пыли'],
        ending: ['С тех пор там каждый вечер устраивают праздник.', 'И все поняли, что дружба сильнее любых чудес.', 'А по ночам в небе загорается новая звезда — в честь героя.', 'Теперь об этом поют даже ракушки.'],
        tpl: (w) => [
          `Жил-был ${w.hero}, и жил он ${w.place}.`,
          `Однажды случилась беда: ${w.problem}.`,
          `Все растерялись, но ${w.hero.split(' ').slice(-1)[0]} не испугался и отправился в путь.`,
          `По дороге встретился ${w.helper} и подарил ${w.item}.`,
          `С этим подарком герой всё исправил. ${w.ending}`,
        ],
      },
      en: {
        hero: ['a little fox named Tish', 'a robot called Bolt', 'a brave mouse named Button', 'a tiny dragon called Ember', 'a girl named Sonya', 'a hedgehog called Prickles', 'an inventor cat named Merlin', 'a small cloud called Puff'],
        place: ['at the edge of the Star Forest', 'in a city made of glass', 'on an island of talking shells', 'in an old tower by the sea', 'in a valley of singing flowers', 'on the highest mountain'],
        problem: ['all the lanterns lost their light', 'every bird went silent', 'the river stopped flowing', 'the key to the rainbow went missing', 'the moon got stuck behind a cloud', 'the clocks broke and time stood still'],
        helper: ['a wise old turtle', 'a cheerful wind', 'a firefly named Spark', 'an old owl', 'a kind giant', 'a magic compass'],
        item: ['a glass bell', 'a map made of leaves', 'a glowing pebble', 'a firebird feather', 'a song without words', 'a handful of stardust'],
        ending: ['Ever since, there is a party there every evening.', 'And everyone learned that friendship is stronger than any magic.', 'And each night a new star shines in the sky in the hero’s honour.', 'Now even the shells sing about it.'],
        tpl: (w) => [
          `Once upon a time there was ${w.hero}, who lived ${w.place}.`,
          `One day trouble came: ${w.problem}.`,
          'Everyone was lost, but our hero was not afraid and set off on a journey.',
          `On the way they met ${w.helper}, who gave them ${w.item}.`,
          `With that gift the hero set everything right. ${w.ending}`,
        ],
      },
    };
    const story = h('div', { class: 'tl-story b3-card' });
    let text = '';
    function make() {
      const set = isRu() ? WORDS.ru : WORDS.en;
      const words = Object.fromEntries(['hero', 'place', 'problem', 'helper', 'item', 'ending'].map((k) => [k, pick(set[k])]));
      const lines = set.tpl(words).map((line) => line.charAt(0).toUpperCase() + line.slice(1));
      text = lines.join(' ');
      story.replaceChildren(h('span', { class: 'tl-cap' }, lines[0][0]), ...lines.map((line, i) => h('p', {}, i ? line : line.slice(1))));
    }
    const read = h('button', { type: 'button', class: 'btn outline', onclick: () => {
      if (!window.speechSynthesis) return;
      if (speechSynthesis.speaking) { speechSynthesis.cancel(); return; }
      const say = new SpeechSynthesisUtterance(text);
      say.lang = isRu() ? 'ru-RU' : 'en-US';
      speechSynthesis.speak(say);
    } }, icon('volume'), h('span', { i18n: 'tl.read' }));
    if (!window.speechSynthesis) read.disabled = true;
    win.disposers.push(() => { if (window.speechSynthesis) speechSynthesis.cancel(); });
    root.append(story,
      h('div', { class: 'b3-row' },
        h('button', { type: 'button', class: 'btn primary', onclick: make }, icon('spark'), h('span', { i18n: 'tl.new' })),
        read,
        h('button', { type: 'button', class: 'btn ghost', onclick: () => {
          state.notes = `${state.notes ? `${state.notes}\n\n` : ''}${text}`;
          save();
          toast('tl.saved');
        } }, icon('notes'), h('span', { i18n: 'tl.notes' }))));
    body.append(root);
    win.listen('lang', make);
    make();
  });
})();
