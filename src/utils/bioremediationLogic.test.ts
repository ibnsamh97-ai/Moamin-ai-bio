import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRemovalEfficiency,
  calculateAdsorptionCapacityQe,
  calculateTrueQe,
  computeTriplicateBiostats,
  calculateStockSolutionMass,
  calculateDilutionC1V1,
  computeSpectrophotometerCalibration,
  evaluateEfficiencyGrade,
  computeOpticalMetricsFromRGBA,
  calculateVisualClarityImprovement,
  simulateDoseResponseCurve,
  computeWaterQualityIndex,
  computeAcademicReportStats,
  generateBuiltInExpertResponse,
  generateDeterministicQrMatrix,
  INITIAL_EXPERIMENT_RECORDS,
  INITIAL_SAMPLING_STATIONS,
} from './bioremediationLogic.ts';

test('calculateRemovalEfficiency computes exact ((Ci - Cf) / Ci) * 100 formula', () => {
  assert.equal(calculateRemovalEfficiency(100, 15), 85);
  assert.equal(calculateRemovalEfficiency(148, 6.4), 95.68);
  assert.equal(calculateRemovalEfficiency(0, 10), 0);
  assert.equal(calculateRemovalEfficiency(50, 60), 0);
});

test('computeTriplicateBiostats computes Mean, SD, and P <= 0.05 statistical significance', () => {
  const stats = computeTriplicateBiostats([146.5, 148.0, 149.5], [6.2, 6.4, 6.6]);
  assert.equal(stats.ciMean, 148);
  assert.equal(stats.ciSd, 1.5);
  assert.equal(stats.cfMean, 6.4);
  assert.equal(stats.efficiency, 95.68);
  assert.equal(stats.isSignificant, true);
  assert.ok(stats.pValue <= 0.05);
});

test('calculateStockSolutionMass and calculateDilutionC1V1 compute exact lab preparation values', () => {
  const stock = calculateStockSolutionMass(1000, 500, 100);
  assert.equal(stock.requiredMassMg, 500);
  assert.equal(stock.requiredMassG, 0.5);

  const dil = calculateDilutionC1V1(1000, 50, 250);
  assert.equal(dil.isValid, true);
  assert.equal(dil.v1RequiredMl, 12.5);
  assert.equal(dil.waterToAddMl, 237.5);
  assert.equal(dil.dilutionFactor, 20);
});

test('calculateTrueQe computes exact qe = ((Ci - Cf) * V) / m', () => {
  // Ci = 100 mg/L, Cf = 10 mg/L, V = 0.5 L, m = 0.25 g => (90 * 0.5) / 0.25 = 180 mg/g
  assert.equal(calculateTrueQe(100, 10, 0.5, 0.25), 180);
  assert.equal(calculateAdsorptionCapacityQe(100, 20, 80), 1000);
});

test('computeSpectrophotometerCalibration computes Beer-Lambert slope and R² correlation', () => {
  const cal = computeSpectrophotometerCalibration(
    [
      { concentration: 10, absorbanceOd: 0.08 },
      { concentration: 50, absorbanceOd: 0.4 },
      { concentration: 100, absorbanceOd: 0.8 },
      { concentration: 150, absorbanceOd: 1.2 },
    ],
    1.18,
    0.06
  );
  assert.equal(cal.rSquared, 1);
  assert.ok(cal.estimatedCiFromOd > 140);
  assert.ok(cal.estimatedCfFromOd < 10);
  assert.ok(cal.odRemovalEfficiency > 90);
});

test('computeOpticalMetricsFromRGBA and calculateVisualClarityImprovement distinguish turbid vs clear samples', () => {
  const turbidPixels = new Uint8ClampedArray(400);
  for (let i = 0; i < turbidPixels.length; i += 4) {
    turbidPixels[i] = 130;
    turbidPixels[i + 1] = 105;
    turbidPixels[i + 2] = 65;
    turbidPixels[i + 3] = 255;
  }

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
  const improvement = calculateVisualClarityImprovement(beforeMetrics, afterMetrics);
  assert.ok(improvement > 65);
});

test('computeWaterQualityIndex, Built-In Expert Engine, and QR generator produce valid outputs', () => {
  const clean = computeWaterQualityIndex(3.5, 2.0, 380, 7.2, 0.008);
  assert.equal(clean.pollutionLevel, 'low');

  const sim = simulateDoseResponseCurve(65, 45, 7.2, 'plant_extract');
  const stats = computeAcademicReportStats(
    INITIAL_EXPERIMENT_RECORDS,
    INITIAL_SAMPLING_STATIONS,
    sim
  );
  assert.equal(stats.totalExperiments, 6);

  const expertText = generateBuiltInExpertResponse('تفسير نتائج العكورة', {
    specialty: 'المعالجة الحيوية وتنقية المياه',
    researchNotes: 'مشروع تخرج جامعة تكريت',
    records: INITIAL_EXPERIMENT_RECORDS,
    wqiScore: 21.4,
    qeValue: 180.5,
    optimalDose: 65,
    optimalTime: 45,
    optimalPh: 7.2,
  });
  assert.ok(expertText.includes('مؤمن خلف عبدالله'));
  assert.ok(expertText.includes('P ≤ 0.05'));

  const qr = generateDeterministicQrMatrix('https://moamin-ai-bio.vercel.app/');
  assert.equal(qr.length, 29);
  assert.equal(qr[0].length, 29);
  assert.equal(qr[0][0], true);
  assert.equal(qr[3][3], true);
  assert.equal(qr[0][28], true);
});
