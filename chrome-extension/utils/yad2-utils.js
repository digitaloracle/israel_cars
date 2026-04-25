const YAD2_CATALOG_URL = 'https://gw.yad2.co.il/vehicles-cars-catalog/';
const YAD2_SEARCH_BASE = 'https://www.yad2.co.il/vehicles/cars';

function findManufacturerId(catalogData, nameHe) {
  const list = catalogData?.data?.manufacturer;
  if (!list || !list.length) return null;
  // Exact match first
  let match = list.find(m => m.title === nameHe);
  if (match) return match.id;
  // data.gov.il appends country/origin to some names: "אאודי הונגריה" → "אאודי"
  match = list.find(m => nameHe.startsWith(m.title + ' '));
  return match?.id ?? null;
}

function findModelId(catalogData, nameHe) {
  const list = catalogData?.data?.model;
  if (!list || !list.length) return null;
  const match = list.find(m => m.title === nameHe);
  return match?.id ?? null;
}

function parseYad2FeedPrices(html) {
  const scriptMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!scriptMatch) return null;

  let nextData;
  try { nextData = JSON.parse(scriptMatch[1]); } catch { return null; }

  const queries = nextData?.props?.pageProps?.dehydratedState?.queries || [];
  const feedQ = queries.find(q => Array.isArray(q.queryKey) && q.queryKey[0] === 'feed' && q.queryKey[1] === 'vehicles');
  const feedData = feedQ?.state?.data;
  if (!feedData) return null;

  const items = [...(feedData.private || []), ...(feedData.commercial || [])].filter(i => i.price > 0);
  if (!items.length) return null;

  const prices = items.map(i => i.price).sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  const median = prices.length % 2 === 0
    ? Math.round((prices[mid - 1] + prices[mid]) / 2)
    : prices[mid];
  const sum = prices.reduce((s, p) => s + p, 0);
  return {
    avg: Math.round(sum / prices.length),
    median,
    count: prices.length,
    min: prices[0],
    max: prices[prices.length - 1]
  };
}

async function fetchYad2Ids(makeHe, modelHe) {
  const resp1 = await fetchWithTimeoutAndRetry(YAD2_CATALOG_URL, 10000, 0);
  const data1 = await resp1.json();
  const manufacturerId = findManufacturerId(data1, makeHe);
  console.log('[Yad2] manufacturer lookup:', makeHe, '→', manufacturerId);
  if (!manufacturerId) return null;

  const resp2 = await fetchWithTimeoutAndRetry(`${YAD2_CATALOG_URL}?manufacturer=${manufacturerId}`, 10000, 0);
  const data2 = await resp2.json();
  const modelId = findModelId(data2, modelHe);
  console.log('[Yad2] model lookup:', modelHe, '→', modelId);

  return { manufacturerId, modelId: modelId ?? null };
}

async function fetchYad2MarketPriceForYear(manufacturerId, modelId, year) {
  const url = `${YAD2_SEARCH_BASE}?manufacturer=${manufacturerId}&model=${modelId}&year=${year}-${year}`;
  const resp = await fetchWithTimeoutAndRetry(url, 15000, 0);
  const html = await resp.text();
  const hasNextData = html.includes('__NEXT_DATA__');
  const result = parseYad2FeedPrices(html);
  console.log(`[Yad2] year ${year}: hasNextData=${hasNextData}, result=`, result);
  return result;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { findManufacturerId, findModelId, parseYad2FeedPrices, fetchYad2Ids, fetchYad2MarketPriceForYear };
}
