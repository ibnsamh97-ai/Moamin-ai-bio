import React, { useState, useMemo } from 'react';
import {
  FlaskConical,
  Droplets,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import {
  calculateStockSolutionMass,
  calculateDilutionC1V1,
  calculateTrueQe,
  computeWaterQualityIndex,
} from '../utils/bioremediationLogic';

interface LabSolutionsAndWqiTabProps {
  darkMode: boolean;
  onUpdateGlobalWqiAndQe?: (wqi: number, qe: number) => void;
}

export const LabSolutionsAndWqiTab: React.FC<LabSolutionsAndWqiTabProps> = ({
  darkMode,
  onUpdateGlobalWqiAndQe,
}) => {
  // 1. Stock Solution Calculator State
  const [stockTargetConcMgL, setStockTargetConcMgL] = useState<number>(1000);
  const [stockVolumeMl, setStockVolumeMl] = useState<number>(500);
  const [stockPurityPercent, setStockPurityPercent] = useState<number>(99.5);
  const [reagentName, setReagentName] = useState<string>(
    'مسحوق بذور المورينجا المستخلص (Moringa Seed Powder)'
  );

  const stockResult = useMemo(
    () =>
      calculateStockSolutionMass(
        stockTargetConcMgL,
        stockVolumeMl,
        stockPurityPercent
      ),
    [stockTargetConcMgL, stockVolumeMl, stockPurityPercent]
  );

  // 2. Dilution Calculator (C1V1 = C2V2) State
  const [c1Stock, setC1Stock] = useState<number>(1000);
  const [c2Target, setC2Target] = useState<number>(65);
  const [v2FinalMl, setV2FinalMl] = useState<number>(250);

  const dilutionResult = useMemo(
    () => calculateDilutionC1V1(c1Stock, c2Target, v2FinalMl),
    [c1Stock, c2Target, v2FinalMl]
  );

  // 3. True Adsorption Capacity (qe = (Ci - Cf) * V / m) State
  const [qeCiMgL, setQeCiMgL] = useState<number>(148.0);
  const [qeCfMgL, setQeCfMgL] = useState<number>(6.4);
  const [qeVolumeL, setQeVolumeL] = useState<number>(0.5);
  const [qeMassG, setQeMassG] = useState<number>(0.325);

  const trueQeValue = useMemo(() => {
    const val = calculateTrueQe(qeCiMgL, qeCfMgL, qeVolumeL, qeMassG);
    return val;
  }, [qeCiMgL, qeCfMgL, qeVolumeL, qeMassG]);

  // 4. Unified Water Quality Index (Weighted WQI 0-100) State
  const [wqiTurbidity, setWqiTurbidity] = useState<number>(4.8);
  const [wqiBod, setWqiBod] = useState<number>(3.9);
  const [wqiTds, setWqiTds] = useState<number>(480);
  const [wqiPh, setWqiPh] = useState<number>(7.2);
  const [wqiMetals, setWqiMetals] = useState<number>(0.015);

  const wqiEval = useMemo(() => {
    const res = computeWaterQualityIndex(
      wqiTurbidity,
      wqiBod,
      wqiTds,
      wqiPh,
      wqiMetals
    );
    if (onUpdateGlobalWqiAndQe) {
      onUpdateGlobalWqiAndQe(res.wqi, trueQeValue);
    }
    return res;
  }, [
    wqiTurbidity,
    wqiBod,
    wqiTds,
    wqiPh,
    wqiMetals,
    trueQeValue,
    onUpdateGlobalWqiAndQe,
  ]);

  const inputClass = `w-full rounded-lg border px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
    darkMode
      ? 'bg-slate-950 border-slate-700 text-slate-100'
      : 'bg-slate-50 border-slate-300 text-slate-900'
  }`;

  return (
    <div className="space-y-6" data-testid="lab-solutions-wqi-tab">
      {/* Row 1: Stock Solution Calculator + C1V1 = C2V2 Dilution Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Card 1: Stock Solution Preparation Calculator (6 cols) */}
        <div
          className={`lg:col-span-6 rounded-xl border p-6 flex flex-col justify-between ${
            darkMode
              ? 'bg-slate-900 border-slate-800'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="space-y-4">
            <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Scale className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  حاسبة تحضير المحلول القياسي (Stock Solution Preparation)
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                حساب الوزن الدقيق بالملغرام (mg) والغرام (g) لتحضير المحاليل
                القياسية للمواد المعالجة الحيوية
              </p>
            </div>

            <div>
              <label
                htmlFor="stock-reagent-select"
                className="block text-xs font-semibold mb-1"
              >
                المادة القياسية المراد تحضيرها
              </label>
              <select
                id="stock-reagent-select"
                value={reagentName}
                onChange={(e) => setReagentName(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  darkMode
                    ? 'bg-slate-950 border-slate-700 text-slate-100'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="مسحوق بذور المورينجا المستخلص (Moringa Seed Powder)">
                  مسحوق بذور المورينجا المستخلص (Moringa Seed Powder)
                </option>
                <option value="كتلة الطحالب المجهرية المجففة (Chlorella vulgaris Biomass)">
                  كتلة الطحالب المجهرية المجففة (Chlorella vulgaris Biomass)
                </option>
                <option value="الفحم الحيوي المنشط (Activated Biochar)">
                  الفحم الحيوي المنشط (Activated Biochar)
                </option>
                <option value="كبريتات الألمنيوم القياسية (Alum Reference)">
                  كبريتات الألمنيوم القياسية (Alum Reference)
                </option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="stock-conc-input"
                  className="block text-xs font-semibold mb-1"
                >
                  التركيز المطلوب (mg/L)
                </label>
                <input
                  id="stock-conc-input"
                  type="number"
                  min={1}
                  step="10"
                  value={stockTargetConcMgL}
                  onChange={(e) =>
                    setStockTargetConcMgL(Number(e.target.value))
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="stock-vol-input"
                  className="block text-xs font-semibold mb-1"
                >
                  حجم المحلول (mL)
                </label>
                <input
                  id="stock-vol-input"
                  type="number"
                  min={10}
                  step="50"
                  value={stockVolumeMl}
                  onChange={(e) => setStockVolumeMl(Number(e.target.value))}
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="stock-purity-input"
                  className="block text-xs font-semibold mb-1"
                >
                  نسبة النقاوة (%)
                </label>
                <input
                  id="stock-purity-input"
                  type="number"
                  min={10}
                  max={100}
                  step="0.5"
                  value={stockPurityPercent}
                  onChange={(e) =>
                    setStockPurityPercent(Number(e.target.value))
                  }
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div
            className={`mt-5 p-4 rounded-xl border ${
              darkMode
                ? 'bg-emerald-950/35 border-emerald-800/60'
                : 'bg-emerald-50/80 border-emerald-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                الوزن الواجب وزنه في الميزان الحساس:
              </span>
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                W = (C × V) / Purity
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-baseline justify-between gap-4">
              <div>
                <span
                  className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400"
                  data-testid="stock-mass-mg"
                >
                  {stockResult.requiredMassMg} mg
                </span>
                <span className="mx-2 text-slate-400">|</span>
                <span className="text-sm font-bold font-mono text-slate-700 dark:text-slate-200">
                  ({stockResult.requiredMassG} g)
                </span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                يُذاب في {stockVolumeMl} mL ماء مقطر
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Dilution Law Calculator (C1V1 = C2V2) (6 cols) */}
        <div
          className={`lg:col-span-6 rounded-xl border p-6 flex flex-col justify-between ${
            darkMode
              ? 'bg-slate-900 border-slate-800'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="space-y-4">
            <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-bold flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-cyan-600 shrink-0" />
                <span>
                  حاسبة قانون التخفيف المختبري (C1 × V1 = C2 × V2)
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                حساب الحجم الدقيق الواجب سحبه بالماصة (V1) من المحلول القياسي
                لتحضير التراكيز المخففة
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="dil-c1-input"
                  className="block text-xs font-semibold mb-1"
                >
                  تركيز المحلول الأصلي C1 (mg/L)
                </label>
                <input
                  id="dil-c1-input"
                  type="number"
                  min={1}
                  value={c1Stock}
                  onChange={(e) => setC1Stock(Number(e.target.value))}
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="dil-c2-input"
                  className="block text-xs font-semibold mb-1"
                >
                  التركيز المطلوب C2 (mg/L)
                </label>
                <input
                  id="dil-c2-input"
                  type="number"
                  min={0.1}
                  value={c2Target}
                  onChange={(e) => setC2Target(Number(e.target.value))}
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="dil-v2-input"
                  className="block text-xs font-semibold mb-1"
                >
                  الحجم النهائي المطلوب V2 (mL)
                </label>
                <input
                  id="dil-v2-input"
                  type="number"
                  min={10}
                  value={v2FinalMl}
                  onChange={(e) => setV2FinalMl(Number(e.target.value))}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div
            className={`mt-5 p-4 rounded-xl border ${
              darkMode
                ? 'bg-cyan-950/35 border-cyan-800/60'
                : 'bg-cyan-50/80 border-cyan-200'
            }`}
          >
            {dilutionResult.isValid ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    الحجم المسحوب من المحلول القياسي (V1):
                  </span>
                  <span className="font-mono text-cyan-600 dark:text-cyan-400">
                    معامل التخفيف: {dilutionResult.dilutionFactor}x
                  </span>
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-4">
                  <span
                    className="text-2xl font-extrabold font-mono text-cyan-600 dark:text-cyan-400"
                    data-testid="dilution-v1-ml"
                  >
                    V1 = {dilutionResult.v1RequiredMl} mL
                  </span>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    + يضاف{' '}
                    <strong className="font-mono">
                      {dilutionResult.waterToAddMl} mL
                    </strong>{' '}
                    ماء مقطر لإكمال الحجم إلى {v2FinalMl} mL
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-rose-500 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  يجب أن يكون التركيز المطلوب (C2) أقل من أو مساوياً لتركيز
                  المحلول القياسي (C1).
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: True Adsorption Capacity (qe) + Weighted Water Quality Index (WQI 0-100) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Card 3: True Biosorption Capacity qe = ((Ci - Cf) * V) / m (5 cols) */}
        <div
          className={`lg:col-span-5 rounded-xl border p-6 flex flex-col justify-between ${
            darkMode
              ? 'bg-slate-900 border-slate-800'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="space-y-4">
            <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>حاسبة سعة الامتزاز الحقيقية (True Adsorption qe)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                qe = ((Ci - Cf) × V) / m (mg/g)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="qe-ci-input"
                  className="block text-xs font-semibold mb-1"
                >
                  التركيز الابتدائي Ci (mg/L)
                </label>
                <input
                  id="qe-ci-input"
                  type="number"
                  step="0.5"
                  value={qeCiMgL}
                  onChange={(e) => setQeCiMgL(Number(e.target.value))}
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="qe-cf-input"
                  className="block text-xs font-semibold mb-1"
                >
                  التركيز النهائي Cf (mg/L)
                </label>
                <input
                  id="qe-cf-input"
                  type="number"
                  step="0.2"
                  value={qeCfMgL}
                  onChange={(e) => setQeCfMgL(Number(e.target.value))}
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="qe-vol-input"
                  className="block text-xs font-semibold mb-1"
                >
                  حجم العينة V (لتر - L)
                </label>
                <input
                  id="qe-vol-input"
                  type="number"
                  step="0.1"
                  min={0.05}
                  value={qeVolumeL}
                  onChange={(e) => setQeVolumeL(Number(e.target.value))}
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="qe-mass-input"
                  className="block text-xs font-semibold mb-1"
                >
                  كتلة المادة المازة m (غرام - g)
                </label>
                <input
                  id="qe-mass-input"
                  type="number"
                  step="0.05"
                  min={0.01}
                  value={qeMassG}
                  onChange={(e) => setQeMassG(Number(e.target.value))}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div
            className={`mt-5 p-4 rounded-xl border ${
              darkMode
                ? 'bg-slate-950 border-slate-800'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="text-xs text-slate-500 dark:text-slate-400">
              سعة الامتزاز التوازنية للمادة الحيوية (qe):
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span
                className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400"
                data-testid="true-qe-output"
              >
                {trueQeValue} mg/g
              </span>
              <span className="text-xs font-mono text-slate-400">
                أيزوثيرم لانجمير وفروندليش
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Weighted Water Quality Index (WQI 0-100) (7 cols) */}
        <div
          className={`lg:col-span-7 rounded-xl border p-6 flex flex-col justify-between ${
            darkMode
              ? 'bg-slate-900 border-slate-800'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="space-y-4">
            <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-teal-600 shrink-0" />
                  <span>
                    المؤشر الموحد لجودة المياه (Weighted WQI 0–100) والمطابقة
                    القياسية
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  تقييم شامل لجودة المياه وتصنيفها تلقائياً وفق المواصفات
                  العراقية (IQS 417) ومنظمة الصحة العالمية (WHO)
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-teal-500/15 text-teal-600 dark:text-teal-400">
                WQI = {wqiEval.wqi}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label
                  htmlFor="wqi-turb-input"
                  className="block text-[11px] font-semibold mb-1"
                >
                  العكورة (NTU)
                </label>
                <input
                  id="wqi-turb-input"
                  type="number"
                  step="0.5"
                  value={wqiTurbidity}
                  onChange={(e) => setWqiTurbidity(Number(e.target.value))}
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="wqi-bod-input"
                  className="block text-[11px] font-semibold mb-1"
                >
                  BOD5 (mg/L)
                </label>
                <input
                  id="wqi-bod-input"
                  type="number"
                  step="0.5"
                  value={wqiBod}
                  onChange={(e) => setWqiBod(Number(e.target.value))}
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="wqi-tds-input"
                  className="block text-[11px] font-semibold mb-1"
                >
                  TDS (mg/L)
                </label>
                <input
                  id="wqi-tds-input"
                  type="number"
                  step="20"
                  value={wqiTds}
                  onChange={(e) => setWqiTds(Number(e.target.value))}
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="wqi-ph-input"
                  className="block text-[11px] font-semibold mb-1"
                >
                  الدالة الحامضية pH
                </label>
                <input
                  id="wqi-ph-input"
                  type="number"
                  step="0.1"
                  value={wqiPh}
                  onChange={(e) => setWqiPh(Number(e.target.value))}
                  className={inputClass}
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label
                  htmlFor="wqi-metals-input"
                  className="block text-[11px] font-semibold mb-1"
                >
                  المعادن (mg/L)
                </label>
                <input
                  id="wqi-metals-input"
                  type="number"
                  step="0.005"
                  value={wqiMetals}
                  onChange={(e) => setWqiMetals(Number(e.target.value))}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div
            className={`mt-5 p-4 rounded-xl border space-y-2.5 ${
              darkMode
                ? 'bg-slate-950 border-slate-800'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full inline-block ${
                    wqiEval.pollutionLevel === 'low'
                      ? 'bg-emerald-500'
                      : wqiEval.pollutionLevel === 'medium'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                />
                <span className="text-xs font-bold">
                  الرقم الموحد لجودة المياه (Weighted WQI):{' '}
                  <strong className="font-mono text-base" data-testid="weighted-wqi-score">
                    {wqiEval.wqi} / 100
                  </strong>
                </span>
              </div>

              <span className="text-xs font-semibold flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {wqiEval.pollutionLevel === 'low'
                    ? 'جودة ممتازة (آمنة بيئياً)'
                    : wqiEval.pollutionLevel === 'medium'
                    ? 'جودة متوسطة (تحتاج معالجة)'
                    : 'تلوث حرج مرتفع'}
                </span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-slate-400 block">
                  المواصفة العراقية (IQS 417):
                </span>
                <span className="font-semibold">{wqiEval.iqsStatus}</span>
              </div>
              <div>
                <span className="text-slate-400 block">
                  معايير منظمة الصحة العالمية (WHO):
                </span>
                <span className="font-semibold">{wqiEval.whoStatus}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
