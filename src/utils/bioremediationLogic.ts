export interface ExperimentRecord {
  id: string;
  pollutantId: string;
  pollutantName: string;
  unit: string;
  ci: number; // Initial concentration
  cf: number; // Final concentration
  efficiency: number; // ((Ci - Cf) / Ci) * 100
  adsorptionCapacityQe: number; // mg/g or unit/g
  treatmentType: string;
  doseMgL: number;
  contactTimeMin: number;
  ph: number;
  standardLimit: number;
  isCompliant: boolean;
  timestamp: string;
}

export interface PollutantSpec {
  id: string;
  name: string;
  englishName: string;
  unit: string;
  standardLimit: number;
  standardSource: string;
  defaultCi: number;
  defaultCf: number;
}

export interface OpticalMetrics {
  meanR: number;
  meanG: number;
  meanB: number;
  luminance: number;
  opticalDensity: number; // -log10(L / 255)
  turbidityIndex: number; // 0 to 100
  estimatedColonies: number;
  rHistogram: number[];
  gHistogram: number[];
  bHistogram: number[];
}

export interface SimulationPoint {
  x: number;
  efficiency: number;
}

export interface SimulationResult {
  currentEfficiency: number;
  optimalDose: number;
  optimalTime: number;
  optimalPh: number;
  maxPredictedEfficiency: number;
  langmuirQmax: number;
  freundlichKf: number;
  pseudoSecondOrderK2: number;
  doseCurve: SimulationPoint[];
  timeCurve: SimulationPoint[];
  phCurve: SimulationPoint[];
}

export interface SamplingStation {
  id: string;
  name: string;
  locationArea: string;
  lat: number;
  lng: number;
  sampleType: string;
  pollutionLevel: 'low' | 'medium' | 'high';
  turbidityNTU: number;
  bodMgL: number;
  tdsMgL: number;
  ph: number;
  heavyMetalsMgL: number;
  wqi: number;
  date: string;
  notes: string;
}

export const POLLUTANT_SPECS: PollutantSpec[] = [
  {
    id: 'turbidity',
    name: 'العكورة (Turbidity)',
    englishName: 'Turbidity',
    unit: 'NTU',
    standardLimit: 5.0,
    standardSource: 'WHO / IQS 417',
    defaultCi: 145.0,
    defaultCf: 6.8,
  },
  {
    id: 'bod',
    name: 'المتطلب الحيوي للأوكسجين (BOD₅)',
    englishName: 'Biochemical Oxygen Demand',
    unit: 'mg/L',
    standardLimit: 5.0,
    standardSource: 'محددات الأنهار العراقية',
    defaultCi: 68.5,
    defaultCf: 9.4,
  },
  {
    id: 'cod',
    name: 'المتطلب الكيميائي للأوكسجين (COD)',
    englishName: 'Chemical Oxygen Demand',
    unit: 'mg/L',
    standardLimit: 40.0,
    standardSource: 'WHO / EPA',
    defaultCi: 185.0,
    defaultCf: 28.5,
  },
  {
    id: 'tds',
    name: 'الأملاح الذائبة الكلية (TDS)',
    englishName: 'Total Dissolved Solids',
    unit: 'mg/L',
    standardLimit: 1000.0,
    standardSource: 'IQS 417',
    defaultCi: 1420.0,
    defaultCf: 580.0,
  },
  {
    id: 'ec',
    name: 'التوصيلية الكهربائية (EC)',
    englishName: 'Electrical Conductivity',
    unit: 'µS/cm',
    standardLimit: 1500.0,
    standardSource: 'WHO',
    defaultCi: 2350.0,
    defaultCf: 940.0,
  },
  {
    id: 'heavy_metals',
    name: 'المعادن الثقيلة (Pb²⁺ / Cd²⁺)',
    englishName: 'Heavy Metals (Lead/Cadmium)',
    unit: 'mg/L',
    standardLimit: 0.05,
    standardSource: 'WHO Drinking Water',
    defaultCi: 4.85,
    defaultCf: 0.18,
  },
  {
    id: 'bacteria',
    name: 'العدد البكتيري الكلي (Total Coliforms)',
    englishName: 'Total Bacterial Count',
    unit: 'CFU/100mL',
    standardLimit: 10.0,
    standardSource: 'WHO / IQS',
    defaultCi: 2400.0,
    defaultCf: 45.0,
  },
];

