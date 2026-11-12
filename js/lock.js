// Экран блокировки поверх оболочки: она продолжает работать, но недоступна, пока не введён пароль.
BOS.lockScreen = function () {
  const { h, icon, state } = BOS;
  const screen = document.getElementById('screen');
  if (!state.lock || screen.querySelector('.lock')) return;

  const shell = screen.firstElementChild;
  if (shell) shell.inert = true;

  const time = h('b', { class: 'lock-time' });
  const date = h('p', { class: 'lock-date' });
  const tick = () => {
    const now = new Date();
    time.textContent = BOS.fmtTime(now);
    date.textContent = BOS.fmtDate(now);
  };
  tick();
  const timer = setInterval(tick, 1000);

  const input = h('input', { class: 'input', type: 'password', autocomplete: 'current-password', i18nPh: 'lock.ph' });
  input.setAttribute('aria-label', BOS.t('lock.ph'));
  const error = h('p', { class: 'field-note err', hidden: true, i18n: 'lock.wrong' });
  const form = h('form', {
    class: 'lock-form',
    onsubmit: async (e) => {
      e.preventDefault();
      if (await BOS.checkPassword(input.value)) {
        unlock();
        return;
      }
      error.hidden = false;
      form.classList.remove('shake');
      void form.offsetWidth;
      form.classList.add('shake');
      input.select();
    },
  },
    h('div', { class: 'lock-field' },
      input,
      h('button', { type: 'submit', class: 'round primary', i18nTitle: 'lock.unlock' }, icon('right'))),
    error);

  const forgot = h('button', {
    type: 'button',
    class: 'lock-link',
    i18n: 'lock.forgot',
    onclick: () => {
      forgot.hidden = true;
      erase.hidden = false;
    },
  });
  const erase = h('div', { class: 'lock-forgot', hidden: true },
    h('p', { i18n: 'lock.forgotText' }),
    h('div', { class: 'lock-actions' },
      h('button', {
        type: 'button',
        class: 'btn ghost',
        i18n: 'common.cancel',
        onclick: () => {
          erase.hidden = true;
          forgot.hidden = false;
        },
      }),
      h('button', { type: 'button', class: 'btn danger', i18n: 'lock.erase', onclick: BOS.factoryReset })));

  const overlay = h('div', { class: 'lock', role: 'dialog', 'aria-modal': 'true' },
    icon('lock'),
    time,
    date,
    h('div', { class: 'lock-user' },
      h('span', { class: 'avatar large' }, BOS.initial()),
      h('b', {}, BOS.displayName()),
      h('small', {}, BOS.accountLabel())),
    form,
    h('button', { type: 'button', class: 'btn ghost lock-guest', onclick: BOS.startGuest }, icon('user'), h('span', { i18n: 'guest.enter' })),
    forgot,
    erase);
  screen.append(overlay);
  input.focus();

  function unlock() {
    clearInterval(timer);
    overlay.remove();
    if (shell) shell.inert = false;
  }
};
