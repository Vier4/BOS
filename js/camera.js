// Камера и Фото BOS 02 — только для BOS MOBILE. Снимки и видео хранятся на этом устройстве (IndexedDB)
// и никуда не отправляются.
(function () {
  const { h, icon } = BOS;
  const KIND = 'photo';
  const clock = (ms) => {
    const sec = Math.max(0, Math.round(ms / 1000));
    return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  };

  BOS.photos = {
    all: () => BOS.docs.all(KIND).catch(() => []),
    async add(dataUrl) {
      return save({ data: dataUrl });
    },
    // Видео хранится как файл (Blob), рядом — кадр-обложка и длительность.
    async addVideo(blob, poster, duration) {
      return save({ media: 'video', blob, poster, duration });
    },
    async remove(id) {
      await BOS.docs.remove(id);
      BOS.emit('photos');
    },
  };
  async function save(fields) {
    const now = new Date();
    const doc = { id: BOS.newId(), kind: KIND, name: BOS.fmtLong(now), taken: now.getTime(), ...fields };
    await BOS.docs.put(doc);
    BOS.emit('photos');
    return doc;
  }
  const isVideo = (doc) => doc.media === 'video';
  const thumbOf = (doc) => (isVideo(doc) ? doc.poster : doc.data);

  // Формат записи, который понимает этот браузер.
  function recordType() {
    if (!window.MediaRecorder) return null;
    const types = ['video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    return types.find((type) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) || '';
  }

  BOS.apps.camera = {
    title: 'app.camera', icon: 'camera', width: 420, height: 720, minWidth: 320, minHeight: 480,
    mount(body, win) {
      const video = h('video', { class: 'cam-video', autoplay: true, playsInline: true, muted: true });
      video.setAttribute('playsinline', '');
      const flash = h('div', { class: 'cam-flash', hidden: true });
      const message = h('p', { class: 'cam-msg', hidden: true });
      const timer = h('span', { class: 'cam-timer', hidden: true });
      const last = h('button', { type: 'button', class: 'cam-last', i18nTitle: 'app.photos', onclick: () => BOS.wm.open('photos') });
      const shutter = h('button', { type: 'button', class: 'cam-shutter', onclick: press }, h('i'));
      const flip = h('button', { type: 'button', class: 'cam-round', i18nTitle: 'cam.flip', onclick: () => { facing = facing === 'user' ? 'environment' : 'user'; start(); } }, icon('flip'));
      const modeButtons = ['photo', 'video'].map((name) => h('button', {
        type: 'button', class: 'cam-mode', i18n: `cam.${name}`, onclick: () => setMode(name),
      }));
      let stream = null;
      let facing = 'environment';
      let mode = 'photo';
      let recorder = null;
      let tick = null;

      function say(key) {
        message.hidden = !key;
        if (key) {
          message.dataset.i18n = key;
          BOS.applyI18nTo(message);
        }
      }
      function paintMode() {
        const recording = Boolean(recorder);
        shutter.classList.toggle('video', mode === 'video');
        shutter.classList.toggle('recording', recording);
        shutter.dataset.i18nTitle = mode === 'photo' ? 'cam.shoot' : recording ? 'cam.stop' : 'cam.record';
        BOS.applyI18nTo(shutter);
        modeButtons.forEach((button, i) => {
          button.classList.toggle('on', ['photo', 'video'][i] === mode);
          button.disabled = recording;
        });
        flip.disabled = recording;
        last.disabled = recording;
        timer.hidden = !recording;
      }
      function setMode(next) {
        if (recorder || mode === next) return;
        mode = next;
        paintMode();
        // Для видео нужен ещё и микрофон.
        if (mode === 'video' && stream && !stream.getAudioTracks().length) start();
        if (mode === 'video' && recordType() === null) say('cam.noRecord');
        else if (stream) say(null);
      }
      function stop() {
        if (stream) stream.getTracks().forEach((track) => track.stop());
        stream = null;
      }
      async function start() {
        stop();
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { say('cam.none'); return; }
        const wanted = { video: { facingMode: facing } };
        try {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ ...wanted, audio: mode === 'video' });
          } catch (error) {
            // Без микрофона видео всё равно можно снять, только беззвучное.
            if (mode !== 'video') throw error;
            stream = await navigator.mediaDevices.getUserMedia({ ...wanted, audio: false });
          }
          video.srcObject = stream;
          video.classList.toggle('mirror', facing === 'user');
          say(mode === 'video' && recordType() === null ? 'cam.noRecord' : null);
        } catch {
          say('cam.denied');
        }
      }
      async function paintLast() {
        const [doc] = await BOS.photos.all();
        last.replaceChildren(doc ? h('img', { src: thumbOf(doc), alt: '' }) : '');
      }
      function frame(maxSide) {
        const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        const g = canvas.getContext('2d');
        if (facing === 'user') { g.translate(canvas.width, 0); g.scale(-1, 1); }
        g.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas;
      }
      function press() {
        if (mode === 'photo') shoot();
        else if (recorder) recorder.stop();
        else record();
      }
      async function shoot() {
        if (!stream || !video.videoWidth) return;
        const canvas = frame(1600);
        flash.hidden = false;
        setTimeout(() => { flash.hidden = true; }, 160);
        await BOS.photos.add(canvas.toDataURL('image/jpeg', 0.85));
      }
      function record() {
        const type = recordType();
        if (!stream || !video.videoWidth || type === null) return;
        const poster = frame(480).toDataURL('image/jpeg', 0.75);
        const chunks = [];
        let rec;
        try {
          rec = type ? new MediaRecorder(stream, { mimeType: type }) : new MediaRecorder(stream);
        } catch {
          say('cam.noRecord');
          return;
        }
        const began = Date.now();
        rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
        rec.onstop = async () => {
          clearInterval(tick);
          recorder = null;
          paintMode();
          if (chunks.length) await BOS.photos.addVideo(new Blob(chunks, { type: rec.mimeType || type || 'video/webm' }), poster, Date.now() - began);
        };
        rec.start(1000);
        recorder = rec;
        timer.textContent = '00:00';
        tick = setInterval(() => { timer.textContent = clock(Date.now() - began); }, 500);
        paintMode();
      }

      win.listen('photos', paintLast);
      win.disposers.push(() => {
        if (recorder) recorder.stop();
        clearInterval(tick);
        setTimeout(stop, 0);
      });
      body.append(h('div', { class: 'cam' },
        h('div', { class: 'cam-view' }, video, flash, message, timer),
        h('div', { class: 'cam-modes' }, modeButtons),
        h('div', { class: 'cam-bar' }, last, shutter, flip)));
      paintMode();
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
      let objectUrl = null;

      function flashNote(key) {
        note.dataset.i18n = key;
        BOS.applyI18nTo(note);
        note.hidden = false;
        setTimeout(() => { note.hidden = true; }, 1800);
      }
      function closeViewer() {
        viewer.hidden = true;
        viewer.replaceChildren();
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }

      function open(doc) {
        closeViewer();
        const asking = h('div', { class: 'ph-ask', hidden: true },
          h('b', { i18n: isVideo(doc) ? 'photos.deleteVideo' : 'photos.deleteAsk' }),
          h('div', { class: 'sec-actions' },
            h('button', { type: 'button', class: 'btn ghost', i18n: 'common.cancel', onclick: () => { asking.hidden = true; } }),
            h('button', { type: 'button', class: 'btn danger', i18n: 'docs.delete', onclick: async () => {
              closeViewer();
              await BOS.photos.remove(doc.id);
            } })));
        let media;
        if (isVideo(doc)) {
          objectUrl = URL.createObjectURL(doc.blob);
          media = h('video', { class: 'ph-big', src: objectUrl, controls: true, playsInline: true, poster: doc.poster });
          media.setAttribute('playsinline', '');
        } else {
          media = h('img', { class: 'ph-big', src: doc.data, alt: '' });
        }
        viewer.append(
          h('div', { class: 'ph-viewer-top' },
            h('button', { type: 'button', class: 'round', i18nTitle: 'common.back', onclick: closeViewer }, icon('left')),
            h('span', {}, doc.name)),
          media,
          h('div', { class: 'ph-viewer-bar' },
            isVideo(doc) ? null : h('button', { type: 'button', class: 'btn ghost', onclick: async () => {
              const blob = await (await fetch(doc.data)).blob();
              if (await BOS.usePhoto(blob)) flashNote('photos.wallDone');
            } }, icon('wall'), h('span', { i18n: 'photos.wallpaper' })),
            h('button', { type: 'button', class: 'btn ghost', onclick: () => { asking.hidden = false; } }, icon('trash'), h('span', { i18n: 'docs.delete' }))),
          asking);
        viewer.hidden = false;
      }

      async function refresh() {
        const docs = await BOS.photos.all();
        empty.hidden = docs.length > 0;
        count.hidden = !docs.length;
        count.dataset.i18n = 'photos.count';
        count.i18nVars = { n: docs.length };
        BOS.applyI18nTo(count);
        grid.replaceChildren(...docs.map((doc) => h('button', { type: 'button', class: 'ph-cell', onclick: () => open(doc) },
          h('img', { src: thumbOf(doc), alt: '', loading: 'lazy' }),
          isVideo(doc) ? h('span', { class: 'ph-badge' }, icon('play'), clock(doc.duration)) : null)));
      }

      win.listen('photos', refresh);
      win.listen('lang', refresh);
      win.disposers.push(closeViewer);
      body.append(h('div', { class: 'ph' }, count, grid, empty, viewer, note));
      refresh();
    },
  };
})();
