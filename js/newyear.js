// BOS 03 New Year Edition: снегопад поверх обоев, отсчёт до Нового года и салют.
// Салют запускается кнопкой (в шторке, на отсчёте, в Адвент-календаре) и сам — ровно в полночь 1 января.
(function () {
  if (!BOS.isNY) return;
  const { h, state } = BOS;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Снег ----------
  const layers = new Set();
  function snowLayer() {
    const canvas = h('canvas', { class: 'ny-snow', 'aria-hidden': 'true' });
    let flakes = [];
    let W = 0;
    let H = 0;
    let frame = 0;
    function resize() {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width) return;
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      W = rect.width;
      H = rect.height;
      canvas.width = W * ratio;
      canvas.height = H * ratio;
      canvas.getContext('2d').setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.round(Math.min(220, (W * H) / (reduced ? 26000 : 9000)));
      flakes = Array.from({ length: count }, () => ({ x: Math.random() * W, y: Math.random() * H, r: 0.8 + Math.random() * 2.6, v: 0.3 + Math.random() * 0.9, p: Math.random() * 6.28 }));
    }
    function draw() {
      frame = 0;
      if (state.snow === false || !canvas.isConnected) return;
      if (!document.hidden) {
        const g = canvas.getContext('2d');
        g.clearRect(0, 0, W, H);
        g.fillStyle = 'rgba(255,255,255,.9)';
        for (const f of flakes) {
          f.p += 0.01;
          f.y += f.v * (reduced ? 0.4 : 1);
          f.x += Math.sin(f.p) * 0.35;
          if (f.y > H + 4) { f.y = -4; f.x = Math.random() * W; }
          g.globalAlpha = 0.45 + f.r / 6;
          g.beginPath();
          g.arc(f.x, f.y, f.r, 0, Math.PI * 2);
          g.fill();
        }
        g.globalAlpha = 1;
      }
      frame = requestAnimationFrame(draw);
    }
    const start = () => {
      canvas.hidden = state.snow === false;
      if (!canvas.hidden && !frame) frame = requestAnimationFrame(draw);
    };
    new ResizeObserver(() => { resize(); start(); }).observe(canvas);
    canvas.restart = start;
    layers.add(canvas);
    return canvas;
  }
  function setSnow(on) {
    state.snow = on;
    BOS.save();
    layers.forEach((canvas) => canvas.restart());
    BOS.emit('snow');
  }

  // ---------- Отсчёт до Нового года ----------
  function nextNewYear(now = new Date()) {
    return new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0);
  }
  // Первое января — праздник: весь день показываем поздравление.
  const isNewYearDay = (now = new Date()) => now.getMonth() === 0 && now.getDate() === 1;
  function countdown(className = '') {
    const el = h('button', { type: 'button', class: `ny-countdown ${className}`, i18nTitle: 'ny.fireworks', onclick: () => fireworks() });
    function paint() {
      const now = new Date();
      if (isNewYearDay(now)) {
        el.dataset.i18n = 'ny.happy';
        el.i18nVars = { y: now.getFullYear() };
      } else {
        const left = nextNewYear(now) - now;
        const days = Math.floor(left / 86400000);
        const hours = Math.floor((left % 86400000) / 3600000);
        const minutes = Math.floor((left % 3600000) / 60000);
        el.dataset.i18n = days ? 'ny.left' : 'ny.leftToday';
        el.i18nVars = { d: days, h: hours, m: minutes, y: nextNewYear(now).getFullYear() };
      }
      BOS.applyI18nTo(el);
    }
    BOS.on('lang', paint);
    BOS.on('nyTick', paint);
    paint();
    return el;
  }
  // Раз в секунду: обновляем отсчёт и ловим полночь.
  let lastYear = new Date().getFullYear();
  let lastMinute = -1;
  setInterval(() => {
    const now = new Date();
    if (now.getFullYear() !== lastYear) {
      lastYear = now.getFullYear();
      fireworks(12000);
    }
    if (now.getMinutes() !== lastMinute) {
      lastMinute = now.getMinutes();
      BOS.emit('nyTick');
    }
  }, 1000);

  // ---------- Салют ----------
  let show = null;
  function boom() {
    try {
      const ctx = BOS.b03 ? BOS.b03.audio() : new (window.AudioContext || window.webkitAudioContext)();
      const at = ctx.currentTime;
      const src = ctx.createBufferSource();
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 900 + Math.random() * 900;
      const gain = ctx.createGain();
      gain.gain.value = 0.5 * state.volume;
      src.connect(filter).connect(gain).connect(ctx.destination);
      src.start(at);
    } catch {}
  }
  function fireworks(duration = 6000) {
    const screen = document.getElementById('screen');
    if (!screen) return;
    if (show) { show.until = Date.now() + duration; return; }
    const canvas = h('canvas', { class: 'ny-fireworks', 'aria-hidden': 'true' });
    const banner = h('div', { class: 'ny-banner ny-title' });
    const year = isNewYearDay() ? new Date().getFullYear() : nextNewYear().getFullYear();
    banner.dataset.i18n = 'ny.happy';
    banner.i18nVars = { y: year };
    BOS.applyI18nTo(banner);
    screen.append(canvas, banner);
    const rect = screen.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    canvas.width = W;
    canvas.height = H;
    const g = canvas.getContext('2d');
    const rockets = [];
    const sparks = [];
    show = { until: Date.now() + duration };
    let next = 0;
    function launch() {
      rockets.push({ x: W * (0.15 + Math.random() * 0.7), y: H, vx: (Math.random() - 0.5) * 2, vy: -(H / 70 + Math.random() * 4), hue: Math.floor(Math.random() * 360) });
    }
    function burst(r) {
      boom();
      const count = 70 + Math.floor(Math.random() * 50);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const speed = 2 + Math.random() * 4;
        sparks.push({ x: r.x, y: r.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, hue: (r.hue + Math.random() * 40) % 360 });
      }
    }
    function tick() {
      const running = Date.now() < show.until;
      if (running && Date.now() > next) { launch(); next = Date.now() + 250 + Math.random() * 450; }
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = 'rgba(0,0,0,.22)';
      g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'lighter';
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.x += r.vx;
        r.y += r.vy;
        r.vy += 0.12;
        g.fillStyle = `hsl(${r.hue} 100% 75%)`;
        g.fillRect(r.x - 1.5, r.y - 1.5, 3, 3);
        if (r.vy >= -1) { burst(r); rockets.splice(i, 1); }
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.98;
        s.vy = s.vy * 0.98 + 0.06;
        s.life -= 0.012;
        if (s.life <= 0) { sparks.splice(i, 1); continue; }
        g.globalAlpha = s.life;
        g.fillStyle = `hsl(${s.hue} 100% ${55 + s.life * 25}%)`;
        g.beginPath();
        g.arc(s.x, s.y, 2.2, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      if (running || rockets.length || sparks.length) { requestAnimationFrame(tick); return; }
      canvas.remove();
      banner.remove();
      show = null;
    }
    requestAnimationFrame(tick);
  }

  BOS.ny = { snowLayer, setSnow, countdown, fireworks, nextNewYear };
})();
