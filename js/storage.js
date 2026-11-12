// Документы приложений (презентации, проекты монтажа) в IndexedDB этого устройства.
// Наружу они не уходят: ни отправки, ни синхронизации здесь нет.
(function () {
  const { h, icon } = BOS;
  const NAME = BOS.guestSession ? 'bos-guest-data' : 'bos-data';
  let dbPromise = null;

  function openDb() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(NAME, 1);
        request.onupgradeneeded = () => request.result.createObjectStore('docs', { keyPath: 'id' });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return dbPromise;
  }
  function transaction(mode, run) {
    return openDb().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction('docs', mode);
      const request = run(tx.objectStore('docs'));
      tx.oncomplete = () => resolve(request && request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    }));
  }
  BOS.on('reset', () => { if (dbPromise) dbPromise.then((db) => db.close(), () => {}); });

  BOS.docs = {
    all: (kind) => transaction('readonly', (store) => store.getAll())
      .then((docs) => docs.filter((doc) => doc.kind === kind).sort((a, b) => b.updated - a.updated)),
    put(doc) {
      doc.updated = Date.now();
      return transaction('readwrite', (store) => store.put(doc));
    },
    remove: (id) => transaction('readwrite', (store) => store.delete(id)),
  };

  BOS.newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  // Экран «Мои документы»: карточка «Создать» и карточки документов с удалением.
  BOS.docHome = function ({ kind, title, note, newLabel, thumb, meta, create, open }) {
    const grid = h('div', { class: 'doc-grid' });
    const root = h('div', { class: 'doc-home' },
      h('h2', { i18n: title }),
      h('p', { class: 'doc-note' }, icon('lock'), h('span', { i18n: note })),
      grid);

    function card(doc) {
      const wrap = h('div', { class: 'doc-card' });
      const normal = () => wrap.replaceChildren(
        h('button', { type: 'button', class: 'doc-open', onclick: () => open(doc) },
          h('span', { class: 'doc-thumb' }, thumb(doc)),
          h('span', { class: 'doc-name' }, doc.name),
          h('span', { class: 'doc-meta' }, meta(doc))),
        h('button', { type: 'button', class: 'round doc-del', i18nTitle: 'docs.delete', onclick: () => confirm() }, icon('trash')));
      const confirm = () => wrap.replaceChildren(h('div', { class: 'doc-confirm' },
        h('b', { i18n: 'docs.confirm', i18nVars: { name: doc.name } }),
        h('div', { class: 'sec-actions' },
          h('button', { type: 'button', class: 'btn ghost', i18n: 'common.cancel', onclick: normal }),
          h('button', {
            type: 'button',
            class: 'btn danger',
            i18n: 'docs.delete',
            onclick: async () => {
              await BOS.docs.remove(doc.id);
              refresh();
            },
          }))));
      normal();
      return wrap;
    }

    async function refresh() {
      const docs = await BOS.docs.all(kind).catch(() => []);
      grid.replaceChildren(
        h('button', { type: 'button', class: 'doc-open doc-new', onclick: async () => open(await create()) },
          h('span', { class: 'doc-thumb' }, icon('plus')),
          h('span', { class: 'doc-name', i18n: newLabel })),
        ...docs.map(card));
    }

    return { root, refresh };
  };
})();
