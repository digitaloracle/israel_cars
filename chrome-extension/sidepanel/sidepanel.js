// Israel Vehicle Lookup - Side Panel JavaScript
// Fetches vehicle data from data.gov.il APIs with progressive loading

// API Configuration
const BASE_URL = 'https://data.gov.il/api/3/action/datastore_search';
const RESOURCE_IDS = {
  vehicle: '053cea08-09bc-40ec-8f7a-156f0677aff3',
  history: 'bb2355dc-9ec7-4f06-9c3f-3344672171da',
  mileage: '56063a99-8a3e-4ff4-912e-5966c0279bad',
  price:   '39f455bf-6db0-4926-859d-017f34eacbcb'
};

// Field name mappings (API field -> Display name)
const FIELD_NAMES = {
  mispar_rechev: 'License Plate',
  tozeret_nm: 'Vehicle Make',
  kinuy_mishari: 'Commercial Name',
  degem_nm: 'Model Name',
  shnat_yitzur: 'Year',
  tzeva_rechev: 'Color',
  sug_delek_nm: 'Fuel Type',
  misgeret: 'Chassis Number',
  degem_manoa: 'Engine Model',
  ramat_gimur: 'Trim Level',
  ramat_eivzur_betihuty: 'Safety Level',
  kvutzat_zihum: 'Pollution Group',
  mivchan_acharon_dt: 'Last Inspection',
  tokef_dt: 'Registration Expiry',
  moed_aliya_lakvish: 'Road Entry Date',
  baalut: 'Ownership',
  horaat_rishum: 'Registration Status',
  zmig_kidmi: 'Front Tire',
  zmig_ahori: 'Rear Tire',
  tozeret_cd: 'Make Code',
  sug_degem: 'Model Type',
  degem_cd: 'Model Code',
  tzeva_cd: 'Color Code',
  rank: 'Rank',
  _id: 'Record ID'
};

// Fields that contain Hebrew text (need RTL)
const HEBREW_FIELDS = [
  'tozeret_nm', 'tzeva_rechev', 'sug_delek_nm', 'baalut',
  'kinuy_mishari', 'degem_nm', 'ramat_gimur'
];

// Field display order
const FIELD_ORDER = [
  'mispar_rechev', 'tozeret_nm', 'kinuy_mishari', 'degem_nm',
  'shnat_yitzur', 'tzeva_rechev', 'sug_delek_nm', 'misgeret',
  'degem_manoa', 'ramat_gimur', 'ramat_eivzur_betihuty', 'kvutzat_zihum',
  'mivchan_acharon_dt', 'tokef_dt', 'moed_aliya_lakvish', 'baalut',
  'horaat_rishum', 'zmig_kidmi', 'zmig_ahori', 'tozeret_cd',
  'sug_degem', 'degem_cd', 'tzeva_cd', 'rank', '_id'
];

// Recent searches configuration
const MAX_RECENT_SEARCHES = 5;

// DOM Elements
let licensePlateInput, searchBtn, loadingEl, errorPanel, errorMessage;
let notFoundPanel, notFoundMessage, resultsSection, vehicleTbody;
let mileageLoading, historyContainer, historyTbody, historyLoading;
let priceContainer;
let recentSection, recentList;



// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);

