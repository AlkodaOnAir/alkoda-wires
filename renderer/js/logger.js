/* ═══════════════════════════════════════════════════════════════
   logger.js — Activity log (written to userData/wires-activity.log)
   wLog(action, data?) — call from anywhere in the renderer
═══════════════════════════════════════════════════════════════ */

const _logBuf  = [];
let   _logTmr  = null;

function wLog(action, data) {
  const ts    = new Date().toISOString();
  const parts = [`${ts} [${action}]`];
  if (data) {
    for (const [k, v] of Object.entries(data)) {
      parts.push(`${k}=${JSON.stringify(v)}`);
    }
  }
  _logBuf.push(parts.join(' '));
  if (!_logTmr) _logTmr = setTimeout(_flush, 800);
}

async function _flush() {
  _logTmr = null;
  if (!_logBuf.length || !window.electronAPI?.logAppend) return;
  const lines = _logBuf.splice(0).join('\n') + '\n';
  await window.electronAPI.logAppend(lines);
}

// Flush avant fermeture de la fenêtre
window.addEventListener('beforeunload', () => {
  if (_logBuf.length && window.electronAPI?.logAppend) {
    // sync best-effort — IPC invoke est async mais on essaie
    window.electronAPI.logAppend(_logBuf.join('\n') + '\n');
  }
});

// Erreurs JS non catchées
window.onerror = (msg, src, line, col, err) => {
  wLog('JS_ERROR', { msg: String(msg).slice(0, 200), src: String(src).split('/').pop(), line, col, stack: err?.stack?.split('\n')[1]?.trim().slice(0, 120) });
};
window.addEventListener('unhandledrejection', e => {
  const r = e.reason;
  wLog('JS_PROMISE_ERROR', { msg: String(r?.message || r).slice(0, 200), stack: r?.stack?.split('\n')[1]?.trim().slice(0, 120) });
});

// Marqueur de début de session (après que electronAPI est prêt)
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    wLog('SESSION_START', {
      ua:     navigator.userAgent.match(/Electron\/[\d.]+/)?.[0] || 'unknown',
      screen: `${screen.width}x${screen.height}`,
      win:    `${window.innerWidth}x${window.innerHeight}`,
    });
  }, 200);
});
