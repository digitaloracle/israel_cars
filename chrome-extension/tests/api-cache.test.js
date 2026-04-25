const { getCachedData, setCachedData, CACHE_TTL_MS } = require('../utils/api-cache');

let _store = {};

beforeEach(() => {
  _store = {};
  chrome.storage.local.get.mockImplementation(async (key) => {
    return key in _store ? { [key]: _store[key] } : {};
  });
  chrome.storage.local.set.mockImplementation(async (items) => {
    Object.assign(_store, items);
  });
});

test('getCachedData returns null when no entry exists', async () => {
  expect(await getCachedData('12345678')).toBeNull();
});

test('getCachedData returns stored data when cache is fresh', async () => {
  const data = { mispar_rechev: '12345678', tozeret_nm: 'Toyota' };
  await setCachedData('12345678', data);
  expect(await getCachedData('12345678')).toEqual(data);
});

test('getCachedData returns null when cache entry is expired', async () => {
  _store['cache_12345678'] = {
    data: { mispar_rechev: '12345678' },
    timestamp: Date.now() - CACHE_TTL_MS - 1
  };
  expect(await getCachedData('12345678')).toBeNull();
});

test('setCachedData stores data with current timestamp', async () => {
  const data = { mispar_rechev: '12345678' };
  const before = Date.now();
  await setCachedData('12345678', data);
  const after = Date.now();
  const entry = _store['cache_12345678'];
  expect(entry.data).toEqual(data);
  expect(entry.timestamp).toBeGreaterThanOrEqual(before);
  expect(entry.timestamp).toBeLessThanOrEqual(after);
});

test('different plates use different cache keys', async () => {
  const dataA = { mispar_rechev: '11111111' };
  const dataB = { mispar_rechev: '22222222' };
  await setCachedData('11111111', dataA);
  await setCachedData('22222222', dataB);
  expect(await getCachedData('11111111')).toEqual(dataA);
  expect(await getCachedData('22222222')).toEqual(dataB);
});
