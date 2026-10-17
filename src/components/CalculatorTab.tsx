import React, { useState, useEffect, useRef } from 'react';
import {
  Chart,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import {
  Calculator,
  PlusCircle,
  Trash2,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import {
  ExperimentRecord,
  POLLUTANT_SPECS,
  TREATMENT_TYPES,
  calculateAdsorptionCapacityQe,
  computeTriplicateBiostats,
  evaluateEfficiencyGrade,
} from '../utils/bioremediationLogic';
import { UserSettings } from './SettingsModal';

Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

interface CalculatorTabProps {
  records: ExperimentRecord[];
  onAddRecord: (rec: ExperimentRecord) => void;
  onDeleteRecord: (id: string) => void;
  onResetRecords: () => void;
  darkMode: boolean;
  userSettings: UserSettings;
}

export const CalculatorTab: React.FC<CalculatorTabProps> = ({
  records,
  onAddRecord,
  onDeleteRecord,
  onResetRecords,
  darkMode,
  userSettings,
}) => {
  const [selectedPollutantId, setSelectedPollutantId] =
    useState<string>('turbidity');
  const [ciR1, setCiR1] = useState<string>('146.5');
  const [ciR2, setCiR2] = useState<string>('148.0');
  const [ciR3, setCiR3] = useState<string>('149.5');

  const [cfR1, setCfR1] = useState<string>('6.2');
  const [cfR2, setCfR2] = useState<string>('6.4');
  const [cfR3, setCfR3] = useState<string>('6.6');

  const [selectedTreatment, setSelectedTreatment] = useState<string>(
    userSettings.defaultTreatmentType
  );
  const [doseStr, setDoseStr] = useState<string>(
    String(userSettings.defaultDose)
  );
  const [timeStr, setTimeStr] = useState<string>(
    String(userSettings.defaultContactTime)
  );
  const [phStr, setPhStr] = useState<string>(String(userSettings.defaultPh));
  const [formError, setFormError] = useState<string | null>(null);

  const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    setSelectedTreatment(userSettings.defaultTreatmentType);
    setDoseStr(String(userSettings.defaultDose));
    setTimeStr(String(userSettings.defaultContactTime));
    setPhStr(String(userSettings.defaultPh));
  }, [
    userSettings.defaultTreatmentType,
    userSettings.defaultDose,
    userSettings.defaultContactTime,
    userSettings.defaultPh,
  ]);

  const currentSpec =
    POLLUTANT_SPECS.find((p) => p.id === selectedPollutantId) ??
    POLLUTANT_SPECS[0];

  const resolveDisplayUnit = (specId: string, baseUnit: string): string => {
    if (specId === 'turbidity') return userSettings.turbidityUnit;
    if (baseUnit === 'mg/L') return userSettings.concentrationUnit;
    return baseUnit;
  };

  const activeUnit = resolveDisplayUnit(currentSpec.id, currentSpec.unit);

  const handlePollutantChange = (pollutantId: string) => {
    setSelectedPollutantId(pollutantId);
    const spec = POLLUTANT_SPECS.find((p) => p.id === pollutantId);
    if (spec) {
      setCiR1(String(spec.defaultCiReplicates[0]));
      setCiR2(String(spec.defaultCiReplicates[1]));
      setCiR3(String(spec.defaultCiReplicates[2]));
      setCfR1(String(spec.defaultCfReplicates[0]));
      setCfR2(String(spec.defaultCfReplicates[1]));
      setCfR3(String(spec.defaultCfReplicates[2]));
      setFormError(null);
    }
  };

  const ciReps: [number, number, number] = [
    Number(ciR1) || 0,
    Number(ciR2) || 0,
    Number(ciR3) || 0,
  ];
  const cfReps: [number, number, number] = [
    Number(cfR1) || 0,
    Number(cfR2) || 0,
    Number(cfR3) || 0,
  ];

  const liveBiostats = computeTriplicateBiostats(ciReps, cfReps);
  const doseNum = Number(doseStr);
  const liveQe = calculateAdsorptionCapacityQe(
    liveBiostats.ciMean,
    liveBiostats.cfMean,
    doseNum
  );
  const liveGrade = evaluateEfficiencyGrade(liveBiostats.efficiency);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      ciReps.some((v) => !Number.isFinite(v) || v <= 0) ||
      cfReps.some((v) => !Number.isFinite(v) || v < 0)
    ) {
      setFormError(
        'يرجى إدخال قراءات رقمية صحيحة للمكررات الثلاثة (R1, R2, R3) بحيث تكون القراءات قبل المعالجة أكبر من صفر.'
      );
      return;
    }
    if (liveBiostats.cfMean > liveBiostats.ciMean) {
      setFormError(
        'المتوسط الحسابي بعد المعالجة (Cf Mean) يجب أن يكون أقل من أو مساوياً للمتوسط قبل المعالجة (Ci Mean).'
      );
      return;
    }
    const timeNum = Number(timeStr);
    const phNum = Number(phStr);
    if (
      !Number.isFinite(doseNum) ||
      doseNum <= 0 ||
      !Number.isFinite(timeNum) ||
      timeNum <= 0
    ) {
      setFormError('يرجى إدخال جرعة معالجة ووقت تماس موجبين.');
      return;
    }

    setFormError(null);
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(
      now.getHours()
    ).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newRec: ExperimentRecord = {
      id: `exp-${Date.now()}`,
      pollutantId: currentSpec.id,
      pollutantName: currentSpec.name,
      unit: activeUnit,
      ciReplicates: ciReps,
      cfReplicates: cfReps,
      ci: liveBiostats.ciMean,
      ciSd: liveBiostats.ciSd,
      cf: liveBiostats.cfMean,
      cfSd: liveBiostats.cfSd,
      efficiency: liveBiostats.efficiency,
      tStat: liveBiostats.tStat,
      pValue: liveBiostats.pValue,
      isSignificant: liveBiostats.isSignificant,
      adsorptionCapacityQe: liveQe,
      treatmentType: selectedTreatment,
      doseMgL: doseNum,
      contactTimeMin: timeNum,
      ph: Number.isFinite(phNum) ? phNum : 7.0,
      standardLimit: currentSpec.standardLimit,
      isCompliant: liveBiostats.cfMean <= currentSpec.standardLimit,
      timestamp,
    };

    onAddRecord(newRec);
  };

  const handleExportCSV = () => {
    const headers = [
      'المؤشر البيئي',
      'الوحدة',
      'المتوسط قبل المعالجة (Ci ± SD)',
      'المتوسط بعد المعالجة (Cf ± SD)',
      'كفاءة الإزالة (%)',
      'اختبار المعنوية (t / P-value)',
      'سعة الامتزاز (qe mg/g)',
      'نوع المعالجة',
      'الجرعة',
      'وقت التماس (min)',
      'pH',
    ];
    const rows = records.map((r) => [
      `"${r.pollutantName}"`,
      r.unit,
      `"${r.ci} ± ${r.ciSd}"`,
      `"${r.cf} ± ${r.cfSd}"`,
      r.efficiency,
      `"t=${r.tStat}, P=${r.pValue}"`,
      r.adsorptionCapacityQe,
      `"${r.treatmentType}"`,
      r.doseMgL,
      r.contactTimeMin,
      r.ph,
    ]);
    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'EcoBio_AI_Biostatistics_Results.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!chartCanvasRef.current) return;
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const labels = records.map(
      (r) =>
        POLLUTANT_SPECS.find((p) => p.id === r.pollutantId)?.shortName ??
        r.pollutantName
    );
    const ciData = records.map((r) => r.ci);
    const cfData = records.map((r) => r.cf);
    const effData = records.map((r) => r.efficiency);

    const textColor = darkMode ? '#cbd5e1' : '#334155';
    const gridColor = darkMode
      ? 'rgba(148, 163, 184, 0.14)'
      : 'rgba(15, 23, 42, 0.08)';

    chartInstanceRef.current = new Chart(chartCanvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'line',
            label: 'منحنى كفاءة الإزالة المئوية (%)',
            data: effData,
            borderColor: '#10b981',
            backgroundColor: '#10b981',
            borderWidth: 3,
            pointRadius: 5,
            pointBackgroundColor: '#059669',
            yAxisID: 'yEfficiency',
            tension: 0.3,
          },
          {
            type: 'bar',
            label: 'متوسط التركيز قبل المعالجة (Ci Mean)',
            data: ciData,
            backgroundColor: 'rgba(245, 158, 11, 0.78)',
            borderColor: '#d97706',
            borderWidth: 1,
            borderRadius: 6,
            yAxisID: 'yConc',
          },
          {
            type: 'bar',
            label: 'متوسط التركيز بعد المعالجة (Cf Mean)',
            data: cfData,
            backgroundColor: 'rgba(6, 182, 212, 0.85)',
            borderColor: '#0891b2',
            borderWidth: 1,
            borderRadius: 6,
            yAxisID: 'yConc',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            labels: {
              color: textColor,
              font: { family: 'Cairo', size: 12, weight: 'bold' },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: textColor, font: { family: 'Cairo', size: 11 } },
            grid: { color: gridColor },
          },
          yConc: {
            type: 'linear',
            position: 'right',
            title: {
              display: true,
              text: 'متوسط التركيز (Ci / Cf)',
              color: textColor,
              font: { family: 'Cairo', size: 12, weight: 'bold' },
            },
            ticks: { color: textColor },
            grid: { color: gridColor },
          },
          yEfficiency: {
            type: 'linear',
            position: 'left',
            min: 0,
            max: 100,
            title: {
              display: true,
              text: 'كفاءة الإزالة (%)',
              color: '#10b981',
              font: { family: 'Cairo', size: 12, weight: 'bold' },
            },
            ticks: {
              color: '#10b981',
              callback: (val) => `${val}%`,
            },
            grid: { drawOnChartArea: false },
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [records, darkMode]);

  const inputClass = `w-full rounded-lg border px-2.5 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
    darkMode
      ? 'bg-slate-950 border-slate-700 text-slate-100'
      : 'bg-slate-50 border-slate-300 text-slate-900'
  }`;

  return (
    <div className="space-y-8">
      {/* Top 12-Col Bento Grid: Form (5 cols) + Dual-Axis Chart (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Input Form Card with Triplicate Replicates (R1, R2, R3) & ANOVA/t-test */}
        <div
          className={`lg:col-span-5 rounded-xl border p-6 flex flex-col justify-between ${
            darkMode
              ? 'bg-slate-900 border-slate-800'
              : 'bg-white border-slate-200'
          }`}
        >
          <div>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>
                    حاسبة كفاءة المعالجة ومختبر الإحصاء الحيوي (R1, R2, R3)
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  حساب تلقائي للمتوسط (Mean)، الانحراف المعياري (±SD)، واختبار
                  المعنوية (ANOVA / t-test عند P ≤ 0.05)
                </p>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                {activeUnit}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label
                  htmlFor="pollutant-select"
                  className="block text-xs font-semibold mb-1"
                >
                  نوع الملوث أو المؤشر البيئي
                </label>
                <select
                  id="pollutant-select"
                  value={selectedPollutantId}
                  onChange={(e) => handlePollutantChange(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    darkMode
                      ? 'bg-slate-950 border-slate-700 text-slate-100'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  {POLLUTANT_SPECS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — الحد القياسي: {p.standardLimit}{' '}
                      {resolveDisplayUnit(p.id, p.unit)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Triplicate Replicates Before Treatment (Ci: R1, R2, R3) */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    قراءات المكررات قبل المعالجة Ci ({activeUnit}):
                  </span>
                  <span
                    className="font-mono font-bold"
                    data-testid="live-ci-mean-sd"
                  >
                    Mean: {liveBiostats.ciMean} ± {liveBiostats.ciSd}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label
                      htmlFor="ci-r1"
                      className="block text-[11px] text-slate-400 mb-0.5"
                    >
                      مكرر R1 (Ci)
                    </label>
                    <input
                      id="ci-r1"
                      type="number"
                      step="any"
                      value={ciR1}
                      onChange={(e) => setCiR1(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="ci-r2"
                      className="block text-[11px] text-slate-400 mb-0.5"
                    >
                      مكرر R2 (Ci)
                    </label>
                    <input
                      id="ci-r2"
                      type="number"
                      step="any"
                      value={ciR2}
                      onChange={(e) => setCiR2(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="ci-r3"
                      className="block text-[11px] text-slate-400 mb-0.5"
                    >
                      مكرر R3 (Ci)
                    </label>
                    <input
                      id="ci-r3"
                      type="number"
                      step="any"
                      value={ciR3}
                      onChange={(e) => setCiR3(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {/* Triplicate Replicates After Treatment (Cf: R1, R2, R3) */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">
                    قراءات المكررات بعد المعالجة Cf ({activeUnit}):
                  </span>
                  <span
                    className="font-mono font-bold"
                    data-testid="live-cf-mean-sd"
                  >
                    Mean: {liveBiostats.cfMean} ± {liveBiostats.cfSd}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label
                      htmlFor="cf-r1"
                      className="block text-[11px] text-slate-400 mb-0.5"
                    >
                      مكرر R1 (Cf)
                    </label>
                    <input
                      id="cf-r1"
                      type="number"
                      step="any"
                      value={cfR1}
                      onChange={(e) => setCfR1(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="cf-r2"
                      className="block text-[11px] text-slate-400 mb-0.5"
                    >
                      مكرر R2 (Cf)
                    </label>
                    <input
                      id="cf-r2"
                      type="number"
                      step="any"
                      value={cfR2}
                      onChange={(e) => setCfR2(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="cf-r3"
                      className="block text-[11px] text-slate-400 mb-0.5"
                    >
                      مكرر R3 (Cf)
                    </label>
                    <input
                      id="cf-r3"
                      type="number"
                      step="any"
                      value={cfR3}
                      onChange={(e) => setCfR3(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="treatment-select"
                  className="block text-xs font-semibold mb-1"
                >
                  نوع المعالجة الحيوية أو الكيميائية المستخدمة
                </label>
                <select
                  id="treatment-select"
                  value={selectedTreatment}
                  onChange={(e) => setSelectedTreatment(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    darkMode
                      ? 'bg-slate-950 border-slate-700 text-slate-100'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  {TREATMENT_TYPES.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label
                    htmlFor="dose-input"
                    className="block text-xs font-semibold mb-1"
                  >
                    الجرعة ({userSettings.concentrationUnit})
                  </label>
                  <input
                    id="dose-input"
                    type="number"
                    step="any"
                    value={doseStr}
                    onChange={(e) => setDoseStr(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor="time-input"
                    className="block text-xs font-semibold mb-1"
                  >
                    وقت التماس (دقيقة)
                  </label>
                  <input
                    id="time-input"
                    type="number"
                    step="any"
                    value={timeStr}
                    onChange={(e) => setTimeStr(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor="ph-input"
                    className="block text-xs font-semibold mb-1"
                  >
                    الأس الهيدروجيني pH
                  </label>
                  <input
                    id="ph-input"
                    type="number"
                    step="0.1"
                    min="1"
                    max="14"
                    value={phStr}
                    onChange={(e) => setPhStr(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs"
                >
                  {formError}
                </div>
              )}

              {/* Live Biostatistics & Removal Efficiency Preview Box */}
              <div
                className={`p-3.5 rounded-xl border space-y-2 ${
                  darkMode
                    ? 'bg-emerald-950/30 border-emerald-800/60'
                    : 'bg-emerald-50/70 border-emerald-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">
                      نسبة كفاءة الإزالة المئوية (RE%)
                    </span>
                    <span
                      className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400"
                      data-testid="live-efficiency-output"
                    >
                      {liveBiostats.efficiency}%
                    </span>
                  </div>
                  <div className="text-left">
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">
                      سعة الامتزاز الحيوي (qe)
                    </span>
                    <span className="text-sm font-bold font-mono">
                      {liveQe} mg/g
                    </span>
                  </div>
                </div>

                {/* ANOVA / t-test Statistical Significance Indicator */}
                <div className="pt-2 border-t border-emerald-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div
                    className="flex items-center gap-1.5 font-bold"
                    data-testid="live-significance-badge"
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full inline-block ${
                        liveBiostats.isSignificant
                          ? 'bg-emerald-500'
                          : 'bg-amber-500'
                      }`}
                    />
                    <span
                      className={
                        liveBiostats.isSignificant
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-amber-700 dark:text-amber-300'
                      }
                    >
                      {liveBiostats.significanceBadge}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    t = {liveBiostats.tStat} · F = {liveBiostats.fStat} · P ={' '}
                    {liveBiostats.pValue} · {liveGrade.label}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>إضافة القراءة الإحصائية (R1–R3) إلى جدول النتائج</span>
              </button>
            </form>
          </div>
        </div>

        {/* Dual-Axis Chart.js Card (7 cols) */}
        <div
          className={`lg:col-span-7 rounded-xl border p-6 flex flex-col justify-between ${
            darkMode
              ? 'bg-slate-900 border-slate-800'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-600 shrink-0" />
                <span>
                  المخطط المقارن للتراكيز (Ci vs Cf Mean) ومنحنى كفاءة الإزالة
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                تمثيل بياني تفاعلي (Chart.js) للمتوسطات الحسابية للمكررات الثلاثة
                ونسب الإزالة
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              إجمالي التجارب: {records.length} (n = 3 replicates)
            </span>
          </div>

          <div className="relative h-[380px] w-full">
            <canvas
              ref={chartCanvasRef}
              aria-label="الرسم البياني لكفاءة إزالة الملوثات"
            />
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
            <span>
              المعادلة القياسية: RE(%) = ((Ci Mean - Cf Mean) / Ci Mean) × 100
            </span>
            <span>مستوى الدلالة المعتمد: Alpha = 0.05 (ANOVA / t-test)</span>
          </div>
        </div>
      </div>

      {/* Dynamic Biostatistics & Experimental Results Table */}
      <div
        className={`rounded-xl border p-6 ${
          darkMode
            ? 'bg-slate-900 border-slate-800'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold">
              سجل القراءات المختبرية والتحليل الإحصائي الحيوي (Triplicate Mean ±
              SD &amp; Significance)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              يتضمن المتوسط الحسابي والانحراف المعياري للمكررات الثلاثة (R1, R2,
              R3)، كفاءة الإزالة، سعة الامتزاز (qe)، واختبار المعنوية (P ≤ 0.05)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير الجدول الإحصائي (CSV)</span>
            </button>
            <button
              type="button"
              onClick={onResetRecords}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة القراءات المرجعية</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table
            className="w-full text-right border-collapse text-xs"
            data-testid="experiments-table"
          >
            <thead>
              <tr
                className={`border-b ${
                  darkMode
                    ? 'border-slate-800 text-slate-400 bg-slate-950/50'
                    : 'border-slate-200 text-slate-600 bg-slate-50'
                }`}
              >
                <th className="py-3 px-3 font-semibold">المؤشر البيئي</th>
                <th className="py-3 px-3 font-semibold">
                  قبل المعالجة (Ci ± SD)
                </th>
                <th className="py-3 px-3 font-semibold">
                  بعد المعالجة (Cf ± SD)
                </th>
                <th className="py-3 px-3 font-semibold">كفاءة الإزالة (%)</th>
                <th className="py-3 px-3 font-semibold">
                  المعنوية الإحصائية (t-test / ANOVA)
                </th>
                <th className="py-3 px-3 font-semibold">سعة الامتزاز (qe)</th>
                <th className="py-3 px-3 font-semibold">نوع المعالجة والجرعة</th>
                <th className="py-3 px-3 font-semibold">المطابقة</th>
                <th className="py-3 px-3 font-semibold text-center">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono tabular-nums">
              {records.map((rec) => (
                <tr
                  key={rec.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 px-3 font-sans font-bold">
                    {rec.pollutantName}
                  </td>
                  <td className="py-3 px-3 text-amber-600 dark:text-amber-400">
                    {rec.ci} ± {rec.ciSd}{' '}
                    <span className="text-[11px] text-slate-400">
                      {rec.unit}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-cyan-600 dark:text-cyan-400 font-semibold">
                    {rec.cf} ± {rec.cfSd}{' '}
                    <span className="text-[11px] text-slate-400">
                      {rec.unit}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {rec.efficiency}%
                    </span>
                  </td>
                  <td className="py-3 px-3 font-sans">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full inline-block ${
                          rec.isSignificant ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {rec.isSignificant
                          ? 'فرق معنوي (P ≤ 0.05)'
                          : 'غير معنوي'}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        (t={rec.tStat})
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3">{rec.adsorptionCapacityQe} mg/g</td>
                  <td className="py-3 px-3 font-sans">
                    <div>{rec.treatmentType}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {rec.doseMgL} mg/L · {rec.contactTimeMin} min · pH{' '}
                      {rec.ph}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-sans">
                    {rec.isCompliant ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>مطابق ({rec.standardLimit}≤)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>أعلى من الحد ({rec.standardLimit})</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onDeleteRecord(rec.id)}
                      aria-label={`حذف قراءة ${rec.pollutantName}`}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
