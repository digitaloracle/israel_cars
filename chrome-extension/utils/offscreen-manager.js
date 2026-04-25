let _cleanupTimer = null;

function scheduleOffscreenCleanup(timeoutMs, closeDocFn) {
  cancelOffscreenCleanup();
  _cleanupTimer = setTimeout(closeDocFn, timeoutMs);
}

function cancelOffscreenCleanup() {
  if (_cleanupTimer !== null) {
    clearTimeout(_cleanupTimer);
    _cleanupTimer = null;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { scheduleOffscreenCleanup, cancelOffscreenCleanup };
}
