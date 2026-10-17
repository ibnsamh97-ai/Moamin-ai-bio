import { jsPDF } from 'jspdf';
import {
  ExperimentRecord,
  SamplingStation,
  SimulationResult,
} from './bioremediationLogic';
import { UserSettings } from '../components/SettingsModal';

export interface AcademicReportMetadata {
  university: string;
  collegeAndDept: string;
  researcherName: string;
  supervisorName: string;
  reportTitle: string;
  academicYear: string;
  includeCharts: boolean;
  includeStations: boolean;
}

export const DEFAULT_REPORT_METADATA: AcademicReportMetadata = {
  university: 'جامعة تكريت — وزارة التعليم العالي والبحث العلمي',
  collegeAndDept: 'كلية العلوم — قسم علوم الحياة (الدراسات الأولية)',
  researcherName: 'مؤمن خلف عبدالله',
  supervisorName: 'اللجنة العلمية المشرفة — قسم علوم الحياة',
  reportTitle:
    'التقرير العلمي الشامل: تقييم كفاءة المعالجة الحيوية للمياه ورصد التلوث البيئي في محافظة صلاح الدين',
  academicYear: '2026 - 2027',
  includeCharts: true,
  includeStations: true,
};

/**
 * Pure helper to compute academic report summary statistics (unit-tested).
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

/**
 * Helper to wrap RTL Arabic text onto an HTML5 2D Canvas.
 */
function fillWrappedRtlText(
  ctx: CanvasRenderingContext2D,
  text: string,
  rightX: number,
  startY: number,
  maxWidth: number,
  lineHeight: number
): number {
  const paragraphs = text.split('\n');
  let currentY = startY;

  for (const rawPara of paragraphs) {
    const cleanPara = rawPara.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
    if (!cleanPara) {
      currentY += lineHeight * 0.45;
      continue;
    }

    const words = cleanPara.split(' ');
    let line = '';

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line.trim(), rightX, currentY);
        line = words[i] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    if (line.trim()) {
      ctx.fillText(line.trim(), rightX, currentY);
      currentY += lineHeight;
    }
  }

  return currentY;
}

/**
 * Renders Page 1 of the Academic Report onto a high-DPI A4 Canvas (1240 x 1754)
 * including Header, Researcher Metadata, KPI Summary, Experimental Table, and Embedded Charts.
 */