function init() {
  // Cache DOM elements
  licensePlateInput = document.getElementById('license-plate');
  searchBtn = document.getElementById('search-btn');
  loadingEl = document.getElementById('loading');
  errorPanel = document.getElementById('error-panel');
  errorMessage = document.getElementById('error-message');
  notFoundPanel = document.getElementById('not-found-panel');
  notFoundMessage = document.getElementById('not-found-message');
  resultsSection = document.getElementById('results-section');
  vehicleTbody = document.getElementById('vehicle-tbody');
  mileageLoading = document.getElementById('mileage-loading');
  historyContainer = document.getElementById('history-container');
  historyTbody = document.getElementById('history-tbody');
  historyLoading = document.getElementById('history-loading');
  priceContainer = document.getElementById('price-container');
  recentSection = document.getElementById('recent-section');
  recentList = document.getElementById('recent-list');

  // Event listeners
  searchBtn.addEventListener('click', handleSearch);
  licensePlateInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });

  // Dealer filter toggle
  const filterBtn = document.getElementById('dealer-filter-btn');
  chrome.storage.local.get('dealerFilterEnabled', ({ dealerFilterEnabled }) => {
    _setFilterBtn(filterBtn, !!dealerFilterEnabled);
  });
  filterBtn.addEventListener('click', () => {
    chrome.storage.local.get('dealerFilterEnabled', ({ dealerFilterEnabled }) => {
      const next = !dealerFilterEnabled;
      chrome.storage.local.set({ dealerFilterEnabled: next });
      _setFilterBtn(filterBtn, next);
      chrome.runtime.sendMessage({ action: 'setDealerFilter', enabled: next });
    });
  });

  // Region selector
  document.getElementById('select-region-btn').addEventListener('click', startRegionSelection);

  // Messages from service worker (region selection result)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'cropAndOcr') {
      handleCropAndOcr(message.dataUrl, message.rect, message.devicePixelRatio);
    } else if (message.action === 'regionCancelled') {
      hideOcrStatus();
    } else if (message.action === 'regionError') {
      hideOcrStatus();
      showError(`Region selection error: ${message.error}`);
    } else if (message.action === 'ocrProgress') {
      showOcrStatus(message.text);
    }
  });

  // Load recent searches
  loadRecentSearches();
}

function _setFilterBtn(btn, enabled) {
  btn.classList.toggle('active', enabled);
  document.getElementById('dealer-filter-label').textContent = enabled ? 'Dealer ads hidden' : 'Hide dealer ads';
}

// --- Detection + OCR functions ---

// Convert a blob/remote URL to a data URL via canvas.
// Blob URLs are context-local; data URLs can cross extension contexts.
// Images are capped at 1024px longest dimension — sufficient for SmolVLM.
async function _toDataUrl(srcUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const MAX_DIM = 1024;
      const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.92);
    };
    img.onerror = reject;
    img.src = srcUrl;
  });
}