export const TREATMENT_TYPES = [
  {
    id: 'plant_extract',
    name: 'مستخلص نباتي (بذور المورينجا Moringa oleifera)',
    mechanism: 'تخثر حيوي ومعادلة الشحنات السطحية (Charge Neutralization & Interparticle Bridging) بواسطة البروتينات الكاتيونية الذائبة',
    optPh: 7.2,
    optDose: 65,
    optTime: 45,
  },
  {
    id: 'microalgae',
    name: 'طحالب مجهرية (Chlorella vulgaris)',
    mechanism: 'امتزاز وتمثيل حيوي (Biosorption & Bioaccumulation) عبر مجاميع الكاربوكسيل والهيدروكسيل والفوسفات في الجدار الخلوي',
    optPh: 6.8,
    optDose: 80,
    optTime: 90,
  },
  {
    id: 'biochar',
    name: 'فحم حيوي منشط (Activated Biochar)',
    mechanism: 'امتزاز فيزيائي وكيميائي في المسامات الدقيقة وتبادل أيوني (Micropore Diffusion, π-π Interaction & Ion Exchange)',
    optPh: 6.0,
    optDose: 110,
    optTime: 60,
  },
  {
    id: 'chemical_coagulant',
    name: 'مخثر كيميائي مرجعي (الشب Alum Al₂(SO₄)₃)',
    mechanism: 'ترسيب وتلبيد كيميائي عبر تكوين هيدروكسيد الألمنيوم غير الذائب (Sweep Flocculation)',
    optPh: 6.5,
    optDose: 90,
    optTime: 35,
  },
];

/**
 * Calculates removal efficiency percentage: ((Ci - Cf) / Ci) * 100
 */
export function calculateRemovalEfficiency(ci: number, cf: number): number {
  if (!Number.isFinite(ci) || !Number.isFinite(cf) || ci <= 0) {
    return 0;
  }
  const safeCf = Math.max(0, cf);
  const raw = ((ci - safeCf) / ci) * 100;
  return Number(Math.max(0, Math.min(100, raw)).toFixed(2));
}

/**
 * Calculates adsorption capacity qe = ((Ci - Cf) * V) / m
 * Assuming standard 1L sample volume and dose in mg/L (converted to g/L).
 */
export function calculateAdsorptionCapacityQe(
  ci: number,
  cf: number,
  doseMgL: number
): number {
  if (!Number.isFinite(ci) || !Number.isFinite(cf) || !Number.isFinite(doseMgL) || doseMgL <= 0 || ci <= cf) {
    return 0;
  }
  const doseGramsPerLiter = doseMgL / 1000;
  const qe = (ci - cf) / doseGramsPerLiter;
  return Number(qe.toFixed(2));
}

/**
 * Evaluates treatment performance grade in Arabic.
 */
export function evaluateEfficiencyGrade(efficiency: number): {
  label: string;
  tier: 'excellent' | 'good' | 'moderate' | 'low';
} {
  if (efficiency >= 85) {
    return { label: 'كفاءة عالية جداً (ممتاز)', tier: 'excellent' };
  }
  if (efficiency >= 70) {
    return { label: 'كفاءة جيدة جداً', tier: 'good' };
  }
  if (efficiency >= 50) {
    return { label: 'كفاءة متوسطة', tier: 'moderate' };
  }
  return { label: 'كفاءة منخفضة', tier: 'low' };
}

/**
 * Computes optical density, RGB histogram, and clarity index from raw RGBA pixel array.
 */
