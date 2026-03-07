// Israel Vehicle Lookup - Desktop App JavaScript
// Fetches vehicle data from data.gov.il APIs with progressive loading

// API Configuration
const BASE_URL = 'https://data.gov.il/api/3/action/datastore_search';
const RESOURCE_IDS = {
  vehicle: '053cea08-09bc-40ec-8f7a-156f0677aff3',
  history: 'bb2355dc-9ec7-4f06-9c3f-3344672171da',
  mileage: '56063a99-8a3e-4ff4-912e-5966c0279bad'
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
  recentSection = document.getElementById('recent-section');
  recentList = document.getElementById('recent-list');

  // Event listeners
  searchBtn.addEventListener('click', handleSearch);
  licensePlateInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });

  // Load recent searches
  loadRecentSearches();

  // Custom titlebar controls (no-op in browser dev mode)
  if (window.__TAURI__) {
    const appWindow = window.__TAURI__.window.getCurrentWindow();
    document.getElementById('btn-minimize').addEventListener('click', () => appWindow.minimize());
    document.getElementById('btn-maximize').addEventListener('click', () => appWindow.toggleMaximize());
    document.getElementById('btn-close').addEventListener('click', () => appWindow.close());
  }
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
    // Fetch vehicle data first (required)
    const vehicleData = await fetchVehicleData(licensePlate);

    if (!vehicleData) {
      showNotFound(licensePlate);
      return;
    }

    // Show vehicle data immediately
    showLoading(false);
    displayVehicleData(vehicleData);

    // Save to recent searches
    saveRecentSearch(licensePlate);

    // Fetch mileage and history in parallel (progressive loading)
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

  } catch (error) {
    showError(`Network error: ${error.message}`);
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

  const response = await fetch(url);
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

    const response = await fetch(url);
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

    const response = await fetch(url);
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
    } else if (fieldKey === 'mivchan_acharon_dt' || fieldKey === 'tokef_dt') {
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
  void resultsSection.offsetWidth; // reflow to restart animation
  resultsSection.classList.add('animate-in');

  // Stagger row animations
  Array.from(vehicleTbody.querySelectorAll('tr')).forEach((row, i) => {
    row.style.animationDelay = (i * 30) + 'ms';
  });
}

// Update mileage row after async fetch
function updateMileageRow(mileage) {
  const mileageRow = document.getElementById('mileage-row');
  if (mileageRow) {
    const valueCell = mileageRow.querySelector('td:last-child');
    if (mileage !== null) {
      valueCell.textContent = `${mileage.toLocaleString()} km`;
      valueCell.className = '';
    } else {
      valueCell.textContent = 'N/A';
      valueCell.className = 'status-dim';
    }
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
    const endDate = isCurrent ? 'Present' : formatIsraeliDate(record.endDate);
    const ownerType = record.ownerType || 'Unknown';

    const rowClass = isCurrent ? 'current-owner' : '';

    row.innerHTML = `
      <td class="${rowClass}">${startDate}</td>
      <td class="${rowClass}">${isCurrent ? '<span class="status-green">Present</span>' : endDate}</td>
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

// Recent searches — stored in localStorage (sync, no chrome.storage dependency)
function loadRecentSearches() {
  try {
    const stored = localStorage.getItem('recentSearches');
    const searches = stored ? JSON.parse(stored) : [];
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

function saveRecentSearch(licensePlate) {
  try {
    const stored = localStorage.getItem('recentSearches');
    let searches = stored ? JSON.parse(stored) : [];

    // Remove if already exists (to move to front)
    searches = searches.filter(p => p !== licensePlate);

    // Add to front
    searches.unshift(licensePlate);

    // Keep only MAX_RECENT_SEARCHES
    searches = searches.slice(0, MAX_RECENT_SEARCHES);

    localStorage.setItem('recentSearches', JSON.stringify(searches));
    displayRecentSearches(searches);
  } catch (error) {
    console.error('Error saving recent search:', error);
  }
}
