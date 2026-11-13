// Камера и Фото BOS 02 — только для BOS MOBILE. Снимки хранятся на этом устройстве (IndexedDB)
// и никуда не отправляются.
(function () {
  const { h, icon } = BOS;
  const KIND = 'photo';

  BOS.photos = {
    all: () => BOS.docs.all(KIND).catch(() => []),
    async add(dataUrl) {
      const now = new Date();
      const doc = { id: BOS.newId(), kind: KIND, name: BOS.fmtLong(now), data: dataUrl, taken: now.getTime() };
      await BOS.docs.put(doc);
      BOS.emit('photos');
      return doc;
    },
    async remove(id) {
      await BOS.docs.remove(id);
      BOS.emit('photos');
    },
  };

  BOS.apps.camera = {
    title: 'app.camera', icon: 'camera', width: 420, height: 720, minWidth: 320, minHeight: 480,
    mount(body, win) {
      const video = h('video', { class: 'cam-video', autoplay: true, playsInline: true, muted: true });
      video.setAttribute('playsinline', '');
      const flash = h('div', { class: 'cam-flash', hidden: true });
      const message = h('p', { class: 'cam-msg', hidden: true });
      const last = h('button', { type: 'button', class: 'cam-last', i18nTitle: 'app.photos', onclick: () => BOS.wm.open('photos') });
      const shutter = h('button', { type: 'button', class: 'cam-shutter', i18nTitle: 'cam.shoot', onclick: shoot }, h('i'));
      const flip = h('button', { type: 'button', class: 'cam-round', i18nTitle: 'cam.flip', onclick: () => { facing = facing === 'user' ? 'environment' : 'user'; start(); } }, icon('flip'));
      let stream = null;
      let facing = 'environment';

      function say(key) {
        message.hidden = !key;
        if (key) {
          message.dataset.i18n = key;
          BOS.applyI18nTo(message);
        }
      }
      function stop() {
        if (stream) stream.getTracks().forEach((track) => track.stop());
        stream = null;
      }
      async function start() {
        stop();
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { say('cam.none'); return; }
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false });
          video.srcObject = stream;
          video.classList.toggle('mirror', facing === 'user');
          say(null);
        } catch {
          say('cam.denied');
        }
      }
      async function paintLast() {
        const [photo] = await BOS.photos.all();
        last.replaceChildren(photo ? h('img', { src: photo.data, alt: '' }) : '');
      }
      async function shoot() {
        if (!stream || !video.videoWidth) return;
        const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        const g = canvas.getContext('2d');
        if (facing === 'user') { g.translate(canvas.width, 0); g.scale(-1, 1); }
        g.drawImage(video, 0, 0, canvas.width, canvas.height);
        flash.hidden = false;
        setTimeout(() => { flash.hidden = true; }, 160);
        await BOS.photos.add(canvas.toDataURL('image/jpeg', 0.85));
      }

      win.listen('photos', paintLast);
      win.disposers.push(stop);
      body.append(h('div', { class: 'cam' },
        h('div', { class: 'cam-view' }, video, flash, message),
        h('div', { class: 'cam-bar' }, last, shutter, flip)));
      paintLast();
      start();
    },
  };

  BOS.apps.photos = {
    title: 'app.photos', icon: 'image', width: 420, height: 720, minWidth: 320, minHeight: 480,
    mount(body, win) {
      const grid = h('div', { class: 'ph-grid' });
      const count = h('p', { class: 'ph-count' });
      const empty = h('div', { class: 'ph-empty', hidden: true },
        BOS.appTile('photos', 'ph-empty-tile'),
        h('p', { i18n: 'photos.empty' }),
        h('button', { type: 'button', class: 'btn primary', onclick: () => BOS.wm.open('camera') }, icon('camera'), h('span', { i18n: 'app.camera' })));
      const viewer = h('div', { class: 'ph-viewer', hidden: true });
      const note = h('p', { class: 'field-note ok ph-note', hidden: true });

      function flashNote(key) {
        note.dataset.i18n = key;
        BOS.applyI18nTo(note);
        note.hidden = false;
        setTimeout(() => { note.hidden = true; }, 1800);
      }

      function open(photo) {
        const asking = h('div', { class: 'ph-ask', hidden: true },
          h('b', { i18n: 'photos.deleteAsk' }),
          h('div', { class: 'sec-actions' },
            h('button', { type: 'button', class: 'btn ghost', i18n: 'common.cancel', onclick: () => { asking.hidden = true; } }),
            h('button', { type: 'button', class: 'btn danger', i18n: 'docs.delete', onclick: async () => {
              await BOS.photos.remove(photo.id);
              viewer.hidden = true;
            } })));
        viewer.replaceChildren(
          h('div', { class: 'ph-viewer-top' },
            h('button', { type: 'button', class: 'round', i18nTitle: 'common.back', onclick: () => { viewer.hidden = true; } }, icon('left')),
            h('span', {}, photo.name)),
          h('img', { class: 'ph-big', src: photo.data, alt: '' }),
          h('div', { class: 'ph-viewer-bar' },
            h('button', { type: 'button', class: 'btn ghost', onclick: async () => {
              const blob = await (await fetch(photo.data)).blob();
              if (await BOS.usePhoto(blob)) flashNote('photos.wallDone');
            } }, icon('wall'), h('span', { i18n: 'photos.wallpaper' })),
            h('button', { type: 'button', class: 'btn ghost', onclick: () => { asking.hidden = false; } }, icon('trash'), h('span', { i18n: 'docs.delete' }))),
          asking);
        viewer.hidden = false;
      }

      async function refresh() {
        const photos = await BOS.photos.all();
        empty.hidden = photos.length > 0;
        count.hidden = !photos.length;
        count.dataset.i18n = 'photos.count';
        count.i18nVars = { n: photos.length };
        BOS.applyI18nTo(count);
        grid.replaceChildren(...photos.map((photo) => h('button', { type: 'button', class: 'ph-cell', onclick: () => open(photo) },
          h('img', { src: photo.data, alt: '', loading: 'lazy' }))));
      }

      win.listen('photos', refresh);
      win.listen('lang', refresh);
      body.append(h('div', { class: 'ph' }, count, grid, empty, viewer, note));
      refresh();
    },
  };
})();