export function computeOpticalMetricsFromRGBA(
  pixels: Uint8ClampedArray | number[],
  width: number,
  height: number
): OpticalMetrics {
  const rHist = new Array<number>(16).fill(0);
  const gHist = new Array<number>(16).fill(0);
  const bHist = new Array<number>(16).fill(0);

  const totalPixels = Math.max(1, Math.floor(pixels.length / 4));
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let darkClusterPixels = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i] ?? 0;
    const g = pixels[i + 1] ?? 0;
    const b = pixels[i + 2] ?? 0;

    sumR += r;
    sumG += g;
    sumB += b;

    const rBin = Math.min(15, Math.floor(r / 16));
    const gBin = Math.min(15, Math.floor(g / 16));
    const bBin = Math.min(15, Math.floor(b / 16));
    rHist[rBin]++;
    gHist[gBin]++;
    bHist[bBin]++;

    // Detect localized colony/particulate contrast spots
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum < 145) {
      darkClusterPixels++;
    }
  }

  const meanR = Number((sumR / totalPixels).toFixed(1));
  const meanG = Number((sumG / totalPixels).toFixed(1));
  const meanB = Number((sumB / totalPixels).toFixed(1));
  const luminance = Number((0.299 * meanR + 0.587 * meanG + 0.114 * meanB).toFixed(1));

  // Optical Density OD = -log10(I / I0), where I0 = 255
  const transmittance = Math.max(1, luminance) / 255;
  const opticalDensity = Number((-Math.log10(transmittance)).toFixed(3));

  // Yellow/brownish shift + absorbance indicates turbidity
  const colorTurbidityFactor = Math.max(0, (meanR - meanB) * 0.45);
  const rawTurbidity = (1 - transmittance) * 100 + colorTurbidityFactor;
  const turbidityIndex = Number(Math.max(1, Math.min(100, rawTurbidity)).toFixed(1));

  // Normalize histograms to percentages
  const normR = rHist.map((v) => Number(((v / totalPixels) * 100).toFixed(1)));
  const normG = gHist.map((v) => Number(((v / totalPixels) * 100).toFixed(1)));
  const normB = bHist.map((v) => Number(((v / totalPixels) * 100).toFixed(1)));

  const colonyRatio = darkClusterPixels / totalPixels;
  const estimatedColonies = Math.max(
    0,
    Math.round(colonyRatio * ((width * height) / 420))
  );

  return {
    meanR,
    meanG,
    meanB,
    luminance,
    opticalDensity,
    turbidityIndex,
    estimatedColonies,
    rHistogram: normR,
    gHistogram: normG,
    bHistogram: normB,
  };
}

/**
 * Calculates net optical purity improvement percentage between Before and After samples.
 */
export function calculateVisualClarityImprovement(
  before: OpticalMetrics,
  after: OpticalMetrics
): number {
  if (before.opticalDensity <= 0 && before.turbidityIndex <= 0) {
    return 0;
  }
  const odImprovement =
    before.opticalDensity > 0
      ? ((before.opticalDensity - after.opticalDensity) / before.opticalDensity) * 100
      : 0;
  const turbImprovement =
    before.turbidityIndex > 0
      ? ((before.turbidityIndex - after.turbidityIndex) / before.turbidityIndex) * 100
      : 0;
  const blended = 0.55 * turbImprovement + 0.45 * odImprovement;
  return Number(Math.max(0, Math.min(99.9, blended)).toFixed(2));
}

/**
 * Predictive optimization model combining Langmuir adsorption, restabilization at overdose,
 * pseudo-second-order contact time kinetics, and Gaussian pH surface charge window.
 */
