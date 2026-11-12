// B Монтаж: собирает ролик из видеофрагментов, обрезает их, добавляет титр
// и сохраняет готовое видео в «Файлы». Всё считается прямо на устройстве.
(function () {
  const { h, icon, t } = BOS;
  const TITLE_SECONDS = 3;

  const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  const lengthOf = (clip) => Math.max(0, clip.end - clip.start);
  const once = (target, event) => new Promise((resolve, reject) => {
    target.addEventListener(event, resolve, { once: true });
    target.addEventListener('error', reject, { once: true });
  });

  // Узнаёт длину видео и снимает кадр для обложки. Видео, записанные в браузере,
  // часто не знают своей длины, поэтому их сначала перематывают в самый конец.
  function probe(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const video = h('video', { muted: true, preload: 'auto', src: url });
      let phase = 'meta';
      const finish = (error, value) => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        if (error) reject(error);
        else resolve(value);
      };
      const timer = setTimeout(() => finish(new Error('timeout')), 15000);
      const seekThumb = () => {
        phase = 'thumb';
        video.currentTime = Math.min(0.5, video.duration / 3);
      };
      video.onerror = () => finish(new Error('bad video'));
      video.onloadedmetadata = () => {
        if (Number.isFinite(video.duration)) seekThumb();
        else {
          phase = 'fix';
          video.currentTime = 1e101;
        }
      };
      video.ondurationchange = () => {
        if (phase === 'fix' && Number.isFinite(video.duration)) seekThumb();
      };
      video.onseeked = () => {
        if (phase !== 'thumb') return;
        const canvas = h('canvas', { width: 192, height: 108 });
        const g = canvas.getContext('2d');
        const k = Math.max(192 / video.videoWidth, 108 / video.videoHeight);
        g.drawImage(video, (192 - video.videoWidth * k) / 2, (108 - video.videoHeight * k) / 2, video.videoWidth * k, video.videoHeight * k);
        finish(null, { duration: video.duration, thumb: canvas.toDataURL('image/jpeg', 0.7) });
      };
    });
  }

  function editor(root, project, back, win) {
    const urls = new Map();
    const urlOf = (clip) => {
      if (!urls.has(clip.id)) urls.set(clip.id, URL.createObjectURL(clip.blob));
      return urls.get(clip.id);
    };
    let selected = project.clips[0] ? project.clips[0].id : null;
    let playIndex = -1;
    let playing = false;
    let exporting = false;
    let timer = null;
    const save = () => {
      clearTimeout(timer);
      timer = setTimeout(() => BOS.docs.put(project), 400);
    };
    const flush = () => {
      clearTimeout(timer);
      return BOS.docs.put(project);
    };
    const totalLength = () => project.clips.reduce((sum, clip) => sum + lengthOf(clip), 0);
    const selectedIndex = () => project.clips.findIndex((clip) => clip.id === selected);

    const video = h('video', { playsInline: true, preload: 'auto' });
    const overlay = h('div', { class: 'montage-title', hidden: true });
    const empty = h('div', { class: 'montage-empty', i18n: 'montage.empty' });
    const playButton = h('button', { type: 'button', class: 'round primary', onclick: togglePlay });
    const timeLabel = h('span', { class: 'montage-time' });
    const timeline = h('div', { class: 'montage-timeline' });
    const status = h('div', { class: 'montage-status', hidden: true });
    const picker = h('input', {
      type: 'file', accept: 'video/*', multiple: true, hidden: true,
      onchange: () => {
        addFiles([...picker.files]);
        picker.value = '';
      },
    });
    const name = h('input', {
      class: 'doc-title-input', value: project.name, maxLength: 80,
      oninput: () => {
        project.name = name.value.trim() || t('montage.newProject');
        save();
      },
    });
    name.setAttribute('aria-label', t('docs.name'));
    const titleInput = h('input', {
      class: 'input', value: project.title || '', maxLength: 60, i18nPh: 'montage.titlePh',
      oninput: () => {
        project.title = titleInput.value;
        overlay.textContent = project.title;
        save();
        paintOverlay();
      },
    });
    titleInput.setAttribute('aria-label', t('montage.titlePh'));
    const startRange = h('input', { type: 'range', min: 0, step: 0.1, oninput: () => trim('start') });
    const endRange = h('input', { type: 'range', min: 0, step: 0.1, oninput: () => trim('end') });
    const startValue = h('output');
    const endValue = h('output');
    const tool = (iconName, key, run) => h('button', { type: 'button', class: 'round', i18nTitle: key, onclick: run }, icon(iconName));
    const clipTools = h('div', { class: 'montage-clip-tools' },
      h('label', {}, h('span', {}, h('span', { i18n: 'montage.start' }), ' ', startValue), startRange),
      h('label', {}, h('span', {}, h('span', { i18n: 'montage.end' }), ' ', endValue), endRange),
      h('div', { class: 'montage-clip-buttons' },
        tool('left', 'montage.moveLeft', () => moveClip(-1)),
        tool('right', 'montage.moveRight', () => moveClip(1)),
        tool('trash', 'montage.removeClip', removeClip)));
    const saveButton = h('button', { type: 'button', class: 'btn primary', onclick: exportVideo }, icon('download'), h('span', { i18n: 'montage.save' }));
    const addButton = h('button', { type: 'button', class: 'btn ghost', onclick: () => picker.click() }, icon('plus'), h('span', { i18n: 'montage.add' }));

    root.replaceChildren(h('div', { class: 'montage-editor' },
      h('div', { class: 'doc-bar' },
        h('button', {
          type: 'button', class: 'round', i18nTitle: 'common.back',
          onclick: async () => {
            if (exporting) return;
            stop();
            await flush();
            back();
          },
        }, icon('left')),
        name,
        h('div', { class: 'grow' }),
        addButton,
        saveButton),
      h('div', { class: 'montage-stage' }, h('div', { class: 'montage-screen' }, video, overlay, empty)),
      h('div', { class: 'montage-transport' }, playButton, timeLabel),
      timeline,
      h('div', { class: 'montage-tools' }, h('label', { class: 'montage-title-field' }, h('span', { i18n: 'montage.titlePh' }), titleInput), clipTools),
      status,
      picker));
    overlay.textContent = project.title || '';

    function say(key, kind, vars, extra) {
      status.hidden = !key;
      status.className = `montage-status ${kind || ''}`;
      if (!key) return;
      status.replaceChildren(h('span', { i18n: key, i18nVars: vars }), extra || '');
    }

    async function addFiles(files) {
      say(null);
      for (const file of files) {
        try {
          const { duration, thumb } = await probe(file);
          project.clips.push({ id: BOS.newId(), name: file.name, blob: file, duration, start: 0, end: duration, thumb });
        } catch {
          say('montage.badFile', 'err');
        }
      }
      if (!selected && project.clips[0]) selected = project.clips[0].id;
      await flush();
      paint();
    }

    function show(index, at) {
      const clip = project.clips[index];
      if (video.dataset.clip !== clip.id) {
        video.src = urlOf(clip);
        video.dataset.clip = clip.id;
      }
      video.currentTime = at;
    }

    function elapsed() {
      const index = playing ? playIndex : selectedIndex();
      if (index < 0) return 0;
      let sum = 0;
      for (let i = 0; i < index; i++) sum += lengthOf(project.clips[i]);
      return sum + Math.max(0, (video.currentTime || 0) - project.clips[index].start);
    }

    function paintTime() {
      timeLabel.textContent = `${clock(elapsed())} / ${clock(totalLength())}`;
    }

    function paintOverlay() {
      overlay.hidden = !(project.title && project.clips.length && elapsed() < TITLE_SECONDS);
    }

    function paintPlay() {
      playButton.replaceChildren(icon(playing ? 'pause' : 'play'));
      playButton.dataset.i18nTitle = playing ? 'music.pause' : 'music.play';
      BOS.applyI18nTo(playButton);
    }

    function playFrom(index) {
      const clip = project.clips[index];
      if (!clip) {
        stop();
        return;
      }
      playIndex = index;
      selected = clip.id;
      paintTimeline();
      show(index, clip.start);
      video.play().catch(() => {});
    }

    function togglePlay() {
      if (playing) {
        stop();
        return;
      }
      if (!project.clips.length || exporting) return;
      playing = true;
      paintPlay();
      playFrom(Math.max(0, selectedIndex()));
    }

    function stop() {
      playing = false;
      video.pause();
      paintPlay();
      paintOverlay();
    }

    video.addEventListener('timeupdate', () => {
      if (playing) {
        const clip = project.clips[playIndex];
        if (clip && video.currentTime >= clip.end - 0.05) playFrom(playIndex + 1);
      }
      paintTime();
      paintOverlay();
    });
    video.addEventListener('ended', () => { if (playing) playFrom(playIndex + 1); });

    function selectClip(id) {
      if (exporting) return;
      stop();
      selected = id;
      const index = selectedIndex();
      show(index, project.clips[index].start);
      paint();
    }

    function trim(edge) {
      const clip = project.clips[selectedIndex()];
      if (!clip) return;
      if (edge === 'start') clip.start = Math.min(Number(startRange.value), clip.end - 0.3);
      else clip.end = Math.max(Number(endRange.value), clip.start + 0.3);
      show(selectedIndex(), edge === 'start' ? clip.start : clip.end);
      save();
      paintInspector();
      paintTimeline();
      paintTime();
    }

    function moveClip(delta) {
      const index = selectedIndex();
      const to = index + delta;
      if (index < 0 || to < 0 || to >= project.clips.length) return;
      [project.clips[index], project.clips[to]] = [project.clips[to], project.clips[index]];
      save();
      paint();
    }

    function removeClip() {
      const index = selectedIndex();
      if (index < 0) return;
      stop();
      const [clip] = project.clips.splice(index, 1);
      if (urls.has(clip.id)) {
        URL.revokeObjectURL(urls.get(clip.id));
        urls.delete(clip.id);
      }
      const next = project.clips[Math.min(index, project.clips.length - 1)];
      selected = next ? next.id : null;
      video.removeAttribute('src');
      delete video.dataset.clip;
      if (next) show(selectedIndex(), next.start);
      save();
      paint();
    }

    function paintTimeline() {
      timeline.replaceChildren(
        ...project.clips.map((clip) => h('button', {
          type: 'button',
          class: `clip${clip.id === selected ? ' on' : ''}`,
          style: `width:${Math.round(Math.min(320, 96 + lengthOf(clip) * 14))}px;background-image:url(${clip.thumb})`,
          onclick: () => selectClip(clip.id),
        }, h('b', {}, clip.name), h('small', {}, clock(lengthOf(clip))))),
        h('button', { type: 'button', class: 'clip add', onclick: () => picker.click() }, icon('plus'), h('span', { i18n: 'montage.add' })));
    }

    function paintInspector() {
      const clip = project.clips[selectedIndex()];
      clipTools.hidden = !clip;
      if (!clip) return;
      startRange.max = clip.duration;
      endRange.max = clip.duration;
      startRange.value = clip.start;
      endRange.value = clip.end;
      startValue.textContent = clock(clip.start);
      endValue.textContent = clock(clip.end);
    }

    function paint() {
      empty.hidden = project.clips.length > 0;
      video.hidden = !project.clips.length;
      saveButton.disabled = !project.clips.length || exporting;
      addButton.disabled = exporting;
      paintTimeline();
      paintInspector();
      paintTime();
      paintOverlay();
      paintPlay();
    }

    // Сохранение: каждый кадр рисуется на холсте, звук идёт через Web Audio, а MediaRecorder пишет итог.
    // Ролик записывается со скоростью воспроизведения, поэтому окно лучше не сворачивать.
    async function exportVideo() {
      if (exporting || !project.clips.length) return;
      if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
        say('montage.noRecorder', 'err');
        return;
      }
      stop();
      exporting = true;
      paint();
      const W = 1280;
      const H = 720;
      const canvas = h('canvas', { width: W, height: H });
      const g = canvas.getContext('2d');
      const stream = canvas.captureStream(30);
      const audio = new AudioContext();
      const output = audio.createMediaStreamDestination();
      const source = h('video', { playsInline: true, preload: 'auto' });
      audio.createMediaElementSource(source).connect(output);
      output.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
      const type = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
        .find((candidate) => MediaRecorder.isTypeSupported(candidate)) || '';
      const recorder = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 5000000 } : {});
      const chunks = [];
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      const stopped = new Promise((resolve) => { recorder.onstop = resolve; });
      const total = totalLength();
      let done = 0;
      const bar = h('i');
      const progress = h('span', { class: 'montage-progress' }, bar);

      const draw = (at) => {
        g.fillStyle = '#000';
        g.fillRect(0, 0, W, H);
        if (source.videoWidth) {
          const k = Math.min(W / source.videoWidth, H / source.videoHeight);
          const w = source.videoWidth * k;
          const hh = source.videoHeight * k;
          g.drawImage(source, (W - w) / 2, (H - hh) / 2, w, hh);
        }
        if (project.title && at < TITLE_SECONDS) {
          g.font = '800 64px -apple-system, "Segoe UI", Roboto, sans-serif';
          g.textAlign = 'center';
          g.fillStyle = '#fff';
          g.shadowColor = 'rgba(0,0,0,.65)';
          g.shadowBlur = 18;
          g.fillText(project.title, W / 2, H * 0.84);
          g.shadowBlur = 0;
        }
      };

      let failed = false;
      recorder.start(250);
      await audio.resume();
      try {
        for (const clip of project.clips) {
          source.src = urlOf(clip);
          await once(source, 'loadedmetadata');
          source.currentTime = clip.start;
          await once(source, 'seeked');
          await source.play();
          await new Promise((resolve) => {
            const tick = () => {
              const inside = Math.max(0, source.currentTime - clip.start);
              draw(done + inside);
              const percent = Math.min(100, Math.round(((done + inside) / total) * 100));
              bar.style.width = `${percent}%`;
              say('montage.saving', '', { n: percent }, progress);
              if (source.currentTime >= clip.end - 0.02 || source.ended) {
                resolve();
                return;
              }
              setTimeout(tick, 1000 / 30);
            };
            tick();
          });
          source.pause();
          done += lengthOf(clip);
        }
      } catch {
        failed = true;
      } finally {
        recorder.stop();
        await stopped;
        audio.close();
      }

      exporting = false;
      paint();
      if (failed) {
        say('montage.badFile', 'err');
        return;
      }
      const blob = new Blob(chunks, { type: (recorder.mimeType || type || 'video/webm').split(';')[0] });
      await BOS.saveToFiles(blob, `${project.name}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`);
      say('montage.saved', 'ok', null, h('button', { type: 'button', class: 'lock-link', i18n: 'montage.openFiles', onclick: () => BOS.wm.open('files') }));
    }

    if (selected) show(selectedIndex(), project.clips[selectedIndex()].start);
    paint();
    return () => {
      stop();
      flush();
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }

  BOS.apps.montage = {
    title: 'app.montage', icon: 'film', width: 980, height: 700, minWidth: 380, minHeight: 480,
    mount(body, win) {
      const root = h('div', { class: 'montage-app' });
      body.append(root);
      let closeEditor = () => {};
      const home = BOS.docHome({
        kind: 'montage',
        title: 'montage.mine',
        note: 'montage.sub',
        newLabel: 'montage.newProject',
        thumb: (project) => (project.clips[0] ? h('img', { src: project.clips[0].thumb, alt: '' }) : icon('film')),
        meta: (project) => `${t('montage.clips', { n: project.clips.length })} · ${clock(project.clips.reduce((sum, clip) => sum + lengthOf(clip), 0))}`,
        create: async () => {
          const project = { id: BOS.newId(), kind: 'montage', name: t('montage.newProject'), title: '', clips: [] };
          await BOS.docs.put(project);
          return project;
        },
        open: (project) => { closeEditor = editor(root, project, showHome, win); },
      });
      function showHome() {
        closeEditor();
        closeEditor = () => {};
        root.replaceChildren(home.root);
        home.refresh();
      }
      showHome();
      win.disposers.push(() => closeEditor());
    },
  };
})();
