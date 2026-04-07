// Service Worker for Israel Vehicle Lookup Extension

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('Error setting panel behavior:', error));

// ─── Offscreen document management ───────────────────────────────────────────

const OFFSCREEN_URL = 'offscreen/offscreen.html';

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

// ─── Message routing ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

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
    ensureOffscreenDocument()
      .then(() => chrome.runtime.sendMessage({
        action: 'ocrRequest',
        dataUrl: message.dataUrl
      }))
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // async sendResponse
  }
});
