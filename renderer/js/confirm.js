/* ═══════════════════════════════════════════════════════════════
   confirm.js — Custom confirmation dialog (replaces native confirm)
═══════════════════════════════════════════════════════════════ */

function showConfirm(msg, opts = {}) {
  return new Promise(resolve => {
    const overlay  = document.getElementById('confirm-overlay');
    const msgEl    = document.getElementById('confirm-msg');
    const okBtn    = document.getElementById('confirm-ok');
    const cancelBtn = document.getElementById('confirm-cancel');
    if (!overlay) { resolve(window.confirm(msg)); return; }

    msgEl.textContent = msg;
    okBtn.textContent = opts.ok     || (typeof t === 'function' ? t('ok') : 'OK');
    cancelBtn.textContent = opts.cancel || (typeof t === 'function' ? t('cancel') : 'Cancel');
    okBtn.className = 'confirm-btn-ok' + (opts.danger ? ' danger' : '');

    overlay.classList.add('visible');
    window.electronAPI?.beep?.();
    okBtn.focus();

    let done = false;
    const finish = result => {
      if (done) return;
      done = true;
      overlay.classList.remove('visible');
      document.removeEventListener('keydown', onKey);
      resolve(result);
    };

    okBtn.onclick     = () => finish(true);
    cancelBtn.onclick = () => finish(false);
    overlay.onclick   = e => { if (e.target === overlay) finish(false); };

    const onKey = e => {
      if (e.key === 'Escape') finish(false);
      if (e.key === 'Enter')  finish(true);
    };
    document.addEventListener('keydown', onKey);
  });
}
