import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRemovalEfficiency,
  calculateAdsorptionCapacityQe,
  evaluateEfficiencyGrade,
  computeOpticalMetricsFromRGBA,
  calculateVisualClarityImprovement,
  simulateDoseResponseCurve,
  computeWaterQualityIndex,
  computeAcademicReportStats,
  INITIAL_EXPERIMENT_RECORDS,
  INITIAL_SAMPLING_STATIONS,
} from './bioremediationLogic.ts';

test('calculateRemovalEfficiency computes exact ((Ci - Cf) / Ci) * 100 formula', () => {
  assert.equal(calculateRemovalEfficiency(100, 15), 85);
  assert.equal(calculateRemovalEfficiency(148, 6.4), 95.68);
  assert.equal(calculateRemovalEfficiency(0, 10), 0);
  assert.equal(calculateRemovalEfficiency(50, 60), 0);
});

test('calculateAdsorptionCapacityQe computes mg pollutant per gram biosorbent', () => {
  // Ci = 100 mg/L, Cf = 20 mg/L, Dose = 80 mg/L (0.08 g/L) => (80 / 0.08) = 1000 mg/g
  assert.equal(calculateAdsorptionCapacityQe(100, 20, 80), 1000);
  assert.equal(calculateAdsorptionCapacityQe(50, 50, 100), 0);
});

test('evaluateEfficiencyGrade classifies efficiency tiers accurately', () => {
  assert.equal(evaluateEfficiencyGrade(92.4).tier, 'excellent');
  assert.equal(evaluateEfficiencyGrade(75.0).tier, 'good');
  assert.equal(evaluateEfficiencyGrade(55.0).tier, 'moderate');
  assert.equal(evaluateEfficiencyGrade(30.0).tier, 'low');
});

test('computeOpticalMetricsFromRGBA and calculateVisualClarityImprovement distinguish turbid vs clear samples', () => {
  // Turbid sample: darker, brownish pixels (R=130, G=105, B=65)
  const turbidPixels = new Uint8ClampedArray(400);
  for (let i = 0; i < turbidPixels.length; i += 4) {
    turbidPixels[i] = 130;
    turbidPixels[i + 1] = 105;
    turbidPixels[i + 2] = 65;
    turbidPixels[i + 3] = 255;
  }

  // Clarified sample: bright, clear water pixels (R=235, G=244, B=248)
  const clearPixels = new Uint8ClampedArray(400);
  for (let i = 0; i < clearPixels.length; i += 4) {
    clearPixels[i] = 235;
    clearPixels[i + 1] = 244;
    clearPixels[i + 2] = 248;
    clearPixels[i + 3] = 255;
  }

  const beforeMetrics = computeOpticalMetricsFromRGBA(turbidPixels, 10, 10);
  const afterMetrics = computeOpticalMetricsFromRGBA(clearPixels, 10, 10);

  assert.ok(beforeMetrics.opticalDensity > afterMetrics.opticalDensity);
  assert.ok(beforeMetrics.turbidityIndex > afterMetrics.turbidityIndex);

  const improvement = calculateVisualClarityImprovement(beforeMetrics, afterMetrics);
  assert.ok(improvement > 65);
});

test('simulateDoseResponseCurve predicts optimal point and valid kinetic curves', () => {
  const result = simulateDoseResponseCurve(65, 45, 7.2, 'plant_extract');
  assert.equal(result.optimalDose, 65);
  assert.equal(result.optimalTime, 45);
  assert.equal(result.optimalPh, 7.2);
  assert.ok(result.currentEfficiency > 80);
  assert.ok(result.doseCurve.length >= 15);
  assert.ok(result.timeCurve.length >= 15);
  assert.ok(result.phCurve.length >= 10);
});

test('computeWaterQualityIndex classifies low, medium, and high pollution stations', () => {
  const clean = computeWaterQualityIndex(3.5, 2.0, 380, 7.2, 0.008);
  assert.equal(clean.pollutionLevel, 'low');

  const polluted = computeWaterQualityIndex(140, 65, 1400, 8.2, 0.25);
  assert.equal(polluted.pollutionLevel, 'high');
});

test('computeAcademicReportStats summarizes experimental records, compliance, and optimal parameters for PDF export', () => {
  const sim = simulateDoseResponseCurve(65, 45, 7.2, 'plant_extract');
  const stats = computeAcademicReportStats(
    INITIAL_EXPERIMENT_RECORDS,
    INITIAL_SAMPLING_STATIONS,
    sim
  );
  assert.equal(stats.totalExperiments, 6);
  assert.equal(stats.totalStations, 5);
  assert.ok(stats.avgEfficiency > 85);
  assert.equal(stats.highestEfficiency, 99.13);
  assert.equal(stats.optimalDose, 65);
  assert.equal(stats.compliantCount, 4);
});
