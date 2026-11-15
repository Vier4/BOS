// BOS 03: значок Wi‑Fi. BOS ничего не подключает сама — она только спрашивает у браузера,
// через что подключено настоящее устройство (телефон или компьютер), на котором её открыли.
// Значок горит, только если браузер точно говорит «Wi‑Fi». Нет Wi‑Fi или браузер молчит — значка нет.
(function () {
  if (!BOS.is03) return;
  const { h, icon, state } = BOS;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  // 'on' — устройство на Wi‑Fi; 'off' — точно не Wi‑Fi (мобильная сеть, кабель, нет сети, авиарежим);
  // 'unknown' — этот браузер не сообщает тип сети (например, Safari на iPhone).
  function status() {
    if (state.airplane || !navigator.onLine) return 'off';
    if (!connection || !connection.type || connection.type === 'unknown') return 'unknown';
    return connection.type === 'wifi' ? 'on' : 'off';
  }
  const emit = () => BOS.emit('wifi');
  if (connection && connection.addEventListener) connection.addEventListener('change', emit);
  window.addEventListener('online', emit);
  window.addEventListener('offline', emit);
  BOS.on('airplane', emit);

  // Значок для строки состояния и острова: виден только при настоящем Wi‑Fi.
  function mark(className) {
    const el = h('span', { class: `wifi-mark ${className || ''}`, i18nTitle: 'wifi.on' }, icon('wifi'));
    const sync = () => { el.hidden = status() !== 'on'; };
    BOS.on('wifi', sync);
    sync();
    return el;
  }

  BOS.wifi = { status, mark };
})();
