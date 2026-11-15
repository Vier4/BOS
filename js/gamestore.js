// BOS 03: Магазин игр. Игры здесь — классические, у которых нет автора (их придумали очень давно),
// или придуманные для BOS. «Скачать» добавляет игру в приложение «Игры» на этом устройстве.
(function () {
  if (!BOS.is03 || !BOS.defineGame) return;
  const { h, icon, state, t } = BOS;
  const { grid, canvasOf, shuffle, rand, DIRS } = BOS.gameKit;
  const isRu = () => ['ru', 'uk', 'kk'].includes(state.lang);
  const add = (id, glyph, hue, genre, start) => BOS.defineGame(id, glyph, start, { hue, genre });

  // 1. Угадай слово: каждая ошибка растапливает снеговика. Классическая игра в слова.
  const WORDS = {
    ru: ['КОМПЬЮТЕР', 'РАДУГА', 'ПИНГВИН', 'КОСМОС', 'ШОКОЛАД', 'ВЕЛОСИПЕД', 'ЖИРАФ', 'ОКЕАН', 'ВУЛКАН', 'ФОНАРИК', 'МОРОЖЕНОЕ', 'ДРАКОН', 'ПЛАНЕТА', 'ЛАБИРИНТ', 'СНЕЖИНКА', 'КАРАНДАШ', 'ЧЕРЕПАХА', 'ПАРОВОЗ'],
    en: ['COMPUTER', 'RAINBOW', 'PENGUIN', 'GALAXY', 'CHOCOLATE', 'BICYCLE', 'GIRAFFE', 'OCEAN', 'VOLCANO', 'LANTERN', 'DRAGON', 'PLANET', 'MAZE', 'SNOWFLAKE', 'PENCIL', 'TURTLE', 'ROCKET', 'JUNGLE'],
  };
  add('hang', 'А_Я', 200, 'words', (ctx) => {
    const ru = isRu();
    const word = WORDS[ru ? 'ru' : 'en'][rand(WORDS.ru.length)];
    const abc = ru ? 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const guessed = new Set();
    let misses = 0;
    let over = false;
    const MAX = 6;
    const snow = h('div', { class: 'gs-snowman' });
    const shown = h('div', { class: 'gs-word' });
    const keys = h('div', { class: 'gs-keys' });
    function paint() {
      shown.replaceChildren(...[...word].map((ch) => h('span', { class: 'gs-letter' }, guessed.has(ch) || over ? ch : '')));
      const melt = misses / MAX;
      snow.innerHTML = `<svg viewBox="0 0 100 120"><ellipse cx="50" cy="112" rx="${30 + melt * 18}" ry="${5 + melt * 4}" fill="#bae6fd"/>
        <g transform="translate(0 ${melt * 40}) scale(1 ${1 - melt * 0.55})" transform-origin="50 112">
        <circle cx="50" cy="88" r="24" fill="#fff" stroke="#cbd5e1"/><circle cx="50" cy="52" r="18" fill="#fff" stroke="#cbd5e1"/>
        ${misses < 5 ? '<circle cx="50" cy="22" r="13" fill="#fff" stroke="#cbd5e1"/><circle cx="45" cy="20" r="1.8"/><circle cx="55" cy="20" r="1.8"/><path d="M50 24l10 3-10 2z" fill="#f97316"/>' : ''}
        ${misses < 3 ? '<path d="M38 8h24v-8h-6v8M34 9h32" stroke="#1e293b" stroke-width="4"/>' : ''}
        </g></svg>`;
      ctx.score(MAX - misses, 'gs.lives');
    }
    keys.append(...[...abc].map((ch) => {
      const key = h('button', { type: 'button', class: 'gs-key', onclick: () => {
        if (over || guessed.has(ch)) return;
        guessed.add(ch);
        key.disabled = true;
        if (!word.includes(ch)) misses++;
        key.classList.add(word.includes(ch) ? 'hit' : 'miss');
        if ([...word].every((c) => guessed.has(c))) { over = true; ctx.status('games.win'); ctx.record(MAX - misses); }
        else if (misses >= MAX) { over = true; ctx.status('gs.wordWas', { w: word }); }
        paint();
      } }, ch);
      return key;
    }));
    ctx.stage.append(h('div', { class: 'gs-col' }, snow, shown, keys));
    paint();
  });

  // 2. Быки и коровы: угадайте 4 разные цифры. Бык — цифра на своём месте, корова — есть, но не там.
  add('bulls', '🐂', 30, 'puzzle', (ctx) => {
    const secret = shuffle([...'0123456789']).slice(0, 4).join('');
    const input = h('input', { class: 'input gs-guess', inputMode: 'numeric', maxLength: 4, placeholder: '0000' });
    const log = h('div', { class: 'gs-log' });
    let moves = 0;
    let over = false;
    ctx.score(0, 'games.moves');
    const form = h('form', { class: 'gs-row', onsubmit: (e) => {
      e.preventDefault();
      const guess = input.value.trim();
      if (over || !/^\d{4}$/.test(guess) || new Set(guess).size !== 4) { ctx.status('gs.bullsRule'); return; }
      moves++;
      const bulls = [...guess].filter((d, i) => secret[i] === d).length;
      const cows = [...guess].filter((d, i) => secret.includes(d) && secret[i] !== d).length;
      log.prepend(h('div', { class: 'gs-log-row' }, h('b', {}, guess), h('span', {}, '🐂 '.repeat(bulls) + '🐄 '.repeat(cows) || '—')));
      ctx.score(moves, 'games.moves');
      input.value = '';
      if (bulls === 4) { over = true; ctx.status('games.win'); ctx.record(moves, true); }
      else ctx.status('gs.bullsCows', { b: bulls, c: cows });
    } }, input, h('button', { type: 'submit', class: 'btn primary', i18n: 'gs.check' }));
    ctx.stage.append(h('div', { class: 'gs-col' }, form, log));
    input.focus();
  });

  // 3. Пять в ряд: старинная игра на клетчатом поле против BOS.
  add('five', '●5', 0, 'board', (ctx) => {
    const N = 10;
    const board = Array(N * N).fill(null);
    let over = false;
    const cells = grid(ctx, N, N, (i) => {
      if (over || board[i]) return;
      put(i, 'x');
      if (!over) ctx.after(220, () => put(bot(), 'o'));
    }, 'gs-five');
    const lineLen = (i, who, dx, dy) => {
      let n = 0;
      let x = i % N;
      let y = Math.floor(i / N);
      for (;;) { x += dx; y += dy; if (x < 0 || y < 0 || x >= N || y >= N || board[y * N + x] !== who) return n; n++; }
    };
    const DIRS4 = [[1, 0], [0, 1], [1, 1], [1, -1]];
    const best = (i, who) => Math.max(...DIRS4.map(([dx, dy]) => 1 + lineLen(i, who, dx, dy) + lineLen(i, who, -dx, -dy)));
    function put(i, who) {
      if (i < 0) return;
      board[i] = who;
      cells[i].textContent = who === 'x' ? '✕' : '○';
      cells[i].classList.add(who);
      if (best(i, who) >= 5) { over = true; ctx.status(who === 'x' ? 'games.win' : 'games.lose'); if (who === 'x') ctx.record((state.best.five || 0) + 1); }
      else if (board.every(Boolean)) { over = true; ctx.status('games.draw'); }
    }
    function bot() {
      let pickAt = -1;
      let score = -1;
      board.forEach((v, i) => {
        if (v) return;
        const attack = best(i, 'o');
        const defend = best(i, 'x');
        const s = (attack >= 5 ? 1000 : attack ** 3) + (defend >= 5 ? 900 : defend ** 3 * 0.9) + Math.random();
        if (s > score) { score = s; pickAt = i; }
      });
      return pickAt;
    }
  });

  // 4. Реверси: окружайте фишки соперника, чтобы перевернуть их.
  add('reversi', '◐', 140, 'board', (ctx) => {
    const N = 8;
    const board = Array(64).fill(null);
    board[27] = board[36] = 'w';
    board[28] = board[35] = 'b';
    let busy = false;
    const cells = grid(ctx, N, N, (i) => {
      if (busy || !flips(i, 'b').length) return;
      move(i, 'b');
      busy = true;
      ctx.after(450, botTurn);
    }, 'gs-reversi');
    function flips(i, who) {
      if (board[i]) return [];
      const other = who === 'b' ? 'w' : 'b';
      const out = [];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        let x = (i % N) + dx;
        let y = Math.floor(i / N) + dy;
        const line = [];
        while (x >= 0 && y >= 0 && x < N && y < N && board[y * N + x] === other) { line.push(y * N + x); x += dx; y += dy; }
        if (line.length && x >= 0 && y >= 0 && x < N && y < N && board[y * N + x] === who) out.push(...line);
      }
      return out;
    }
    const movesFor = (who) => board.map((_, i) => i).filter((i) => flips(i, who).length);
    function move(i, who) {
      flips(i, who).forEach((j) => { board[j] = who; });
      board[i] = who;
      paint();
    }
    function botTurn() {
      const options = movesFor('w');
      if (options.length) {
        const corner = (i) => [0, 7, 56, 63].includes(i) ? 10 : 0;
        options.sort((a, b) => (flips(b, 'w').length + corner(b)) - (flips(a, 'w').length + corner(a)));
        move(options[0], 'w');
      }
      busy = false;
      if (!movesFor('b').length) {
        if (movesFor('w').length) { busy = true; ctx.after(450, botTurn); return; }
        finish();
      }
      paint();
    }
    function finish() {
      const b = board.filter((v) => v === 'b').length;
      const w = board.filter((v) => v === 'w').length;
      busy = true;
      ctx.status(b > w ? 'games.win' : b < w ? 'games.lose' : 'games.draw');
      if (b > w) ctx.record(b);
    }
    function paint() {
      const hints = busy ? [] : movesFor('b');
      cells.forEach((cell, i) => {
        cell.className = `g-cell${board[i] ? ` disc ${board[i]}` : ''}${hints.includes(i) ? ' hint' : ''}`;
      });
      ctx.score(`${board.filter((v) => v === 'b').length} : ${board.filter((v) => v === 'w').length}`);
      if (!busy && !hints.length && !movesFor('w').length) finish();
    }
    paint();
  });

  // 5. Ним: по очереди берите палочки из одного ряда. Кто возьмёт последнюю — победил.
  add('nim', '|||', 50, 'puzzle', (ctx) => {
    const heaps = [3, 5, 7];
    let busy = false;
    const rows = h('div', { class: 'gs-nim' });
    function paint() {
      rows.replaceChildren(...heaps.map((count, r) => h('div', { class: 'gs-nim-row' },
        Array.from({ length: count }, (_, i) => h('button', {
          type: 'button', class: 'gs-stick',
          onclick: () => { if (!busy) take(r, count - i); },
          onpointerenter: (e) => highlight(e.currentTarget.parentElement, i, true),
          onpointerleave: (e) => highlight(e.currentTarget.parentElement, i, false),
        })))));
    }
    const highlight = (row, from, on) => [...row.children].forEach((stick, i) => stick.classList.toggle('take', on && i >= from));
    function take(r, n) {
      heaps[r] -= n;
      paint();
      if (heaps.every((x) => !x)) { ctx.status('games.win'); ctx.record((state.best.nim || 0) + 1); busy = true; return; }
      busy = true;
      ctx.after(600, () => {
        const xor = heaps.reduce((a, b) => a ^ b, 0);
        let row = heaps.findIndex((x) => (x ^ xor) < x);
        let amount = row >= 0 ? heaps[row] - (heaps[row] ^ xor) : 0;
        if (row < 0 || !amount) { row = heaps.findIndex((x) => x > 0); amount = 1; }
        heaps[row] -= amount;
        paint();
        busy = false;
        if (heaps.every((x) => !x)) { ctx.status('games.lose'); busy = true; }
        else ctx.status('gs.nimBot', { n: amount, r: row + 1 });
      });
    }
    ctx.stage.append(rows);
    paint();
  });

  // Общий помощник для игр на холсте: управление стрелками, мышкой и пальцем.
  function pointerX(el, e, width) {
    const rect = el.getBoundingClientRect();
    return ((e.clientX - rect.left) / rect.width) * width;
  }

  // 6. Кирпичики: отбивайте мячик и разбивайте стенку.
  add('bricks', '▭', 10, 'arcade', (ctx) => {
    const W = 480;
    const H = 360;
    const { el, g, css } = canvasOf(ctx, W, H);
    const pad = { x: W / 2 - 40, w: 80 };
    let ball = { x: W / 2, y: H - 60, dx: 3, dy: -3.4 };
    let lives = 3;
    let score = 0;
    let started = false;
    let over = false;
    const bricks = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 10; c++) bricks.push({ x: 8 + c * 46.4, y: 30 + r * 20, alive: true, hue: r * 40 });
    el.addEventListener('pointermove', (e) => { pad.x = Math.max(0, Math.min(W - pad.w, pointerX(el, e, W) - pad.w / 2)); });
    el.addEventListener('pointerdown', () => { started = true; });
    const held = {};
    ctx.keys((e) => { held[e.code] = e.type === 'keydown'; if (e.code === 'Space' || DIRS[e.code]) { e.preventDefault(); started = true; } });
    ctx.score(0);
    ctx.every(16, () => {
      if (over) return;
      if (held.ArrowLeft || held.KeyA) pad.x = Math.max(0, pad.x - 7);
      if (held.ArrowRight || held.KeyD) pad.x = Math.min(W - pad.w, pad.x + 7);
      if (started) {
        ball.x += ball.dx;
        ball.y += ball.dy;
        if (ball.x < 6 || ball.x > W - 6) ball.dx *= -1;
        if (ball.y < 6) ball.dy *= -1;
        if (ball.y > H - 24 && ball.y < H - 14 && ball.x > pad.x && ball.x < pad.x + pad.w && ball.dy > 0) {
          ball.dy *= -1;
          ball.dx = ((ball.x - (pad.x + pad.w / 2)) / (pad.w / 2)) * 4.5;
        }
        bricks.forEach((b) => {
          if (b.alive && ball.x > b.x && ball.x < b.x + 42 && ball.y > b.y && ball.y < b.y + 16) {
            b.alive = false;
            ball.dy *= -1;
            ctx.score(++score);
            ctx.record(score);
          }
        });
        if (ball.y > H) {
          lives--;
          started = false;
          ball = { x: W / 2, y: H - 60, dx: 3, dy: -3.4 };
          if (!lives) { over = true; ctx.status('games.over'); }
        }
        if (bricks.every((b) => !b.alive)) { over = true; ctx.status('games.win'); }
      } else {
        ball.x = pad.x + pad.w / 2;
      }
      g.clearRect(0, 0, W, H);
      bricks.forEach((b) => { if (b.alive) { g.fillStyle = `hsl(${b.hue} 80% 60%)`; g.fillRect(b.x, b.y, 42, 16); } });
      g.fillStyle = css('--fill');
      g.fillRect(pad.x, H - 18, pad.w, 8);
      g.beginPath();
      g.arc(ball.x, ball.y, 6, 0, Math.PI * 2);
      g.fillStyle = css('--accent');
      g.fill();
      g.fillStyle = css('--ink-3');
      g.font = '13px system-ui';
      g.fillText('♥'.repeat(lives), 8, H - 30);
    });
  });

  // 7. Теннис: отбивайте мяч ракеткой. Кто первым наберёт 5 очков — победил.
  add('tennis', '|•|', 170, 'arcade', (ctx) => {
    const W = 480;
    const H = 320;
    const { el, g, css } = canvasOf(ctx, W, H);
    let me = H / 2;
    let bot = H / 2;
    let score = [0, 0];
    let ball;
    let over = false;
    const serve = (dir) => { ball = { x: W / 2, y: H / 2, dx: 4 * dir, dy: (Math.random() - 0.5) * 5 }; };
    serve(1);
    el.addEventListener('pointermove', (e) => { const rect = el.getBoundingClientRect(); me = ((e.clientY - rect.top) / rect.height) * H; });
    const held = {};
    ctx.keys((e) => { held[e.code] = e.type === 'keydown'; if (DIRS[e.code]) e.preventDefault(); });
    ctx.score('0 : 0');
    ctx.every(16, () => {
      if (over) return;
      if (held.ArrowUp || held.KeyW) me -= 6;
      if (held.ArrowDown || held.KeyS) me += 6;
      me = Math.max(30, Math.min(H - 30, me));
      bot += Math.max(-3.6, Math.min(3.6, ball.y - bot));
      ball.x += ball.dx;
      ball.y += ball.dy;
      if (ball.y < 6 || ball.y > H - 6) ball.dy *= -1;
      const hit = (paddleY, side) => Math.abs(ball.y - paddleY) < 34 && (side < 0 ? ball.x < 22 && ball.dx < 0 : ball.x > W - 22 && ball.dx > 0);
      if (hit(me, -1) || hit(bot, 1)) {
        const paddle = ball.dx < 0 ? me : bot;
        ball.dx *= -1.06;
        ball.dy = ((ball.y - paddle) / 30) * 5;
      }
      if (ball.x < 0 || ball.x > W) {
        score[ball.x < 0 ? 1 : 0]++;
        ctx.score(`${score[0]} : ${score[1]}`);
        if (score[0] === 5 || score[1] === 5) { over = true; ctx.status(score[0] === 5 ? 'games.win' : 'games.lose'); if (score[0] === 5) ctx.record(5 - score[1]); }
        serve(ball.x < 0 ? 1 : -1);
      }
      g.clearRect(0, 0, W, H);
      g.fillStyle = css('--line');
      for (let y = 0; y < H; y += 20) g.fillRect(W / 2 - 1, y, 2, 10);
      g.fillStyle = css('--fill');
      g.fillRect(8, me - 30, 8, 60);
      g.fillRect(W - 16, bot - 30, 8, 60);
      g.beginPath();
      g.arc(ball.x, ball.y, 6, 0, Math.PI * 2);
      g.fillStyle = css('--accent');
      g.fill();
    });
  });

  // 8. Судоку: заполните поле так, чтобы в каждой строке, столбце и квадрате были цифры 1–9.
  add('sudoku', '9', 260, 'puzzle', (ctx) => {
    const solution = Array(81).fill(0);
    const ok = (b, i, n) => {
      const r = Math.floor(i / 9);
      const c = i % 9;
      for (let k = 0; k < 9; k++) if (b[r * 9 + k] === n || b[k * 9 + c] === n) return false;
      const br = r - (r % 3);
      const bc = c - (c % 3);
      for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) if (b[(br + y) * 9 + bc + x] === n) return false;
      return true;
    };
    (function fill(i) {
      if (i === 81) return true;
      for (const n of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
        if (ok(solution, i, n)) { solution[i] = n; if (fill(i + 1)) return true; solution[i] = 0; }
      }
      return false;
    })(0);
    const given = solution.map((n) => (Math.random() < 0.52 ? n : 0));
    const board = [...given];
    let selected = -1;
    let mistakes = 0;
    ctx.score(0, 'gs.mistakes');
    const cells = grid(ctx, 9, 9, (i) => { if (!given[i]) { selected = i; paint(); } }, 'gs-sudoku');
    const pad = h('div', { class: 'gs-pad' }, [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => h('button', { type: 'button', class: 'btn outline', onclick: () => enter(n) }, String(n))));
    ctx.tools.append(pad);
    function enter(n) {
      if (selected < 0 || given[selected]) return;
      board[selected] = n;
      if (n !== solution[selected]) { mistakes++; ctx.score(mistakes, 'gs.mistakes'); }
      paint();
      if (board.every((v, i) => v === solution[i])) { ctx.status('games.win'); ctx.record(mistakes, true); selected = -1; }
    }
    ctx.keys((e) => { if (e.type === 'keydown' && /^Digit[1-9]$/.test(e.code)) enter(Number(e.code.slice(5))); });
    function paint() {
      cells.forEach((cell, i) => {
        cell.textContent = board[i] || '';
        cell.className = `g-cell${given[i] ? ' given' : ''}${i === selected ? ' sel' : ''}${board[i] && !given[i] && board[i] !== solution[i] ? ' bad' : ''}${Math.floor((i % 9) / 3) % 2 === Math.floor(Math.floor(i / 9) / 3) % 2 ? ' tint' : ''}`;
      });
    }
    paint();
  });

  // 9. Прыгунок: перепрыгивайте препятствия. Пробел, стрелка вверх или касание — прыжок.
  add('runner', '⤴', 90, 'arcade', (ctx) => {
    const W = 480;
    const H = 220;
    const GROUND = 180;
    const { el, g, css } = canvasOf(ctx, W, H);
    let y = GROUND;
    let vy = 0;
    let speed = 5;
    let score = 0;
    let over = false;
    let obstacles = [];
    let next = 60;
    const jump = () => { if (!over && y >= GROUND) vy = -11; };
    el.addEventListener('pointerdown', jump);
    ctx.keys((e) => { if (e.type === 'keydown' && (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW')) { e.preventDefault(); jump(); } });
    ctx.score(0);
    ctx.every(16, () => {
      if (over) return;
      vy += 0.6;
      y = Math.min(GROUND, y + vy);
      if (--next <= 0) { obstacles.push({ x: W, w: 16 + rand(18), h: 22 + rand(26) }); next = 50 + rand(60); }
      obstacles.forEach((o) => { o.x -= speed; });
      obstacles = obstacles.filter((o) => o.x + o.w > 0);
      if (obstacles.some((o) => o.x < 70 && o.x + o.w > 44 && y > GROUND - o.h)) { over = true; ctx.status('games.over'); ctx.record(Math.floor(score / 10)); }
      score++;
      speed = 5 + score / 600;
      if (score % 10 === 0) ctx.score(score / 10);
      g.clearRect(0, 0, W, H);
      g.fillStyle = css('--line');
      g.fillRect(0, GROUND + 1, W, 2);
      g.fillStyle = css('--accent');
      g.beginPath();
      g.ellipse(57, y - 14, 14, 14 + Math.min(4, Math.abs(vy)), 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(62, y - 18, 3, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = css('--fill');
      obstacles.forEach((o) => g.fillRect(o.x, GROUND - o.h, o.w, o.h));
    });
  });

  // 10. Заливка: перекрашивайте поле из левого верхнего угла, пока оно не станет одного цвета.
  add('flood', '◧', 300, 'puzzle', (ctx) => {
    const N = 12;
    const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];
    const LIMIT = 22;
    const board = Array.from({ length: N * N }, () => rand(COLORS.length));
    let moves = 0;
    let over = false;
    const cells = grid(ctx, N, N, () => {}, 'gs-flood');
    ctx.tools.append(h('div', { class: 'gs-pad' }, COLORS.map((c, k) => h('button', { type: 'button', class: 'gs-color', style: `background:${c}`, onclick: () => paintWith(k) }))));
    function paintWith(k) {
      if (over || board[0] === k) return;
      const from = board[0];
      const stack = [0];
      const seen = new Set();
      while (stack.length) {
        const i = stack.pop();
        if (seen.has(i) || board[i] !== from) continue;
        seen.add(i);
        board[i] = k;
        const x = i % N;
        if (x > 0) stack.push(i - 1);
        if (x < N - 1) stack.push(i + 1);
        if (i >= N) stack.push(i - N);
        if (i < N * N - N) stack.push(i + N);
      }
      moves++;
      paint();
      if (board.every((v) => v === board[0])) { over = true; ctx.status('games.win'); ctx.record(moves, true); }
      else if (moves >= LIMIT) { over = true; ctx.status('games.lose'); }
    }
    function paint() {
      cells.forEach((cell, i) => { cell.style.background = COLORS[board[i]]; });
      ctx.score(`${moves} / ${LIMIT}`, 'games.moves');
    }
    paint();
  });

  // 11. Морской бой: найдите и потопите весь флот за 45 выстрелов.
  add('sea', '⚓', 210, 'board', (ctx) => {
    const N = 8;
    const ships = [];
    const taken = new Set();
    for (const len of [4, 3, 3, 2, 2, 1, 1]) {
      for (let tries = 0; tries < 500; tries++) {
        const across = rand(2);
        const x = rand(across ? N - len + 1 : N);
        const y = rand(across ? N : N - len + 1);
        const cellsOf = Array.from({ length: len }, (_, k) => (y + (across ? 0 : k)) * N + x + (across ? k : 0));
        const near = (i) => [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => {
          const xx = (i % N) + dx;
          const yy = Math.floor(i / N) + dy;
          return xx >= 0 && yy >= 0 && xx < N && yy < N && taken.has(yy * N + xx);
        }));
        if (cellsOf.some(near)) continue;
        cellsOf.forEach((i) => taken.add(i));
        ships.push({ cells: cellsOf, hits: 0 });
        break;
      }
    }
    let shots = 45;
    let over = false;
    const cells = grid(ctx, N, N, (i) => {
      if (over || cells[i].dataset.shot) return;
      cells[i].dataset.shot = '1';
      shots--;
      const ship = ships.find((s) => s.cells.includes(i));
      if (ship) {
        ship.hits++;
        cells[i].classList.add('hit');
        cells[i].textContent = '✹';
        if (ship.hits === ship.cells.length) { ship.cells.forEach((j) => cells[j].classList.add('sunk')); ctx.status('gs.sunk'); }
        else ctx.status('gs.hit');
      } else {
        cells[i].classList.add('miss');
        cells[i].textContent = '•';
        ctx.status('gs.miss');
      }
      ctx.score(shots, 'gs.shots');
      if (ships.every((s) => s.hits === s.cells.length)) { over = true; ctx.status('games.win'); ctx.record(shots); }
      else if (!shots) { over = true; ctx.status('games.lose'); ships.forEach((s) => s.cells.forEach((j) => cells[j].classList.add('reveal'))); }
    }, 'gs-sea');
    ctx.score(shots, 'gs.shots');
  });

  // 12. Лабиринт: доберитесь до звезды. Каждый раз лабиринт новый.
  add('maze', '▦', 120, 'puzzle', (ctx) => {
    const N = 12;
    const C = 30;
    const { g, css } = canvasOf(ctx, N * C, N * C);
    const walls = Array.from({ length: N * N }, () => [true, true, true, true]); // верх, право, низ, лево
    const seen = new Set([0]);
    const stack = [0];
    while (stack.length) {
      const i = stack[stack.length - 1];
      const x = i % N;
      const y = Math.floor(i / N);
      const next = [[0, -1, 0, 2], [1, 0, 1, 3], [0, 1, 2, 0], [-1, 0, 3, 1]]
        .map(([dx, dy, a, b]) => [x + dx, y + dy, a, b])
        .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < N && ny < N && !seen.has(ny * N + nx));
      if (!next.length) { stack.pop(); continue; }
      const [nx, ny, a, b] = next[rand(next.length)];
      const j = ny * N + nx;
      walls[i][a] = false;
      walls[j][b] = false;
      seen.add(j);
      stack.push(j);
    }
    let pos = 0;
    let steps = 0;
    let done = false;
    const began = Date.now();
    ctx.score(0, 'games.moves');
    function go([dx, dy]) {
      if (done) return;
      const side = dx === 1 ? 1 : dx === -1 ? 3 : dy === 1 ? 2 : 0;
      if (walls[pos][side]) return;
      pos += dy * N + dx;
      ctx.score(++steps, 'games.moves');
      if (pos === N * N - 1) { done = true; ctx.status('gs.mazeDone', { s: Math.round((Date.now() - began) / 1000) }); ctx.record(steps, true); }
      draw();
    }
    ctx.keys((e) => { if (e.type === 'keydown' && DIRS[e.code]) { e.preventDefault(); go(DIRS[e.code]); } });
    ctx.swipe(go);
    function draw() {
      g.clearRect(0, 0, N * C, N * C);
      g.strokeStyle = css('--fill');
      g.lineWidth = 2;
      g.beginPath();
      walls.forEach(([top, right, bottom, left], i) => {
        const x = (i % N) * C;
        const y = Math.floor(i / N) * C;
        if (top) { g.moveTo(x, y); g.lineTo(x + C, y); }
        if (right) { g.moveTo(x + C, y); g.lineTo(x + C, y + C); }
        if (bottom) { g.moveTo(x, y + C); g.lineTo(x + C, y + C); }
        if (left) { g.moveTo(x, y); g.lineTo(x, y + C); }
      });
      g.stroke();
      g.font = `${C * 0.7}px system-ui`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('⭐', (N - 0.5) * C, (N - 0.5) * C);
      g.fillStyle = css('--accent');
      g.beginPath();
      g.arc((pos % N + 0.5) * C, (Math.floor(pos / N) + 0.5) * C, C * 0.32, 0, Math.PI * 2);
      g.fill();
    }
    draw();
  });

  // 13. Счёт в уме: решите как можно больше примеров за 60 секунд.
  add('math', '+−', 330, 'puzzle', (ctx) => {
    let score = 0;
    let left = 60;
    let answer = 0;
    let over = false;
    const question = h('b', { class: 'gs-question' });
    const options = h('div', { class: 'gs-options' });
    function next() {
      const op = rand(3);
      let a = 2 + rand(18);
      let b = 2 + rand(12);
      if (op === 1 && b > a) [a, b] = [b, a];
      answer = op === 0 ? a + b : op === 1 ? a - b : a * b;
      question.textContent = `${a} ${['+', '−', '×'][op]} ${b} = ?`;
      const set = new Set([answer]);
      while (set.size < 4) set.add(answer + rand(11) - 5);
      options.replaceChildren(...shuffle([...set]).map((n) => h('button', { type: 'button', class: 'btn outline', onclick: () => {
        if (over) return;
        if (n === answer) { ctx.score(++score); } else { left = Math.max(0, left - 3); }
        next();
      } }, String(n))));
    }
    ctx.stage.append(h('div', { class: 'gs-col' }, question, options));
    ctx.score(0);
    ctx.every(1000, () => {
      if (over) return;
      left--;
      ctx.status('games.timeLeft', { n: left });
      if (left <= 0) { over = true; ctx.status('games.over'); ctx.record(score); }
    });
    next();
  });

  // 14. Звездопад: ловите падающие звёзды. Пропустите три — игра окончена.
  add('starfall', '★', 45, 'arcade', (ctx) => {
    const W = 420;
    const H = 420;
    const { el, g, css } = canvasOf(ctx, W, H);
    let stars = [];
    let missed = 0;
    let score = 0;
    let over = false;
    let tick = 0;
    el.addEventListener('pointerdown', (e) => {
      if (over) return;
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * W;
      const y = ((e.clientY - rect.top) / rect.height) * H;
      const hit = stars.find((s) => Math.hypot(s.x - x, s.y - y) < s.r + 12);
      if (hit) { stars = stars.filter((s) => s !== hit); ctx.score(++score); ctx.record(score); }
    });
    ctx.score(0);
    ctx.every(16, () => {
      if (over) return;
      tick++;
      if (tick % Math.max(18, 50 - Math.floor(score / 3)) === 0) stars.push({ x: 20 + rand(W - 40), y: -20, r: 12 + rand(8), v: 1.5 + Math.random() * 1.5 + score / 40, spin: rand(360) });
      stars.forEach((s) => { s.y += s.v; s.spin += 2; });
      const fallen = stars.filter((s) => s.y > H + 20);
      if (fallen.length) {
        missed += fallen.length;
        stars = stars.filter((s) => s.y <= H + 20);
        if (missed >= 3) { over = true; ctx.status('games.over'); }
      }
      g.clearRect(0, 0, W, H);
      stars.forEach((s) => {
        g.save();
        g.translate(s.x, s.y);
        g.rotate((s.spin * Math.PI) / 180);
        g.beginPath();
        for (let k = 0; k < 10; k++) {
          const r = k % 2 ? s.r * 0.45 : s.r;
          const a = (k * Math.PI) / 5;
          g.lineTo(Math.sin(a) * r, -Math.cos(a) * r);
        }
        g.closePath();
        g.fillStyle = `hsl(${45 + (s.r * 3) % 30} 95% 58%)`;
        g.shadowColor = '#facc15';
        g.shadowBlur = 12;
        g.fill();
        g.restore();
      });
      g.fillStyle = css('--ink-3');
      g.font = '14px system-ui';
      g.fillText('✕'.repeat(missed), 10, H - 12);
    });
  });

  // 15. Башня: останавливайте плиту точно над предыдущей. Что свисает — отрезается.
  add('tower', '▤', 230, 'arcade', (ctx) => {
    const W = 360;
    const H = 460;
    const BH = 22;
    const { el, g } = canvasOf(ctx, W, H);
    let stack = [{ x: 90, w: 180 }];
    let moving = { x: 0, w: 180, dir: 1 };
    let over = false;
    function drop() {
      if (over) return;
      const top = stack[stack.length - 1];
      const left = Math.max(top.x, moving.x);
      const right = Math.min(top.x + top.w, moving.x + moving.w);
      if (right <= left) { over = true; ctx.status('games.over'); ctx.record(stack.length - 1); return; }
      stack.push({ x: left, w: right - left });
      ctx.score(stack.length - 1);
      moving = { x: stack.length % 2 ? 0 : W - (right - left), w: right - left, dir: stack.length % 2 ? 1 : -1 };
    }
    el.addEventListener('pointerdown', drop);
    ctx.keys((e) => { if (e.type === 'keydown' && e.code === 'Space') { e.preventDefault(); drop(); } });
    ctx.score(0);
    ctx.every(16, () => {
      if (!over) {
        moving.x += moving.dir * (2.5 + stack.length * 0.12);
        if (moving.x < 0 || moving.x + moving.w > W) moving.dir *= -1;
      }
      const shift = Math.max(0, stack.length - 14) * BH;
      g.clearRect(0, 0, W, H);
      stack.forEach((b, i) => {
        g.fillStyle = `hsl(${(i * 18) % 360} 75% 60%)`;
        g.fillRect(b.x, H - (i + 1) * BH + shift, b.w, BH - 2);
      });
      if (!over) {
        g.fillStyle = `hsl(${(stack.length * 18) % 360} 75% 60%)`;
        g.fillRect(moving.x, H - (stack.length + 1) * BH + shift, moving.w, BH - 2);
      }
    });
  });

  // Сам Магазин игр.
  const GENRES = ['all', 'puzzle', 'arcade', 'board', 'words'];
  BOS.apps.gamestore = {
    title: 'app.gamestore', icon: 'gamestore', width: 860, height: 620, minWidth: 360, minHeight: 420,
    mount(body, win) {
      let genre = 'all';
      const timers = new Set();
      win.disposers.push(() => timers.forEach(clearInterval));
      const owned = () => state.gamesOwned || [];
      const gridEl = h('div', { class: 'gs-grid' });
      const count = h('p', { class: 'b3-sub' });
      const chips = GENRES.map((id) => h('button', { type: 'button', class: 'chip', i18n: `gs.genre.${id}`, onclick: () => { genre = id; paint(); } }));

      function actions(entry) {
        const box = h('div', { class: 'bstore-actions' });
        if (owned().includes(entry.id)) {
          box.append(
            h('button', { type: 'button', class: 'btn primary', onclick: () => { BOS.wm.open('games'); if (BOS.playGame) BOS.playGame(entry.id); } }, icon('play'), h('span', { i18n: 'gs.play' })),
            h('button', { type: 'button', class: 'btn ghost', i18n: 'store.remove', onclick: () => {
              state.gamesOwned = owned().filter((id) => id !== entry.id);
              BOS.save();
              BOS.emit('gamesOwned');
            } }));
        } else {
          box.append(h('button', { type: 'button', class: 'btn primary', onclick: () => download(entry, box) }, icon('download'), h('span', { i18n: 'gs.get' })));
        }
        return box;
      }
      // «Скачивание»: игра уже внутри BOS, полоска показывает, как она ставится на устройство.
      function download(entry, box) {
        const bar = h('i');
        box.replaceChildren(h('span', { class: 'bstore-bar' }, bar), h('span', { class: 'bstore-state', i18n: 'gs.loading' }));
        let progress = 0;
        const timer = setInterval(() => {
          progress = Math.min(100, progress + 6 + Math.random() * 12);
          bar.style.width = `${progress}%`;
          if (progress < 100) return;
          clearInterval(timer);
          timers.delete(timer);
          state.gamesOwned = [...owned(), entry.id];
          BOS.save();
          BOS.emit('gamesOwned');
        }, 110);
        timers.add(timer);
      }
      function paint() {
        chips.forEach((chip, i) => chip.classList.toggle('active', GENRES[i] === genre));
        const games = BOS.storeGames().filter((entry) => genre === 'all' || entry.genre === genre);
        gridEl.replaceChildren(...games.map((entry) => h('article', { class: 'gs-card' },
          h('div', { class: 'gs-head' },
            h('span', { class: 'gs-tile', style: `--hue:${entry.hue}` }, entry.glyph),
            h('div', {}, h('b', { i18n: `game.${entry.id}` }), h('small', { i18n: `gs.genre.${entry.genre}` }))),
          h('p', { i18n: `gs.desc.${entry.id}` }),
          actions(entry))));
        count.dataset.i18n = 'gs.count';
        count.i18nVars = { n: BOS.storeGames().length, mine: owned().length };
        BOS.applyI18nTo(count);
      }
      win.listen('gamesOwned', paint);
      body.append(h('div', { class: 'bstore gs' },
        h('div', { class: 'bstore-hero gs-hero' },
          BOS.appTile('gamestore'),
          h('div', {}, h('h2', { i18n: 'app.gamestore' }), h('p', { i18n: 'gs.sub' }), count)),
        h('div', { class: 'b3-chips' }, chips),
        gridEl));
      paint();
    },
  };
})();
