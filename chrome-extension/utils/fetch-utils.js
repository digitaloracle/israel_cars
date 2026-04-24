async function fetchWithTimeoutAndRetry(url, timeoutMs = 10000, maxRetries = 1) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
    }
  }
  throw lastError;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { fetchWithTimeoutAndRetry };
}
