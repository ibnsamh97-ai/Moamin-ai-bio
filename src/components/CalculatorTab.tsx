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
  Beaker,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  ExperimentRecord,
  POLLUTANT_SPECS,
  TREATMENT_TYPES,
  calculateRemovalEfficiency,
  calculateAdsorptionCapacityQe,
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
  const [selectedPollutantId, setSelectedPollutantId] = useState<string>(
    POLLUTANT_SPECS[0].id
  );
  const [ciInput, setCiInput] = useState<string>('145');
  const [cfInput, setCfInput] = useState<string>('6.8');
  const [treatmentType, setTreatmentType] = useState<string>(
    userSettings.defaultTreatmentType
  );
  const [doseInput, setDoseInput] = useState<string>(
    String(userSettings.defaultDose)
  );
  const [timeInput, setTimeInput] = useState<string>(
    String(userSettings.defaultContactTime)
  );
  const [phInput, setPhInput] = useState<string>(
    String(userSettings.defaultPh)
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  // Sync default fields when user updates settings
  useEffect(() => {
    setTreatmentType(userSettings.defaultTreatmentType);
    setDoseInput(String(userSettings.defaultDose));
    setTimeInput(String(userSettings.defaultContactTime));
    setPhInput(String(userSettings.defaultPh));
  }, [
    userSettings.defaultTreatmentType,
    userSettings.defaultDose,
    userSettings.defaultContactTime,
    userSettings.defaultPh,
  ]);

  const currentSpec =
    POLLUTANT_SPECS.find((p) => p.id === selectedPollutantId) ??
    POLLUTANT_SPECS[0];

  // Resolve unit label based on userSettings
  const activePollutantUnit =
    currentSpec.id === 'turbidity'
      ? userSettings.turbidityUnit
      : currentSpec.unit === 'mg/L'
      ? userSettings.concentrationUnit
      : currentSpec.unit;

  const formatRecordUnit = (rec: ExperimentRecord) => {
    if (rec.pollutantId === 'turbidity') return userSettings.turbidityUnit;
    if (rec.unit === 'mg/L') return userSettings.concentrationUnit;
    return rec.unit;
  };

  const handlePollutantChange = (newId: string) => {
    setSelectedPollutantId(newId);
    const spec = POLLUTANT_SPECS.find((p) => p.id === newId);
    if (spec) {
      setCiInput(String(spec.defaultCi));
      setCfInput(String(spec.defaultCf));
      setValidationError(null);
    }
  };

  const numericCi = parseFloat(ciInput);
  const numericCf = parseFloat(cfInput);
  const numericDose = parseFloat(doseInput);
  const liveEfficiency = calculateRemovalEfficiency(numericCi, numericCf);
  const liveQe = calculateAdsorptionCapacityQe(
    numericCi,
    numericCf,
    numericDose
  );
  const liveGrade = evaluateEfficiencyGrade(liveEfficiency);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      Number.isNaN(numericCi) ||
      numericCi <= 0 ||
      Number.isNaN(numericCf) ||
      numericCf < 0
    ) {
      setValidationError(
        'يرجى إدخال قراءات رقمية صحيحة أكبر من الصفر للتركيز الأولي (Ci) والتركيز النهائي (Cf).'
      );
      return;
    }
    if (numericCf > numericCi) {
      setValidationError(
        'القراءة بعد المعالجة (Cf) يجب أن تكون أقل من أو مساوية للقراءة قبل المعالجة (Ci).'
      );
      return;
    }
    setValidationError(null);

    const now = new Date();
    const formattedTime = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(
      now.getHours()
    ).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newRecord: ExperimentRecord = {
      id: `exp-${Date.now()}`,
      pollutantId: currentSpec.id,
      pollutantName: currentSpec.name,
      unit: activePollutantUnit,
      ci: numericCi,
      cf: numericCf,
      efficiency: liveEfficiency,
      adsorptionCapacityQe: liveQe,
      treatmentType,
      doseMgL: Number.isNaN(numericDose)
        ? userSettings.defaultDose
        : numericDose,
      contactTimeMin: Number.isNaN(parseFloat(timeInput))
        ? userSettings.defaultContactTime
        : parseFloat(timeInput),
      ph: Number.isNaN(parseFloat(phInput))
        ? userSettings.defaultPh
        : parseFloat(phInput),
      standardLimit: currentSpec.standardLimit,
      isCompliant: numericCf <= currentSpec.standardLimit,
      timestamp: formattedTime,
    };

    onAddRecord(newRecord);
  };

  const handleExportCSV = () => {
    const headers = [
      'المؤشر البيئي',
      'الوحدة',
      'التركيز قبل المعالجة Ci',
      'التركيز بعد المعالجة Cf',
      'كفاءة الإزالة %',
      'سعة الامتزاز qe (mg/g)',
      'نوع المعالجة الحيوية',
      `الجرعة (${userSettings.concentrationUnit})`,
      'وقت التماس (min)',
      'pH',
      'المطابقة القياسية',
    ];
    const rows = records.map((r) => [
      `"${r.pollutantName}"`,
      formatRecordUnit(r),
      r.ci,
      r.cf,
      r.efficiency,
      r.adsorptionCapacityQe,
      `"${r.treatmentType}"`,
      r.doseMgL,
      r.contactTimeMin,
      r.ph,
      r.isCompliant ? 'مطابق' : 'أعلى من الحد',
    ]);
    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'EcoBio_AI_Results_Moamen_Khalaf.csv');
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

    const ctx = chartCanvasRef.current.getContext('2d');
    if (!ctx) return;

    const textColor = darkMode ? '#cbd5e1' : '#334155';
    const gridColor = darkMode
      ? 'rgba(148, 163, 184, 0.14)'
      : 'rgba(148, 163, 184, 0.25)';

    const labels = records.map((r) => r.pollutantName.split(' (')[0]);
    const ciValues = records.map((r) => r.ci);
    const cfValues = records.map((r) => r.cf);
    const effValues = records.map((r) => r.efficiency);

    chartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: `التركيز قبل المعالجة (Ci) [${userSettings.concentrationUnit}]`,
            data: ciValues,
            backgroundColor: 'rgba(245, 158, 11, 0.75)',
            borderColor: '#d97706',
            borderWidth: 1,
            borderRadius: 6,
            yAxisID: 'y',
          },
          {
            type: 'bar',
            label: `التركيز بعد المعالجة (Cf) [${userSettings.concentrationUnit}]`,
            data: cfValues,
            backgroundColor: 'rgba(13, 148, 136, 0.82)',
            borderColor: '#0d9488',
            borderWidth: 1,
            borderRadius: 6,
            yAxisID: 'y',
          },
          {
            type: 'line',
            label: 'منحنى كفاءة الإزالة (%)',
            data: effValues,
            borderColor: '#10b981',
            backgroundColor: '#10b981',
            borderWidth: 2.5,
            pointRadius: 4,
            pointBackgroundColor: '#059669',
            tension: 0.3,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 200,
        },
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            labels: {
              color: textColor,
              font: { family: 'Cairo', size: 12, weight: 600 },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: textColor,
              font: { family: 'Cairo', size: 11 },
            },
            grid: { color: gridColor },
          },
          y: {
            type: 'linear',
            position: 'right',
            title: {
              display: true,
              text: `التركيز (${userSettings.concentrationUnit} / ${userSettings.turbidityUnit})`,
              color: textColor,
              font: { family: 'Cairo', size: 12, weight: 600 },
            },
            ticks: { color: textColor },
            grid: { color: gridColor },
          },
          y1: {
            type: 'linear',
            position: 'left',
            min: 0,
            max: 100,
            title: {
              display: true,
              text: 'كفاءة الإزالة (%)',
              color: '#10b981',
              font: { family: 'Cairo', size: 12, weight: 600 },
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
  }, [records, darkMode, userSettings.concentrationUnit, userSettings.turbidityUnit]);

  return (
    <div className="space-y-8">
      {/* Top Split: Calculator Form & Live Formula Readout + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Form Panel (5 cols) */}
        <div
          className={`lg:col-span-5 rounded-xl border p-6 transition-colors ${
            darkMode
              ? 'bg-slate-900 border-slate-800'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>حاسبة كفاءة الإزالة والمؤشرات البيئية</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                إدخال القراءات المختبرية قبل وبعد المعالجة الحيوية
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
              {userSettings.preferredStandard} · {userSettings.concentrationUnit}
            </span>
          </div>

          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="pollutant-select"
                className="block text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300"
              >
                نوع الملوث أو المؤشر البيئي
              </label>
              <select
                id="pollutant-select"
                value={selectedPollutantId}
                onChange={(e) => handlePollutantChange(e.target.value)}
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  darkMode
                    ? 'bg-slate-950 border-slate-700 text-slate-100'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                {POLLUTANT_SPECS.map((spec) => (
                  <option key={spec.id} value={spec.id}>
                    {spec.name} — [
                    {spec.id === 'turbidity'
                      ? userSettings.turbidityUnit
                      : spec.unit === 'mg/L'
                      ? userSettings.concentrationUnit
                      : spec.unit}
                    ]
                  </option>
                ))}
              </select>
              <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>وحدة القياس: {activePollutantUnit}</span>
                <span aria-hidden="true">·</span>
                <span>
                  الحد القياسي المسموح: {currentSpec.standardLimit}{' '}
                  {activePollutantUnit} ({userSettings.preferredStandard})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="ci-input"
                  className="block text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300"
                >
                  القراءة قبل المعالجة (Ci) [{activePollutantUnit}]
                </label>
                <input
                  id="ci-input"
                  type="number"
                  step="any"
                  value={ciInput}
                  onChange={(e) => setCiInput(e.target.value)}
                  className={`w-full rounded-lg border px-3.5 py-2 text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    darkMode
                      ? 'bg-slate-950 border-slate-700 text-slate-100'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="cf-input"
                  className="block text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300"
                >
                  القراءة بعد المعالجة (Cf) [{activePollutantUnit}]
                </label>
                <input
                  id="cf-input"
                  type="number"
                  step="any"
                  value={cfInput}
                  onChange={(e) => setCfInput(e.target.value)}
                  className={`w-full rounded-lg border px-3.5 py-2 text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    darkMode
                      ? 'bg-slate-950 border-slate-700 text-slate-100'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="treatment-select"
                className="block text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300"
              >
                نوع المعالجة الحيوية / الكيميائية المستخدمة
              </label>
              <select
                id="treatment-select"
                value={treatmentType}
                onChange={(e) => setTreatmentType(e.target.value)}
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
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

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="dose-input"
                  className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300"
                >
                  الجرعة ({userSettings.concentrationUnit})
                </label>
                <input
                  id="dose-input"
                  type="number"
                  step="any"
                  value={doseInput}
                  onChange={(e) => setDoseInput(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    darkMode
                      ? 'bg-slate-950 border-slate-700 text-slate-100'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label
                  htmlFor="time-input"
                  className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300"
                >
                  وقت التماس (دقيقة)
                </label>
                <input
                  id="time-input"
                  type="number"
                  step="any"
                  value={timeInput}
                  onChange={(e) => setTimeInput(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    darkMode
                      ? 'bg-slate-950 border-slate-700 text-slate-100'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label
                  htmlFor="ph-input"
                  className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300"
                >
                  الدالة الحامضية (pH)
                </label>
                <input
                  id="ph-input"
                  type="number"
                  step="0.1"
                  min="1"
                  max="14"
                  value={phInput}
                  onChange={(e) => setPhInput(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    darkMode
                      ? 'bg-slate-950 border-slate-700 text-slate-100'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            {/* Live Mathematical Output Display */}
            <div
              className={`rounded-lg border p-4 ${
                darkMode
                  ? 'bg-slate-950/90 border-slate-800'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                <span>المعادلة المعتمدة: RE(%) = ((Ci - Cf) / Ci) × 100</span>
                <span className="font-mono">qe = (Ci - Cf) × V / m</span>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">
                    نسبة كفاءة الإزالة المئوية
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                      {liveEfficiency.toFixed(2)}
                    </span>
                    <span className="text-xs font-mono text-slate-400">%</span>
                  </div>
                  <span className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 block">
                    {liveGrade.label}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">
                    سعة الامتزاز الحيوي (qe)
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-2xl font-bold font-mono tabular-nums text-teal-600 dark:text-teal-400">
                      {liveQe.toFixed(1)}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      mg/g
                    </span>
                  </div>
                  <span className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 block">
                    {numericCf <= currentSpec.standardLimit
                      ? `● مطابق لـ ${userSettings.preferredStandard}`
                      : `▲ أعلى من حد ${userSettings.preferredStandard}`}
                  </span>
                </div>
              </div>
            </div>

            {validationError && (
              <p
                role="alert"
                className="text-xs text-rose-600 dark:text-rose-400 font-medium"
              >
                {validationError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>إضافة القراءة إلى الجدول وتحديث الرسم البياني</span>
            </button>
          </form>
        </div>

        {/* Chart.js Panel (7 cols) */}
        <div
          className={`lg:col-span-7 rounded-xl border p-6 flex flex-col justify-between transition-colors ${
            darkMode
              ? 'bg-slate-900 border-slate-800'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Beaker className="w-5 h-5 text-teal-600 shrink-0" />
                <span>
                  المخطط المقارن للتراكيز ومنحنى كفاءة الإزالة (Chart.js)
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                مقارنة القراءات قبل المعالجة (Ci) وبعدها (Cf) مع النسبة المئوية
                لكفاءة الإزالة
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
              <span>إجمالي التجارب: {records.length}</span>
              <span aria-hidden="true">·</span>
              <span>
                متوسط الكفاءة:{' '}
                {records.length > 0
                  ? (
                      records.reduce((s, r) => s + r.efficiency, 0) /
                      records.length
                    ).toFixed(2)
                  : '0.00'}
                %
              </span>
            </div>
          </div>

          <div
            className="relative w-full h-80 lg:h-96 my-auto"
            data-testid="efficiency-chart-container"
          >
            <canvas ref={chartCanvasRef} />
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>
              المصدر: تجارب مختبر الدراسات الأولية - قسم علوم الحياة (الباحث:
              مؤمن خلف عبدالله)
            </span>
            <span className="font-mono">
              Standard Reference: {userSettings.preferredStandard} · Unit:{' '}
              {userSettings.concentrationUnit}
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Results Table */}
      <div
        className={`rounded-xl border p-6 transition-colors ${
          darkMode
            ? 'bg-slate-900 border-slate-800'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-base font-bold">
              سجل القراءات المختبرية ونتائج كفاءة الإزالة الديناميكي
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              تُرسل هذه البيانات تلقائياً إلى المفسر العلمي الذكي في التبويب
              الخامس لصياغة فصل النتائج والمناقشة
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>تصدير الجدول (CSV)</span>
            </button>
            <button
              type="button"
              onClick={onResetRecords}
              className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>استعادة البيانات التجريبية</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-sm">
            <thead>
              <tr
                className={`border-b text-xs ${
                  darkMode
                    ? 'border-slate-800 text-slate-400 bg-slate-950/50'
                    : 'border-slate-200 text-slate-600 bg-slate-50'
                }`}
              >
                <th className="py-3 px-3 font-semibold">المؤشر البيئي</th>
                <th className="py-3 px-3 font-semibold">قبل المعالجة (Ci)</th>
                <th className="py-3 px-3 font-semibold">بعد المعالجة (Cf)</th>
                <th className="py-3 px-3 font-semibold">كفاءة الإزالة (%)</th>
                <th className="py-3 px-3 font-semibold">سعة الامتزاز (qe)</th>
                <th className="py-3 px-3 font-semibold">المادة المعالجة</th>
                <th className="py-3 px-3 font-semibold">الظروف التشغيلية</th>
                <th className="py-3 px-3 font-semibold">المطابقة القياسية</th>
                <th className="py-3 px-3 font-semibold text-center">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {records.map((rec) => {
                const displayUnit = formatRecordUnit(rec);
                return (
                  <tr
                    key={rec.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-3 font-medium">
                      <div>{rec.pollutantName}</div>
                      <div className="text-xs text-slate-400 font-mono">
                        الحد القياسي: {rec.standardLimit} {displayUnit}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono tabular-nums text-amber-600 dark:text-amber-400 font-semibold">
                      {rec.ci} <span className="text-xs">{displayUnit}</span>
                    </td>
                    <td className="py-3 px-3 font-mono tabular-nums text-teal-600 dark:text-teal-400 font-semibold">
                      {rec.cf} <span className="text-xs">{displayUnit}</span>
                    </td>
                    <td className="py-3 px-3 font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                      {rec.efficiency.toFixed(2)}%
                    </td>
                    <td className="py-3 px-3 font-mono tabular-nums">
                      {rec.adsorptionCapacityQe}{' '}
                      <span className="text-xs text-slate-400">mg/g</span>
                    </td>
                    <td className="py-3 px-3 text-xs max-w-48">
                      {rec.treatmentType}
                    </td>
                    <td className="py-3 px-3 text-xs font-mono text-slate-500 dark:text-slate-400">
                      {rec.doseMgL} {userSettings.concentrationUnit} ·{' '}
                      {rec.contactTimeMin} د · pH {rec.ph}
                    </td>
                    <td className="py-3 px-3 text-xs">
                      {rec.isCompliant ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>مطابق ({userSettings.preferredStandard})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>يتطلب مرحلة ثانية</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => onDeleteRecord(rec.id)}
                        aria-label={`حذف قراءة ${rec.pollutantName}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {records.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="py-8 text-center text-slate-400 text-sm"
                  >
                    لا توجد قراءات مسجلة حالياً. أضف قراءة جديدة من النموذج أعلاه
                    أو اضغط &quot;استعادة البيانات التجريبية&quot;.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