export function simulateDoseResponseCurve(
  doseMgL: number,
  contactTimeMin: number,
  ph: number,
  treatmentId = 'plant_extract'
): SimulationResult {
  const spec =
    TREATMENT_TYPES.find((t) => t.id === treatmentId) ?? TREATMENT_TYPES[0];

  const evalEfficiency = (d: number, t: number, p: number): number => {
    // Dose factor: rises up to optDose, slight restabilization penalty if heavily overdosed
    const dRatio = d / spec.optDose;
    const doseFactor =
      d <= spec.optDose
        ? 1 - Math.exp(-2.6 * dRatio)
        : (1 - Math.exp(-2.6)) * Math.exp(-0.08 * Math.pow(dRatio - 1, 1.6));

    // Time factor: pseudo-second-order saturation
    const kTime = 0.055;
    const timeFactor = (kTime * t) / (1 + kTime * t);

    // pH factor: Gaussian bell curve around optimal pH (isoelectric / active site window)
    const phFactor = Math.exp(-Math.pow(p - spec.optPh, 2) / (2 * Math.pow(2.15, 2)));

    const baseMax = 97.8;
    const eff = baseMax * (0.48 * doseFactor + 0.30 * timeFactor + 0.22 * phFactor);
    return Number(Math.max(5, Math.min(99.2, eff)).toFixed(2));
  };

  const currentEfficiency = evalEfficiency(doseMgL, contactTimeMin, ph);
  const maxPredictedEfficiency = evalEfficiency(
    spec.optDose,
    spec.optTime,
    spec.optPh
  );

  const doseCurve: SimulationPoint[] = [];
  for (let d = 10; d <= 200; d += 10) {
    doseCurve.push({
      x: d,
      efficiency: evalEfficiency(d, contactTimeMin, ph),
    });
  }

  const timeCurve: SimulationPoint[] = [];
  for (let t = 5; t <= 120; t += 5) {
    timeCurve.push({
      x: t,
      efficiency: evalEfficiency(doseMgL, t, ph),
    });
  }

  const phCurve: SimulationPoint[] = [];
  for (let p = 2; p <= 12; p += 1) {
    phCurve.push({
      x: p,
      efficiency: evalEfficiency(doseMgL, contactTimeMin, p),
    });
  }

  return {
    currentEfficiency,
    optimalDose: spec.optDose,
    optimalTime: spec.optTime,
    optimalPh: spec.optPh,
    maxPredictedEfficiency,
    langmuirQmax: Number((spec.optDose * 1.85).toFixed(1)),
    freundlichKf: Number((spec.optPh * 2.4).toFixed(2)),
    pseudoSecondOrderK2: 0.042,
    doseCurve,
    timeCurve,
    phCurve,
  };
}

/**
 * Computes field station Water Quality Index (WQI) and pollution level.
 */
export function computeWaterQualityIndex(
  turbidityNTU: number,
  bodMgL: number,
  tdsMgL: number,
  ph: number,
  heavyMetalsMgL = 0.02
): { wqi: number; pollutionLevel: 'low' | 'medium' | 'high' } {
  const qTurb = Math.min(100, (turbidityNTU / 5) * 18);
  const qBod = Math.min(100, (bodMgL / 5) * 22);
  const qTds = Math.min(100, (tdsMgL / 1000) * 35);
  const qPh = Math.min(100, Math.abs(ph - 7.2) * 25);
  const qMetals = Math.min(100, (heavyMetalsMgL / 0.05) * 30);

  const rawPollutionIndex =
    0.28 * qTurb + 0.26 * qBod + 0.16 * qTds + 0.12 * qPh + 0.18 * qMetals;
  const wqi = Number(Math.max(5, Math.min(100, rawPollutionIndex)).toFixed(1));

  if (wqi < 35) {
    return { wqi, pollutionLevel: 'low' };
  }
  if (wqi < 68) {
    return { wqi, pollutionLevel: 'medium' };
  }
  return { wqi, pollutionLevel: 'high' };
}

/**
 * Pure helper to compute academic report summary statistics for PDF submission.
 */
export function computeAcademicReportStats(
  records: ExperimentRecord[],
  stations: SamplingStation[],
  simulationResult: SimulationResult
) {
  const totalExperiments = records.length;
  const avgEfficiency =
    totalExperiments > 0
      ? Number(
          (
            records.reduce((acc, r) => acc + r.efficiency, 0) / totalExperiments
          ).toFixed(2)
        )
      : 0;
  const compliantCount = records.filter((r) => r.isCompliant).length;
  const complianceRate =
    totalExperiments > 0
      ? Number(((compliantCount / totalExperiments) * 100).toFixed(1))
      : 0;
  const highestRecord =
    totalExperiments > 0
      ? [...records].sort((a, b) => b.efficiency - a.efficiency)[0]
      : null;

  return {
    totalExperiments,
    avgEfficiency,
    compliantCount,
    complianceRate,
    highestPollutant: highestRecord?.pollutantName ?? 'غير محدد',
    highestEfficiency: highestRecord?.efficiency ?? 0,
    optimalDose: simulationResult.optimalDose,
    optimalTime: simulationResult.optimalTime,
    optimalPh: simulationResult.optimalPh,
    maxPredictedEfficiency: simulationResult.maxPredictedEfficiency,
    totalStations: stations.length,
  };
}