export function renderReportPage1Canvas(
  records: ExperimentRecord[],
  stations: SamplingStation[],
  simulationResult: SimulationResult,
  userSettings: UserSettings,
  meta: AcademicReportMetadata
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 1240;
  canvas.height = 1754;
  const ctx = canvas.getContext('2d')!;

  const stats = computeAcademicReportStats(records, stations, simulationResult);

  // Crisp white A4 background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Top Emerald & Teal Academic Banner
  const headerGrad = ctx.createLinearGradient(0, 0, canvas.width, 0);
  headerGrad.addColorStop(0, '#065f46');
  headerGrad.addColorStop(0.5, '#047857');
  headerGrad.addColorStop(1, '#0f766e');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, canvas.width, 165);

  ctx.direction = 'rtl';
  ctx.textAlign = 'right';

  // Header Institution Text
  ctx.fillStyle = '#d1fae5';
  ctx.font = '600 19px Cairo, sans-serif';
  ctx.fillText(meta.university, 1180, 46);
  ctx.fillText(meta.collegeAndDept, 1180, 76);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 22px Cairo, sans-serif';
  ctx.fillText(meta.reportTitle, 1180, 118, 1120);

  ctx.fillStyle = '#a7f3d0';
  ctx.font = '600 15px Cairo, sans-serif';
  ctx.fillText(
    `إعداد الباحث: ${meta.researcherName}  |  إشراف: ${meta.supervisorName}  |  العام الدراسي: ${meta.academicYear}`,
    1180,
    150,
    1120
  );

  // KPI Summary Strip (Y = 190 to 290)
  const kpiCards = [
    {
      title: 'متوسط كفاءة الإزالة الكلية',
      val: `${stats.avgEfficiency}%`,
      sub: `من إجمالي ${stats.totalExperiments} تجارب مختبرية`,
      color: '#059669',
    },
    {
      title: 'أعلى كفاءة إزالة مسجلة',
      val: `${stats.highestEfficiency}%`,
      sub: stats.highestPollutant,
      color: '#0d9488',
    },
    {
      title: 'الجرعة المثالية المتوقعة (Optimal)',
      val: `${stats.optimalDose} ${userSettings.concentrationUnit}`,
      sub: `زمن التماس: ${stats.optimalTime} دقيقة | pH ${stats.optimalPh}`,
      color: '#d97706',
    },
    {
      title: 'المطابقة للمواصفة القياسية',
      val: `${stats.complianceRate}%`,
      sub: `المرجع: ${userSettings.preferredStandard} | ${stats.totalStations} محطات رصد`,
      color: '#0284c7',
    },
  ];

  const cardW = 268;
  const gap = 22;
  kpiCards.forEach((card, idx) => {
    const x = 1180 - (idx + 1) * cardW - idx * gap;
    const y = 192;
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, cardW, 102, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.font = '600 15px Cairo, sans-serif';
    ctx.fillText(card.title, x + cardW - 16, y + 28);

    ctx.fillStyle = card.color;
    ctx.font = '800 26px Cairo, sans-serif';
    ctx.fillText(card.val, x + cardW - 16, y + 64);

    ctx.fillStyle = '#64748b';
    ctx.font = '500 13px Cairo, sans-serif';
    ctx.fillText(card.sub, x + cardW - 16, y + 88);
  });

  // Section 1: Experimental Findings Table (Y = 325)
  ctx.fillStyle = '#0f172a';
  ctx.font = '700 20px Cairo, sans-serif';
  ctx.fillText(
    'أولاً: جدول القراءات المختبرية ونتائج كفاءة الإزالة وسعة الامتزاز الحيوي (qe)',
    1180,
    332
  );

  const tableTop = 348;
  const rowH = 44;
  const cols = [
    { label: 'المؤشر البيئي', rightX: 1170 },
    { label: 'قبل المعالجة (Ci)', rightX: 900 },
    { label: 'بعد المعالجة (Cf)', rightX: 730 },
    { label: 'كفاءة الإزالة (%)', rightX: 560 },
    { label: 'سعة الامتزاز (qe)', rightX: 405 },
    { label: 'المادة المعالجة والظروف', rightX: 255 },
  ];

  // Table Header Row
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(60, tableTop, 1120, rowH);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 15px Cairo, sans-serif';
  cols.forEach((col) => {
    ctx.fillText(col.label, col.rightX, tableTop + 28);
  });

  const displayRecords = records.slice(0, 8);
  displayRecords.forEach((rec, i) => {
    const ry = tableTop + (i + 1) * rowH;
    ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#f1f5f9';
    ctx.fillRect(60, ry, 1120, rowH);
    ctx.strokeStyle = '#e2e8f0';
    ctx.strokeRect(60, ry, 1120, rowH);

    ctx.fillStyle = '#0f172a';
    ctx.font = '600 14px Cairo, sans-serif';
    ctx.fillText(rec.pollutantName, cols[0].rightX, ry + 27);

    ctx.fillStyle = '#b45309';
    ctx.fillText(`${rec.ci} ${rec.unit}`, cols[1].rightX, ry + 27);

    ctx.fillStyle = '#0f766e';
    ctx.fillText(`${rec.cf} ${rec.unit}`, cols[2].rightX, ry + 27);

    ctx.fillStyle = '#059669';
    ctx.font = '700 15px Cairo, sans-serif';
    ctx.fillText(`${rec.efficiency.toFixed(2)}%`, cols[3].rightX, ry + 27);

    ctx.fillStyle = '#334155';
    ctx.font = '600 14px Cairo, sans-serif';
    ctx.fillText(`${rec.adsorptionCapacityQe} mg/g`, cols[4].rightX, ry + 27);

    const shortTreatment = rec.treatmentType.split(' (')[0];
    ctx.font = '500 13px Cairo, sans-serif';
    ctx.fillText(
      `${shortTreatment} (${rec.doseMgL} mg/L · pH ${rec.ph})`,
      cols[5].rightX,
      ry + 27
    );
  });

  // Section 2: Embedded High-Resolution Charts (Y = 760)
  const chartsTop = tableTop + (displayRecords.length + 1) * rowH + 42;

  if (meta.includeCharts) {
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 20px Cairo, sans-serif';
    ctx.fillText(
      'ثانياً: المخططات البيانية المقارنة ومنحنى النمذجة التنبؤية للجرعة المثالية',
      1180,
      chartsTop
    );

    // Chart Box 1 (Right): Removal Efficiency & Ci/Cf Bar Comparison
    const c1X = 635;
    const c1Y = chartsTop + 20;
    const cW = 545;
    const cH = 410;

    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.roundRect(c1X, c1Y, cW, cH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = '700 16px Cairo, sans-serif';
    ctx.fillText(
      'شكل (1): كفاءة الإزالة المئوية (%) للمؤشرات البيئية المدروسة',
      c1X + cW - 20,
      c1Y + 34
    );

    const plotLeft = c1X + 45;
    const plotRight = c1X + cW - 42;
    const plotTop = c1Y + 65;
    const plotBottom = c1Y + cH - 65;
    const plotW = plotRight - plotLeft;
    const plotH = plotBottom - plotTop;

    // Horizontal grid lines (0%, 25%, 50%, 75%, 100%)
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let pct = 0; pct <= 100; pct += 25) {
      const gy = plotBottom - (pct / 100) * plotH;
      ctx.beginPath();
      ctx.moveTo(plotLeft, gy);
      ctx.lineTo(plotRight, gy);
      ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.font = '600 12px sans-serif';
      ctx.fillText(`${pct}%`, plotRight + 34, gy + 4);
    }

    const barCount = Math.max(1, displayRecords.length);
    const slotW = plotW / barCount;
    ctx.textAlign = 'center';
    displayRecords.forEach((rec, idx) => {
      const centerX = plotRight - (idx + 0.5) * slotW;
      const barW = Math.min(40, slotW * 0.52);
      const bx = centerX - barW / 2;
      const bh = (rec.efficiency / 100) * plotH;
      const by = plotBottom - bh;

      const barGrad = ctx.createLinearGradient(0, by, 0, plotBottom);
      barGrad.addColorStop(0, '#10b981');
      barGrad.addColorStop(1, '#0d9488');
      ctx.fillStyle = barGrad;
      ctx.beginPath();
      ctx.roundRect(bx, by, barW, bh, 5);
      ctx.fill();

      // Efficiency label on top of bar
      ctx.fillStyle = '#065f46';
      ctx.font = '700 11px sans-serif';
      ctx.fillText(`${rec.efficiency}%`, centerX, by - 8);

      // Concise X-axis label centered under each bar
      const matchParen = rec.pollutantName.match(/\(([^)]+)\)/);
      const shortLabel = matchParen
        ? matchParen[1].replace('Total ', '').replace(' / Cd²⁺', '')
        : rec.pollutantName.slice(0, 8);
      ctx.fillStyle = '#334155';
      ctx.font = '700 11px Cairo, sans-serif';
      ctx.fillText(shortLabel, centerX, plotBottom + 24);
    });
    ctx.textAlign = 'right';

    // Chart Box 2 (Left): Dose-Response Optimization Curve
    const c2X = 60;
    const c2Y = chartsTop + 20;

    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.roundRect(c2X, c2Y, cW, cH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = '700 16px Cairo, sans-serif';
    ctx.fillText(
      `شكل (2): منحنى الاستجابة للجرعة ونقطة الكفاءة القصوى (${simulationResult.optimalDose} mg/L)`,
      c2X + cW - 20,
      c2Y + 34
    );

    const p2Left = c2X + 45;
    const p2Right = c2X + cW - 35;
    const p2Top = c2Y + 65;
    const p2Bottom = c2Y + cH - 65;
    const p2W = p2Right - p2Left;
    const p2H = p2Bottom - p2Top;

    for (let pct = 0; pct <= 100; pct += 25) {
      const gy = p2Bottom - (pct / 100) * p2H;
      ctx.strokeStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(p2Left, gy);
      ctx.lineTo(p2Right, gy);
      ctx.stroke();
    }

    const pts = simulationResult.doseCurve;
    if (pts.length > 1) {
      ctx.strokeStyle = '#0d9488';
      ctx.lineWidth = 3;
      ctx.beginPath();
      pts.forEach((pt, idx) => {
        const px = p2Left + (idx / (pts.length - 1)) * p2W;
        const py = p2Bottom - (pt.efficiency / 100) * p2H;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      // Highlight points and Optimal Point
      pts.forEach((pt, idx) => {
        const px = p2Left + (idx / (pts.length - 1)) * p2W;
        const py = p2Bottom - (pt.efficiency / 100) * p2H;
        const isOpt = Math.abs(pt.x - simulationResult.optimalDose) <= 6;
        ctx.fillStyle = isOpt ? '#f59e0b' : '#0d9488';
        ctx.beginPath();
        ctx.arc(px, py, isOpt ? 7 : 3.5, 0, Math.PI * 2);
        ctx.fill();

        if (idx % 3 === 0) {
          ctx.fillStyle = '#475569';
          ctx.font = '600 11px sans-serif';
          ctx.fillText(`${pt.x}`, px + 8, p2Bottom + 22);
        }
      });
    }
  }

  // Page 1 Footer
  ctx.strokeStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.moveTo(60, 1690);
  ctx.lineTo(1180, 1690);
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.font = '600 14px Cairo, sans-serif';
  ctx.fillText(
    `منصة EcoBio AI | باحث مشروع التخرج: ${meta.researcherName} — الصفحة 1 من 2`,
    1180,
    1720
  );

  return canvas;
}

/**
 * Renders Page 2 of the Academic Report onto a high-DPI A4 Canvas (1240 x 1754)
 * including the Scientific Discussion, Field Stations Table, and Signature Block.
 */
export function renderReportPage2Canvas(
  discussionText: string,
  stations: SamplingStation[],
  meta: AcademicReportMetadata
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 1240;
  canvas.height = 1754;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.direction = 'rtl';
  ctx.textAlign = 'right';

  // Top Subheader Banner
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, 95);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 22px Cairo, sans-serif';
  ctx.fillText(
    'ثالثاً: التفسير العلمي والنتائج والمناقشة الأكاديمية (Results & Discussion)',
    1180,
    56
  );

  // Discussion Box
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(60, 120, 1120, 760, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#1e293b';
  ctx.font = '500 17px Cairo, sans-serif';
  fillWrappedRtlText(ctx, discussionText, 1150, 162, 1060, 31);

  // Section 4: Field Monitoring Stations in Saladin / Tikrit
  let nextY = 925;
  if (meta.includeStations) {
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 20px Cairo, sans-serif';
    ctx.fillText(
      'رابعاً: سجل محطات الرصد البيئي الميداني في محافظة صلاح الدين — نهر دجلة / تكريت',
      1180,
      nextY
    );

    const stTop = nextY + 20;
    const rowH = 44;
    const cols = [
      { label: 'اسم محطة الرصد الميداني', rightX: 1165 },
      { label: 'الإحداثيات الجغرافية', rightX: 760 },
      { label: 'العكورة / BOD₅ / TDS', rightX: 540 },
      { label: 'مؤشر WQI والتصنيف', rightX: 270 },
    ];

    ctx.fillStyle = '#065f46';
    ctx.fillRect(60, stTop, 1120, rowH);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 15px Cairo, sans-serif';
    cols.forEach((c) => ctx.fillText(c.label, c.rightX, stTop + 28));

    stations.slice(0, 6).forEach((st, idx) => {
      const ry = stTop + (idx + 1) * rowH;
      ctx.fillStyle = idx % 2 === 0 ? '#ffffff' : '#f1f5f9';
      ctx.fillRect(60, ry, 1120, rowH);
      ctx.strokeStyle = '#e2e8f0';
      ctx.strokeRect(60, ry, 1120, rowH);

      ctx.fillStyle = '#0f172a';
      ctx.font = '600 14px Cairo, sans-serif';
      ctx.fillText(st.name, cols[0].rightX, ry + 27);

      ctx.fillStyle = '#475569';
      ctx.fillText(
        `${st.lat.toFixed(4)}°N, ${st.lng.toFixed(4)}°E`,
        cols[1].rightX,
        ry + 27
      );

      ctx.fillText(
        `${st.turbidityNTU} NTU | ${st.bodMgL} mg/L | ${st.tdsMgL} mg/L`,
        cols[2].rightX,
        ry + 27
      );

      const levelAr =
        st.pollutionLevel === 'low'
          ? 'منخفض (آمن)'
          : st.pollutionLevel === 'medium'
          ? 'متوسط (مراقبة)'
          : 'مرتفع (تلوث حرج)';
      ctx.fillStyle =
        st.pollutionLevel === 'low'
          ? '#059669'
          : st.pollutionLevel === 'medium'
          ? '#d97706'
          : '#dc2626';
      ctx.font = '700 14px Cairo, sans-serif';
      ctx.fillText(`WQI: ${st.wqi} — ${levelAr}`, cols[3].rightX, ry + 27);
    });
  }

  // Academic Signature Block at bottom of Page 2
  const sigY = 1470;
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.roundRect(60, sigY, 1120, 175, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.font = '700 17px Cairo, sans-serif';
  ctx.fillText('إقرار الباحث واعتماد اللجنة العلمية المشرفة:', 1150, sigY + 40);

  ctx.fillStyle = '#334155';
  ctx.font = '600 15px Cairo, sans-serif';
  ctx.fillText(`اسم الباحث: ${meta.researcherName}`, 1150, sigY + 85);
  ctx.fillText('القسم العلمي: قسم علوم الحياة — كلية العلوم', 1150, sigY + 118);

  ctx.fillText(`جهة الإشراف: ${meta.supervisorName}`, 620, sigY + 85);
  ctx.fillText(
    `تاريخ إصدار التقرير: ${new Date().toISOString().slice(0, 10)}`,
    620,
    sigY + 118
  );

  // Page 2 Footer
  ctx.strokeStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.moveTo(60, 1690);
  ctx.lineTo(1180, 1690);
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.font = '600 14px Cairo, sans-serif';
  ctx.fillText(
    `منصة EcoBio AI | باحث مشروع التخرج: ${meta.researcherName} — الصفحة 2 من 2`,
    1180,
    1720
  );

  return canvas;
}

/**
 * Generates and downloads the complete 2-page formatted Academic PDF Report.
 */
export function generateAndDownloadAcademicPDF(
  records: ExperimentRecord[],
  stations: SamplingStation[],
  simulationResult: SimulationResult,
  discussionText: string,
  userSettings: UserSettings,
  meta: AcademicReportMetadata = DEFAULT_REPORT_METADATA
): void {
  const page1Canvas = renderReportPage1Canvas(
    records,
    stations,
    simulationResult,
    userSettings,
    meta
  );
  const page2Canvas = renderReportPage2Canvas(discussionText, stations, meta);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidthMm = 210;
  const pageHeightMm = 297;

  const imgData1 = page1Canvas.toDataURL('image/jpeg', 0.95);
  pdf.addImage(imgData1, 'JPEG', 0, 0, pageWidthMm, pageHeightMm);

  pdf.addPage();
  const imgData2 = page2Canvas.toDataURL('image/jpeg', 0.95);
  pdf.addImage(imgData2, 'JPEG', 0, 0, pageWidthMm, pageHeightMm);

  pdf.save('EcoBio_AI_Academic_Report_Moamen_Khalaf.pdf');
}
