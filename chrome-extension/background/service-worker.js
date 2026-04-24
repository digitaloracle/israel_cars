// Service Worker for Israel Vehicle Lookup Extension

importScripts('../utils/offscreen-manager.js');

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('Error setting panel behavior:', error));

// ─── Offscreen document management ───────────────────────────────────────────

const OFFSCREEN_URL = 'offscreen/offscreen.html';
const OFFSCREEN_IDLE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function ensureOffscreenDocument() {
  try {
    if (await chrome.offscreen.hasDocument()) return;
  } catch {
    // hasDocument() not available in Chrome < 116 — fall through to createDocument
  }
  try {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: ['BLOBS'],
      justification: 'Run SmolVLM-500M vision-language model via WebGPU for license plate OCR'
    });
  } catch (e) {
    if (!e.message?.includes('Only a single')) throw e;
    // Already exists — safe to continue
  }
}

// P3: close the offscreen document when idle to release GPU memory
async function closeOffscreenDocument() {
  try {
    if (await chrome.offscreen.hasDocument()) {
      await chrome.offscreen.closeDocument();
    }
  } catch {
    // document may already be closed — ignore
  }
}

// ─── Dealer ad filter ─────────────────────────────────────────────────────────

async function injectDealerFilter(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/remove-agency-labels.js'],
    });
  } catch (_) {
    // Tab may not be injectable (chrome://, extension pages, etc.)
  }
}

// Re-inject whenever a tab finishes loading, if the filter is enabled.
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== 'complete') return;
  chrome.storage.local.get('dealerFilterEnabled', ({ dealerFilterEnabled }) => {
    if (dealerFilterEnabled) injectDealerFilter(tabId);
  });
});

// ─── Message routing ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

  if (message.action === 'setDealerFilter') {
    if (message.enabled) {
      // Inject immediately into the current active tab.
      chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
        if (tab) injectDealerFilter(tab.id);
      });
    }
    return;
  }

  if (message.action === 'startRegionSelection') {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/region-selector.js']
      }).catch(err => {
        chrome.runtime.sendMessage({ action: 'regionError', error: err.message });
      });
    });
    return;
  }

  if (message.action === 'regionSelected') {
    const { rect, devicePixelRatio } = message;
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' }).then(dataUrl => {
        chrome.runtime.sendMessage({ action: 'cropAndOcr', dataUrl, rect, devicePixelRatio });
      }).catch(err => {
        chrome.runtime.sendMessage({ action: 'regionError', error: err.message });
      });
    });
    return;
  }

  if (message.action === 'regionCancelled') {
    chrome.runtime.sendMessage({ action: 'regionCancelled' });
    return;
  }

  // Route ocrRequest from sidepanel → offscreen document.
  // ocrProgress messages are broadcast from offscreen → all contexts (sidepanel receives directly).
  if (message.action === 'ocrRequest') {
    // P3: cancel any pending cleanup while OCR is active
    cancelOffscreenCleanup();
    ensureOffscreenDocument()
      .then(() => chrome.runtime.sendMessage({
        action: 'ocrRequest',
        dataUrl: message.dataUrl
      }))
      .then(result => {
        scheduleOffscreenCleanup(OFFSCREEN_IDLE_TTL_MS, closeOffscreenDocument);
        sendResponse(result);
      })
      .catch(err => {
        scheduleOffscreenCleanup(OFFSCREEN_IDLE_TTL_MS, closeOffscreenDocument);
        sendResponse({ success: false, error: err.message });
      });
    return true; // async sendResponse
  }
});
