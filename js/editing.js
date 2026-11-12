// Режим правки значков. Долгое нажатие или правый клик включает его: значки покачиваются,
// их можно перетаскивать, а крестик удаляет приложение. Настройки, Браузер, «Файлы» и B Store крестика не получают.
// С onPlace значки стоят где угодно (рабочий стол) и перетаскиваются сразу, без режима правки.
(function () {
  const { h, icon, t } = BOS;

  // Спрашивает, точно ли удалить приложение. Окно появляется поверх host.
  BOS.confirmRemove = function (id, host) {
    const box = h('div', { class: 'app-confirm', role: 'dialog', 'aria-modal': 'true' },
      h('div', {},
        BOS.appTile(id),
        h('b', { i18n: 'apps.removeAsk', i18nVars: { name: t(BOS.apps[id].title) } }),
        h('p', { i18n: 'apps.removeNote' }),
        h('div', { class: 'sec-actions' },
          h('button', { type: 'button', class: 'btn ghost', i18n: 'common.cancel', onclick: () => box.remove() }),
          h('button', {
            type: 'button',
            class: 'btn danger',
            i18n: 'docs.delete',
            onclick: () => {
              box.remove();
              BOS.uninstall(id);
            },
          }))));
    box.addEventListener('pointerdown', (e) => { if (e.target === box) box.remove(); });
    host.append(box);
  };

  BOS.editableGrid = function (grid, { container, onReorder, onPlace }) {
    let editing = false;
    let pressTimer = null;
    let swallowClick = false;

    function decorate() {
      [...grid.children].forEach((button) => {
        const id = button.dataset.app;
        if (!id || !BOS.canRemove(id) || button.querySelector('.app-x')) return;
        button.append(h('span', { class: 'app-x', role: 'button', i18nTitle: 'apps.remove' }, icon('close')));
      });
    }

    function setEditing(on) {
      editing = on;
      grid.classList.toggle('editing', on);
      container.classList.toggle('editing-on', on);
      if (on) decorate();
    }

    // В режиме правки нажатие на значок не открывает приложение.
    grid.addEventListener('click', (e) => {
      const remove = e.target.closest('.app-x');
      if (editing && remove) {
        e.preventDefault();
        e.stopPropagation();
        BOS.confirmRemove(remove.closest('.app-icon').dataset.app, container.closest('.desktop, .mobile') || container);
        return;
      }
      if (editing || swallowClick) {
        e.preventDefault();
        e.stopPropagation();
        swallowClick = false;
      }
    }, true);

    grid.addEventListener('contextmenu', (e) => {
      if (!e.target.closest('.app-icon')) return;
      e.preventDefault();
      setEditing(true);
    });

    grid.addEventListener('pointerdown', (e) => {
      const button = e.target.closest('.app-icon');
      swallowClick = false;
      if (!button || e.button !== 0 || e.target.closest('.app-x') || e.target.closest('input')) return;
      if (editing || onPlace) drag(e, button);
      if (!editing) {
        const startX = e.clientX;
        const startY = e.clientY;
        const cancel = () => {
          clearTimeout(pressTimer);
          window.removeEventListener('pointermove', watch);
          window.removeEventListener('pointerup', cancel);
        };
        const watch = (ev) => { if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > 8) cancel(); };
        pressTimer = setTimeout(() => {
          cancel();
          swallowClick = true;
          setEditing(true);
        }, 550);
        window.addEventListener('pointermove', watch);
        window.addEventListener('pointerup', cancel);
      }
    });

    // Перетаскивание: значок едет за пальцем, а соседи расступаются, когда он над ними.
    // На рабочем столе соседи не двигаются: значок просто остаётся там, где его отпустили.
    function drag(e, button) {
      e.preventDefault();
      const layout = () => {
        const shift = button.style.transform;
        button.style.transform = '';
        const rect = button.getBoundingClientRect();
        button.style.transform = shift;
        return rect;
      };
      const start = layout();
      const grabX = e.clientX - start.left;
      const grabY = e.clientY - start.top;
      let moved = false;
      button.setPointerCapture(e.pointerId);

      const move = (ev) => {
        if (!moved && Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < 6) return;
        moved = true;
        button.classList.add('dragging');
        if (onPlace) {
          const area = grid.getBoundingClientRect();
          const clamp = (value, max) => Math.round(Math.min(Math.max(value, 0), Math.max(max, 0)));
          button.style.left = `${clamp(ev.clientX - grabX - area.left, area.width - button.offsetWidth)}px`;
          button.style.top = `${clamp(ev.clientY - grabY - area.top, area.height - button.offsetHeight)}px`;
          return;
        }
        const over = document.elementsFromPoint(ev.clientX, ev.clientY)
          .map((el) => el.closest && el.closest('.app-icon'))
          .find((el) => el && el !== button && grid.contains(el));
        if (over) {
          const rect = over.getBoundingClientRect();
          const before = ev.clientX < rect.left + rect.width / 2;
          grid.insertBefore(button, before ? over : over.nextSibling);
        }
        const now = layout();
        button.style.transform = `translate(${ev.clientX - grabX - now.left}px, ${ev.clientY - grabY - now.top}px)`;
      };
      const end = () => {
        button.removeEventListener('pointermove', move);
        button.removeEventListener('pointerup', end);
        button.removeEventListener('pointercancel', end);
        button.style.transform = '';
        button.classList.remove('dragging');
        if (!moved) return;
        swallowClick = !editing;
        if (onPlace) onPlace(button, parseFloat(button.style.left), parseFloat(button.style.top));
        else onReorder([...grid.children].map((child) => child.dataset.app).filter(Boolean));
      };
      button.addEventListener('pointermove', move);
      button.addEventListener('pointerup', end);
      button.addEventListener('pointercancel', end);
    }

    return {
      refresh: () => { if (editing) decorate(); },
      stop: () => setEditing(false),
      start: () => setEditing(true),
      isEditing: () => editing,
    };
  };
})();