export const INITIAL_EXPERIMENT_RECORDS: ExperimentRecord[] = [
  {
    id: 'exp-1',
    pollutantId: 'turbidity',
    pollutantName: 'العكورة (Turbidity)',
    unit: 'NTU',
    ci: 148.0,
    cf: 6.4,
    efficiency: 95.68,
    adsorptionCapacityQe: 2178.46,
    treatmentType: 'مستخلص نباتي (بذور المورينجا Moringa oleifera)',
    doseMgL: 65,
    contactTimeMin: 45,
    ph: 7.2,
    standardLimit: 5.0,
    isCompliant: false,
    timestamp: '2026-10-15 09:30',
  },
  {
    id: 'exp-2',
    pollutantId: 'bod',
    pollutantName: 'المتطلب الحيوي للأوكسجين (BOD₅)',
    unit: 'mg/L',
    ci: 64.0,
    cf: 4.8,
    efficiency: 92.5,
    adsorptionCapacityQe: 740.0,
    treatmentType: 'طحالب مجهرية (Chlorella vulgaris)',
    doseMgL: 80,
    contactTimeMin: 90,
    ph: 6.8,
    standardLimit: 5.0,
    isCompliant: true,
    timestamp: '2026-10-15 11:15',
  },
  {
    id: 'exp-3',
    pollutantId: 'cod',
    pollutantName: 'المتطلب الكيميائي للأوكسجين (COD)',
    unit: 'mg/L',
    ci: 192.0,
    cf: 26.5,
    efficiency: 86.2,
    adsorptionCapacityQe: 1504.55,
    treatmentType: 'فحم حيوي منشط (Activated Biochar)',
    doseMgL: 110,
    contactTimeMin: 60,
    ph: 6.2,
    standardLimit: 40.0,
    isCompliant: true,
    timestamp: '2026-10-16 10:00',
  },
  {
    id: 'exp-4',
    pollutantId: 'heavy_metals',
    pollutantName: 'المعادن الثقيلة (Pb²⁺ / Cd²⁺)',
    unit: 'mg/L',
    ci: 4.6,
    cf: 0.04,
    efficiency: 99.13,
    adsorptionCapacityQe: 41.45,
    treatmentType: 'فحم حيوي منشط (Activated Biochar)',
    doseMgL: 110,
    contactTimeMin: 60,
    ph: 6.0,
    standardLimit: 0.05,
    isCompliant: true,
    timestamp: '2026-10-16 12:40',
  },
  {
    id: 'exp-5',
    pollutantId: 'bacteria',
    pollutantName: 'العدد البكتيري الكلي (Total Coliforms)',
    unit: 'CFU/100mL',
    ci: 2250.0,
    cf: 38.0,
    efficiency: 98.31,
    adsorptionCapacityQe: 34030.77,
    treatmentType: 'مستخلص نباتي (بذور المورينجا Moringa oleifera)',
    doseMgL: 65,
    contactTimeMin: 45,
    ph: 7.1,
    standardLimit: 10.0,
    isCompliant: false,
    timestamp: '2026-10-16 14:20',
  },
  {
    id: 'exp-6',
    pollutantId: 'tds',
    pollutantName: 'الأملاح الذائبة الكلية (TDS)',
    unit: 'mg/L',
    ci: 1380.0,
    cf: 540.0,
    efficiency: 60.87,
    adsorptionCapacityQe: 10500.0,
    treatmentType: 'طحالب مجهرية (Chlorella vulgaris)',
    doseMgL: 80,
    contactTimeMin: 90,
    ph: 7.0,
    standardLimit: 1000.0,
    isCompliant: true,
    timestamp: '2026-10-17 08:45',
  },
];

