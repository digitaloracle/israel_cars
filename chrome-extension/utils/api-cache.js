const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function getCachedData(plate) {
  const key = `cache_${plate}`;
  const result = await chrome.storage.local.get(key);
  const entry = result[key];
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) return null;
  return entry.data;
}

async function setCachedData(plate, data) {
  const key = `cache_${plate}`;
  await chrome.storage.local.set({ [key]: { data, timestamp: Date.now() } });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getCachedData, setCachedData, CACHE_TTL_MS };
}
