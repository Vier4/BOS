// Приложение «Файлы»: папка «Файлы» с вложенными папками. Файлы лежат в IndexedDB браузера.
(function () {
  const { h, icon, state, t } = BOS;
  const DB_NAME = BOS.guestSession ? 'bos-guest-files' : 'bos-files';
  const TEXT_EXT = /\.(txt|md|csv|json|js|ts|css|html?|xml|log|ini|ya?ml)$/i;
  let dbPromise = null;

  function openDb() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => request.result.createObjectStore('items', { keyPath: 'id' });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return dbPromise;
  }
  function transaction(mode, run) {
    return openDb().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction('items', mode);
      const request = run(tx.objectStore('items'));
      tx.oncomplete = () => resolve(request && request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    }));
  }
  const loadItems = () => transaction('readonly', (store) => store.getAll());
  const saveItem = (item) => transaction('readwrite', (store) => store.put(item));
  const deleteItems = (ids) => transaction('readwrite', (store) => { ids.forEach((id) => store.delete(id)); });

  // Перед стиранием BOS соединение закрывается, иначе браузер не удалит базу.
  BOS.on('reset', () => { if (dbPromise) dbPromise.then((db) => db.close(), () => {}); });

  const newId = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

  // Другие приложения (например, B Монтаж) кладут сюда готовые файлы.
  BOS.saveToFiles = async function (blob, name) {
    const item = { id: newId(), parent: null, kind: 'file', name, type: blob.type || 'application/octet-stream', size: blob.size, added: Date.now(), blob };
    await saveItem(item);
    BOS.emit('files');
    return item;
  };

  function uniqueIn(items, name, parent, exceptId) {
    const taken = new Set(items.filter((i) => i.parent === parent && i.id !== exceptId).map((i) => i.name.toLowerCase()));
    if (!taken.has(name.toLowerCase())) return name;
    const dot = name.lastIndexOf('.');
    const base = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : '';
    for (let n = 2; ; n++) {
      const candidate = `${base} (${n})${ext}`;
      if (!taken.has(candidate.toLowerCase())) return candidate;
    }
  }
  function withChildren(items, id) {
    const ids = [id];
    for (let i = 0; i < ids.length; i++) {
      items.filter((child) => child.parent === ids[i]).forEach((child) => ids.push(child.id));
    }
    return ids;
  }

  // Папки рабочего стола — обычные папки в корне «Файлов» с пометкой desk.
  BOS.deskFolders = async () => (await loadItems()).filter((item) => item.kind === 'folder' && item.desk && item.parent === null);
  BOS.createDeskFolder = async function () {
    const item = { id: newId(), parent: null, kind: 'folder', desk: true, name: uniqueIn(await loadItems(), t('files.newFolder'), null), added: Date.now() };
    await saveItem(item);
    BOS.emit('files');
    return item;
  };
  BOS.renameFolder = async function (id, name) {
    const items = await loadItems();
    const item = items.find((i) => i.id === id);
    if (!item || !name.trim()) return;
    item.name = uniqueIn(items, name.trim(), item.parent, id);
    await saveItem(item);
    BOS.emit('files');
  };
  BOS.deleteFolder = async function (id) {
    await deleteItems(withChildren(await loadItems(), id));
    BOS.emit('files');
  };
  // Открывает «Файлы» сразу в нужной папке.
  let pendingFolder = null;
  BOS.openFolder = function (id) {
    pendingFolder = id;
    if (BOS.wm.isOpen('files')) BOS.emit('files-open');
    BOS.wm.open('files');
  };
  const takePending = () => {
    const id = pendingFolder;
    pendingFolder = null;
    return id;
  };

  function formatSize(bytes) {
    const units = ['byte', 'kilobyte', 'megabyte', 'gigabyte'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit++;
    }
    return new Intl.NumberFormat(state.lang, {
      style: 'unit', unit: units[unit], unitDisplay: 'short', maximumFractionDigits: unit ? 1 : 0,
    }).format(value);
  }

  function download(item) {
    const url = URL.createObjectURL(item.blob);
    const link = h('a', { href: url, download: item.name });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  BOS.apps.files = {
    title: 'app.files', icon: 'folder', width: 720, height: 500, minWidth: 340, minHeight: 320,
    mount(body, win) {
      let items = [];
      let folder = takePending(); // null — сама папка «Файлы»
      let thumbs = [];
      let viewerUrl = null;
      let dragDepth = 0;

      const crumbs = h('nav', { class: 'files-crumbs' });
      const list = h('div', { class: 'files-list' });
      const error = h('p', { class: 'field-note err files-error', hidden: true, i18n: 'files.error' });
      const picker = h('input', {
        type: 'file', multiple: true, hidden: true,
        onchange: () => {
          addFiles([...picker.files]);
          picker.value = '';
        },
      });
      const browser = h('div', { class: 'files' },
        h('div', { class: 'files-bar' },
          crumbs,
          h('button', { type: 'button', class: 'btn ghost', onclick: newFolder }, icon('folder'), h('span', { i18n: 'files.newFolder' })),
          h('button', { type: 'button', class: 'btn primary', onclick: () => picker.click() }, icon('plus'), h('span', { i18n: 'files.add' }))),
        error,
        list,
        picker);
      const root = h('div', { class: 'files-root' }, browser);
      body.append(root);

      const hasFiles = (e) => [...((e.dataTransfer && e.dataTransfer.types) || [])].includes('Files');
      browser.addEventListener('dragenter', (e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        dragDepth++;
        browser.dataset.drop = t('files.drop');
        browser.classList.add('drop');
      });
      browser.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
      browser.addEventListener('dragleave', () => {
        dragDepth = Math.max(0, dragDepth - 1);
        if (!dragDepth) browser.classList.remove('drop');
      });
      browser.addEventListener('drop', (e) => {
        e.preventDefault();
        dragDepth = 0;
        browser.classList.remove('drop');
        addFiles([...e.dataTransfer.files]);
      });

      async function refresh() {
        try {
          items = await loadItems();
        } catch {
          items = [];
          error.hidden = false;
        }
        if (folder && !items.some((item) => item.id === folder)) folder = null;
        render();
      }

      const childrenOf = (parent) => items
        .filter((item) => item.parent === parent)
        .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'folder' ? -1 : 1) || a.name.localeCompare(b.name, state.lang));

      function pathTo(id) {
        const path = [];
        let current = items.find((item) => item.id === id);
        while (current) {
          path.unshift(current);
          current = items.find((item) => item.id === current.parent);
        }
        return path;
      }

      const uniqueName = (name, parent, exceptId) => uniqueIn(items, name, parent, exceptId);

      function render() {
        thumbs.forEach((url) => URL.revokeObjectURL(url));
        thumbs = [];
        crumbs.replaceChildren(
          h('button', { type: 'button', class: 'crumb', i18n: 'files.root', onclick: () => openFolder(null) }),
          ...pathTo(folder).flatMap((f) => [
            h('span', { class: 'crumb-sep' }, '›'),
            h('button', { type: 'button', class: 'crumb', onclick: () => openFolder(f.id) }, f.name),
          ]));
        const rows = childrenOf(folder).map(rowFor);
        list.replaceChildren(...(rows.length ? rows : [h('p', { class: 'files-empty', i18n: 'files.empty' })]));
      }

      function openFolder(id) {
        folder = id;
        render();
      }

      function thumbFor(item) {
        if (item.kind === 'folder') return h('span', { class: 'files-icon folder' }, icon('folder'));
        if (item.type.startsWith('image/')) {
          const url = URL.createObjectURL(item.blob);
          thumbs.push(url);
          return h('span', { class: 'files-icon' }, h('img', { src: url, alt: '' }));
        }
        const ext = (item.name.match(/\.([^.]{1,4})$/) || [])[1];
        return h('span', { class: 'files-icon' }, ext || icon('file'));
      }

      const action = (iconName, key, run) => h('button', { type: 'button', class: 'round', i18nTitle: key, onclick: run }, icon(iconName));

      function rowFor(item) {
        const row = h('div', { class: 'files-row' });
        const meta = item.kind === 'folder' ? '' : `${formatSize(item.size)} · ${BOS.fmtDate(new Date(item.added))}`;
        const showNormal = () => row.replaceChildren(
          h('button', { type: 'button', class: 'files-open', onclick: () => openItem(item) },
            thumbFor(item),
            h('span', { class: 'files-name' }, item.name),
            h('span', { class: 'files-meta' }, meta)),
          h('span', { class: 'files-actions' },
            action('edit', 'files.rename', () => rename(item, row, showNormal)),
            item.kind === 'file' && action('download', 'files.download', () => download(item)),
            action('trash', 'files.delete', () => confirmDelete(item, row, showNormal))));
        showNormal();
        return row;
      }

      async function persist(item) {
        try {
          await saveItem(item);
          error.hidden = true;
        } catch {
          error.hidden = false;
        }
        await refresh();
        // Рабочий стол показывает папки, поэтому узнаёт о переименовании.
        BOS.emit('files-changed');
      }

      function rename(item, row, cancel) {
        let finished = false;
        const input = h('input', { class: 'input', value: item.name, maxLength: 120 });
        input.setAttribute('aria-label', t('files.rename'));
        async function commit() {
          if (finished) return;
          finished = true;
          const name = input.value.trim();
          if (!name || name === item.name) { cancel(); return; }
          item.name = uniqueName(name, item.parent, item.id);
          await persist(item);
        }
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
          if (e.key === 'Escape') { finished = true; cancel(); }
        });
        input.addEventListener('blur', commit);
        row.replaceChildren(h('div', { class: 'files-rename' }, thumbFor(item), input));
        input.focus();
        input.select();
      }

      function confirmDelete(item, row, cancel) {
        row.replaceChildren(h('div', { class: 'files-confirm' },
          h('span', { class: 'files-name', i18n: 'files.confirm', i18nVars: { name: item.name } }),
          h('button', { type: 'button', class: 'btn ghost', i18n: 'common.cancel', onclick: cancel }),
          h('button', {
            type: 'button',
            class: 'btn danger',
            i18n: 'files.delete',
            onclick: async () => {
              // Папка удаляется вместе со всем, что в ней лежит.
              try {
                await deleteItems(withChildren(items, item.id));
              } catch {
                error.hidden = false;
              }
              await refresh();
              BOS.emit('files-changed');
            },
          })));
      }

      async function newFolder() {
        const item = { id: newId(), parent: folder, kind: 'folder', name: uniqueName(t('files.newFolder'), folder), added: Date.now() };
        await persist(item);
        const index = childrenOf(folder).findIndex((i) => i.id === item.id);
        const row = list.children[index];
        if (row) rename(item, row, render);
      }

      async function addFiles(files) {
        if (!files.length) return;
        error.hidden = true;
        for (const file of files) {
          const item = {
            id: newId(),
            parent: folder,
            kind: 'file',
            name: uniqueName(file.name, folder),
            type: file.type || 'application/octet-stream',
            size: file.size,
            added: Date.now(),
            blob: file,
          };
          items.push(item);
          try {
            await saveItem(item);
          } catch {
            error.hidden = false;
          }
        }
        await refresh();
      }

      function openItem(item) {
        if (item.kind === 'folder') { openFolder(item.id); return; }
        viewerUrl = URL.createObjectURL(item.blob);
        const { type } = item;
        let content;
        if (type.startsWith('image/')) content = h('img', { src: viewerUrl, alt: item.name });
        else if (type.startsWith('video/')) content = h('video', { src: viewerUrl, controls: true });
        else if (type.startsWith('audio/')) content = h('audio', { src: viewerUrl, controls: true });
        else if (type === 'application/pdf') content = h('iframe', { src: viewerUrl, title: item.name });
        else if (type.startsWith('text/') || /json|xml|javascript/.test(type) || TEXT_EXT.test(item.name)) {
          // HTML и скрипты показываются как текст и не выполняются.
          content = h('pre');
          item.blob.text().then((text) => { content.textContent = text.slice(0, 500000); });
        } else {
          content = h('p', { class: 'files-empty', i18n: 'files.noPreview' });
        }
        root.replaceChildren(h('div', { class: 'files-view' },
          h('div', { class: 'files-bar' },
            h('button', { type: 'button', class: 'round', i18nTitle: 'common.back', onclick: closeViewer }, icon('left')),
            h('b', { class: 'files-title' }, item.name),
            h('button', { type: 'button', class: 'btn outline', onclick: () => download(item) }, icon('download'), h('span', { i18n: 'files.download' }))),
          h('div', { class: 'files-preview' }, content)));
      }

      function closeViewer() {
        if (viewerUrl) URL.revokeObjectURL(viewerUrl);
        viewerUrl = null;
        root.replaceChildren(browser);
        render();
      }

      win.listen('lang', render);
      win.listen('files', refresh);
      win.listen('files-open', () => {
        folder = takePending();
        refresh();
      });
      win.disposers.push(() => {
        thumbs.forEach((url) => URL.revokeObjectURL(url));
        if (viewerUrl) URL.revokeObjectURL(viewerUrl);
      });
      refresh();
    },
  };
})();