async function handleImageFileOcr(file) {
  const objectUrl = URL.createObjectURL(file);
  try {
    showOcrStatus('Preparing image…');
    const dataUrl = await _toDataUrl(objectUrl);
    await _sendOcrRequest(dataUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function handleImageOcr(imageUrl) {
  showOcrStatus('Preparing image…');
  const dataUrl = imageUrl.startsWith('data:') ? imageUrl : await _toDataUrl(imageUrl);
  await _sendOcrRequest(dataUrl);
}

async function _sendOcrRequest(dataUrl) {
  showOcrStatus('Loading OCR model…');
  let result;
  try {
    result = await chrome.runtime.sendMessage({ action: 'ocrRequest', dataUrl });
  } catch (err) {
    hideOcrStatus();
    showError(`OCR communication error: ${err.message}`);
    return;
  }

  hideOcrStatus();

  if (!result?.success) {
    showError(`OCR error: ${result?.error ?? 'Unknown error'}`);
    return;
  }

  // Extract 7–8 digit Israeli plate number from model output.
  const raw = result.text ?? '';
  const match = raw.replace(/\D/g, '').match(/\d{7,8}/);
  if (match) {
    licensePlateInput.value = match[0];
    handleSearch();
  } else {
    showError(
      raw.trim()
        ? `Plate not recognised (model returned: "${raw.trim().slice(0, 40)}")`
        : 'No license plate detected. Try a clearer or closer photo.'
    );
  }
}

function showOcrStatus(message) {
  document.getElementById('ocr-status-text').textContent = message;
  document.getElementById('ocr-status').style.display = 'block';

  // Parse percentage from messages like "Downloading model: foo.bin — 45%"
  const fill = document.getElementById('ocr-progress-fill');
  const pctMatch = message.match(/(\d+)%/);
  if (pctMatch) {
    fill.classList.remove('indeterminate');
    fill.style.width = `${pctMatch[1]}%`;
  } else {
    fill.classList.add('indeterminate');
  }
}

function hideOcrStatus() {
  document.getElementById('ocr-status').style.display = 'none';
  const fill = document.getElementById('ocr-progress-fill');
  fill.classList.remove('indeterminate');
  fill.style.width = '0%';
}

// --- Region selector (content script overlay → service worker screenshot → crop → OCR) ---

function startRegionSelection() {
  showOcrStatus('Drag over the license plate on the page…');
  chrome.runtime.sendMessage({ action: 'startRegionSelection' });
  chrome.runtime.sendMessage({ action: 'warmupOcr' });
}

async function handleCropAndOcr(dataUrl, rect, dpr) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      const x = Math.round(rect.x * dpr);
      const y = Math.round(rect.y * dpr);
      const w = Math.round(rect.w * dpr);
      const h = Math.round(rect.h * dpr);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, x, y, w, h, 0, 0, w, h);
      // toDataURL avoids blob URL cross-context issues.
      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
      try {
        await _sendOcrRequest(croppedDataUrl);
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// Handle search button click
async function handleSearch() {
  const licensePlate = licensePlateInput.value.trim();

  if (!licensePlate) {
    showError('Please enter a license plate number.');
    return;
  }

  // Reset UI
  hideAllPanels();
  showLoading(true);
  searchBtn.disabled = true;

  try {
    // P1: use cached vehicle data if available (24-hour TTL)
    const cached = await getCachedData(licensePlate);
    const vehicleData = cached ?? await fetchVehicleData(licensePlate);

    if (!vehicleData) {
      showNotFound(licensePlate);
      return;
    }

    if (!cached) await setCachedData(licensePlate, vehicleData);

    // Show vehicle data immediately
    showLoading(false);
    displayVehicleData(vehicleData);

    // Save to recent searches
    saveRecentSearch(licensePlate);

    // Fetch mileage and history in parallel — these are fast and unblock the UI immediately
    mileageLoading.style.display = 'flex';
    historyLoading.style.display = 'flex';

    const [mileage, history] = await Promise.all([
      fetchMileageData(licensePlate),
      fetchOwnershipHistory(licensePlate)
    ]);

    // Update mileage in table
    mileageLoading.style.display = 'none';
    if (mileage !== null) {
      updateMileageRow(mileage);
    }

    // Display ownership history
    historyLoading.style.display = 'none';
    if (history && history.length > 0) {
      displayOwnershipHistory(history);
    }

    // Fetch original price then Yad2 market data in background (price API can be slow)
    fetchNewPrice(vehicleData).then(newPrice => {
      updatePriceRow(newPrice);
      if (newPrice === null) return;
      displayPriceInfo(newPrice, vehicleData.shnat_yitzur, null);
      // Show loading hint while Yad2 data is in flight
      const summaryEl = document.getElementById('price-summary');
      const loadingNote = document.createElement('span');
      loadingNote.id = 'yad2-loading-note';
      loadingNote.className = 'status-dim';
      loadingNote.textContent = ' · Fetching market prices…';
      summaryEl.appendChild(loadingNote);

      fetchYad2CurrentPrice(vehicleData).then(yad2Data => {
        const note = document.getElementById('yad2-loading-note');
        if (note) note.remove();
        if (yad2Data) {
          displayPriceInfo(newPrice, vehicleData.shnat_yitzur, yad2Data);
        } else {
          console.warn('[Yad2] returned null — model or manufacturer not found on Yad2');
        }
      }).catch(err => {
        const note = document.getElementById('yad2-loading-note');
        if (note) note.remove();
        console.error('[Yad2] fetchYad2CurrentPrice failed:', err);
      });
    }).catch(err => {
      console.error('Error fetching new price:', err);
      updatePriceRow(null);
    });

  } catch (error) {
    // P2: surface timeout errors with an actionable message
    if (error.name === 'AbortError') {
      showError('Request timed out — the government API is slow. Please try again.');
    } else {
      showError(`Network error: ${error.message}`);
    }
  } finally {
    searchBtn.disabled = false;
    showLoading(false);
  }
}

// Fetch vehicle data from main endpoint
async function fetchVehicleData(licensePlate) {
  const url = new URL(BASE_URL);
  url.searchParams.set('resource_id', RESOURCE_IDS.vehicle);
  url.searchParams.set('q', licensePlate);
  url.searchParams.set('limit', '1');

  // P2: 10-second timeout, one automatic retry on network failure
  const response = await fetchWithTimeoutAndRetry(url, 10000, 1);
  const data = await response.json();

  if (!data.success) return null;
  
  const records = data.result?.records || [];
  return records.length > 0 ? records[0] : null;
}

// Fetch mileage data from modifications endpoint
async function fetchMileageData(licensePlate) {
  try {
    const url = new URL(BASE_URL);
    url.searchParams.set('resource_id', RESOURCE_IDS.mileage);
    url.searchParams.set('q', licensePlate);
    url.searchParams.set('limit', '1');

    const response = await fetchWithTimeoutAndRetry(url, 10000, 1);
    const data = await response.json();

    if (!data.success) return null;
    
    const records = data.result?.records || [];
    if (records.length === 0) return null;

    const mileage = records[0].kilometer_test_aharon;
    if (mileage === null || mileage === undefined || mileage === '') return null;

    return Math.round(parseFloat(mileage));
  } catch (error) {
    console.error('Error fetching mileage:', error);
    return null;
  }
}

// Fetch ownership history
async function fetchOwnershipHistory(licensePlate) {
  try {
    const url = new URL(BASE_URL);
    url.searchParams.set('resource_id', RESOURCE_IDS.history);
    url.searchParams.set('q', licensePlate);
    url.searchParams.set('limit', '100');

    const response = await fetchWithTimeoutAndRetry(url, 10000, 1);
    const data = await response.json();

    if (!data.success) return null;
    
    const records = data.result?.records || [];
    if (records.length === 0) return null;

    // Sort by date (baalut_dt in YYYYMM format)
    records.sort((a, b) => (a.baalut_dt || 0) - (b.baalut_dt || 0));

    // Process records
    return records.map((record, index) => ({
      startDate: record.baalut_dt,
      endDate: index < records.length - 1 ? records[index + 1].baalut_dt : null,
      ownerType: record.baalut || ''
    }));
  } catch (error) {
    console.error('Error fetching history:', error);
    return null;
  }
}

// Fetch original new-car price from the MOT importers dataset
async function fetchNewPrice(record) {
  try {
    const { tozeret_cd, degem_cd, shnat_yitzur } = record || {};
    if (!tozeret_cd || !degem_cd || !shnat_yitzur) return null;

    const url = new URL(BASE_URL);
    url.searchParams.set('resource_id', RESOURCE_IDS.price);
    url.searchParams.set('filters', JSON.stringify({ tozeret_cd, degem_cd, shnat_yitzur }));
    url.searchParams.set('limit', '1');

    const response = await fetchWithTimeoutAndRetry(url, 10000, 1);
    const data = await response.json();

    if (!data.success) return null;
    const records = data.result?.records || [];
    if (records.length === 0) return null;

    const mehir = records[0].mehir;
    return (mehir !== null && mehir !== undefined && mehir !== '') ? Number(mehir) : null;
  } catch (error) {
    console.error('Error fetching new price:', error);
    return null;
  }
}

// Fetch current market price from Yad2 for the vehicle's manufacture year.
// e.g. a 2013 A3 → searches year=2013-2013 → what 2013 A3s sell for today.
async function fetchYad2CurrentPrice(vehicleData) {
  try {
    const modelName = vehicleData.kinuy_mishari || vehicleData.degem_nm;
    const ids = await fetchYad2Ids(vehicleData.tozeret_nm, modelName);
    if (!ids || !ids.modelId) return null;

    const year = parseInt(vehicleData.shnat_yitzur, 10);
    return await fetchYad2MarketPriceForYear(ids.manufacturerId, ids.modelId, year);
  } catch {
    return null;
  }
}

// Update the original price table row after async fetch
function updatePriceRow(price) {
  const row = document.getElementById('price-row');
  if (!row) return;
  const cell = row.querySelector('td:last-child');
  if (price !== null) {
    cell.textContent = `₪${Math.round(price).toLocaleString()}`;
    cell.className = '';
  } else {
    cell.textContent = 'Not available';
    cell.className = 'status-dim';
  }
}

// Render original price summary + year-by-year bar chart.
// yad2Data: {avg, median, count, min, max} for the manufacture-year cohort, or null for estimates only.
function displayPriceInfo(originalPrice, shnat_yitzur, yad2Data) {
  const manufactureYear = parseInt(shnat_yitzur, 10);
  const currentYear = new Date().getFullYear();
  const estimated = calculateDepreciationTimeline(originalPrice, manufactureYear, currentYear);
  if (!estimated.length) return;

  // Apply Yad2 median to the current-year entry only (manufacture-year cohort price today)
  const timeline = estimated.map(est => {
    const marketPrice = (est.isCurrent && yad2Data) ? yad2Data.median : null;
    const pctOfOriginal = marketPrice !== null
      ? (marketPrice / originalPrice) * 100
      : est.pctOfOriginal;
    return {
      year: est.year,
      age: est.age,
      isCurrent: est.isCurrent,
      price: marketPrice ?? est.value,
      pctOfOriginal,
      isReal: marketPrice !== null,
      listingCount: yad2Data?.count ?? 0
    };
  });

  const current = timeline[timeline.length - 1];
  const pctNow = Math.round(current.pctOfOriginal);
  const hasRealData = yad2Data !== null;

  // Summary line
  const summaryEl = document.getElementById('price-summary');
  summaryEl.textContent = '';

  const line1 = document.createElement('span');
  line1.textContent = `New (${manufactureYear}): ₪${Math.round(originalPrice).toLocaleString()}`;
  summaryEl.appendChild(line1);
  summaryEl.appendChild(document.createElement('br'));

  const line2 = document.createElement('span');
  const sourceLabel = current.isReal ? `Market median (Yad2, ${current.listingCount} ads)` : `Est. (${current.age} yrs)`;
  line2.textContent = `${sourceLabel}: ₪${Math.round(current.price).toLocaleString()} `;
  summaryEl.appendChild(line2);

  const pctSpan = document.createElement('span');
  if (pctNow > 100) {
    pctSpan.className = 'status-green';
    pctSpan.textContent = `(+${pctNow - 100}% above original — mix of trims)`;
  } else {
    pctSpan.className = pctNow >= 40 ? 'status-yellow' : 'status-red';
    pctSpan.textContent = `(${current.isReal ? '' : '~'}${pctNow}% of original)`;
  }
  summaryEl.appendChild(pctSpan);

  if (hasRealData) {
    summaryEl.appendChild(document.createElement('br'));
    const srcNote = document.createElement('span');
    srcNote.className = 'status-dim';
    srcNote.textContent = 'Prices: median asking price on Yad2';
    summaryEl.appendChild(srcNote);
  }

  // Bar chart — one row per year
  const chartEl = document.getElementById('price-chart');
  chartEl.textContent = '';

  timeline.forEach(entry => {
    const pct = Math.round(entry.pctOfOriginal);
    const barPct = Math.min(pct, 100);
    const colorClass = pct > 100 ? 'dep-high'
      : pct >= 70 ? 'dep-high' : pct >= 40 ? 'dep-mid' : pct >= 20 ? 'dep-low' : 'dep-vlow';

    const row = document.createElement('div');
    row.className = entry.isCurrent ? 'dep-row dep-current' : 'dep-row';

    const yearSpan = document.createElement('span');
    yearSpan.className = 'dep-year';
    yearSpan.textContent = entry.year;

    const track = document.createElement('div');
    track.className = 'dep-track';
    const fill = document.createElement('div');
    fill.className = `dep-fill ${colorClass}`;
    fill.style.width = `${barPct}%`;
    track.appendChild(fill);

    const pctEl = document.createElement('span');
    pctEl.className = 'dep-pct';
    pctEl.textContent = pct > 100 ? `+${pct - 100}%` : `${pct}%`;

    const noteEl = document.createElement('span');
    noteEl.className = 'dep-drop';
    if (entry.age === 0) {
      noteEl.textContent = 'new';
    } else if (entry.isReal) {
      noteEl.textContent = `${entry.listingCount} ads`;
    } else {
      noteEl.textContent = 'est.';
    }

    row.appendChild(yearSpan);
    row.appendChild(track);
    row.appendChild(pctEl);
    row.appendChild(noteEl);
    chartEl.appendChild(row);
  });

  priceContainer.style.display = 'block';
}

// Display vehicle data in table
function displayVehicleData(record) {
  vehicleTbody.innerHTML = '';

  // Add mileage placeholder row first
  const mileageRow = document.createElement('tr');
  mileageRow.id = 'mileage-row';
  mileageRow.innerHTML = `
    <td>Last Reported Mileage</td>
    <td class="status-dim">Loading...</td>
  `;
  vehicleTbody.appendChild(mileageRow);

  // Add original price placeholder row
  const priceRow = document.createElement('tr');
  priceRow.id = 'price-row';
  const priceLabelTd = document.createElement('td');
  priceLabelTd.textContent = 'Original New Price';
  const priceValueTd = document.createElement('td');
  priceValueTd.className = 'status-dim';
  priceValueTd.textContent = 'Loading...';
  priceRow.appendChild(priceLabelTd);
  priceRow.appendChild(priceValueTd);
  vehicleTbody.appendChild(priceRow);

  // Add vehicle fields
  for (const fieldKey of FIELD_ORDER) {
    if (!(fieldKey in record)) continue;

    const row = document.createElement('tr');
    const fieldName = FIELD_NAMES[fieldKey] || fieldKey;
    let value = record[fieldKey];
    let valueClass = '';
    let valueHtml = '';

    if (value === null || value === undefined || value === '') {
      valueHtml = 'N/A';
      valueClass = 'status-dim';
    } else if (fieldKey === 'kvutzat_zihum') {
      valueHtml = createPollutionScale(value);
    } else if (fieldKey === 'mivchan_acharon_dt' || fieldKey === 'tokef_dt' || fieldKey === 'moed_aliya_lakvish') {
      const { formatted, colorClass } = formatDate(value);
      valueHtml = formatted;
      valueClass = colorClass;
    } else if (HEBREW_FIELDS.includes(fieldKey)) {
      valueHtml = `<span class="rtl">${escapeHtml(String(value))}</span>`;
    } else {
      valueHtml = escapeHtml(String(value));
    }

    row.innerHTML = `
      <td>${escapeHtml(fieldName)}</td>
      <td class="${valueClass}">${valueHtml}</td>
    `;
    vehicleTbody.appendChild(row);
  }

  resultsSection.style.display = 'block';
  resultsSection.classList.remove('animate-in');
  void resultsSection.offsetWidth;
  resultsSection.classList.add('animate-in');

  Array.from(vehicleTbody.querySelectorAll('tr')).forEach((row, i) => {
    row.style.animationDelay = (i * 30) + 'ms';
  });
}

// Update mileage row after async fetch
function updateMileageRow(mileage) {
  const mileageRow = document.getElementById('mileage-row');
  if (mileageRow) {
    const valueCell = mileageRow.querySelector('td:last-child');
    valueCell.textContent = `${mileage.toLocaleString()} km`;
    valueCell.className = '';
  }
}

// Display ownership history table
function displayOwnershipHistory(records) {
  historyTbody.innerHTML = '';

  records.forEach((record, index) => {
    const row = document.createElement('tr');
    const isLast = index === records.length - 1;
    const isCurrent = isLast && !record.endDate;

    const startDate = formatIsraeliDate(record.startDate);
    const endDateHtml = isCurrent
      ? '<span class="status-green">Present</span>'
      : escapeHtml(formatIsraeliDate(record.endDate));
    const ownerType = record.ownerType || 'Unknown';

    const rowClass = isCurrent ? 'current-owner' : '';

    row.innerHTML = `
      <td class="${rowClass}">${startDate}</td>
      <td class="${rowClass}">${endDateHtml}</td>
      <td class="${rowClass} rtl">${escapeHtml(ownerType)}</td>
    `;
    row.style.animationDelay = (index * 30) + 'ms';
    historyTbody.appendChild(row);
  });

  historyContainer.style.display = 'block';
}

// Create pollution scale visualization
function createPollutionScale(pollutionGroup) {
  const group = parseInt(pollutionGroup);
  if (isNaN(group) || group < 1 || group > 15) {
    return escapeHtml(String(pollutionGroup));
  }

  // Emoji blocks for scale
  const blocks = [];
  for (let i = 1; i <= 15; i++) {
    if (i === group) {
      blocks.push('◉');
    } else if (i <= 5) {
      blocks.push('🟩');
    } else if (i <= 9) {
      blocks.push('🟨');
    } else if (i <= 12) {
      blocks.push('🟧');
    } else if (i <= 14) {
      blocks.push('🟥');
    } else {
      blocks.push('⬛');
    }
  }

  // Category label
  let category, categoryClass;
  if (group <= 5) {
    category = 'Excellent';
    categoryClass = 'pollution-excellent';
  } else if (group <= 9) {
    category = 'Good';
    categoryClass = 'pollution-good';
  } else if (group <= 12) {
    category = 'Fair';
    categoryClass = 'pollution-fair';
  } else if (group <= 14) {
    category = 'Moderate';
    categoryClass = 'pollution-moderate';
  } else {
    category = 'Poor';
    categoryClass = 'pollution-poor';
  }

  return `<span class="pollution-scale">${blocks.join('')}</span> ${group}/15 <span class="pollution-category ${categoryClass}">(${category})</span>`;
}

// Format date and determine color
function formatDate(dateStr) {
  if (!dateStr) {
    return { formatted: 'N/A', colorClass: 'status-dim' };
  }

  try {
    // Parse ISO date or date string
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return { formatted: dateStr, colorClass: '' };
    }

    const formatted = date.toLocaleDateString('en-GB'); // DD/MM/YYYY
    const now = new Date();
    
    if (date < now) {
      return { formatted, colorClass: 'status-red' };
    }
    
    const daysUntil = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
    if (daysUntil < 30) {
      return { formatted, colorClass: 'status-yellow' };
    }
    
    return { formatted, colorClass: 'status-green' };
  } catch {
    return { formatted: dateStr, colorClass: '' };
  }
}

// Format Israeli date (YYYYMM -> MM/YYYY)
function formatIsraeliDate(dateVal) {
  if (!dateVal) return 'Present';
  
  const str = String(dateVal);
  if (str.length === 6) {
    const year = str.substring(0, 4);
    const month = str.substring(4, 6);
    return `${month}/${year}`;
  }
  
  return str;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// UI Helper functions
function showLoading(show) {
  loadingEl.style.display = show ? 'flex' : 'none';
}

function hideAllPanels() {
  errorPanel.style.display = 'none';
  notFoundPanel.style.display = 'none';
  resultsSection.style.display = 'none';
  historyContainer.style.display = 'none';
  priceContainer.style.display = 'none';
  mileageLoading.style.display = 'none';
  historyLoading.style.display = 'none';
}

function showError(message) {
  showLoading(false);
  hideAllPanels();
  errorMessage.textContent = message;
  errorPanel.style.display = 'block';
  errorPanel.classList.remove('animate-in');
  void errorPanel.offsetWidth;
  errorPanel.classList.add('animate-in');
}

function showNotFound(licensePlate) {
  showLoading(false);
  hideAllPanels();
  notFoundMessage.textContent = `No vehicle found with license plate: ${licensePlate}`;
  notFoundPanel.style.display = 'block';
  notFoundPanel.classList.remove('animate-in');
  void notFoundPanel.offsetWidth;
  notFoundPanel.classList.add('animate-in');
}

// Recent searches functions
async function loadRecentSearches() {
  try {
    const result = await chrome.storage.local.get(['recentSearches']);
    const searches = result.recentSearches || [];
    displayRecentSearches(searches);
  } catch (error) {
    console.error('Error loading recent searches:', error);
  }
}

function displayRecentSearches(searches) {
  if (searches.length === 0) {
    recentSection.style.display = 'none';
    return;
  }

  recentList.innerHTML = '';
  searches.forEach(plate => {
    const item = document.createElement('span');
    item.className = 'recent-item';
    item.textContent = plate;
    item.addEventListener('click', () => {
      licensePlateInput.value = plate;
      handleSearch();
    });
    recentList.appendChild(item);
  });

  recentSection.style.display = 'block';
}

async function saveRecentSearch(licensePlate) {
  try {
    const result = await chrome.storage.local.get(['recentSearches']);
    let searches = result.recentSearches || [];
    
    // Remove if already exists (to move to front)
    searches = searches.filter(p => p !== licensePlate);
    
    // Add to front
    searches.unshift(licensePlate);
    
    // Keep only MAX_RECENT_SEARCHES
    searches = searches.slice(0, MAX_RECENT_SEARCHES);
    
    await chrome.storage.local.set({ recentSearches: searches });
    displayRecentSearches(searches);
  } catch (error) {
    console.error('Error saving recent search:', error);
  }
}
