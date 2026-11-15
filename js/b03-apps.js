// BOS 03: 15 приложений, которых нет ни в одном другом магазине, — только в B Store.
// Все придуманы для BOS и работают прямо на устройстве, без интернета.
(function () {
  if (!BOS.is03) return;
  const { h, icon, state, t } = BOS;

  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const rand = (n) => Math.floor(Math.random() * n);
  const pick = (list) => list[rand(list.length)];
  const save = () => BOS.save();
  const isRu = () => ['ru', 'uk', 'kk'].includes(state.lang);

  // Один общий звуковой движок для всех приложений.
  let audioCtx = null;
  function audio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }
  function tone(freq, length = 0.6, type = 'sine', level = 0.25, when = 0) {
    const ctx = audio();
    const at = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(level * BOS.state.volume, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + length + 0.05);
  }
  function noiseBuffer(kind) {
    const ctx = audio();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    let b = [0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      if (kind === 'brown') {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      } else if (kind === 'pink') {
        b[0] = 0.99886 * b[0] + white * 0.0555179; b[1] = 0.99332 * b[1] + white * 0.0750759;
        b[2] = 0.969 * b[2] + white * 0.153852; b[3] = 0.8665 * b[3] + white * 0.3104856;
        b[4] = 0.55 * b[4] + white * 0.5329522; b[5] = -0.7616 * b[5] - white * 0.016898;
        data[i] = (b[0] + b[1] + b[2] + b[3] + b[4] + b[5] + b[6] + white * 0.5362) * 0.11;
        b[6] = white * 0.115926;
      } else {
        data[i] = white * 0.5;
      }
    }
    return buffer;
  }
  function copy(text) {
    try { navigator.clipboard.writeText(text); } catch {}
  }
  // Короткая всплывающая подсказка внизу приложения.
  function toaster(root) {
    const el = h('p', { class: 'b3-toast', hidden: true });
    root.append(el);
    let timer;
    return (key, vars) => {
      el.dataset.i18n = key;
      el.i18nVars = vars;
      BOS.applyI18nTo(el);
      el.hidden = false;
      clearTimeout(timer);
      timer = setTimeout(() => { el.hidden = true; }, 1800);
    };
  }
  // Холст, который сам подстраивается под размер окна.
  function fitCanvas(canvas, win, onResize) {
    const observer = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
      canvas.getContext('2d').setTransform(ratio, 0, 0, ratio, 0, 0);
      onResize(rect.width, rect.height);
    });
    observer.observe(canvas);
    win.disposers.push(() => observer.disconnect());
  }
  const app = (id, size, mount) => {
    BOS.apps[id] = { title: `app.${id}`, icon: id, width: size[0], height: size[1], minWidth: 320, minHeight: 360, mount };
  };

  // 1. Пузыри мыслей: напишите мысль — она улетит пузырём. Нажмите на пузырь, и он лопнет.
  app('bubbles', [480, 560], (body, win) => {
    let popped = 0;
    const area = h('div', { class: 'bb-area' });
    const count = h('p', { class: 'b3-sub' });
    const paintCount = () => { count.dataset.i18n = 'bb.popped'; count.i18nVars = { n: popped }; BOS.applyI18nTo(count); };
    const input = h('input', { class: 'input', maxLength: 80, i18nPh: 'bb.ph' });
    function release(text) {
      const size = Math.min(170, 90 + text.length * 2.2);
      const bubble = h('button', {
        type: 'button', class: 'bb-bubble',
        style: `left:${5 + rand(70)}%;width:${size}px;height:${size}px;--dur:${9 + rand(6)}s;--sway:${rand(2) ? '' : '-'}${20 + rand(30)}px;--hue:${rand(360)}`,
        onclick: () => {
          bubble.classList.add('pop');
          tone(880 + rand(400), 0.15, 'triangle', 0.2);
          popped++;
          paintCount();
          setTimeout(() => bubble.remove(), 250);
        },
      }, h('span', {}, text));
      bubble.addEventListener('animationend', (e) => { if (e.animationName === 'bb-float') bubble.remove(); });
      area.append(bubble);
    }
    body.append(h('div', { class: 'b3 bb' },
      h('p', { class: 'b3-sub', i18n: 'bb.hint' }),
      area,
      h('form', { class: 'b3-row', onsubmit: (e) => { e.preventDefault(); const text = input.value.trim(); if (text) release(text); input.value = ''; } },
        input, h('button', { type: 'submit', class: 'btn primary', i18n: 'bb.go' })),
      count));
    paintCount();
  });

  // 2. Цветомикс: смешайте два цвета и сохраните в палитру.
  app('colormix', [440, 560], (body, win) => {
    const root = h('div', { class: 'b3 cm' });
    const toast = toaster(root);
    const a = h('input', { type: 'color', value: state.cmA || '#38bdf8', oninput: paint });
    const b = h('input', { type: 'color', value: state.cmB || '#f472b6', oninput: paint });
    const ratio = h('input', { type: 'range', min: 0, max: 100, value: 50, oninput: paint });
    const result = h('div', { class: 'cm-result' });
    const hex = h('b', { class: 'cm-hex' });
    const palette = h('div', { class: 'cm-palette' });
    const parse = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
    const mixed = () => {
      const k = ratio.value / 100;
      const [x, y] = [parse(a.value), parse(b.value)];
      return `#${x.map((v, i) => Math.round(v * (1 - k) + y[i] * k).toString(16).padStart(2, '0')).join('')}`;
    };
    function paint() {
      state.cmA = a.value;
      state.cmB = b.value;
      const color = mixed();
      result.style.background = `linear-gradient(90deg, ${a.value}, ${color} 50%, ${b.value})`;
      result.style.setProperty('--mix', color);
      hex.textContent = color.toUpperCase();
    }
    function paintPalette() {
      const list = state.palette || [];
      palette.replaceChildren(...(list.length
        ? list.map((color) => h('button', { type: 'button', class: 'cm-swatch', style: `background:${color}`, title: color, onclick: () => { copy(color); toast('cm.copied', { hex: color }); } }))
        : [h('p', { class: 'b3-sub', i18n: 'cm.empty' })]));
    }
    root.append(
      h('div', { class: 'cm-pick' }, h('label', {}, a), h('span', { class: 'cm-plus' }, '+'), h('label', {}, b)),
      ratio,
      result,
      h('div', { class: 'b3-row' }, hex,
        h('button', { type: 'button', class: 'btn primary', onclick: () => {
          state.palette = [mixed(), ...(state.palette || []).filter((c) => c !== mixed())].slice(0, 24);
          save();
          paintPalette();
        } }, icon('plus'), h('span', { i18n: 'cm.save' }))),
      h('h3', { i18n: 'cm.palette' }),
      palette,
      h('button', { type: 'button', class: 'btn ghost', i18n: 'cm.clear', onclick: () => { state.palette = []; save(); paintPalette(); } }));
    body.append(root);
    paint();
    paintPalette();
    win.disposers.push(save);
  });

  // 3. Мои созвездия: ставьте звёзды на небе, они соединяются линиями.
  app('stars', [620, 520], (body, win) => {
    const canvas = h('canvas', { class: 'st-sky' });
    const name = h('input', { class: 'input', maxLength: 30, i18nPh: 'st.name' });
    const list = h('div', { class: 'st-list' });
    let current = [];
    let W = 1;
    let H = 1;
    const background = Array.from({ length: 160 }, () => [Math.random(), Math.random(), Math.random() * 1.3 + 0.2]);
    function draw() {
      const g = canvas.getContext('2d');
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#0b1030');
      sky.addColorStop(1, '#2a1250');
      g.fillStyle = sky;
      g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,.55)';
      background.forEach(([x, y, r]) => { g.beginPath(); g.arc(x * W, y * H, r, 0, Math.PI * 2); g.fill(); });
      const shape = (pts, color, glow) => {
        g.strokeStyle = color;
        g.lineWidth = 1.5;
        g.beginPath();
        pts.forEach(([x, y], i) => (i ? g.lineTo(x * W, y * H) : g.moveTo(x * W, y * H)));
        g.stroke();
        pts.forEach(([x, y]) => {
          g.shadowColor = glow;
          g.shadowBlur = 12;
          g.fillStyle = '#fff';
          g.beginPath();
          g.arc(x * W, y * H, 3.2, 0, Math.PI * 2);
          g.fill();
          g.shadowBlur = 0;
        });
      };
      (state.constellations || []).forEach((c) => shape(c.pts, 'rgba(147,197,253,.35)', '#93c5fd'));
      shape(current, 'rgba(253,224,71,.85)', '#fde047');
    }
    function paintList() {
      list.replaceChildren(...(state.constellations || []).map((c, i) => h('span', { class: 'st-chip' }, c.name,
        h('button', { type: 'button', class: 'round', i18nTitle: 'docs.delete', onclick: () => {
          state.constellations.splice(i, 1);
          save();
          paintList();
          draw();
        } }, icon('close')))));
    }
    canvas.addEventListener('pointerdown', (e) => {
      const rect = canvas.getBoundingClientRect();
      current.push([(e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height]);
      tone(660 + current.length * 60, 0.4, 'sine', 0.15);
      draw();
    });
    fitCanvas(canvas, win, (w, hgt) => { W = w; H = hgt; draw(); });
    body.append(h('div', { class: 'b3 st' },
      h('p', { class: 'b3-sub', i18n: 'st.hint' }),
      canvas,
      h('div', { class: 'b3-row' }, name,
        h('button', { type: 'button', class: 'btn primary', i18n: 'st.save', onclick: () => {
          if (current.length < 2) return;
          state.constellations = [...(state.constellations || []), { name: name.value.trim() || t('st.untitled'), pts: current }];
          save();
          current = [];
          name.value = '';
          paintList();
          draw();
        } }),
        h('button', { type: 'button', class: 'btn ghost', i18n: 'st.new', onclick: () => { current = []; draw(); } })),
      list));
    paintList();
  });

  // 4. Сонный барашек: звуки для сна, таймер и барашки, прыгающие через забор.
  app('sheep', [440, 560], (body, win) => {
    const SOUNDS = { rain: ['pink', 4000, 0], waves: ['brown', 1200, 0.12], wind: ['pink', 700, 0.18], white: ['white', 9000, 0] };
    let kind = 'rain';
    let nodes = null;
    let stopAt = 0;
    let counted = 0;
    const count = h('b', { class: 'sh-count' });
    const left = h('p', { class: 'b3-sub' });
    const field = h('div', { class: 'sh-field' }, h('span', { class: 'sh-fence' }), h('span', { class: 'sh-sheep' }, '🐑'));
    const volume = h('input', { type: 'range', min: 0, max: 100, value: 60, oninput: () => { if (nodes) nodes.gain.gain.value = volume.value / 100 * 0.6; } });
    const timer = h('select', { class: 'input' }, [0, 15, 30, 60].map((m) => h('option', { value: m, i18n: m ? 'sh.min' : 'sh.off', i18nVars: { n: m } })));
    const playButton = h('button', { type: 'button', class: 'btn primary', onclick: () => (nodes ? stop() : play()) });
    const kinds = Object.keys(SOUNDS).map((id) => h('button', { type: 'button', class: 'chip', i18n: `sh.${id}`, onclick: () => { kind = id; paintKinds(); if (nodes) { stop(); play(); } } }));
    const paintKinds = () => kinds.forEach((chip, i) => chip.classList.toggle('active', Object.keys(SOUNDS)[i] === kind));
    function play() {
      const ctx = audio();
      const [noise, cutoff, sway] = SOUNDS[kind];
      const source = ctx.createBufferSource();
      source.buffer = noiseBuffer(noise);
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = cutoff;
      const gain = ctx.createGain();
      gain.gain.value = volume.value / 100 * 0.6;
      source.connect(filter).connect(gain).connect(ctx.destination);
      let lfo = null;
      if (sway) {
        lfo = ctx.createOscillator();
        const depth = ctx.createGain();
        lfo.frequency.value = sway;
        depth.gain.value = cutoff * 0.6;
        lfo.connect(depth).connect(filter.frequency);
        lfo.start();
      }
      source.start();
      nodes = { source, gain, lfo };
      stopAt = Number(timer.value) ? Date.now() + Number(timer.value) * 60000 : 0;
      field.classList.add('on');
      paint();
    }
    function stop() {
      if (!nodes) return;
      nodes.source.stop();
      if (nodes.lfo) nodes.lfo.stop();
      nodes = null;
      field.classList.remove('on');
      paint();
    }
    function paint() {
      playButton.replaceChildren(icon(nodes ? 'pause' : 'play'), h('span', { i18n: nodes ? 'sh.stop' : 'sh.play' }));
      count.dataset.i18n = 'sh.count';
      count.i18nVars = { n: counted };
      BOS.applyI18nTo(count);
      left.textContent = nodes && stopAt ? `⏾ ${Math.max(0, Math.ceil((stopAt - Date.now()) / 60000))}′` : '';
    }
    field.querySelector('.sh-sheep').addEventListener('animationiteration', () => { counted++; paint(); });
    const tick = setInterval(() => {
      if (nodes && stopAt && Date.now() >= stopAt) stop();
      else if (nodes) paint();
    }, 5000);
    win.disposers.push(() => { clearInterval(tick); stop(); });
    body.append(h('div', { class: 'b3 sh' }, field, count,
      h('div', { class: 'b3-chips' }, kinds),
      h('label', { class: 'b3-field' }, icon('volume'), volume),
      h('label', { class: 'b3-field' }, h('span', { i18n: 'sh.timer' }), timer),
      playButton, left));
    paintKinds();
    paint();
  });

  // 5. Калейдоскоп: рисунок отражается во все стороны.
  app('kaleido', [560, 620], (body, win) => {
    const root = h('div', { class: 'b3 kd' });
    const toast = toaster(root);
    const canvas = h('canvas', { class: 'kd-canvas' });
    let W = 1;
    let mirrors = 8;
    let hue = rand(360);
    let last = null;
    const size = h('input', { type: 'range', min: 1, max: 14, value: 4 });
    const mirrorSel = h('select', { class: 'input', onchange: () => { mirrors = Number(mirrorSel.value); } }, [6, 8, 12].map((n) => h('option', { value: n, selected: n === 8 }, String(n))));
    function clear() {
      const g = canvas.getContext('2d');
      g.fillStyle = '#0b0b16';
      g.fillRect(0, 0, W, W);
    }
    function stroke(from, to) {
      const g = canvas.getContext('2d');
      const c = W / 2;
      g.lineCap = 'round';
      g.lineWidth = Number(size.value);
      g.strokeStyle = `hsl(${hue} 90% 62%)`;
      g.shadowColor = g.strokeStyle;
      g.shadowBlur = 8;
      for (let i = 0; i < mirrors; i++) {
        const angle = (Math.PI * 2 * i) / mirrors;
        for (const flip of [1, -1]) {
          g.save();
          g.translate(c, c);
          g.rotate(angle);
          g.scale(1, flip);
          g.beginPath();
          g.moveTo(from[0] - c, from[1] - c);
          g.lineTo(to[0] - c, to[1] - c);
          g.stroke();
          g.restore();
        }
      }
      g.shadowBlur = 0;
      hue = (hue + 1.5) % 360;
    }
    const at = (e) => {
      const rect = canvas.getBoundingClientRect();
      return [((e.clientX - rect.left) / rect.width) * W, ((e.clientY - rect.top) / rect.height) * W];
    };
    canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); last = at(e); });
    canvas.addEventListener('pointermove', (e) => { if (!last) return; const p = at(e); stroke(last, p); last = p; });
    canvas.addEventListener('pointerup', () => { last = null; });
    fitCanvas(canvas, win, (w) => { W = w; clear(); });
    root.append(
      h('p', { class: 'b3-sub', i18n: 'kd.hint' }),
      canvas,
      h('div', { class: 'b3-row' },
        h('label', { class: 'b3-field' }, h('span', { i18n: 'kd.mirrors' }), mirrorSel),
        h('label', { class: 'b3-field' }, icon('edit'), size)),
      h('div', { class: 'b3-row' },
        h('button', { type: 'button', class: 'btn ghost', onclick: clear }, icon('trash'), h('span', { i18n: 'kd.clear' })),
        h('button', { type: 'button', class: 'btn primary', onclick: () => canvas.toBlob(async (blob) => {
          if (!blob || !BOS.saveToFiles) return;
          await BOS.saveToFiles(blob, `${t('app.kaleido')} ${dayKey()}.png`);
          toast('kd.saved');
        }, 'image/png') }, icon('download'), h('span', { i18n: 'kd.save' }))));
    body.append(root);
  });

  // 6. Дерево привычек: отмечайте дни — на дереве появляются листья.
  app('habits', [520, 600], (body, win) => {
    const input = h('input', { class: 'input', maxLength: 40, i18nPh: 'hb.ph' });
    const list = h('div', { class: 'hb-list' });
    const tree = h('div', { class: 'hb-tree' });
    const leaves = h('p', { class: 'b3-sub' });
    const days = () => Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return d; });
    function paintTree() {
      const total = (state.habits || []).reduce((sum, habit) => sum + habit.days.length, 0);
      const shown = Math.min(total, 80);
      let dots = '';
      for (let i = 0; i < shown; i++) {
        const angle = i * 2.4;
        const r = 14 + Math.sqrt(i) * 9;
        dots += `<ellipse cx="${(120 + Math.cos(angle) * r).toFixed(1)}" cy="${(92 + Math.sin(angle) * r * 0.75).toFixed(1)}" rx="7" ry="4.5" transform="rotate(${(angle * 57) % 360} ${(120 + Math.cos(angle) * r).toFixed(1)} ${(92 + Math.sin(angle) * r * 0.75).toFixed(1)})" fill="hsl(${100 + (i * 7) % 50} 65% ${40 + (i % 3) * 8}%)"/>`;
      }
      tree.innerHTML = `<svg viewBox="0 0 240 220"><path d="M112 220 L116 120 Q120 100 124 120 L128 220Z" fill="#92400e"/><path d="M120 150 Q100 130 90 112M120 140 Q140 120 152 104" stroke="#92400e" stroke-width="5" fill="none" stroke-linecap="round"/>${dots}</svg>`;
      leaves.dataset.i18n = 'hb.leaves';
      leaves.i18nVars = { n: total };
      BOS.applyI18nTo(leaves);
    }
    function paintList() {
      const habits = state.habits || [];
      list.replaceChildren(...(habits.length ? habits.map((habit) => h('div', { class: 'hb-habit b3-card' },
        h('b', {}, habit.name),
        h('div', { class: 'hb-days' }, days().map((d) => {
          const key = dayKey(d);
          const on = habit.days.includes(key);
          return h('button', {
            type: 'button', class: `hb-day${on ? ' on' : ''}`, title: BOS.fmtDate(d),
            onclick: () => {
              habit.days = on ? habit.days.filter((x) => x !== key) : [...habit.days, key];
              if (!on) tone(523 + rand(5) * 60, 0.3, 'triangle', 0.15);
              save();
              paintList();
              paintTree();
            },
          }, BOS.fmt(d, { weekday: 'narrow' }));
        })),
        h('button', { type: 'button', class: 'round', i18nTitle: 'docs.delete', onclick: () => { state.habits = habits.filter((x) => x !== habit); save(); paintList(); paintTree(); } }, icon('trash'))))
        : [h('p', { class: 'b3-sub', i18n: 'hb.empty' })]));
    }
    body.append(h('div', { class: 'b3 hb' }, tree, leaves,
      h('form', { class: 'b3-row', onsubmit: (e) => {
        e.preventDefault();
        if (!input.value.trim()) return;
        state.habits = [...(state.habits || []), { id: BOS.newId(), name: input.value.trim(), days: [] }];
        input.value = '';
        save();
        paintList();
      } }, input, h('button', { type: 'submit', class: 'btn primary', i18n: 'hb.add' })),
      list));
    paintTree();
    paintList();
  });

  // 7. Тайм-капсула: письмо себе в будущее, которое откроется только в выбранный день.
  app('capsule', [480, 580], (body, win) => {
    const text = h('textarea', { class: 'input tc-text', rows: 4, maxLength: 1000, i18nPh: 'tc.ph' });
    const tomorrow = new Date(Date.now() + 86400000);
    const date = h('input', { class: 'input', type: 'date', min: dayKey(tomorrow), value: dayKey(new Date(Date.now() + 7 * 86400000)) });
    const note = h('p', { class: 'field-note err', hidden: true, i18n: 'tc.needText' });
    const list = h('div', { class: 'tc-list' });
    function paint() {
      const capsules = state.capsules || [];
      const today = dayKey();
      list.replaceChildren(...(capsules.length ? capsules.map((c) => {
        const ready = c.openAt <= today;
        const daysLeft = Math.ceil((new Date(`${c.openAt}T00:00`) - Date.now()) / 86400000);
        const card = h('div', { class: `tc-capsule b3-card${ready ? ' ready' : ''}` },
          h('span', { class: 'tc-icon' }, ready ? '📬' : '🔒'),
          h('div', { class: 'tc-info' },
            h('b', { i18n: 'tc.from', i18nVars: { date: BOS.fmtDate(new Date(c.created)) } }),
            ready ? h('small', { i18n: 'tc.ready' }) : h('small', { i18n: 'tc.sealed', i18nVars: { date: BOS.fmtDate(new Date(`${c.openAt}T00:00`)), n: daysLeft } })),
          ready ? h('button', { type: 'button', class: 'btn primary', i18n: 'tc.open', onclick: () => {
            card.replaceWith(h('div', { class: 'tc-letter b3-card' }, h('b', { i18n: 'tc.from', i18nVars: { date: BOS.fmtDate(new Date(c.created)) } }), h('p', {}, c.text)));
          } }) : null,
          h('button', { type: 'button', class: 'round', i18nTitle: 'docs.delete', onclick: () => { state.capsules = capsules.filter((x) => x !== c); save(); paint(); } }, icon('trash')));
        return card;
      }) : [h('p', { class: 'b3-sub', i18n: 'tc.empty' })]));
    }
    body.append(h('div', { class: 'b3 tc' },
      h('form', { class: 'tc-form b3-card', onsubmit: (e) => {
        e.preventDefault();
        const ok = text.value.trim() && date.value && date.value > dayKey();
        note.hidden = Boolean(ok);
        if (!ok) return;
        state.capsules = [...(state.capsules || []), { id: BOS.newId(), text: text.value.trim(), created: Date.now(), openAt: date.value }];
        text.value = '';
        save();
        paint();
      } }, text,
        h('label', { class: 'b3-field' }, h('span', { i18n: 'tc.when' }), date),
        note,
        h('button', { type: 'submit', class: 'btn primary' }, icon('lock'), h('span', { i18n: 'tc.seal' }))),
      list));
    paint();
  });

  // 8. Ветерок: стеклянные трубочки звенят от касания или от ветра.
  app('chimes', [480, 520], (body, win) => {
    const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];
    let pressed = false;
    let wind = null;
    function ring(i) {
      const f = NOTES[i];
      tone(f, 2.2, 'sine', 0.22);
      tone(f * 2.76, 1.2, 'sine', 0.06);
      tone(f * 5.4, 0.6, 'sine', 0.03);
      const tube = tubes[i];
      tube.classList.remove('swing');
      void tube.offsetWidth;
      tube.classList.add('swing');
    }
    const tubes = NOTES.map((_, i) => {
      const tube = h('button', { type: 'button', class: 'ch-tube', style: `--len:${88 - i * 6}%;--hue:${180 + i * 18}`, onclick: () => ring(i) });
      tube.addEventListener('pointerenter', () => { if (pressed) ring(i); });
      return tube;
    });
    const windButton = h('button', { type: 'button', class: 'btn outline', onclick: () => {
      if (wind) { clearTimeout(wind); wind = null; } else blow();
      paintWind();
    } });
    function blow() {
      ring(rand(NOTES.length));
      wind = setTimeout(blow, 350 + rand(900));
    }
    const paintWind = () => { windButton.classList.toggle('on', Boolean(wind)); windButton.replaceChildren(h('span', {}, wind ? '🌬️' : '🍃'), h('span', { i18n: 'ch.wind' })); };
    const rack = h('div', { class: 'ch-rack', onpointerdown: () => { pressed = true; } }, tubes);
    const release = () => { pressed = false; };
    window.addEventListener('pointerup', release);
    win.disposers.push(() => { window.removeEventListener('pointerup', release); clearTimeout(wind); });
    body.append(h('div', { class: 'b3 ch' }, h('p', { class: 'b3-sub', i18n: 'ch.hint' }), rack, windButton));
    paintWind();
  });

  BOS.b03 = { audio, tone, noiseBuffer, copy, toaster, fitCanvas, app, dayKey, rand, pick, save, isRu };
})();
