import React, { useEffect, useRef } from 'react';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Sliders, Target, CheckCircle, Activity } from 'lucide-react';
import {
  TREATMENT_TYPES,
  SimulationResult,
} from '../utils/bioremediationLogic';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  Legend
);

interface SimulatorTabProps {
  doseMgL: number;
  contactTimeMin: number;
  ph: number;
  treatmentId: string;
  onChangeDose: (v: number) => void;
  onChangeTime: (v: number) => void;
  onChangePh: (v: number) => void;
  onChangeTreatment: (id: string) => void;
  simulationResult: SimulationResult;
  darkMode: boolean;
}

export const SimulatorTab: React.FC<SimulatorTabProps> = ({
  doseMgL,
  contactTimeMin,
  ph,
  treatmentId,
  onChangeDose,
  onChangeTime,
  onChangePh,
  onChangeTreatment,
  simulationResult,
  darkMode,
}) => {
  const doseChartRef = useRef<HTMLCanvasElement | null>(null);
  const phChartRef = useRef<HTMLCanvasElement | null>(null);
  const doseChartInstance = useRef<Chart | null>(null);
  const phChartInstance = useRef<Chart | null>(null);

  const selectedTreatmentSpec =
    TREATMENT_TYPES.find((t) => t.id === treatmentId) ?? TREATMENT_TYPES[0];

  const handleApplyOptimal = () => {
    onChangeDose(simulationResult.optimalDose);
    onChangeTime(simulationResult.optimalTime);
    onChangePh(simulationResult.optimalPh);
  };

  useEffect(() => {
    if (!doseChartRef.current) return;
    if (doseChartInstance.current) {
      doseChartInstance.current.destroy();
    }
    const ctx = doseChartRef.current.getContext('2d');
    if (!ctx) return;

    const textColor = darkMode ? '#cbd5e1' : '#334155';
    const gridColor = darkMode
      ? 'rgba(148, 163, 184, 0.14)'
      : 'rgba(148, 163, 184, 0.25)';

    const labels = simulationResult.doseCurve.map((p) => `${p.x}`);
    const dataPts = simulationResult.doseCurve.map((p) => p.efficiency);
    const pointColors = simulationResult.doseCurve.map((p) =>
      Math.abs(p.x - simulationResult.optimalDose) <= 6
        ? '#f59e0b'
        : '#10b981'
    );
    const pointRadii = simulationResult.doseCurve.map((p) =>
      Math.abs(p.x - simulationResult.optimalDose) <= 6 ? 7 : 3.5
    );

    doseChartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'منحنى الاستجابة للجرعة (Dose-Response Curve %)',
            data: dataPts,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.16)',
            fill: true,
            tension: 0.38,
            pointBackgroundColor: pointColors,
            pointRadius: pointRadii,
            borderWidth: 2.5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 120 },
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
            title: {
              display: true,
              text: 'تركيز المادة المعالجة (ملغم / لتر)',
              color: textColor,
              font: { family: 'Cairo', size: 12, weight: 600 },
            },
            ticks: { color: textColor },
            grid: { color: gridColor },
          },
          y: {
            min: 0,
            max: 100,
            title: {
              display: true,
              text: 'كفاءة الإزالة المتوقعة (%)',
              color: textColor,
              font: { family: 'Cairo', size: 12, weight: 600 },
            },
            ticks: {
              color: textColor,
              callback: (v) => `${v}%`,
            },
            grid: { color: gridColor },
          },
        },
      },
    });

    return () => {
      if (doseChartInstance.current) {
        doseChartInstance.current.destroy();
      }
    };
  }, [simulationResult, darkMode]);

  useEffect(() => {
    if (!phChartRef.current) return;
    if (phChartInstance.current) {
      phChartInstance.current.destroy();
    }
    const ctx = phChartRef.current.getContext('2d');
    if (!ctx) return;

    const textColor = darkMode ? '#cbd5e1' : '#334155';
    const gridColor = darkMode
      ? 'rgba(148, 163, 184, 0.14)'
      : 'rgba(148, 163, 184, 0.25)';

    phChartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: simulationResult.phCurve.map((p) => `pH ${p.x}`),
        datasets: [
          {
            label: 'تأثير الأس الهيدروجيني (pH Optimization Curve %)',
            data: simulationResult.phCurve.map((p) => p.efficiency),
            borderColor: '#0d9488',
            backgroundColor: 'rgba(13, 148, 136, 0.16)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 120 },
        plugins: {
          legend: {
            labels: {
              color: textColor,
              font: { family: 'Cairo', size: 11, weight: 600 },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: textColor },
            grid: { color: gridColor },
          },
          y: {
            min: 0,
            max: 100,
            ticks: {
              color: textColor,
              callback: (v) => `${v}%`,
            },
            grid: { color: gridColor },
          },
        },
      },
    });

    return () => {
      if (phChartInstance.current) {
        phChartInstance.current.destroy();
      }
    };
  }, [simulationResult, darkMode]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Sliders Control Column (5 cols) */}
        <div
          className={`lg:col-span-5 rounded-xl border p-6 flex flex-col justify-between ${
            darkMode
              ? 'bg-slate-900 border-slate-800'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="space-y-5">
            <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>المحاكي التنبؤي للجرعة المثالية (Optimization)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                نمذجة رياضية لحركيات الامتزاز الحيوي وتحديد نقطة الكفاءة القصوى
                (Optimal Point)
              </p>
            </div>

            <div>
              <label
                htmlFor="sim-treatment-select"
                className="block text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300"
              >
                المادة المعالجة الحيوية قيد النمذجة
              </label>
              <select
                id="sim-treatment-select"
                value={treatmentId}
                onChange={(e) => onChangeTreatment(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  darkMode
                    ? 'bg-slate-950 border-slate-700 text-slate-100'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                {TREATMENT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                الآلية السائدة: {selectedTreatmentSpec.mechanism}
              </p>
            </div>

            {/* Slider 1: Dose */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <label htmlFor="slider-dose">
                  1. تركيز المادة المعالجة (ملغم / لتر)
                </label>
                <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400 text-sm">
                  {doseMgL} mg/L
                </span>
              </div>
              <input
                id="slider-dose"
                type="range"
                min={10}
                max={200}
                step={5}
                value={doseMgL}
                onChange={(e) => onChangeDose(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>10 mg/L</span>
                <span>المثالي: {simulationResult.optimalDose} mg/L</span>
                <span>200 mg/L</span>
              </div>
            </div>

            {/* Slider 2: Contact Time */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <label htmlFor="slider-time">2. وقت التماس والخلط (دقيقة)</label>
                <span className="font-mono tabular-nums text-teal-600 dark:text-teal-400 text-sm">
                  {contactTimeMin} min
                </span>
              </div>
              <input
                id="slider-time"
                type="range"
                min={5}
                max={120}
                step={5}
                value={contactTimeMin}
                onChange={(e) => onChangeTime(Number(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>5 min</span>
                <span>المثالي: {simulationResult.optimalTime} min</span>
                <span>120 min</span>
              </div>
            </div>

            {/* Slider 3: pH */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <label htmlFor="slider-ph">
                  3. الأس الهيدروجيني للوسط (pH 1 - 14)
                </label>
                <span className="font-mono tabular-nums text-amber-600 dark:text-amber-400 text-sm">
                  pH {ph.toFixed(1)}
                </span>
              </div>
              <input
                id="slider-ph"
                type="range"
                min={1}
                max={14}
                step={0.2}
                value={ph}
                onChange={(e) => onChangePh(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>حامضي (1.0)</span>
                <span>المثالي: pH {simulationResult.optimalPh}</span>
                <span>قاعدي (14.0)</span>
              </div>
            </div>
          </div>

          {/* Predicted Output & Optimal Point Trigger */}
          <div className="mt-6 space-y-3">
            <div
              className={`rounded-lg border p-4 ${
                darkMode
                  ? 'bg-slate-950 border-slate-800'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">
                    الكفاءة عند الإعداد الحالي
                  </span>
                  <span
                    className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400"
                    data-testid="sim-current-efficiency"
                  >
                    {simulationResult.currentEfficiency.toFixed(2)}%
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">
                    نقطة الكفاءة القصوى (Optimal)
                  </span>
                  <span className="text-2xl font-bold font-mono tabular-nums text-amber-500">
                    {simulationResult.maxPredictedEfficiency.toFixed(2)}%
                  </span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs font-mono text-slate-500">
                <span>Qmax: {simulationResult.langmuirQmax} mg/g</span>
                <span>·</span>
                <span>Kf: {simulationResult.freundlichKf}</span>
                <span>·</span>
                <span>k₂: {simulationResult.pseudoSecondOrderK2}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleApplyOptimal}
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Target className="w-4 h-4 shrink-0" />
              <span>
                الانتقال التلقائي لنقطة الكفاءة القصوى (Optimal Point)
              </span>
            </button>
          </div>
        </div>

        {/* Real-Time Optimization Curves (7 cols) */}
        <div
          className={`lg:col-span-7 rounded-xl border p-6 flex flex-col justify-between space-y-6 ${
            darkMode
              ? 'bg-slate-900 border-slate-800'
              : 'bg-white border-slate-200'
          }`}
        >
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span>
                    منحنى التنبؤ اللحظي لكفاءة الإزالة مقابل الجرعة (Real-Time
                    Optimization)
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  النقطة البرتقالية تمثل نقطة الكفاءة القصوى ({simulationResult.optimalDose}{' '}
                  ملغم/لتر) قبل حدوث ظاهرة إعادة الاستقرار الغروي
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Optimal: {simulationResult.optimalDose} mg/L</span>
              </span>
            </div>

            <div className="h-56 w-full">
              <canvas ref={doseChartRef} />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold">
                منحنى حساسية الأس الهيدروجيني (pH Surface Charge Window)
              </h4>
              <span className="text-xs font-mono text-teal-600 dark:text-teal-400">
                Optimal pH = {simulationResult.optimalPh}
              </span>
            </div>
            <div className="h-44 w-full">
              <canvas ref={phChartRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