export const INITIAL_SAMPLING_STATIONS: SamplingStation[] = [
  {
    id: 'st-1',
    name: 'محطة مشروع ماء تكريت الموحد (مأخذ نهر دجلة)',
    locationArea: 'شمال مدينة تكريت - ضفاف نهر دجلة',
    lat: 34.6238,
    lng: 43.6712,
    sampleType: 'مياه نهرية سطحية (قبل الضخ)',
    pollutionLevel: 'low',
    turbidityNTU: 6.2,
    bodMgL: 2.8,
    tdsMgL: 410,
    ph: 7.4,
    heavyMetalsMgL: 0.012,
    wqi: 21.4,
    date: '2026-10-14',
    notes: 'جودة مياه جيدة ومطابقة للمحددات الوطنية مع عكورة موسمية طفيفة.',
  },
  {
    id: 'st-2',
    name: 'محطة جسر تكريت - تقاطع القادسية',
    locationArea: 'وسط مدينة تكريت - المجرى الرئيسي لنهر دجلة',
    lat: 34.6045,
    lng: 43.6865,
    sampleType: 'مياه نهرية (مجرى رئيسي)',
    pollutionLevel: 'medium',
    turbidityNTU: 24.5,
    bodMgL: 8.4,
    tdsMgL: 690,
    ph: 7.7,
    heavyMetalsMgL: 0.038,
    wqi: 49.8,
    date: '2026-10-15',
    notes: 'ارتفاع متوسط في العكورة والحمل العضوي نتيجة التصريف الحضري القريب.',
  },
  {
    id: 'st-3',
    name: 'محطة المصب الجنوبي - قرب المنطقة الصناعية',
    locationArea: 'جنوب تكريت - مخرج المبازل والتصريف',
    lat: 34.5812,
    lng: 43.6984,
    sampleType: 'مياه صرف معالجة جزئياً / مبازل',
    pollutionLevel: 'high',
    turbidityNTU: 142.0,
    bodMgL: 64.0,
    tdsMgL: 1380,
    ph: 8.1,
    heavyMetalsMgL: 0.24,
    wqi: 84.6,
    date: '2026-10-15',
    notes: 'تلوث عضوي وبكتيري مرتفع جداً؛ أُخذت منها العينة القياسية لتجارب المعالجة الحيوية.',
  },
  {
    id: 'st-4',
    name: 'محطة قضاء العلم - الضفة الشرقية لنهر دجلة',
    locationArea: 'شرق تكريت - منطقة زراعية',
    lat: 34.6391,
    lng: 43.7042,
    sampleType: 'مياه ري ومبازل زراعية',
    pollutionLevel: 'medium',
    turbidityNTU: 31.0,
    bodMgL: 11.2,
    tdsMgL: 920,
    ph: 7.8,
    heavyMetalsMgL: 0.045,
    wqi: 58.2,
    date: '2026-10-16',
    notes: 'تأثر واضح بالأسمدة الزراعية وارتفاع نسبي في الأملاح الذائبة الكلية (TDS).',
  },
  {
    id: 'st-5',
    name: 'محطة الحرم الجامعي - جامعة تكريت (القادسية)',
    locationArea: 'شمال تكريت - مختبرات قسم علوم الحياة',
    lat: 34.6785,
    lng: 43.6540,
    sampleType: 'مياه معالجة حيوياً (مخرج وحدة المعالجة التجريبية)',
    pollutionLevel: 'low',
    turbidityNTU: 3.8,
    bodMgL: 2.1,
    tdsMgL: 385,
    ph: 7.2,
    heavyMetalsMgL: 0.008,
    wqi: 16.5,
    date: '2026-10-17',
    notes: 'عينة قياسية بعد المعالجة المشتركة بمستخلص المورينجا والطحالب المجهرية.',
  },
];
