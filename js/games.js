// Приложение «Игры»: каталог мелких игр с общими счётом, рекордом и перезапуском.
(function () {
  const { h, icon, state } = BOS;

  const GAMES = [];
  const game = (id, glyph, start) => GAMES.push({ id, glyph, start });

  // Коды клавиш не зависят от раскладки, поэтому WASD работает и на русской.
  const DIRS = {
    ArrowUp: [0, -1], KeyW: [0, -1],
    ArrowDown: [0, 1], KeyS: [0, 1],
    ArrowLeft: [-1, 0], KeyA: [-1, 0],
    ArrowRight: [1, 0], KeyD: [1, 0],
  };
  const rand = (n) => Math.floor(Math.random() * n);
  function shuffle(list) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = rand(i + 1);
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  function grid(ctx, cols, rows, onClick, className = '') {
    const cells = [];
    const el = h('div', { class: `g-grid ${className}`, style: `--cols:${cols};--rows:${rows}` });
    for (let i = 0; i < cols * rows; i++) {
      const cell = h('button', { type: 'button', class: 'g-cell', onclick: () => onClick(i) });
      cells.push(cell);
      el.append(cell);
    }
    ctx.stage.append(el);
    return cells;
  }

  function canvasOf(ctx, width, height) {
    const el = h('canvas', { class: 'game-canvas', width: width * 2, height: height * 2, style: `--ratio:${width / height}` });
    ctx.stage.append(el);
    const g = el.getContext('2d');
    g.scale(2, 2);
    return { el, g, css: (name) => getComputedStyle(el).getPropertyValue(name).trim() };
  }

  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

  game('tictac', '✕○', (ctx) => {
    const board = Array(9).fill(null);
    let locked = false;
    const lineOf = (b) => LINES.find(([a, c, d]) => b[a] && b[a] === b[c] && b[a] === b[d]);

    const cells = grid(ctx, 3, 3, (i) => {
      if (locked || board[i]) return;
      put(i, 'x');
      if (locked) return;
      locked = true;
      ctx.after(280, () => { locked = false; put(botMove(), 'o'); });
    });

    function put(i, who) {
      board[i] = who;
      cells[i].textContent = who === 'x' ? '✕' : '○';
      if (who === 'x') cells[i].classList.add('p1');
      const line = lineOf(board);
      if (line) {
        line.forEach((k) => cells[k].classList.add('hit'));
        locked = true;
        ctx.status(who === 'x' ? 'games.win' : 'games.lose');
      } else if (board.every(Boolean)) {
        locked = true;
        ctx.status('games.draw');
      }
    }

    function botMove() {
      const free = board.flatMap((v, i) => (v ? [] : [i]));
      const finishing = (who) => free.find((i) => {
        const next = [...board];
        next[i] = who;
        return lineOf(next);
      });
      for (const who of ['o', 'x']) {
        const move = finishing(who);
        if (move !== undefined) return move;
      }
      return free.includes(4) ? 4 : free[rand(free.length)];
    }
  });

  game('four', '●●', (ctx) => {
    const W = 7;
    const H = 6;
    const board = Array(W * H).fill(null);
    let locked = false;

    const cells = grid(ctx, W, H, (i) => {
      if (locked) return;
      const at = landing(i % W);
      if (at < 0) return;
      put(at, 'x');
      if (locked) return;
      locked = true;
      ctx.after(300, () => { locked = false; put(botMove(), 'o'); });
    }, 'g-round');

    function landing(col) {
      for (let row = H - 1; row >= 0; row--) {
        if (!board[row * W + col]) return row * W + col;
      }
      return -1;
    }

    // Возвращает клетки линии из четырёх, проходящей через i, или null.
    function lineThrough(i, who) {
      const row = Math.floor(i / W);
      const col = i % W;
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
        const line = [i];
        for (const sign of [1, -1]) {
          for (let k = 1; k < 4; k++) {
            const x = col + dx * sign * k;
            const y = row + dy * sign * k;
            if (x < 0 || x >= W || y < 0 || y >= H || board[y * W + x] !== who) break;
            line.push(y * W + x);
          }
        }
        if (line.length >= 4) return line;
      }
      return null;
    }

    function put(i, who) {
      board[i] = who;
      cells[i].classList.add(who === 'x' ? 'd1' : 'd2');
      const line = lineThrough(i, who);
      if (line) {
        line.forEach((k) => cells[k].classList.add('won'));
        locked = true;
        ctx.status(who === 'x' ? 'games.win' : 'games.lose');
      } else if (board.every(Boolean)) {
        locked = true;
        ctx.status('games.draw');
      }
    }

    function botMove() {
      const options = [...Array(W).keys()].map(landing).filter((i) => i >= 0);
      for (const who of ['o', 'x']) {
        const move = options.find((i) => lineThrough(i, who));
        if (move !== undefined) return move;
      }
      return options.sort((a, b) => Math.abs((a % W) - 3) - Math.abs((b % W) - 3) + (Math.random() - 0.5) * 3)[0];
    }
  });

  game('pairs', '♥♥', (ctx) => {
    const SYMBOLS = '●▲■◆★✚♥☾';
    const deck = shuffle([...SYMBOLS, ...SYMBOLS]);
    let first = null;
    let locked = false;
    let moves = 0;
    let found = 0;
    ctx.score(0, 'games.moves');

    const cells = grid(ctx, 4, 4, (i) => {
      if (locked || cells[i].textContent) return;
      cells[i].textContent = deck[i];
      cells[i].classList.add('up');
      if (first === null) { first = i; return; }
      ctx.score(++moves, 'games.moves');
      const previous = first;
      first = null;
      if (deck[previous] === deck[i]) {
        cells[previous].classList.add('hit');
        cells[i].classList.add('hit');
        if (++found === SYMBOLS.length) {
          ctx.status('games.win');
          ctx.record(moves, true);
        }
        return;
      }
      locked = true;
      ctx.after(650, () => {
        [previous, i].forEach((k) => {
          cells[k].textContent = '';
          cells[k].classList.remove('up');
        });
        locked = false;
      });
    });
  });

  game('slide', '15', (ctx) => {
    const S = 4;
    const tiles = [...Array(S * S - 1).keys()].map((v) => v + 1).concat(0);
    let moves = 0;
    let done = false;
    ctx.score(0, 'games.moves');

    const neighbours = (i) => [i - S, i + S, i % S ? i - 1 : -1, i % S < S - 1 ? i + 1 : -1].filter((k) => k >= 0 && k < S * S);
    const swapWithEmpty = (i) => {
      const empty = tiles.indexOf(0);
      [tiles[i], tiles[empty]] = [tiles[empty], tiles[i]];
    };
    for (let n = 0; n < 300; n++) {
      const options = neighbours(tiles.indexOf(0));
      swapWithEmpty(options[rand(options.length)]);
    }

    const cells = grid(ctx, S, S, move);
    function paint() {
      cells.forEach((cell, i) => {
        cell.textContent = tiles[i] || '';
        cell.classList.toggle('blank', !tiles[i]);
      });
    }
    function move(i) {
      if (done || !neighbours(tiles.indexOf(0)).includes(i) || !tiles[i]) return;
      swapWithEmpty(i);
      ctx.score(++moves, 'games.moves');
      paint();
      if (tiles.every((v, k) => v === (k + 1) % (S * S))) {
        done = true;
        ctx.status('games.win');
        ctx.record(moves, true);
      }
    }
    ctx.keys((e) => {
      const d = DIRS[e.code];
      if (e.type !== 'keydown' || !d) return;
      e.preventDefault();
      const empty = tiles.indexOf(0);
      const x = (empty % S) - d[0];
      const y = Math.floor(empty / S) - d[1];
      if (x >= 0 && x < S && y >= 0 && y < S) move(y * S + x);
    });
    paint();
  });

  game('lights', '☀', (ctx) => {
    const S = 5;
    const lit = Array(S * S).fill(false);
    let moves = 0;
    let done = false;
    ctx.score(0, 'games.moves');

    function toggle(i) {
      const row = Math.floor(i / S);
      const col = i % S;
      [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
        const x = col + dx;
        const y = row + dy;
        if (x >= 0 && x < S && y >= 0 && y < S) lit[y * S + x] = !lit[y * S + x];
      });
    }
    // Поле строится нажатиями из погашенного состояния, поэтому всегда решаемо.
    do {
      shuffle([...lit.keys()]).slice(0, 9).forEach(toggle);
    } while (!lit.some(Boolean));

    const cells = grid(ctx, S, S, (i) => {
      if (done) return;
      toggle(i);
      ctx.score(++moves, 'games.moves');
      paint();
      if (!lit.some(Boolean)) {
        done = true;
        ctx.status('games.win');
        ctx.record(moves, true);
      }
    });
    function paint() {
      cells.forEach((cell, i) => cell.classList.toggle('lit', lit[i]));
    }
    paint();
  });

  game('merge', '1+1', (ctx) => {
    const S = 4;
    const board = Array(S * S).fill(0);
    let score = 0;
    let over = false;
    ctx.score(0);

    const cells = grid(ctx, S, S, () => {});
    function spawn() {
      const free = board.flatMap((v, i) => (v ? [] : [i]));
      if (free.length) board[free[rand(free.length)]] = Math.random() < 0.9 ? 1 : 2;
    }
    function paint() {
      cells.forEach((cell, i) => {
        const level = board[i];
        cell.textContent = level || '';
        cell.style.background = level ? `hsl(${(12 + level * 37) % 360} 85% 72%)` : '';
        cell.style.color = level ? '#111' : '';
      });
    }
    function linesFor([dx, dy]) {
      const lines = [];
      for (let a = 0; a < S; a++) {
        const line = [];
        for (let b = 0; b < S; b++) {
          const along = (dx > 0 || dy > 0) ? S - 1 - b : b;
          line.push(dx ? a * S + along : along * S + a);
        }
        lines.push(line);
      }
      return lines;
    }
    function move(dir) {
      if (over) return;
      let changed = false;
      linesFor(dir).forEach((line) => {
        const values = line.map((i) => board[i]).filter(Boolean);
        const merged = [];
        for (let k = 0; k < values.length; k++) {
          if (values[k] === values[k + 1]) {
            merged.push(values[k] + 1);
            score += 2 ** (values[k] + 1);
            k++;
          } else {
            merged.push(values[k]);
          }
        }
        line.forEach((i, k) => {
          const value = merged[k] || 0;
          if (board[i] !== value) changed = true;
          board[i] = value;
        });
      });
      if (!changed) return;
      spawn();
      paint();
      ctx.score(score);
      ctx.record(score);
      const canMove = board.some((v, i) => !v
        || (i % S < S - 1 && v === board[i + 1])
        || (i + S < S * S && v === board[i + S]));
      if (!canMove) {
        over = true;
        ctx.status('games.over');
      }
    }
    ctx.keys((e) => {
      const d = DIRS[e.code];
      if (e.type !== 'keydown' || !d) return;
      e.preventDefault();
      move(d);
    });
    ctx.swipe(move);
    spawn();
    spawn();
    paint();
  });

  game('traps', '!', (ctx) => {
    const S = 9;
    const TRAPS = 10;
    const traps = Array(S * S).fill(false);
    const opened = Array(S * S).fill(false);
    const flagged = Array(S * S).fill(false);
    let placed = false;
    let over = false;
    let flagMode = false;
    let openedCount = 0;

    function around(i) {
      const row = Math.floor(i / S);
      const col = i % S;
      const out = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const x = col + dx;
          const y = row + dy;
          if ((dx || dy) && x >= 0 && x < S && y >= 0 && y < S) out.push(y * S + x);
        }
      }
      return out;
    }
    function place(safe) {
      const blocked = new Set([safe, ...around(safe)]);
      shuffle([...traps.keys()].filter((i) => !blocked.has(i))).slice(0, TRAPS).forEach((i) => { traps[i] = true; });
      placed = true;
    }
    function toggleFlag(i) {
      if (over || opened[i]) return;
      flagged[i] = !flagged[i];
      cells[i].textContent = flagged[i] ? '⚑' : '';
      cells[i].classList.toggle('p1', flagged[i]);
    }
    function reveal(i) {
      if (over || opened[i] || flagged[i]) return;
      if (!placed) place(i);
      if (traps[i]) {
        over = true;
        traps.forEach((isTrap, k) => {
          if (!isTrap) return;
          cells[k].textContent = '✸';
          cells[k].classList.add('boom');
        });
        ctx.status('games.lose');
        return;
      }
      const stack = [i];
      while (stack.length) {
        const k = stack.pop();
        if (opened[k] || flagged[k]) continue;
        opened[k] = true;
        openedCount++;
        const count = around(k).filter((n) => traps[n]).length;
        cells[k].textContent = count || '';
        cells[k].classList.add('opened');
        if (!count) stack.push(...around(k));
      }
      if (openedCount === S * S - TRAPS) {
        over = true;
        ctx.status('games.win');
      }
    }

    const cells = grid(ctx, S, S, (i) => (flagMode ? toggleFlag(i) : reveal(i)), 'g-tight');
    cells.forEach((cell, i) => cell.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      toggleFlag(i);
    }));
    const flagButton = h('button', {
      type: 'button',
      class: 'btn outline',
      i18n: 'games.flag',
      onclick: () => {
        flagMode = !flagMode;
        flagButton.classList.toggle('on', flagMode);
      },
    });
    ctx.tools.append(flagButton);
  });

  game('tail', '~', (ctx) => {
    const N = 20;
    const C = 20;
    const { g, css } = canvasOf(ctx, N * C, N * C);
    const body = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
    const queue = [];
    let dir = [1, 0];
    let food = spawn();
    let score = 0;
    let running = false;
    let over = false;
    ctx.score(0);

    function spawn() {
      for (;;) {
        const spot = { x: rand(N), y: rand(N) };
        if (!body.some((p) => p.x === spot.x && p.y === spot.y)) return spot;
      }
    }
    function steer(d) {
      if (over) return;
      const last = queue[queue.length - 1] || dir;
      if (d[0] === -last[0] && d[1] === -last[1]) return;
      if (queue.length < 2) queue.push(d);
      running = true;
    }
    function draw() {
      g.clearRect(0, 0, N * C, N * C);
      g.fillStyle = css('--accent');
      g.beginPath();
      g.arc((food.x + 0.5) * C, (food.y + 0.5) * C, C * 0.38, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = css('--fill');
      body.forEach((p) => g.fillRect(p.x * C + 1, p.y * C + 1, C - 2, C - 2));
    }
    ctx.keys((e) => {
      const d = DIRS[e.code];
      if (e.type !== 'keydown' || !d) return;
      e.preventDefault();
      steer(d);
    });
    ctx.swipe(steer);
    ctx.every(110, () => {
      if (!running || over) return;
      if (queue.length) dir = queue.shift();
      const head = { x: body[0].x + dir[0], y: body[0].y + dir[1] };
      const hitsSelf = body.slice(0, -1).some((p) => p.x === head.x && p.y === head.y);
      if (head.x < 0 || head.y < 0 || head.x >= N || head.y >= N || hitsSelf) {
        over = true;
        ctx.status('games.over');
        return;
      }
      body.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        ctx.score(++score);
        ctx.record(score);
        food = spawn();
      } else {
        body.pop();
      }
      draw();
    });
    draw();
  });

  game('dodge', '▼', (ctx) => {
    const W = 480;
    const H = 360;
    const PLAYER_W = 46;
    const PLAYER_H = 14;
    const { el, g, css } = canvasOf(ctx, W, H);
    const blocks = [];
    let x = W / 2;
    let left = false;
    let right = false;
    let frame = 0;
    let score = 0;
    let over = false;
    ctx.score(0);

    el.addEventListener('pointermove', (e) => {
      const rect = el.getBoundingClientRect();
      x = ((e.clientX - rect.left) / rect.width) * W;
    });
    ctx.keys((e) => {
      const d = DIRS[e.code];
      if (!d || !d[0]) return;
      e.preventDefault();
      if (d[0] < 0) left = e.type === 'keydown';
      else right = e.type === 'keydown';
    });

    ctx.every(16, () => {
      if (over) return;
      frame++;
      if (left) x -= 6;
      if (right) x += 6;
      x = Math.max(PLAYER_W / 2, Math.min(W - PLAYER_W / 2, x));
      if (frame % Math.max(9, 34 - Math.floor(score * 0.4)) === 0) {
        const size = 18 + rand(30);
        blocks.push({ x: rand(W - size), y: -size, size, speed: 2.4 + score * 0.05 + Math.random() * 2 });
      }
      const top = H - PLAYER_H - 8;
      for (let i = blocks.length - 1; i >= 0; i--) {
        const b = blocks[i];
        b.y += b.speed;
        if (b.y > H) {
          blocks.splice(i, 1);
          ctx.score(++score);
          ctx.record(score);
        } else if (b.y + b.size > top && b.y < top + PLAYER_H && b.x + b.size > x - PLAYER_W / 2 && b.x < x + PLAYER_W / 2) {
          over = true;
          ctx.status('games.over');
        }
      }
      g.clearRect(0, 0, W, H);
      g.fillStyle = css('--fill');
      blocks.forEach((b) => g.fillRect(b.x, b.y, b.size, b.size));
      g.fillStyle = css('--accent');
      g.fillRect(x - PLAYER_W / 2, top, PLAYER_W, PLAYER_H);
    });
  });

  game('catch', '◎', (ctx) => {
    let left = 20;
    let score = 0;
    let started = false;
    let over = false;

    const dot = h('button', { type: 'button', class: 'g-dot', 'aria-label': '●', onpointerdown: hit });
    ctx.stage.append(h('div', { class: 'g-arena' }, dot));
    function place() {
      dot.style.left = `${8 + rand(84)}%`;
      dot.style.top = `${10 + rand(80)}%`;
      dot.style.setProperty('--hue', rand(360));
    }
    function tick() {
      if (over) return;
      left--;
      ctx.status('games.timeLeft', { n: left });
      if (left > 0) return;
      over = true;
      dot.hidden = true;
      ctx.status('games.over');
    }
    function hit() {
      if (over) return;
      if (!started) {
        started = true;
        ctx.status('games.timeLeft', { n: left });
        ctx.every(1000, tick);
        ctx.every(850, () => { if (!over) place(); });
      }
      ctx.score(++score);
      ctx.record(score);
      place();
    }
    ctx.score(0);
    place();
  });

  game('repeat', '1·2', (ctx) => {
    const seq = [];
    let position = 0;
    let listening = false;
    let over = false;

    const pads = grid(ctx, 2, 2, (i) => {
      if (!listening || over) return;
      flash(i, 180);
      if (i !== seq[position]) {
        over = true;
        ctx.status('games.over');
        return;
      }
      if (++position === seq.length) {
        listening = false;
        ctx.score(seq.length);
        ctx.record(seq.length);
        ctx.after(500, nextRound);
      }
    }, 'g-pads');
    pads.forEach((pad, i) => pad.style.setProperty('--hue', [0, 48, 140, 215][i]));

    function flash(i, ms = 320) {
      pads[i].classList.add('lit');
      ctx.after(ms, () => pads[i].classList.remove('lit'));
    }
    function nextRound() {
      seq.push(rand(4));
      position = 0;
      seq.forEach((pad, k) => ctx.after(500 + k * 520, () => flash(pad)));
      ctx.after(500 + seq.length * 520, () => { listening = true; });
    }
    ctx.score(0);
    nextRound();
  });

  game('reaction', '⚡', (ctx) => {
    let phase = 'idle';
    let round = 0;
    let startedAt = 0;

    const pad = h('button', { type: 'button', class: 'g-pad', onclick: press });
    ctx.stage.append(pad);

    function show(nextPhase, key, text) {
      phase = nextPhase;
      pad.dataset.phase = nextPhase;
      if (key) {
        pad.dataset.i18n = key;
        BOS.applyI18nTo(pad);
      } else {
        delete pad.dataset.i18n;
        pad.textContent = text;
      }
    }
    function press() {
      if (phase === 'wait') {
        round++;
        ctx.status('games.early');
        show('idle', 'common.start');
      } else if (phase === 'go') {
        const ms = Math.round(performance.now() - startedAt);
        ctx.score(`${ms} ms`, 'games.score');
        ctx.record(ms, true);
        show('idle', null, `${ms} ms`);
      } else {
        const token = ++round;
        ctx.hint();
        show('wait', null, '…');
        ctx.after(1200 + rand(2800), () => {
          if (token !== round) return;
          startedAt = performance.now();
          show('go', 'games.go');
        });
      }
    }
    show('idle', 'common.start');
  });

  game('guess', '?', (ctx) => {
    const secret = 1 + rand(100);
    let tries = 0;
    let done = false;
    ctx.score(0, 'games.moves');

    const mark = h('div', { class: 'g-guess-mark' }, '?');
    const input = h('input', { class: 'input', type: 'number', min: 1, max: 100, 'aria-label': '1–100' });
    ctx.stage.append(h('form', {
      class: 'g-guess',
      onsubmit: (e) => {
        e.preventDefault();
        const value = Number(input.value);
        if (done || !Number.isInteger(value) || value < 1 || value > 100) return;
        ctx.score(++tries, 'games.moves');
        if (value === secret) {
          done = true;
          mark.textContent = value;
          mark.classList.add('ok');
          ctx.status('games.win');
          ctx.record(tries, true);
        } else {
          mark.textContent = `${value} ${value < secret ? '↑' : '↓'}`;
        }
        input.value = '';
        input.focus();
      },
    }, mark, h('div', { class: 'g-guess-row' }, input, h('button', { type: 'submit', class: 'btn primary' }, 'OK'))));
    ctx.after(50, () => input.focus());
  });

  game('rps', '✌️', (ctx) => {
    const ITEMS = ['✊', '✋', '✌️'];
    const TARGET = 3;
    let you = 0;
    let bot = 0;

    const yours = h('span', {}, '?');
    const theirs = h('span', {}, '?');
    const showScore = () => ctx.score(`${you}:${bot}`);

    function choose(mine) {
      if (you === TARGET || bot === TARGET) return;
      const other = rand(3);
      yours.textContent = ITEMS[mine];
      theirs.textContent = ITEMS[other];
      const outcome = (mine - other + 3) % 3;
      if (outcome === 1) you++;
      if (outcome === 2) bot++;
      showScore();
      if (you === TARGET || bot === TARGET) ctx.status(you === TARGET ? 'games.win' : 'games.lose');
      else ctx.status(['games.draw', 'games.win', 'games.lose'][outcome]);
    }

    ctx.stage.append(h('div', { class: 'g-rps' },
      h('div', { class: 'g-rps-field' }, yours, h('i', {}, 'vs'), theirs),
      h('div', { class: 'g-rps-choices' }, ITEMS.map((item, i) => h('button', { type: 'button', onclick: () => choose(i) }, item)))));
    showScore();
  });

  BOS.apps.games = {
    title: 'app.games', icon: 'games', width: 640, height: 560, minWidth: 340, minHeight: 420,
    mount(body, win) {
      const root = h('div', { class: 'games' });
      let cleanup = [];
      let keyHandler = null;

      function stopGame() {
        cleanup.forEach((fn) => fn());
        cleanup = [];
        keyHandler = null;
      }

      function showMenu() {
        stopGame();
        // Скачанные из Магазина игр игры появляются здесь же, после встроенных.
        const owned = state.gamesOwned || [];
        const list = GAMES.filter((entry) => !entry.store || owned.includes(entry.id));
        root.replaceChildren(h('div', { class: 'games-menu' }, list.map((entry, i) => h('button', {
          type: 'button',
          class: 'game-card',
          onclick: () => play(entry),
        },
          h('span', { class: 'game-glyph', style: `--hue:${entry.hue ?? Math.round((i * 360) / list.length)}` }, entry.glyph),
          h('span', { i18n: `game.${entry.id}` })))));
      }

      function play(entry) {
        stopGame();
        const scoreEl = h('span', { class: 'game-score' });
        const statusEl = h('p', { class: 'game-status', 'aria-live': 'polite' });
        const stage = h('div', { class: 'game-stage' });
        const tools = h('div', { class: 'game-tools' });
        let current = null;

        function paintScore() {
          const best = state.best[entry.id];
          scoreEl.replaceChildren(...[
            ...(current ? [h('span', { i18n: current[0] }), ` ${current[1]}`] : []),
            ...(best !== undefined ? [current ? ' · ' : '', h('span', { i18n: 'games.best' }), ` ${best}`] : []),
          ]);
        }

        const ctx = {
          stage,
          tools,
          status(key, vars) {
            statusEl.dataset.i18n = key;
            statusEl.i18nVars = vars;
            BOS.applyI18nTo(statusEl);
          },
          hint() { ctx.status(`hint.${entry.id}`); },
          keys(fn) { keyHandler = fn; },
          // Интервалы не тикают, пока окно свёрнуто: игра встаёт на паузу.
          every(ms, fn) {
            const id = setInterval(() => { if (!win.minimized) fn(); }, ms);
            cleanup.push(() => clearInterval(id));
          },
          after(ms, fn) {
            const id = setTimeout(fn, ms);
            cleanup.push(() => clearTimeout(id));
          },
          score(value, label = 'games.score') {
            current = [label, value];
            paintScore();
          },
          record(value, lowerIsBetter = false) {
            const best = state.best[entry.id];
            if (best === undefined || (lowerIsBetter ? value < best : value > best)) {
              state.best[entry.id] = value;
              BOS.save();
            }
            paintScore();
          },
          swipe(fn) {
            let start = null;
            stage.addEventListener('pointerdown', (e) => { start = [e.clientX, e.clientY]; });
            stage.addEventListener('pointerup', (e) => {
              if (!start) return;
              const dx = e.clientX - start[0];
              const dy = e.clientY - start[1];
              start = null;
              if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
              fn(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]);
            });
          },
        };

        root.replaceChildren(h('div', { class: 'game-play' },
          h('div', { class: 'game-head' },
            h('button', { type: 'button', class: 'round', i18nTitle: 'common.back', onclick: showMenu }, icon('left')),
            h('b', { class: 'game-title', i18n: `game.${entry.id}` }),
            scoreEl,
            h('button', { type: 'button', class: 'round', i18nTitle: 'games.restart', onclick: () => play(entry) }, icon('restart'))),
          statusEl,
          stage,
          tools));
        ctx.hint();
        paintScore();
        entry.start(ctx);
      }

      const onKey = (e) => { if (keyHandler) keyHandler(e); };
      win.el.addEventListener('keydown', onKey);
      win.el.addEventListener('keyup', onKey);
      win.disposers.push(stopGame);

      // Магазин игр открывает нужную игру сразу.
      BOS.playGame = (id) => {
        const entry = GAMES.find((x) => x.id === id);
        if (entry) play(entry);
      };
      win.disposers.push(() => { BOS.playGame = null; });
      win.listen('gamesOwned', () => { if (root.querySelector('.games-menu')) showMenu(); });

      showMenu();
      body.append(root);
    },
  };

  BOS.GAME_IDS = GAMES.map((entry) => entry.id);
  // Для Магазина игр: общие помощники и регистрация скачиваемых игр.
  BOS.gameKit = { grid, canvasOf, shuffle, rand, DIRS, LINES };
  BOS.defineGame = (id, glyph, start, meta) => GAMES.push({ id, glyph, start, store: true, ...meta });
  BOS.storeGames = () => GAMES.filter((entry) => entry.store);
})();
