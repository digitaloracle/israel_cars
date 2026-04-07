// Region selector overlay — injected into the active tab on demand.
// Shows a crosshair overlay; user drags a rectangle over the license plate.
// Removes itself, waits for repaint, then sends coordinates to service worker.

(function () {
  // Prevent double-injection
  if (document.getElementById('ivl-region-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'ivl-region-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483647',
    cursor: 'crosshair',
    background: 'rgba(0,0,0,0.45)',
  });

  const hint = document.createElement('div');
  hint.textContent = 'Drag to select the license plate area  ·  Esc to cancel';
  Object.assign(hint.style, {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(139,156,244,0.97)',
    color: 'white',
    padding: '10px 22px',
    borderRadius: '14px',
    fontSize: '14px',
    fontFamily: "'Segoe UI', Tahoma, sans-serif",
    fontWeight: '500',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
    boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
    letterSpacing: '0.01em',
  });
  overlay.appendChild(hint);

  const selBox = document.createElement('div');
  Object.assign(selBox.style, {
    position: 'absolute',
    border: '2px solid #8b9cf4',
    background: 'rgba(139,156,244,0.18)',
    display: 'none',
    pointerEvents: 'none',
    boxSizing: 'border-box',
  });
  overlay.appendChild(selBox);

  document.documentElement.appendChild(overlay);

  let startX = 0, startY = 0, active = false;

  overlay.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startX = e.clientX;
    startY = e.clientY;
    active = true;
    hint.style.display = 'none';
    selBox.style.display = 'block';
    selBox.style.left = startX + 'px';
    selBox.style.top = startY + 'px';
    selBox.style.width = '0';
    selBox.style.height = '0';
  });

  overlay.addEventListener('mousemove', (e) => {
    if (!active) return;
    const x = Math.min(e.clientX, startX);
    const y = Math.min(e.clientY, startY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);
    selBox.style.left = x + 'px';
    selBox.style.top = y + 'px';
    selBox.style.width = w + 'px';
    selBox.style.height = h + 'px';
  });

  overlay.addEventListener('mouseup', (e) => {
    if (!active) return;
    active = false;
    const x = Math.min(e.clientX, startX);
    const y = Math.min(e.clientY, startY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);

    cancel();

    if (w < 10 || h < 10) {
      chrome.runtime.sendMessage({ action: 'regionCancelled' });
      return;
    }

    // Wait for the browser to repaint without the overlay before screenshotting
    requestAnimationFrame(() => requestAnimationFrame(() => {
      chrome.runtime.sendMessage({
        action: 'regionSelected',
        rect: { x, y, w, h },
        devicePixelRatio: window.devicePixelRatio || 1,
      });
    }));
  });

  function cancel() {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      cancel();
      chrome.runtime.sendMessage({ action: 'regionCancelled' });
    }
  }
  document.addEventListener('keydown', onKey);
})();
