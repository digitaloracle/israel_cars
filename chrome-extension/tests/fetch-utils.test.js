const { fetchWithTimeoutAndRetry } = require('../utils/fetch-utils');

afterEach(() => {
  jest.useRealTimers();
});

test('returns response when fetch succeeds on first attempt', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
  const response = await fetchWithTimeoutAndRetry('https://example.com', 5000, 1);
  expect(response.ok).toBe(true);
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('retries once on network failure and succeeds on second attempt', async () => {
  global.fetch = jest.fn()
    .mockRejectedValueOnce(new Error('Network error'))
    .mockResolvedValueOnce({ ok: true, status: 200 });
  const response = await fetchWithTimeoutAndRetry('https://example.com', 5000, 1);
  expect(response.ok).toBe(true);
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('throws after all retries are exhausted', async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
  await expect(fetchWithTimeoutAndRetry('https://example.com', 5000, 1))
    .rejects.toThrow('Network error');
  expect(global.fetch).toHaveBeenCalledTimes(2); // initial + 1 retry
});

test('aborts fetch and throws after timeout elapses', async () => {
  jest.useFakeTimers();
  global.fetch = jest.fn().mockImplementation((_url, { signal }) =>
    new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () =>
        reject(new DOMException('The operation was aborted.', 'AbortError'))
      );
    })
  );

  const promise = fetchWithTimeoutAndRetry('https://example.com', 1000, 0);
  jest.advanceTimersByTime(1001);
  await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
});

test('does not retry on timeout when maxRetries is 0', async () => {
  jest.useFakeTimers();
  global.fetch = jest.fn().mockImplementation((_url, { signal }) =>
    new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () =>
        reject(new DOMException('The operation was aborted.', 'AbortError'))
      );
    })
  );

  const promise = fetchWithTimeoutAndRetry('https://example.com', 1000, 0);
  jest.advanceTimersByTime(1001);
  await expect(promise).rejects.toThrow();
  expect(global.fetch).toHaveBeenCalledTimes(1);
});
