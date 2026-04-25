const { calculateDepreciationTimeline, VALUE_FLOOR_PCT } = require('../utils/price-utils');

test('returns empty array for zero or falsy price', () => {
  expect(calculateDepreciationTimeline(0, 2020, 2024)).toEqual([]);
  expect(calculateDepreciationTimeline(null, 2020, 2024)).toEqual([]);
});

test('returns empty array when currentYear is before manufactureYear', () => {
  expect(calculateDepreciationTimeline(100000, 2025, 2020)).toEqual([]);
});

test('returns one entry for brand-new car (same year)', () => {
  const timeline = calculateDepreciationTimeline(200000, 2024, 2024);
  expect(timeline).toHaveLength(1);
  expect(timeline[0].value).toBe(200000);
  expect(timeline[0].pctOfOriginal).toBe(100);
  expect(timeline[0].dropFromPrevYear).toBe(0);
  expect(timeline[0].annualDropPct).toBe(0);
});

test('entry count equals (currentYear - manufactureYear + 1)', () => {
  const timeline = calculateDepreciationTimeline(100000, 2019, 2024);
  expect(timeline).toHaveLength(6);
});

test('first entry has 100% value and zero drop', () => {
  const timeline = calculateDepreciationTimeline(100000, 2020, 2024);
  expect(timeline[0].pctOfOriginal).toBe(100);
  expect(timeline[0].value).toBe(100000);
  expect(timeline[0].dropFromPrevYear).toBe(0);
  expect(timeline[0].annualDropPct).toBe(0);
  expect(timeline[0].age).toBe(0);
  expect(timeline[0].year).toBe(2020);
});

test('value decreases every year after year 0', () => {
  const timeline = calculateDepreciationTimeline(100000, 2015, 2024);
  for (let i = 1; i < timeline.length; i++) {
    expect(timeline[i].value).toBeLessThan(timeline[i - 1].value);
  }
});

test('value never drops below floor percentage of original', () => {
  const originalPrice = 100000;
  const timeline = calculateDepreciationTimeline(originalPrice, 1990, 2026);
  const floor = Math.round(originalPrice * VALUE_FLOOR_PCT);
  timeline.forEach(entry => {
    expect(entry.value).toBeGreaterThanOrEqual(floor);
  });
});

test('exactly one entry is marked isCurrent', () => {
  const timeline = calculateDepreciationTimeline(100000, 2018, 2024);
  const current = timeline.filter(e => e.isCurrent);
  expect(current).toHaveLength(1);
  expect(current[0].year).toBe(2024);
});

test('year-1 drop is 15% of the original price', () => {
  const timeline = calculateDepreciationTimeline(100000, 2020, 2021);
  expect(timeline[1].value).toBe(85000);
  expect(timeline[1].dropFromPrevYear).toBe(15000);
  expect(timeline[1].annualDropPct).toBeCloseTo(15, 1);
});
