const { findManufacturerId, findModelId, parseYad2FeedPrices } = require('../utils/yad2-utils');

// --- findManufacturerId ---

test('findManufacturerId returns null for empty catalog', () => {
  expect(findManufacturerId({}, 'טסלה')).toBeNull();
  expect(findManufacturerId({ data: { manufacturer: [] } }, 'טסלה')).toBeNull();
});

test('findManufacturerId returns null when name not found', () => {
  const catalog = { data: { manufacturer: [{ id: 62, title: 'טסלה', engTitle: 'Tesla' }] } };
  expect(findManufacturerId(catalog, 'לא קיים')).toBeNull();
});

test('findManufacturerId matches when data.gov.il appends country suffix', () => {
  const catalog = {
    data: { manufacturer: [{ id: 1, title: 'אאודי', engTitle: 'Audi' }] }
  };
  expect(findManufacturerId(catalog, 'אאודי הונגריה')).toBe(1);
  expect(findManufacturerId(catalog, 'אאודי גרמניה')).toBe(1);
  expect(findManufacturerId(catalog, 'אאודי')).toBe(1);
});

test('findManufacturerId returns correct ID for exact Hebrew match', () => {
  const catalog = {
    data: {
      manufacturer: [
        { id: 5, title: 'אלפא רומיאו', engTitle: 'Alfa Romeo' },
        { id: 62, title: 'טסלה', engTitle: 'Tesla' },
        { id: 19, title: 'טויוטה', engTitle: 'Toyota' }
      ]
    }
  };
  expect(findManufacturerId(catalog, 'טסלה')).toBe(62);
  expect(findManufacturerId(catalog, 'אלפא רומיאו')).toBe(5);
});

// --- findModelId ---

test('findModelId returns null for empty catalog', () => {
  expect(findModelId({}, 'מודל Y')).toBeNull();
  expect(findModelId({ data: { model: [] } }, 'מודל Y')).toBeNull();
});

test('findModelId returns null when model not found', () => {
  const catalog = { data: { model: [{ id: 11942, title: 'מודל Y' }] } };
  expect(findModelId(catalog, 'לא קיים')).toBeNull();
});

test('findModelId returns correct ID for exact Hebrew match', () => {
  const catalog = {
    data: {
      model: [
        { id: 10846, title: 'מודל 3', manufacturer: { id: 62 } },
        { id: 11942, title: 'מודל Y', manufacturer: { id: 62 } },
        { id: 10848, title: 'מודל X', manufacturer: { id: 62 } }
      ]
    }
  };
  expect(findModelId(catalog, 'מודל Y')).toBe(11942);
  expect(findModelId(catalog, 'מודל 3')).toBe(10846);
});

// --- parseYad2FeedPrices ---

test('parseYad2FeedPrices returns null for empty or non-HTML input', () => {
  expect(parseYad2FeedPrices('')).toBeNull();
  expect(parseYad2FeedPrices('no script tags here')).toBeNull();
});

test('parseYad2FeedPrices returns null when __NEXT_DATA__ has no feed query', () => {
  const nextData = JSON.stringify({
    props: { pageProps: { dehydratedState: { queries: [] } } }
  });
  const html = `<html><script id="__NEXT_DATA__" type="application/json">${nextData}</script></html>`;
  expect(parseYad2FeedPrices(html)).toBeNull();
});

test('parseYad2FeedPrices returns null when all items have price 0', () => {
  const feedData = { private: [{ price: 0 }, { price: 0 }], commercial: [] };
  const nextData = JSON.stringify({
    props: { pageProps: { dehydratedState: {
      queries: [{ queryKey: ['feed', 'vehicles', 'cars', {}], state: { data: feedData } }]
    } } }
  });
  const html = `<html><script id="__NEXT_DATA__" type="application/json">${nextData}</script></html>`;
  expect(parseYad2FeedPrices(html)).toBeNull();
});

test('parseYad2FeedPrices median is less skewed than avg when high-trim outliers exist', () => {
  const feedData = {
    private: [{ price: 100000 }, { price: 110000 }, { price: 115000 }, { price: 300000 }],
    commercial: []
  };
  const nextData = JSON.stringify({
    props: { pageProps: { dehydratedState: {
      queries: [{ queryKey: ['feed', 'vehicles', 'cars', {}], state: { data: feedData } }]
    } } }
  });
  const html = `<html><script id="__NEXT_DATA__" type="application/json">${nextData}</script></html>`;
  const result = parseYad2FeedPrices(html);
  expect(result.median).toBe(112500); // (110000+115000)/2
  expect(result.median).toBeLessThan(result.avg); // median less skewed than avg
});

test('parseYad2FeedPrices returns correct avg/count/min/max from private listings', () => {
  const feedData = {
    private: [{ price: 200000 }, { price: 180000 }, { price: 220000 }],
    commercial: []
  };
  const nextData = JSON.stringify({
    props: { pageProps: { dehydratedState: {
      queries: [{ queryKey: ['feed', 'vehicles', 'cars', {}], state: { data: feedData } }]
    } } }
  });
  const html = `<html><script id="__NEXT_DATA__" type="application/json">${nextData}</script></html>`;
  const result = parseYad2FeedPrices(html);
  expect(result).not.toBeNull();
  expect(result.count).toBe(3);
  expect(result.avg).toBe(200000);
  expect(result.min).toBe(180000);
  expect(result.max).toBe(220000);
});

test('parseYad2FeedPrices combines private and commercial listings, ignoring price=0', () => {
  const feedData = {
    private: [{ price: 150000 }, { price: 0 }],
    commercial: [{ price: 170000 }, { price: 160000 }]
  };
  const nextData = JSON.stringify({
    props: { pageProps: { dehydratedState: {
      queries: [{ queryKey: ['feed', 'vehicles', 'cars', {}], state: { data: feedData } }]
    } } }
  });
  const html = `<html><script id="__NEXT_DATA__" type="application/json">${nextData}</script></html>`;
  const result = parseYad2FeedPrices(html);
  expect(result.count).toBe(3);
  expect(result.avg).toBe(160000);
  expect(result.min).toBe(150000);
  expect(result.max).toBe(170000);
});
