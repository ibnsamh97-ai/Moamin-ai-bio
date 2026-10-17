import React, { useState } from 'react';
import { X, ShieldCheck, QrCode, Award, CheckCircle2 } from 'lucide-react';
import { generateDeterministicQrMatrix } from '../utils/bioremediationLogic';

interface HolographicIdModalProps {
  isOpen: boolean;
  onClose: () => void;
  avgEfficiency: number;
  wqiScore: number;
  totalExperiments: number;
}

export const HolographicIdModal: React.FC<HolographicIdModalProps> = ({
  isOpen,
  onClose,
  avgEfficiency,
  wqiScore,
  totalExperiments,
}) => {
  const [tilt, setTilt] = useState<{ rx: number; ry: number; gx: number; gy: number }>({
    rx: 0,
    ry: 0,
    gx: 50,
    gy: 50,
  });

  if (!isOpen) return null;

  const appUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://ecobio-ai.tikrit.edu.iq';
  const qrMatrix = generateDeterministicQrMatrix(appUrl, 21);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const ry = (x - 0.5) * 18;
    const rx = (0.5 - y) * 18;
    setTilt({
      rx: Number(rx.toFixed(2)),
      ry: Number(ry.toFixed(2)),
      gx: Math.round(x * 100),
      gy: Math.round(y * 100),
    });
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 50 });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85"
      role="dialog"
      aria-modal="true"
      aria-label="بطاقة هوية المشروع ثلاثية الأبعاد (3D Holographic ID)"
      data-testid="holographic-id-modal"
    >
      <div className="relative w-full max-w-xl">
        {/* Close Button */}
        <div className="flex justify-end mb-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>إغلاق بطاقة الهوية</span>
          </button>
        </div>

        {/* Interactive 3D Tilt Holographic Card */}
        <div
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            transform: `perspective(1000px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
            transition: 'transform 120ms ease-out',
            background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(16, 185, 129, 0.22), rgba(6, 182, 212, 0.12) 45%, rgba(15, 23, 42, 0.98) 85%)`,
          }}
          className="rounded-2xl border-2 border-emerald-500/40 p-6 sm:p-8 text-slate-100 shadow-2xl select-none"
        >
          {/* Card Header */}
          <div className="flex items-start justify-between gap-4 pb-5 border-b border-emerald-500/25">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                <span>OFFICIAL ACADEMIC PROJECT ID · TIKRIT UNIVERSITY</span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white">
                EcoBio AI | النظام الذكي للمعالجة الحيوية ورصد التلوث البيئي
              </h2>
              <p className="text-xs text-cyan-300 font-semibold">
                جامعة تكريت — كلية التربية للعلوم الصرفة — قسم علوم الحياة
              </p>
            </div>

            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center shrink-0">
              <Award className="w-6 h-6 text-emerald-400" />
            </div>
          </div>

          {/* Researcher Details & Interactive SVG QR Code */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 py-6 items-center">
            <div className="sm:col-span-7 space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block">إعداد الباحث:</span>
                <span className="text-base font-extrabold text-white">
                  مؤمن خلف عبدالله
                </span>
              </div>

              <div>
                <span className="text-slate-400 block">
                  الكلية والقسم العلمي:
                </span>
                <span className="font-bold text-emerald-300">
                  قسم علوم الحياة / كلية التربية للعلوم الصرفة / جامعة تكريت
                </span>
              </div>

              <div>
                <span className="text-slate-400 block">الإشراف الأكاديمي:</span>
                <span className="font-semibold text-slate-200">
                  اللجنة العلمية المشرفة على بحوث التخرج
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">
                    متوسط الإزالة
                  </span>
                  <span className="text-sm font-bold font-mono text-emerald-400">
                    {avgEfficiency}%
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">
                    مؤشر WQI
                  </span>
                  <span className="text-sm font-bold font-mono text-cyan-400">
                    {wqiScore}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">
                    التجارب (n=3)
                  </span>
                  <span className="text-sm font-bold font-mono text-white">
                    {totalExperiments}
                  </span>
                </div>
              </div>
            </div>

            {/* Procedural Vector SVG QR Code */}
            <div className="sm:col-span-5 flex flex-col items-center justify-center">
              <div className="p-3 rounded-xl bg-white border-2 border-emerald-400 shadow-md">
                <svg
                  viewBox="0 0 21 21"
                  className="w-32 h-32 block"
                  shapeRendering="crispEdges"
                  aria-label="رمز الاستجابة السريع QR Code لرابط المنصة"
                >
                  {qrMatrix.map((row, rIdx) =>
                    row.map((cell, cIdx) =>
                      cell ? (
                        <rect
                          key={`${rIdx}-${cIdx}`}
                          x={cIdx}
                          y={rIdx}
                          width={1}
                          height={1}
                          fill="#0f172a"
                        />
                      ) : null
                    )
                  )}
                </svg>
              </div>
              <div className="mt-2 flex items-center gap-1 text-[11px] font-mono text-emerald-300">
                <QrCode className="w-3.5 h-3.5" />
                <span>امسح الرمز لفتح المنصة التفاعلية</span>
              </div>
            </div>
          </div>

          {/* Card Footer */}
          <div className="pt-4 border-t border-emerald-500/25 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>HOLOGRAPHIC VERIFIED ID · 2026-2027</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>حرّك المؤشر فوق البطاقة لمعاينة التأثير ثلاثي الأبعاد</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
