import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import {
  Eye,
  Upload,
  Sparkles,
  FlaskConical,
  Microscope,
  RefreshCw,
} from 'lucide-react';
import {
  OpticalMetrics,
  computeOpticalMetricsFromRGBA,
  calculateVisualClarityImprovement,
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

interface VisionLabTabProps {
  darkMode: boolean;
}

export const VisionLabTab: React.FC<VisionLabTabProps> = ({ darkMode }) => {
  const [sampleMode, setSampleMode] = useState<'water' | 'petri'>('water');
  const [beforeImgSrc, setBeforeImgSrc] = useState<string>('');
  const [afterImgSrc, setAfterImgSrc] = useState<string>('');
  const [beforeMetrics, setBeforeMetrics] = useState<OpticalMetrics | null>(
    null
  );
  const [afterMetrics, setAfterMetrics] = useState<OpticalMetrics | null>(null);
  const [clarityGain, setClarityGain] = useState<number>(0);

  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [aiModelUsed, setAiModelUsed] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const beforeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const afterCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const histChartRef = useRef<HTMLCanvasElement | null>(null);
  const histChartInstance = useRef<Chart | null>(null);

  /**
   * Renders realistic synthetic laboratory samples onto the Before and After canvases
   * when no user file is uploaded or when switching presets.
   */
  const renderSyntheticLabSamples = useCallback(
    (mode: 'water' | 'petri') => {
      const bCanvas = beforeCanvasRef.current;
      const aCanvas = afterCanvasRef.current;
      if (!bCanvas || !aCanvas) return;

      const width = 320;
      const height = 240;
      bCanvas.width = width;
      bCanvas.height = height;
      aCanvas.width = width;
      aCanvas.height = height;

      const bCtx = bCanvas.getContext('2d');
      const aCtx = aCanvas.getContext('2d');
      if (!bCtx || !aCtx) return;

      if (mode === 'water') {
        // BEFORE: Turbid brownish-yellow river/wastewater bottle sample
        const gradB = bCtx.createLinearGradient(0, 0, 0, height);
        gradB.addColorStop(0, '#a8894c');
        gradB.addColorStop(0.6, '#8f6f36');
        gradB.addColorStop(1, '#6b4e21');
        bCtx.fillStyle = gradB;
        bCtx.fillRect(0, 0, width, height);

        // Suspended colloidal particles (deterministic pseudo-random)
        for (let i = 0; i < 240; i++) {
          const x = (i * 73) % width;
          const y = (i * 41) % height;
          const r = 1.5 + (i % 4);
          bCtx.fillStyle =
            i % 2 === 0 ? 'rgba(65, 42, 15, 0.55)' : 'rgba(195, 160, 95, 0.45)';
          bCtx.beginPath();
          bCtx.arc(x, y, r, 0, Math.PI * 2);
          bCtx.fill();
        }

        // AFTER: Clarified water after Moringa oleifera / Biochar treatment
        const gradA = aCtx.createLinearGradient(0, 0, 0, height);
        gradA.addColorStop(0, '#eef9ff');
        gradA.addColorStop(0.7, '#d8f1fa');
        gradA.addColorStop(1, '#c2e8f5');
        aCtx.fillStyle = gradA;
        aCtx.fillRect(0, 0, width, height);

        // Very few tiny settled flocs at the very bottom
        for (let i = 0; i < 12; i++) {
          const x = 30 + ((i * 23) % (width - 60));
          const y = height - 12 + (i % 6);
          aCtx.fillStyle = 'rgba(120, 145, 155, 0.35)';
          aCtx.beginPath();
          aCtx.arc(x, y, 1.5, 0, Math.PI * 2);
          aCtx.fill();
        }
      } else {
        // PETRI DISH MODE: Bacterial colony count before vs after
        // Background agar
        bCtx.fillStyle = '#f3ebd3';
        bCtx.fillRect(0, 0, width, height);
        aCtx.fillStyle = '#f5eedc';
        aCtx.fillRect(0, 0, width, height);

        // Petri dish circle rim
        [bCtx, aCtx].forEach((ctx) => {
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(width / 2, height / 2, 98, 0, Math.PI * 2);
          ctx.stroke();
        });

        // BEFORE: 145 dense bacterial colonies inside petri dish
        for (let i = 0; i < 145; i++) {
          const angle = (i * 137.5 * Math.PI) / 180;
          const radius = Math.sqrt(i / 145) * 86;
          const x = width / 2 + Math.cos(angle) * radius;
          const y = height / 2 + Math.sin(angle) * radius;
          bCtx.fillStyle = i % 3 === 0 ? '#7c2d12' : '#9a3412';
          bCtx.beginPath();
          bCtx.arc(x, y, 2.8 + (i % 2), 0, Math.PI * 2);
          bCtx.fill();
        }

        // AFTER: Only 5 isolated colonies remaining
        const coords = [
          [140, 100],
          [185, 135],
          [125, 145],
          [165, 95],
          [155, 155],
        ];
        coords.forEach(([x, y]) => {
          aCtx.fillStyle = '#9a3412';
          aCtx.beginPath();
          aCtx.arc(x, y, 2.5, 0, Math.PI * 2);
          aCtx.fill();
        });
      }

      setBeforeImgSrc(bCanvas.toDataURL('image/png'));
      setAfterImgSrc(aCanvas.toDataURL('image/png'));

      const bData = bCtx.getImageData(0, 0, width, height);
      const aData = aCtx.getImageData(0, 0, width, height);
      const bMet = computeOpticalMetricsFromRGBA(bData.data, width, height);
      const aMet = computeOpticalMetricsFromRGBA(aData.data, width, height);
      setBeforeMetrics(bMet);
      setAfterMetrics(aMet);
      setClarityGain(calculateVisualClarityImprovement(bMet, aMet));
    },
    []
  );

  useEffect(() => {
    renderSyntheticLabSamples(sampleMode);
  }, [sampleMode, renderSyntheticLabSamples]);

  const handleImageUpload = (
    file: File,
    target: 'before' | 'after'
  ) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = String(ev.target?.result || '');
      const img = new Image();
      img.onload = () => {
        const canvas =
          target === 'before'
            ? beforeCanvasRef.current
            : afterCanvasRef.current;
        if (!canvas) return;
        const width = 320;
        const height = 240;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height);
        const metrics = computeOpticalMetricsFromRGBA(
          imgData.data,
          width,
          height
        );

        if (target === 'before') {
          setBeforeImgSrc(canvas.toDataURL('image/png'));
          setBeforeMetrics(metrics);
          if (afterMetrics) {
            setClarityGain(
              calculateVisualClarityImprovement(metrics, afterMetrics)
            );
          }
        } else {
          setAfterImgSrc(canvas.toDataURL('image/png'));
          setAfterMetrics(metrics);
          if (beforeMetrics) {
            setClarityGain(
              calculateVisualClarityImprovement(beforeMetrics, metrics)
            );
          }
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Update RGB & Luminance Histogram Chart
  useEffect(() => {
    if (!histChartRef.current || !beforeMetrics || !afterMetrics) return;
    if (histChartInstance.current) {
      histChartInstance.current.destroy();
    }
    const ctx = histChartRef.current.getContext('2d');
    if (!ctx) return;

    const bins = Array.from({ length: 16 }, (_, i) => `${i * 16}-${i * 16 + 15}`);
    const textColor = darkMode ? '#cbd5e1' : '#334155';

    histChartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: bins,
        datasets: [
          {
            label: 'طيف الإضاءة قبل المعالجة (Before RGB)',
            data: beforeMetrics.gHistogram,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.18)',
            fill: true,
            tension: 0.35,
          },
          {
            label: 'طيف الإضاءة بعد المعالجة (After RGB)',
            data: afterMetrics.bHistogram,
            borderColor: '#0d9488',
            backgroundColor: 'rgba(13, 148, 136, 0.22)',
            fill: true,
            tension: 0.35,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 200 },
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
            title: {
              display: true,
              text: 'شدة الإضاءة اللونية (0 - 255 Pixel Intensity)',
              color: textColor,
              font: { family: 'Cairo', size: 11 },
            },
            ticks: { color: textColor, font: { size: 10 } },
          },
          y: {
            title: {
              display: true,
              text: 'نسبة البكسلات (%)',
              color: textColor,
              font: { family: 'Cairo', size: 11 },
            },
            ticks: { color: textColor },
          },
        },
      },
    });

    return () => {
      if (histChartInstance.current) {
        histChartInstance.current.destroy();
      }
    };
  }, [beforeMetrics, afterMetrics, darkMode]);

  const handleRunGeminiVision = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/gemini/vision-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beforeImageBase64: beforeImgSrc,
          afterImageBase64: afterImgSrc,
          sampleMode,
          beforeMetrics,
          afterMetrics,
          clarityImprovement: clarityGain,
        }),
      });
      const data = await response.json();
      setAiAnalysis(data.analysis || '');
      setAiModelUsed(data.modelUsed || 'gemini-4-argon');
    } catch (err) {
      setAiAnalysis(
        'تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Mode Selector Bar */}
      <div
        className={`rounded-xl border p-5 flex flex-wrap items-center justify-between gap-4 ${
          darkMode
            ? 'bg-slate-900 border-slate-800'
            : 'bg-white border-slate-200'
        }`}
      >
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Eye className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              المختبر البصري الذكي (HTML5 Canvas Optical Density &amp; Gemini
              Vision)
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            قياس الكثافة الضوئية (OD600) والتوزيع اللوني (RGB Histogram) رقمياً
            لعينات المياه وأطباق بتري قبل وبعد المعالجة
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setSampleMode('water')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                sampleMode === 'water'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>قناني فحص العكورة واللون</span>
            </button>
            <button
              type="button"
              onClick={() => setSampleMode('petri')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                sampleMode === 'petri'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Microscope className="w-3.5 h-3.5" />
              <span>أطباق بتري (المستعمرات البكتيرية)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => renderSyntheticLabSamples(sampleMode)}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>إعادة ضبط العينة القياسية</span>
          </button>
        </div>
      </div>

      {/* Before & After Canvases + Optical Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Before Sample Card (4 cols) */}
        <div
          className={`lg:col-span-4 rounded-xl border p-5 flex flex-col justify-between ${
            darkMode
              ? 'bg-slate-900 border-slate-800'
              : 'bg-white border-slate-200'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400">
                1. عينة قبل المعالجة (Raw Sample)
              </h3>
              <span className="text-xs font-mono text-slate-400">
                OD600 = {beforeMetrics?.opticalDensity ?? 0}
              </span>
            </div>

            <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 flex items-center justify-center">
              <canvas
                ref={beforeCanvasRef}
                className="w-full h-48 object-cover"
                data-testid="before-sample-canvas"
              />
            </div>

            <label
              htmlFor="upload-before-sample"
              className="mt-3 w-full py-2 px-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <span>رفع صورة عينة قبل المعالجة (أو اسحب وأفلت)</span>
              <input
                id="upload-before-sample"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file, 'before');
                }}
                className="hidden"
              />
            </label>
          </div>

          {beforeMetrics && (
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs font-mono tabular-nums">
              <div>
                <span className="text-slate-400 block font-sans">
                  الكثافة الضوئية (OD):
                </span>
                <span className="font-bold text-sm">
                  {beforeMetrics.opticalDensity}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-sans">
                  متوسط النصوع (Luminance):
                </span>
                <span className="font-bold text-sm">
                  {beforeMetrics.luminance} / 255
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-sans">
                  مؤشر العكورة البصري:
                </span>
                <span className="font-bold text-amber-600">
                  {beforeMetrics.turbidityIndex}%
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-sans">
                  RGB المتوسط:
                </span>
                <span>
                  ({beforeMetrics.meanR}, {beforeMetrics.meanG},{' '}
                  {beforeMetrics.meanB})
                </span>
              </div>
            </div>
          )}
        </div>

        {/* After Sample Card (4 cols) */}
        <div
          className={`lg:col-span-4 rounded-xl border p-5 flex flex-col justify-between ${
            darkMode
              ? 'bg-slate-900 border-slate-800'
              : 'bg-white border-slate-200'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                2. عينة بعد المعالجة الحيوية (Treated)
              </h3>
              <span className="text-xs font-mono text-slate-400">
                OD600 = {afterMetrics?.opticalDensity ?? 0}
              </span>
            </div>

            <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 flex items-center justify-center">
              <canvas
                ref={afterCanvasRef}
                className="w-full h-48 object-cover"
                data-testid="after-sample-canvas"
              />
            </div>

            <label
              htmlFor="upload-after-sample"
              className="mt-3 w-full py-2 px-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-teal-600" />
              <span>رفع صورة عينة بعد المعالجة (أو اسحب وأفلت)</span>
              <input
                id="upload-after-sample"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file, 'after');
                }}
                className="hidden"
              />
            </label>
          </div>

          {afterMetrics && (
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs font-mono tabular-nums">
              <div>
                <span className="text-slate-400 block font-sans">
                  الكثافة الضوئية (OD):
                </span>
                <span className="font-bold text-sm">
                  {afterMetrics.opticalDensity}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-sans">
                  متوسط النصوع (Luminance):
                </span>
                <span className="font-bold text-sm">
                  {afterMetrics.luminance} / 255
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-sans">
                  مؤشر العكورة البصري:
                </span>
                <span className="font-bold text-emerald-600">
                  {afterMetrics.turbidityIndex}%
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-sans">
                  RGB المتوسط:
                </span>
                <span>
                  ({afterMetrics.meanR}, {afterMetrics.meanG},{' '}
                  {afterMetrics.meanB})
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Optical Purity Result + RGB Histogram (4 cols) */}
        <div
          className={`lg:col-span-4 rounded-xl border p-5 flex flex-col justify-between ${
            darkMode
              ? 'bg-slate-900 border-slate-800'
              : 'bg-white border-slate-200'
          }`}
        >
          <div>
            <h3 className="text-sm font-bold mb-1">
              نتيجة الفحص الضوئي واللوني الرقمي
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              حساب مباشر من مصفوفة البكسلات (HTML5 Canvas ImageData)
            </p>

            <div
              className={`rounded-lg border p-4 mb-4 ${
                darkMode
                  ? 'bg-slate-950 border-slate-800'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className="text-xs text-slate-500 dark:text-slate-400 block">
                نسبة النقاوة والتحسن البصري
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span
                  className="text-3xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400"
                  data-testid="optical-clarity-value"
                >
                  {clarityGain.toFixed(2)}%
                </span>
                <span className="text-xs font-mono text-slate-400">
                  ΔOD ={' '}
                  {beforeMetrics && afterMetrics
                    ? (
                        beforeMetrics.opticalDensity -
                        afterMetrics.opticalDensity
                      ).toFixed(3)
                    : '0.268'}
                </span>
              </div>
            </div>

            <div className="h-40 w-full">
              <canvas ref={histChartRef} />
            </div>
          </div>

          <button
            type="button"
            onClick={handleRunGeminiVision}
            disabled={isAnalyzing}
            className="mt-4 w-full py-2.5 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>
              {isAnalyzing
                ? 'جاري التحليل البصري عبر Gemini 4 Argon...'
                : 'تحليل متقدم عبر Gemini Vision'}
            </span>
          </button>
        </div>
      </div>

      {/* Gemini Vision Output Report */}
      {aiAnalysis && (
        <div
          className={`rounded-xl border p-6 transition-colors ${
            darkMode
              ? 'bg-slate-900 border-slate-800'
              : 'bg-white border-slate-200'
          }`}
          data-testid="vision-ai-report"
        >
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-emerald-600 dark:text-emerald-400">
              التقرير العلمي لتفسير العينات البصرية (Gemini Vision Scientific
              Analysis)
            </h3>
            <span className="text-xs font-mono text-slate-500">
              Model: {aiModelUsed}
            </span>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line leading-relaxed text-sm">
            {aiAnalysis}
          </div>
        </div>
      )}
    </div>
  );
};
