// Annual depreciation rates indexed by age (age 0 = year of manufacture, no drop).
// Rates apply to the previous year's value (compound). Approximates Israeli market.
const YEARLY_RATES = [0, 0.15, 0.13, 0.11, 0.10, 0.09, 0.08, 0.07, 0.06, 0.06, 0.05];

const VALUE_FLOOR_PCT = 0.08;

function calculateDepreciationTimeline(originalPrice, manufactureYear, currentYear) {
  if (!originalPrice || originalPrice <= 0) return [];
  if (currentYear < manufactureYear) return [];

  const floorValue = Math.round(originalPrice * VALUE_FLOOR_PCT);
  const timeline = [];
  let value = originalPrice;

  for (let year = manufactureYear; year <= currentYear; year++) {
    const age = year - manufactureYear;
    const rate = YEARLY_RATES[Math.min(age, YEARLY_RATES.length - 1)];
    const prevValue = value;

    if (age > 0) {
      value = Math.max(Math.round(prevValue * (1 - rate)), floorValue);
    }

    timeline.push({
      year,
      age,
      value,
      pctOfOriginal: (value / originalPrice) * 100,
      dropFromPrevYear: prevValue - value,
      annualDropPct: age > 0 ? ((prevValue - value) / prevValue) * 100 : 0,
      isCurrent: year === currentYear
    });
  }

  return timeline;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculateDepreciationTimeline, YEARLY_RATES, VALUE_FLOOR_PCT };
}
