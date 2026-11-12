// Обои BOS рисуются кодом: файлы не нужны, а цвета берутся из текущей темы.
(function () {
  const WIDTH = 1600;
  const HEIGHT = 1000;

  const svg = (inner) => `<svg viewBox="0 0 ${WIDTH} ${HEIGHT}" preserveAspectRatio="xMidYMax slice">${inner}</svg>`;

  // Волнистая линия из суммы синусов, замкнутая по нижнему краю.
  function wavePath(base, amplitude, seed, step) {
    let d = `M0 ${HEIGHT}`;
    for (let x = 0; x <= WIDTH; x += step) {
      const wave = 0.55 * Math.sin(x * 0.0021 + seed * 0.17)
        + 0.3 * Math.sin(x * 0.0053 - seed * 0.11 + 1.7)
        + 0.15 * Math.sin(x * 0.011 + seed * 0.23 + 0.6);
      d += `L${x} ${Math.round(base - amplitude * wave)}`;
    }
    return `${d}L${WIDTH} ${HEIGHT}Z`;
  }

  // Объёмный лист. Основание в точке (0, 0), кончик вверху. Центральная жилка изогнута,
  // поэтому левая половина шире и освещена, а правая уже и в тени — так лист кажется повёрнутым.
  const LEAF_OUTLINE = 'M0 0C280-150 340-560 0-820C-340-560-280-150 0 0Z';
  const midribX = (y) => {
    const t = -y / 820;
    return 2 * t * (1 - t) * 40;
  };

  function leafShape(ids, x, y, scale, angle) {
    let veins = '';
    for (let i = 1; i <= 7; i++) {
      const vy = -95 * i - 30;
      const from = midribX(vy).toFixed(1);
      const reach = Math.sin((i / 8.2) * Math.PI) * 190;
      veins += `M${from} ${vy}Q${reach * 0.5} ${vy - 35} ${reach} ${vy - 115}M${from} ${vy}Q${-reach * 0.5} ${vy - 35} ${-reach} ${vy - 115}`;
    }
    return `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${scale}) skewX(-6)">
      <path class="leaf-shadow" d="${LEAF_OUTLINE}" transform="translate(48 56)" filter="url(#${ids.shadow})"/>
      <path class="leaf-stem" d="M0 -10Q10 70-26 150"/>
      <path d="M0 0C-280-150-340-560 0-820Q40-420 0 0Z" fill="url(#${ids.lit})"/>
      <path d="M0 0C280-150 340-560 0-820Q40-420 0 0Z" fill="url(#${ids.shade})"/>
      <path class="leaf-vein" d="${veins}"/>
      <path class="leaf-rib" d="M0 20Q40-420 0-790"/>
      <path d="M-46-130C-160-270-176-520-24-740" fill="none" stroke="url(#${ids.sheen})" stroke-width="28" stroke-linecap="round" filter="url(#${ids.soft})"/>
      <path class="leaf-edge" d="${LEAF_OUTLINE}"/>
    </g>`;
  }
  let gradientId = 0;

  const PAINTERS = {
    leaf() {
      const n = ++gradientId;
      const ids = { sky: `bos-sky-${n}`, lit: `bos-lit-${n}`, shade: `bos-shade-${n}`, sheen: `bos-sheen-${n}`, shadow: `bos-shadow-${n}`, soft: `bos-soft-${n}` };
      return `<defs>
          <linearGradient id="${ids.sky}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style="stop-color:var(--wall-1)"/><stop offset="1" style="stop-color:var(--wall-2)"/>
          </linearGradient>
          <linearGradient id="${ids.lit}" x1="0" y1="0" x2="1" y2=".3">
            <stop offset="0" style="stop-color:var(--leaf-hi)"/><stop offset="1" style="stop-color:var(--leaf)"/>
          </linearGradient>
          <linearGradient id="${ids.shade}" x1="0" y1="0" x2="1" y2=".3">
            <stop offset="0" style="stop-color:var(--leaf)"/><stop offset="1" style="stop-color:var(--leaf-lo)"/>
          </linearGradient>
          <linearGradient id="${ids.sheen}" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".55" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
          </linearGradient>
          <filter id="${ids.shadow}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="28"/></filter>
          <filter id="${ids.soft}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="7"/></filter>
        </defs>
        <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#${ids.sky})"/>
        ${leafShape(ids, 1290, 990, 0.62, 26)}
        ${leafShape(ids, 1230, 940, 1, -24)}`;
    },
    dunes(mini) {
      const count = mini ? 12 : 44;
      let out = `<circle class="orb" cx="1190" cy="330" r="120"/>`;
      for (let i = 0; i < count; i++) {
        const depth = i / (count - 1);
        const opacity = (0.14 + 0.86 * Math.pow(depth, 1.6)).toFixed(2);
        const seed = i * (44 / count);
        out += `<path class="ridge" stroke-opacity="${opacity}" d="${wavePath(430 + 640 * Math.pow(depth, 1.35), 34 + 96 * depth, seed, mini ? 40 : 20)}"/>`;
      }
      return out;
    },
    rings(mini) {
      const step = mini ? 90 : 30;
      let out = `<circle class="orb" cx="1290" cy="760" r="70"/>`;
      for (let r = 100; r < 1500; r += step) {
        out += `<circle class="ring" cx="1290" cy="760" r="${r}" stroke-opacity="${(1 - r / 1500).toFixed(2)}"/>`;
      }
      return out;
    },
    dots(mini) {
      const step = mini ? 80 : 25;
      let d = '';
      for (let y = step / 2; y < HEIGHT; y += step) {
        for (let x = step / 2; x < WIDTH; x += step) {
          const t = (x / WIDTH + y / HEIGHT - 0.8) / 1.2;
          if (t <= 0) continue;
          const r = (step * 0.46 * Math.pow(t, 1.1)).toFixed(1);
          d += `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
        }
      }
      return `<path class="dots" d="${d}"/>`;
    },
    hills() {
      let out = '';
      for (let i = 0; i < 7; i++) {
        const d = wavePath(470 + i * 88, 74 - i * 3, i * 5, 20);
        out += `<path class="hill-base" d="${d}"/><path class="hill" fill-opacity="${(0.16 + i * 0.14).toFixed(2)}" d="${d}"/>`;
      }
      return out;
    },
    plain: () => '',
  };

  BOS.WALLPAPERS = Object.keys(PAINTERS);
  BOS.wallpaperSvg = (id, mini = false) => svg(PAINTERS[id](mini));

  // Слой обоев для рабочего стола и BOS MOBILE: сам следит за выбором в настройках.
  BOS.createWall = function () {
    const wall = BOS.h('div', { 'aria-hidden': 'true' });
    function sync() {
      const photo = BOS.state.wallpaper === 'photo' && BOS.getPhoto();
      wall.className = photo ? 'wall photo' : 'wall';
      if (photo) wall.replaceChildren(BOS.h('img', { src: photo, alt: '' }));
      else wall.innerHTML = BOS.wallpaperSvg(BOS.state.wallpaper === 'photo' ? 'leaf' : BOS.state.wallpaper);
    }
    BOS.on('wallpaper', sync);
    sync();
    return wall;
  };

  // Фото уменьшается, чтобы поместиться в хранилище браузера.
  BOS.usePhoto = async function (file) {
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      if (!BOS.savePhoto(canvas.toDataURL('image/jpeg', 0.82))) return false;
      BOS.setWallpaper('photo');
      return true;
    } catch {
      return false;
    }
  };
})();
