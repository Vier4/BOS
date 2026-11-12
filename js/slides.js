// B Презентация: слайды с темами, картинками и показом во весь экран.
// Презентации хранятся только на этом устройстве: отправить, выгрузить или поделиться ими нельзя.
(function () {
  const { h, icon, t } = BOS;

  const THEMES = {
    paper: { bg: '#ffffff', ink: '#0f172a', accent: '#2563eb' },
    night: { bg: '#0f172a', ink: '#f8fafc', accent: '#38bdf8' },
    sunset: { bg: 'linear-gradient(135deg, #fb923c, #db2777)', ink: '#ffffff', accent: '#fde68a' },
    forest: { bg: '#064e3b', ink: '#ecfdf5', accent: '#34d399' },
    lavender: { bg: '#ede9fe', ink: '#3b0764', accent: '#8b5cf6' },
    sand: { bg: '#fef3c7', ink: '#78350f', accent: '#d97706' },
  };
  const LAYOUTS = { title: 'slides', content: 'notes', image: 'image' };
  const blankSlide = (layout) => ({ id: BOS.newId(), layout, title: '', text: '', image: null });

  // Картинка уменьшается, чтобы презентация не занимала много места.
  function pickImage(done) {
    const input = h('input', { type: 'file', accept: 'image/*' });
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
        const canvas = h('canvas', { width: Math.round(bitmap.width * scale), height: Math.round(bitmap.height * scale) });
        canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        done(canvas.toDataURL('image/jpeg', 0.85));
      } catch {}
    });
    input.click();
  }

  // Один и тот же рисунок слайда в миниатюре, редакторе и показе: размеры текста зависят от ширины слайда.
  function slideView(slide, theme, onChange) {
    const look = THEMES[theme] || THEMES.paper;
    const editable = Boolean(onChange);
    const inner = h('div', { class: 'slide-in' }, h('i', { class: 'slide-bar' }));
    const view = h('div', { class: `slide layout-${slide.layout}`, style: `--s-bg:${look.bg};--s-ink:${look.ink};--s-accent:${look.accent}` }, inner);

    function field(key, className, placeholder) {
      const node = h('div', { class: className, 'data-ph': t(placeholder) });
      node.textContent = slide[key];
      node.classList.toggle('empty', !slide[key]);
      if (editable) {
        node.contentEditable = 'true';
        node.addEventListener('input', () => {
          slide[key] = node.innerText.replace(/\n$/, '');
          node.classList.toggle('empty', !slide[key]);
          onChange();
        });
        node.addEventListener('paste', (e) => {
          e.preventDefault();
          document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
        });
      }
      return node;
    }

    inner.append(field('title', 'slide-title', 'slides.phTitle'));
    if (slide.layout === 'title') inner.append(field('text', 'slide-sub', 'slides.phSub'));
    if (slide.layout === 'content') inner.append(field('text', 'slide-text', 'slides.phText'));
    if (slide.layout === 'image') {
      const box = h('div', { class: 'slide-image' });
      const paintBox = () => box.replaceChildren(slide.image
        ? h('img', { src: slide.image, alt: '' })
        : h('span', { i18n: editable ? 'slides.addImage' : 'slides.layout.image' }));
      if (editable) {
        box.classList.add('pickable');
        box.addEventListener('click', () => pickImage((url) => {
          slide.image = url;
          paintBox();
          onChange();
        }));
      }
      paintBox();
      inner.append(box);
    }
    return view;
  }

  function editor(root, deck, back) {
    let index = 0;
    let timer = null;
    const save = () => {
      clearTimeout(timer);
      timer = setTimeout(() => BOS.docs.put(deck), 400);
    };
    const flush = () => {
      clearTimeout(timer);
      return BOS.docs.put(deck);
    };

    const name = h('input', {
      class: 'doc-title-input', value: deck.name, maxLength: 80,
      oninput: () => {
        deck.name = name.value.trim() || t('slides.newDeck');
        save();
      },
    });
    name.setAttribute('aria-label', t('docs.name'));
    const dots = h('div', { class: 'theme-dots' }, Object.entries(THEMES).map(([key, look]) => h('button', {
      type: 'button', class: 'theme-dot', style: `--d:${look.bg}`, 'aria-label': key, 'data-theme-key': key,
      onclick: () => {
        deck.theme = key;
        save();
        paintAll();
      },
    })));
    const pop = h('div', { class: 'b-pop', hidden: true }, Object.entries(LAYOUTS).map(([layout, iconName]) => h('button', {
      type: 'button',
      onclick: () => {
        pop.hidden = true;
        deck.slides.splice(index + 1, 0, blankSlide(layout));
        index++;
        save();
        paintAll();
      },
    }, icon(iconName), h('span', { i18n: `slides.layout.${layout}` }))));
    const addButton = h('button', {
      type: 'button', class: 'btn ghost',
      onclick: () => {
        pop.hidden = !pop.hidden;
        const at = addButton.getBoundingClientRect();
        const box = editorEl.getBoundingClientRect();
        pop.style.top = `${at.bottom - box.top + 4}px`;
        pop.style.left = `${Math.max(4, at.left - box.left)}px`;
      },
    }, icon('plus'), h('span', { i18n: 'slides.add' }));
    const tool = (iconName, key, run) => h('button', { type: 'button', class: 'round', i18nTitle: key, onclick: run }, icon(iconName));
    const upButton = tool('up', 'slides.moveUp', () => move(-1));
    const downButton = tool('down', 'slides.moveDown', () => move(1));
    const deleteButton = tool('trash', 'slides.deleteSlide', () => {
      deck.slides.splice(index, 1);
      index = Math.max(0, index - 1);
      save();
      paintAll();
    });
    const thumbs = h('div', { class: 'slides-thumbs' });
    const stage = h('div', { class: 'slides-stage' });

    const editorEl = h('div', { class: 'slides-editor' },
      h('div', { class: 'doc-bar' },
        h('button', {
          type: 'button', class: 'round', i18nTitle: 'common.back',
          onclick: async () => {
            await flush();
            back();
          },
        }, icon('left')),
        name,
        dots,
        h('div', { class: 'grow' }),
        addButton, upButton, downButton, deleteButton,
        h('button', { type: 'button', class: 'btn primary', onclick: present }, icon('play'), h('span', { i18n: 'slides.present' }))),
      h('div', { class: 'slides-body' }, thumbs, stage),
      pop);
    editorEl.addEventListener('pointerdown', (e) => {
      if (!pop.hidden && !pop.contains(e.target) && !addButton.contains(e.target)) pop.hidden = true;
    });
    root.replaceChildren(editorEl);

    function move(delta) {
      const to = index + delta;
      if (to < 0 || to >= deck.slides.length) return;
      [deck.slides[index], deck.slides[to]] = [deck.slides[to], deck.slides[index]];
      index = to;
      save();
      paintAll();
    }

    function thumbContent(i) {
      return [h('b', {}, i + 1), slideView(deck.slides[i], deck.theme)];
    }

    function paintAll() {
      dots.querySelectorAll('.theme-dot').forEach((dot) => dot.classList.toggle('on', dot.dataset.themeKey === deck.theme));
      thumbs.replaceChildren(...deck.slides.map((slide, i) => h('button', {
        type: 'button',
        class: `thumb${i === index ? ' on' : ''}`,
        onclick: () => {
          index = i;
          paintAll();
        },
      }, ...thumbContent(i))));
      stage.replaceChildren(slideView(deck.slides[index], deck.theme, () => {
        save();
        const thumb = thumbs.children[index];
        if (thumb) thumb.replaceChildren(...thumbContent(index));
      }));
      upButton.disabled = index === 0;
      downButton.disabled = index === deck.slides.length - 1;
      deleteButton.disabled = deck.slides.length === 1;
      const current = thumbs.children[index];
      if (current) current.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    function present() {
      let at = index;
      const counter = h('span', { class: 'show-count' });
      const holder = h('div', { class: 'show-slide' });
      const show = h('div', { class: 'slides-show', tabIndex: -1 },
        holder,
        counter,
        h('button', { type: 'button', class: 'round show-exit', i18nTitle: 'slides.exit', onclick: () => close() }, icon('close')));
      const paint = () => {
        holder.replaceChildren(slideView(deck.slides[at], deck.theme));
        counter.textContent = `${at + 1} / ${deck.slides.length}`;
      };
      const go = (delta) => {
        at = Math.max(0, Math.min(deck.slides.length - 1, at + delta));
        paint();
      };
      const onFullscreen = () => { if (!document.fullscreenElement) close(); };
      function close() {
        document.removeEventListener('fullscreenchange', onFullscreen);
        if (document.fullscreenElement === show) document.exitFullscreen().catch(() => {});
        show.remove();
      }
      show.addEventListener('click', (e) => {
        if (e.target.closest('.show-exit')) return;
        const box = show.getBoundingClientRect();
        go(e.clientX < box.left + box.width / 3 ? -1 : 1);
      });
      show.addEventListener('keydown', (e) => {
        if (['ArrowRight', 'ArrowDown', ' ', 'PageDown', 'Enter'].includes(e.key)) { e.preventDefault(); go(1); }
        if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); go(-1); }
        if (e.key === 'Escape') { e.stopPropagation(); close(); }
      });
      editorEl.append(show);
      paint();
      show.focus();
      if (show.requestFullscreen) {
        show.requestFullscreen().then(() => document.addEventListener('fullscreenchange', onFullscreen), () => {});
      }
    }

    paintAll();
    return () => flush();
  }

  BOS.apps.slides = {
    title: 'app.slides', icon: 'slides', width: 1000, height: 660, minWidth: 380, minHeight: 440,
    mount(body, win) {
      const root = h('div', { class: 'slides-app' });
      body.append(root);
      let closeEditor = () => {};
      const home = BOS.docHome({
        kind: 'slides',
        title: 'slides.mine',
        note: 'slides.private',
        newLabel: 'slides.newDeck',
        thumb: (deck) => slideView(deck.slides[0] || blankSlide('title'), deck.theme),
        meta: (deck) => `${t('slides.count', { n: deck.slides.length })} · ${BOS.fmtDate(new Date(deck.updated))}`,
        create: async () => {
          const deck = { id: BOS.newId(), kind: 'slides', name: t('slides.newDeck'), theme: 'paper', slides: [blankSlide('title'), blankSlide('content')] };
          await BOS.docs.put(deck);
          return deck;
        },
        open: (deck) => { closeEditor = editor(root, deck, showHome); },
      });
      function showHome() {
        closeEditor = () => {};
        root.replaceChildren(home.root);
        home.refresh();
      }
      showHome();
      win.disposers.push(() => closeEditor());
    },
  };
})();
