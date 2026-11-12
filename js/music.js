// Приложение «Музыка». Здесь два вида песен:
// — песни BOS: их сочиняет сам код по короткому описанию (жанр, тональность, аккорды, зерно мелодии)
//   и играет через Web Audio, поэтому чужих авторских прав у них нет;
// — настоящие записи в общественном достоянии из js/music-records.js, они играют по ссылке.
// Любые песни можно собирать в плейлисты.
(function () {
  const { h, icon, state, t } = BOS;

  const SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
  };

  // Жанр задаёт темп, тембры, ритм ударных и характер мелодии.
  const STYLES = {
    lofi: {
      bpm: 80, meter: 4, swing: 0.14, density: 0.45,
      lead: 'triangle', leadLevel: 0.11, pad: 'sine', bass: 'sine', bassSteps: [0, 10], bassLength: 6, delay: 0.3,
      drums: { kick: 'x.......x.x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' },
    },
    synthwave: {
      bpm: 104, meter: 4, swing: 0, density: 0.5,
      lead: 'sawtooth', leadLevel: 0.05, leadFilter: 2600, pad: 'sawtooth', padFilter: 1400, bass: 'square', bassSteps: [0, 2, 4, 6, 8, 10, 12, 14], bassLength: 1.6, delay: 0.35,
      drums: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.' },
    },
    chiptune: {
      bpm: 140, meter: 4, swing: 0, density: 0.7, fast: true, arp: true,
      lead: 'square', leadLevel: 0.045, leadFilter: 4000, bass: 'triangle', bassSteps: [0, 4, 8, 12], bassLength: 3, delay: 0,
      drums: { kick: 'x.....x.x.......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' },
    },
    ambient: {
      bpm: 66, meter: 4, swing: 0, density: 0.22,
      lead: 'sine', leadLevel: 0.1, pad: 'triangle', padAttack: 1.4, bass: 'sine', bassSteps: [0], bassLength: 15, delay: 0.45,
    },
    house: {
      bpm: 122, meter: 4, swing: 0, density: 0.35, stabs: true,
      lead: 'sawtooth', leadLevel: 0.05, leadFilter: 2400, bass: 'sawtooth', bassSteps: [2, 6, 10, 14], bassLength: 1.8, delay: 0.3,
      drums: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.' },
    },
    waltz: {
      bpm: 150, meter: 3, swing: 0, density: 0.55, chordSteps: [4, 8],
      lead: 'triangle', leadLevel: 0.1, bass: 'triangle', bassSteps: [0], bassLength: 3, delay: 0.2,
    },
    funk: {
      bpm: 104, meter: 4, swing: 0.08, density: 0.5,
      lead: 'square', leadLevel: 0.045, leadFilter: 2200, bass: 'sawtooth', bassSteps: [0, 3, 6, 10, 11, 14], bassLength: 1.5, delay: 0.15,
      drums: { kick: 'x..x..x...x.....', snare: '....x..x....x...', hat: 'xxxxxxxxxxxxxxxx' },
    },
    lullaby: {
      bpm: 72, meter: 3, swing: 0, density: 0.35, bell: true,
      lead: 'sine', leadLevel: 0.1, pad: 'triangle', padAttack: 0.6, bass: 'sine', bassSteps: [0], bassLength: 11, delay: 0.4,
    },
  };

  // Аккорды записаны ступенями лада: 0 — тоника, 3 — субдоминанта, 4 — доминанта и так далее.
  const TRACKS = [
    { title: 'Синий лист', style: 'lofi', root: 62, scale: 'dorian', prog: [0, 3, 6, 4], seed: 11, hue: 215 },
    { title: 'Ночная трасса', style: 'synthwave', root: 57, scale: 'minor', prog: [0, 5, 2, 6], seed: 23, hue: 290 },
    { title: 'Пиксельный лес', style: 'chiptune', root: 60, scale: 'major', prog: [0, 4, 5, 3], seed: 37, hue: 140 },
    { title: 'Тихое облако', style: 'ambient', root: 64, scale: 'major', prog: [0, 3, 5, 3], seed: 41, hue: 195 },
    { title: 'Неоновый пульс', style: 'house', root: 58, scale: 'minor', prog: [0, 0, 5, 6], seed: 53, hue: 320 },
    { title: 'Вальс снежинок', style: 'waltz', root: 65, scale: 'major', prog: [0, 3, 4, 0, 5, 1, 4, 0], seed: 67, hue: 200 },
    { title: 'Медленный кот', style: 'funk', root: 55, scale: 'mixolydian', prog: [0, 0, 3, 0], seed: 71, hue: 30 },
    { title: 'Спи, BOS', style: 'lullaby', root: 67, scale: 'major', prog: [0, 5, 3, 4], seed: 83, hue: 260 },
    { title: 'Дождь за окном', style: 'lofi', root: 60, scale: 'minor', prog: [0, 5, 3, 4], seed: 97, hue: 230 },
    { title: 'Звёздный экспресс', style: 'synthwave', root: 62, scale: 'minor', prog: [0, 6, 5, 4], seed: 101, hue: 270 },
    { title: 'Восьмибитный герой', style: 'chiptune', root: 64, scale: 'minor', prog: [0, 5, 6, 4], seed: 113, hue: 100 },
    { title: 'Глубокое море', style: 'ambient', root: 57, scale: 'dorian', prog: [0, 6, 3, 4], seed: 127, hue: 185 },
    { title: 'Летний ритм', style: 'house', root: 62, scale: 'major', prog: [0, 4, 5, 3], seed: 131, hue: 45 },
    { title: 'Кружение листьев', style: 'waltz', root: 62, scale: 'minor', prog: [0, 3, 6, 2, 5, 3, 4, 4], seed: 149, hue: 25 },
    { title: 'Фиолетовый грув', style: 'funk', root: 57, scale: 'dorian', prog: [0, 3, 0, 4], seed: 157, hue: 275 },
    { title: 'Луна над городом', style: 'lullaby', root: 63, scale: 'major', prog: [0, 3, 1, 4], seed: 163, hue: 240 },
  ];
  const BARS = 32;

  const lengthOf = (track) => {
    const style = STYLES[track.style];
    return (BARS * style.meter * 60) / style.bpm;
  };
  const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

  function random(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let x = Math.imul(a ^ (a >>> 15), 1 | a);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Номер ступени лада → MIDI-нота. Ступень 0 — тоника в октаве, где лежит track.root.
  function pitch(track, index) {
    const scale = SCALES[track.scale];
    const octave = Math.floor(index / scale.length);
    return track.root + octave * 12 + scale[((index % scale.length) + scale.length) % scale.length];
  }

  // Мелодия такта. Зерно зависит от места такта во фразе, поэтому мотивы повторяются, как в настоящей песне.
  function melodyNotes(track, style, bar) {
    const steps = style.meter * 4;
    const part = Math.floor(bar / 8) % 2;
    const next = random(track.seed * 977 + part * 131 + (bar % 4) * 17);
    const chord = track.prog[bar % track.prog.length];
    const chordTones = [chord, chord + 2, chord + 4].flatMap((tone) => [tone - 7, tone, tone + 7]);
    const lengths = style.fast ? [1, 2, 2, 2, 4] : [2, 2, 4, 4, 6, 8];
    const notes = [];
    let index = chord + 2;
    for (let step = 0; step < steps;) {
      const length = Math.min(lengths[Math.floor(next() * lengths.length)], steps - step);
      if (next() < style.density) {
        if (step % 4 === 0) {
          index = chordTones.reduce((best, tone) => (Math.abs(tone - index) < Math.abs(best - index) ? tone : best));
        } else {
          index += [-2, -1, -1, 1, 1, 2][Math.floor(next() * 6)];
        }
        index = Math.max(-2, Math.min(11, index));
        notes.push({ step, length, index });
      }
      step += length;
    }
    return notes;
  }

  function createEngine(onEnd) {
    let ctx = null;
    let master;
    let analyser;
    let echo;
    let noise;
    let song = null;
    let timer = null;
    let volume = 0.8;

    function setup() {
      if (ctx) return;
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = volume;
      const compressor = ctx.createDynamicsCompressor();
      analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      master.connect(compressor).connect(analyser).connect(ctx.destination);
      echo = ctx.createDelay(1);
      const feedback = ctx.createGain();
      feedback.gain.value = 0.32;
      const wet = ctx.createGain();
      wet.gain.value = 0.25;
      echo.connect(feedback).connect(echo);
      echo.connect(wet).connect(master);
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }

    function tone(time, midi, length, type, level, { attack = 0.01, release = 0.15, filter = 0, send = false } = {}) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = 440 * 2 ** ((midi - 69) / 12);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, time);
      env.gain.linearRampToValueAtTime(level, time + attack);
      env.gain.setValueAtTime(level, time + Math.max(attack, length));
      env.gain.exponentialRampToValueAtTime(0.0001, time + Math.max(attack, length) + release);
      let source = osc;
      if (filter) {
        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = filter;
        osc.connect(lowpass);
        source = lowpass;
      }
      source.connect(env);
      env.connect(song.gain);
      if (send) env.connect(song.echoSend);
      osc.start(time);
      osc.stop(time + Math.max(attack, length) + release + 0.05);
    }

    function hiss(time, level, decay, type, frequency) {
      const source = ctx.createBufferSource();
      source.buffer = noise;
      const filter = ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = frequency;
      const env = ctx.createGain();
      env.gain.setValueAtTime(level, time);
      env.gain.exponentialRampToValueAtTime(0.001, time + decay);
      source.connect(filter).connect(env).connect(song.gain);
      source.start(time, Math.random() * 0.5);
      source.stop(time + decay + 0.02);
    }

    function kick(time) {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(42, time + 0.14);
      env.gain.setValueAtTime(0.9, time);
      env.gain.exponentialRampToValueAtTime(0.001, time + 0.32);
      osc.connect(env).connect(song.gain);
      osc.start(time);
      osc.stop(time + 0.35);
    }

    function playStep(step, time) {
      const { track, style, stepDur } = song;
      const steps = style.meter * 4;
      const bar = Math.floor(step / steps);
      const s = step % steps;
      const intro = bar < 4;
      const outro = bar >= BARS - 4;
      const chord = track.prog[bar % track.prog.length];
      const chordTones = [chord, chord + 2, chord + 4];

      if (style.drums && !outro) {
        if (!intro && style.drums.kick[s] === 'x') kick(time);
        if (!intro && style.drums.snare[s] === 'x') {
          hiss(time, 0.35, 0.16, 'bandpass', 1900);
          tone(time, 50, 0.03, 'triangle', 0.15, { release: 0.05 });
        }
        if (style.drums.hat[s] === 'x') hiss(time, 0.1, 0.045, 'highpass', 7500);
      }
      if (style.pad && s === 0) {
        chordTones.forEach((i) => tone(time, pitch(track, i - 7), stepDur * steps * 0.97, style.pad, 0.045,
          { attack: style.padAttack || 0.25, release: 0.6, filter: style.padFilter || 2200 }));
      }
      if (style.chordSteps && style.chordSteps.includes(s)) {
        chordTones.forEach((i) => tone(time, pitch(track, i), stepDur * 1.5, 'triangle', 0.04, { release: 0.1 }));
      }
      if (style.stabs && !intro && s % 4 === 2) {
        chordTones.forEach((i) => tone(time, pitch(track, i), stepDur * 0.9, 'sawtooth', 0.035, { release: 0.08, filter: 1800 }));
      }
      if (style.arp && !intro) tone(time, pitch(track, chordTones[s % 3] + 7), stepDur * 0.8, 'square', 0.03, { release: 0.03, filter: 3000 });
      if (style.bassSteps.includes(s)) {
        const fifth = s % 8 === 6;
        tone(time, pitch(track, (fifth ? chord + 4 : chord) - 14), style.bassLength * stepDur, style.bass, 0.2, { release: 0.08, filter: 900 });
      }
      if (!intro && s === 0) {
        melodyNotes(track, style, bar).forEach((note) => {
          const start = time + note.step * stepDur;
          tone(start, pitch(track, note.index + 7), note.length * stepDur * 0.9, style.lead, style.leadLevel,
            { release: 0.12, filter: style.leadFilter, send: true });
          if (style.bell) tone(start, pitch(track, note.index + 14), note.length * stepDur * 0.5, 'sine', style.leadLevel * 0.3, { release: 0.4 });
        });
      }
    }

    // Ноты планируются чуть заранее. В фоновой вкладке таймеры редкие, поэтому запас больше.
    function schedule() {
      if (!song) return;
      const ahead = document.hidden ? 1.5 : 0.2;
      const total = BARS * song.style.meter * 4;
      while (song.step < total) {
        const swing = song.step % 2 ? song.style.swing * song.stepDur : 0;
        const time = song.startAt + song.step * song.stepDur + swing;
        if (time > ctx.currentTime + ahead) break;
        if (time >= ctx.currentTime - 0.02) playStep(song.step, time);
        song.step++;
      }
      if (position() >= song.length) onEnd();
    }

    function stopSong() {
      clearInterval(timer);
      if (!song) return;
      const { gain, echoSend } = song;
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
      gain.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
      setTimeout(() => {
        gain.disconnect();
        echoSend.disconnect();
      }, 400);
      song = null;
    }

    function play(track, from = 0) {
      setup();
      stopSong();
      const style = STYLES[track.style];
      const stepDur = 60 / style.bpm / 4;
      const length = lengthOf(track);
      const startAt = ctx.currentTime + 0.06 - from;
      const gain = ctx.createGain();
      gain.connect(master);
      const echoSend = ctx.createGain();
      echoSend.gain.value = style.delay;
      echoSend.connect(echo);
      echo.delayTime.setValueAtTime(stepDur * 3, ctx.currentTime);
      // Последние два такта песня плавно затихает.
      gain.gain.setValueAtTime(1, Math.max(ctx.currentTime, startAt + length - stepDur * style.meter * 8));
      gain.gain.linearRampToValueAtTime(0, startAt + length);
      song = { track, style, gain, echoSend, startAt, stepDur, length, step: Math.ceil(from / stepDur) };
      ctx.resume();
      timer = setInterval(schedule, 25);
      schedule();
    }

    function position() {
      return song ? Math.min(song.length, Math.max(0, ctx.currentTime - song.startAt)) : 0;
    }

    return {
      play,
      position,
      pause() {
        const at = position();
        stopSong();
        return at;
      },
      setVolume(value) {
        volume = value;
        if (master) master.gain.setTargetAtTime(value, ctx.currentTime, 0.02);
      },
      levels(into) {
        if (analyser) analyser.getByteFrequencyData(into);
      },
      // Настоящие записи идут через тот же общий выход: работают громкость и полоски на обложке.
      attach(media) {
        setup();
        ctx.createMediaElementSource(media).connect(master);
      },
      resume() {
        if (ctx) ctx.resume();
      },
      close() {
        stopSong();
        if (ctx) ctx.close();
      },
    };
  }

  // Плеер настоящих записей. Звук идёт через движок, чтобы работали громкость и полоски.
  function createRecordPlayer(engine, events) {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.preload = 'auto';
    let attached = false;
    let source = '';
    audio.addEventListener('ended', events.onEnd);
    audio.addEventListener('waiting', () => events.onLoading(true));
    audio.addEventListener('playing', () => events.onLoading(false));
    audio.addEventListener('error', () => { if (source) events.onError(); });
    return {
      play(record, from) {
        if (!attached) {
          engine.attach(audio);
          attached = true;
        }
        engine.resume();
        if (source !== record.src) {
          source = record.src;
          audio.src = source;
        }
        audio.currentTime = from;
        audio.play().catch(() => {});
      },
      pause() {
        audio.pause();
        return audio.currentTime || 0;
      },
      position: () => audio.currentTime || 0,
      close() {
        source = '';
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      },
    };
  }

  const hueOf = (text) => [...text].reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) % 360, 7);

  // Вся медиатека: у каждой песни свой id, по нему песни хранятся в плейлистах.
  const LIBRARY = [
    ...TRACKS.map((track, i) => ({ id: `bos-${i}`, kind: 'synth', track, title: track.title, hue: track.hue, duration: lengthOf(track) })),
    ...(BOS.MUSIC_RECORDS || []).map((record, i) => ({
      id: `rec-${i}`, kind: 'record', record, title: record.title, hue: hueOf(record.composer), duration: record.duration,
    })),
  ];
  const byId = new Map(LIBRARY.map((item) => [item.id, item]));

  function openExternal(url) {
    if (window.bosNative) window.bosNative.openExternal(url);
    else window.open(url, '_blank', 'noopener,noreferrer');
  }

  function cover(item, size) {
    return h('span', { class: `music-cover ${size}`, style: `--h:${item.hue}`, 'aria-hidden': 'true' }, h('i'), h('i'));
  }

  function subtitle(item) {
    if (item.kind === 'synth') return h('small', { i18n: `genre.${item.track.style}` });
    return h('small', {}, item.record.composer, h('span', { class: 'music-badge' }, item.record.license));
  }

  BOS.apps.music = {
    title: 'app.music', icon: 'music', width: 900, height: 580, minWidth: 360, minHeight: 440,
    mount(body, win) {
      let view = 'all';
      let queue = [];
      let currentId = null;
      let playing = false;
      let resumeAt = 0;
      let shuffle = false;
      let repeat = false;
      let frame = 0;
      let rowById = new Map();
      const levels = new Uint8Array(32);
      const synth = createEngine(() => next(true));
      const records = createRecordPlayer(synth, {
        onEnd: () => next(true),
        onLoading: (on) => (on && playing ? say('music.loading') : say(null)),
        onError: () => {
          playing = false;
          paintPlayButton();
          say('music.offline', true);
        },
      });

      const itemOf = (id) => byId.get(id);
      const playlistOf = (id) => state.playlists.find((list) => list.id === id);
      const currentItem = () => itemOf(currentId);
      const backendOf = (item) => (item.kind === 'record' ? records : synth);

      const roundButton = (iconName, key, run, className = '') =>
        h('button', { type: 'button', class: `round ${className}`, i18nTitle: key, onclick: run }, icon(iconName));

      // Левая часть: вкладки, заголовок и список песен.
      const chips = h('nav', { class: 'music-views' });
      const head = h('header', { class: 'music-head' });
      const list = h('div', { class: 'music-list' });
      const menu = h('div', { class: 'music-pop', hidden: true });
      const searchInput = h('input', {
        type: 'search', i18nPh: 'music.search', autocomplete: 'off', spellcheck: false,
        oninput: () => renderList(),
        onkeydown: (e) => {
          if (e.key !== 'Escape' || !searchInput.value) return;
          e.stopPropagation();
          searchInput.value = '';
          renderList();
        },
      });
      searchInput.setAttribute('aria-label', t('music.search'));
      const searchField = h('label', { class: 'music-search' }, icon('search'), searchInput);

      // Правая часть: что играет сейчас.
      const viz = h('canvas', { class: 'music-viz', width: 480, height: 160 });
      const bigCover = h('div', { class: 'music-cover big', style: '--h:220' }, h('i'), h('i'), viz);
      const title = h('b', { class: 'music-title', i18n: 'music.choose' });
      const about = h('span', { class: 'music-genre' });
      const source = h('button', { type: 'button', class: 'lock-link music-source', hidden: true, onclick: () => openExternal(currentItem().record.page) },
        h('span', { i18n: 'music.source' }), ': Wikimedia Commons');
      const notice = h('p', { class: 'music-notice', hidden: true, 'aria-live': 'polite' });
      const elapsed = h('span', {}, '0:00');
      const total = h('span', {}, '0:00');
      const seek = h('input', {
        type: 'range', class: 'music-seek', min: 0, max: 1000, value: 0,
        onchange: () => {
          if (currentId === null) return;
          const at = (seek.value / 1000) * currentItem().duration;
          if (playing) start(at);
          else resumeAt = at;
          paintTime(at);
        },
      });
      seek.setAttribute('aria-label', t('music.choose'));
      const playButton = h('button', { type: 'button', class: 'round primary music-play', onclick: toggle });
      const shuffleButton = roundButton('shuffle', 'music.shuffle', () => {
        shuffle = !shuffle;
        shuffleButton.classList.toggle('active', shuffle);
      });
      const repeatButton = roundButton('repeat', 'music.repeat', () => {
        repeat = !repeat;
        repeatButton.classList.toggle('active', repeat);
      });
      const volume = h('input', {
        type: 'range', class: 'music-volume', min: 0, max: 100, value: 80,
        oninput: () => synth.setVolume(volume.value / 100),
      });
      volume.setAttribute('aria-label', t('music.volume'));

      const root = h('div', { class: 'music' },
        h('section', { class: 'music-main' }, chips, head, searchField, list),
        h('aside', { class: 'music-side' },
          bigCover,
          h('div', { class: 'music-info' }, title, about, source),
          notice,
          h('div', { class: 'music-seekbox' }, seek, h('div', { class: 'music-times' }, elapsed, total)),
          h('div', { class: 'music-controls' },
            shuffleButton,
            roundButton('prev', 'music.prev', previous),
            playButton,
            roundButton('next', 'music.next', () => next(false)),
            repeatButton),
          h('label', { class: 'music-vol' }, icon('volume'), volume)),
        menu);
      body.append(root);

      root.addEventListener('pointerdown', (e) => {
        if (!menu.hidden && !menu.contains(e.target) && !e.target.closest('.music-add')) menu.hidden = true;
      });

      function itemsOf(name) {
        if (name === 'bos') return LIBRARY.filter((item) => item.kind === 'synth');
        if (name === 'rec') return LIBRARY.filter((item) => item.kind === 'record');
        if (name.startsWith('pl:')) {
          const playlist = playlistOf(name.slice(3));
          return playlist ? playlist.items.map(itemOf).filter(Boolean) : [];
        }
        return LIBRARY;
      }

      function savePlaylists() {
        BOS.save();
        renderChips();
        if (view.startsWith('pl:')) renderView();
      }

      function createPlaylist() {
        const playlist = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          name: `${t('music.newPlaylist')} ${state.playlists.length + 1}`,
          items: [],
        };
        state.playlists.push(playlist);
        BOS.save();
        return playlist;
      }

      function renderChips() {
        const chip = (name, label) => {
          const button = h('button', { type: 'button', class: `music-chip${view === name ? ' on' : ''}`, onclick: () => openView(name) });
          if (label.key) {
            button.dataset.i18n = label.key;
            BOS.applyI18nTo(button);
          } else {
            button.textContent = label.text;
          }
          return button;
        };
        chips.replaceChildren(
          chip('all', { key: 'music.all' }),
          chip('bos', { key: 'music.bos' }),
          chip('rec', { key: 'music.classic' }),
          ...state.playlists.map((playlist) => chip(`pl:${playlist.id}`, { text: playlist.name })),
          h('button', {
            type: 'button',
            class: 'music-chip add',
            onclick: () => {
              const playlist = createPlaylist();
              openView(`pl:${playlist.id}`);
              renameHeader(playlist);
            },
          }, icon('plus'), h('span', { i18n: 'music.newPlaylist' })));
      }

      function openView(name) {
        view = name;
        menu.hidden = true;
        renderChips();
        renderView();
      }

      function renderHead() {
        const playlist = view.startsWith('pl:') && playlistOf(view.slice(3));
        const count = h('span', { i18n: 'music.count', i18nVars: { n: itemsOf(view).length } });
        if (playlist) {
          head.replaceChildren(
            h('div', { class: 'music-head-text' }, h('h2', {}, playlist.name), h('p', {}, count)),
            roundButton('edit', 'music.rename', () => renameHeader(playlist)),
            roundButton('trash', 'music.deletePlaylist', () => confirmDelete(playlist)));
          return;
        }
        const titles = { all: 'app.music', bos: 'music.bos', rec: 'music.classic' };
        const notes = { all: null, bos: 'music.free', rec: 'music.recordNote' };
        head.replaceChildren(h('div', { class: 'music-head-text' },
          h('h2', { i18n: titles[view] }),
          h('p', {}, count, notes[view] && ' · ', notes[view] && h('span', { i18n: notes[view] }))));
      }

      function renameHeader(playlist) {
        let done = false;
        const input = h('input', { class: 'input', value: playlist.name, maxLength: 60 });
        input.setAttribute('aria-label', t('music.rename'));
        const commit = () => {
          if (done) return;
          done = true;
          playlist.name = input.value.trim() || playlist.name;
          savePlaylists();
        };
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { done = true; renderHead(); }
        });
        input.addEventListener('blur', commit);
        head.replaceChildren(h('div', { class: 'music-head-text' }, input));
        input.focus();
        input.select();
      }

      function confirmDelete(playlist) {
        head.replaceChildren(
          h('div', { class: 'music-head-text' }, h('h2', {}, playlist.name)),
          h('button', { type: 'button', class: 'btn ghost', i18n: 'common.cancel', onclick: renderHead }),
          h('button', {
            type: 'button',
            class: 'btn danger',
            i18n: 'music.deletePlaylist',
            onclick: () => {
              state.playlists = state.playlists.filter((other) => other !== playlist);
              BOS.save();
              openView('all');
            },
          }));
      }

      function openAddMenu(item, anchor) {
        menu.replaceChildren(
          h('p', { i18n: 'music.addTo' }),
          ...state.playlists.map((playlist) => h('button', {
            type: 'button',
            onclick: () => {
              if (!playlist.items.includes(item.id)) playlist.items.push(item.id);
              menu.hidden = true;
              savePlaylists();
            },
          }, icon(playlist.items.includes(item.id) ? 'check' : 'music'), h('span', {}, playlist.name))),
          h('button', {
            type: 'button',
            class: 'music-pop-new',
            onclick: () => {
              createPlaylist().items.push(item.id);
              menu.hidden = true;
              savePlaylists();
            },
          }, icon('plus'), h('span', { i18n: 'music.newPlaylist' })));
        const at = anchor.getBoundingClientRect();
        const box = root.getBoundingClientRect();
        menu.hidden = false;
        const below = at.bottom - box.top + 4;
        const fitsBelow = below + menu.offsetHeight < box.height;
        menu.style.top = `${fitsBelow ? below : Math.max(4, at.top - box.top - menu.offsetHeight - 4)}px`;
        menu.style.right = `${Math.max(4, box.right - at.right)}px`;
      }

      function renderView() {
        renderHead();
        renderList();
      }

      // Поиск ищет по названию, композитору и жанру внутри открытой вкладки или плейлиста.
      function matches(item, query) {
        if (!query) return true;
        const extra = item.kind === 'synth' ? t(`genre.${item.track.style}`) : `${item.record.composer} ${item.record.license}`;
        return `${item.title} ${extra}`.toLowerCase().includes(query);
      }

      function renderList() {
        const playlist = view.startsWith('pl:') && playlistOf(view.slice(3));
        const query = searchInput.value.trim().toLowerCase();
        const items = itemsOf(view).filter((item) => matches(item, query));
        rowById = new Map();
        const rows = items.map((item) => {
          const row = h('div', { class: 'music-item' },
            h('button', {
              type: 'button',
              class: 'music-row',
              onclick: () => {
                select(item.id, items.map((other) => other.id));
                start(0);
              },
            },
              cover(item, 'small'),
              h('span', { class: 'music-row-text' }, h('b', {}, item.title), subtitle(item)),
              h('span', { class: 'eq', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')),
              h('span', { class: 'music-row-time' }, clock(item.duration))),
            playlist
              ? roundButton('minus', 'music.removeFrom', () => {
                playlist.items = playlist.items.filter((id) => id !== item.id);
                savePlaylists();
              })
              : h('button', { type: 'button', class: 'round music-add', i18nTitle: 'music.addTo', onclick: (e) => openAddMenu(item, e.currentTarget) }, icon('plus')));
          rowById.set(item.id, row);
          return row;
        });
        const emptyKey = query ? 'search.none' : 'music.emptyPlaylist';
        list.replaceChildren(...(rows.length ? rows : [h('p', { class: 'files-empty', i18n: emptyKey })]));
        paintRows();
      }

      function paintRows() {
        rowById.forEach((row, id) => {
          row.classList.toggle('on', id === currentId);
          row.classList.toggle('playing', playing && id === currentId);
        });
      }

      function say(key, isError = false) {
        notice.hidden = !key;
        notice.classList.toggle('err', isError);
        if (key) {
          notice.dataset.i18n = key;
          BOS.applyI18nTo(notice);
        }
      }

      function paintPlayButton() {
        playButton.replaceChildren(icon(playing ? 'pause' : 'play'));
        playButton.dataset.i18nTitle = playing ? 'music.pause' : 'music.play';
        BOS.applyI18nTo(playButton);
        paintRows();
      }

      function paintTime(at) {
        const length = currentId === null ? 0 : currentItem().duration;
        elapsed.textContent = clock(at);
        total.textContent = clock(length);
        if (document.activeElement !== seek) seek.value = length ? Math.round((at / length) * 1000) : 0;
      }

      function select(id, order) {
        currentId = id;
        if (order) queue = order;
        resumeAt = 0;
        const item = currentItem();
        bigCover.style.setProperty('--h', item.hue);
        delete title.dataset.i18n;
        title.textContent = item.title;
        about.replaceChildren(subtitle(item));
        source.hidden = item.kind !== 'record';
        say(null);
        const row = rowById.get(id);
        if (row) row.scrollIntoView({ block: 'nearest' });
        paintRows();
        paintTime(0);
      }

      function start(from) {
        const item = currentItem();
        synth.pause();
        records.pause();
        if (item.kind === 'record' && (state.airplane || !navigator.onLine)) {
          playing = false;
          paintPlayButton();
          say('music.offline', true);
          return;
        }
        say(null);
        if (item.kind === 'record') records.play(item.record, from);
        else synth.play(item.track, from);
        playing = true;
        paintPlayButton();
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(animate);
      }

      function pause() {
        resumeAt = backendOf(currentItem()).pause();
        playing = false;
        paintPlayButton();
      }

      function toggle() {
        if (currentId === null) {
          const items = itemsOf(view);
          if (!items.length) return;
          select(items[0].id, items.map((item) => item.id));
          start(0);
        } else if (playing) {
          pause();
        } else {
          start(resumeAt);
        }
      }

      function next(automatic) {
        if (currentId === null) return;
        if (automatic && repeat) {
          start(0);
          return;
        }
        const order = queue.includes(currentId) ? queue : LIBRARY.map((item) => item.id);
        let index = (order.indexOf(currentId) + 1) % order.length;
        if (shuffle && order.length > 1) index = (order.indexOf(currentId) + 1 + Math.floor(Math.random() * (order.length - 1))) % order.length;
        select(order[index]);
        start(0);
      }

      function previous() {
        if (currentId === null) return;
        if (playing && backendOf(currentItem()).position() > 3) {
          start(0);
          return;
        }
        const order = queue.includes(currentId) ? queue : LIBRARY.map((item) => item.id);
        select(order[(order.indexOf(currentId) - 1 + order.length) % order.length]);
        if (playing) start(0);
      }

      // Полоски на обложке прыгают в такт музыке.
      function animate() {
        if (!playing) return;
        frame = requestAnimationFrame(animate);
        if (win.minimized) return;
        paintTime(backendOf(currentItem()).position());
        synth.levels(levels);
        const g = viz.getContext('2d');
        g.clearRect(0, 0, viz.width, viz.height);
        g.fillStyle = 'rgba(255,255,255,.75)';
        const bars = 24;
        const width = viz.width / bars;
        for (let i = 0; i < bars; i++) {
          const height = Math.max(4, (levels[i] / 255) * viz.height);
          g.beginPath();
          g.roundRect(i * width + 3, viz.height - height, width - 6, height, 4);
          g.fill();
        }
      }

      // Настоящие записи идут через интернет, поэтому авиарежим их останавливает.
      win.listen('airplane', () => {
        if (state.airplane && playing && currentItem().kind === 'record') {
          pause();
          say('music.offline', true);
        }
      });
      win.listen('lang', renderView);
      win.disposers.push(() => {
        cancelAnimationFrame(frame);
        records.close();
        synth.close();
      });

      paintPlayButton();
      renderChips();
      renderView();
    },
  };
})();
