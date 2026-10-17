import {
  ExperimentRecord,
  SamplingStation,
  SimulationResult,
} from './bioremediationLogic';

export function exportStandaloneSingleFileHTML(
  records: ExperimentRecord[],
  stations: SamplingStation[],
  simulationResult: SimulationResult
): void {
  const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>EcoBio AI | المنصة الذكية لتقييم المعالجة الحيوية ورصد التلوث البيئي - مؤمن خلف عبدالله</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet" />
  <style>
    body { font-family: 'Cairo', sans-serif; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen p-6">
  <div class="max-w-7xl mx-auto space-y-6">
    <header class="border-b border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-emerald-400">EcoBio AI | المنصة الذكية لتقييم المعالجة الحيوية ورصد التلوث البيئي</h1>
        <p class="text-sm text-slate-400 mt-1">إعداد الباحث: مؤمن خلف عبدالله — قسم علوم الحياة (مشروع تخرج)</p>
      </div>
      <div class="text-xs font-mono text-teal-400">Single-File Standalone Edition</div>
    </header>

    <section class="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h2 class="text-lg font-bold mb-4 text-emerald-400">1. جدول نتائج كفاءة المعالجة الحيوية المسجلة</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-right text-sm border-collapse">
          <thead>
            <tr class="border-b border-slate-800 text-slate-400">
              <th class="py-2 px-3">المؤشر البيئي</th>
              <th class="py-2 px-3">قبل المعالجة (Ci)</th>
              <th class="py-2 px-3">بعد المعالجة (Cf)</th>
              <th class="py-2 px-3">كفاءة الإزالة (%)</th>
              <th class="py-2 px-3">المادة المعالجة</th>
            </tr>
          </thead>
          <tbody>
            ${records
              .map(
                (r) => `<tr class="border-b border-slate-800/60">
              <td class="py-2 px-3 font-semibold">${r.pollutantName}</td>
              <td class="py-2 px-3 font-mono text-amber-400">${r.ci} ${r.unit}</td>
              <td class="py-2 px-3 font-mono text-teal-400">${r.cf} ${r.unit}</td>
              <td class="py-2 px-3 font-mono font-bold text-emerald-400">${r.efficiency}%</td>
              <td class="py-2 px-3 text-xs">${r.treatmentType}</td>
            </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </section>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <section class="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 class="text-lg font-bold mb-3 text-teal-400">2. المخطط البياني لكفاءة الإزالة</h2>
        <canvas id="effChart" height="220"></canvas>
      </section>
      <section class="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 class="text-lg font-bold mb-3 text-emerald-400">3. خريطة الرصد الميداني (محافظة صلاح الدين - تكريت)</h2>
        <div id="map" style="height:280px;border-radius:12px;"></div>
      </section>
    </div>
  </div>

  <script>
    const records = ${JSON.stringify(records)};
    const stations = ${JSON.stringify(stations)};
    const sim = ${JSON.stringify(simulationResult)};

    new Chart(document.getElementById('effChart'), {
      type: 'bar',
      data: {
        labels: records.map(r => r.pollutantName),
        datasets: [
          { label: 'Ci', data: records.map(r => r.ci), backgroundColor: '#f59e0b' },
          { label: 'Cf', data: records.map(r => r.cf), backgroundColor: '#0d9488' }
        ]
      }
    });

    const map = L.map('map').setView([34.615, 43.682], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    stations.forEach(st => {
      const color = st.pollutionLevel === 'low' ? '#10b981' : st.pollutionLevel === 'medium' ? '#f59e0b' : '#ef4444';
      L.circleMarker([st.lat, st.lng], { radius: 9, fillColor: color, color: '#fff', weight: 2, fillOpacity: 0.9 })
        .addTo(map)
        .bindPopup('<b>' + st.name + '</b><br/>WQI: ' + st.wqi);
    });
  </script>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'EcoBio_AI_SingleFile_Moamen_Khalaf.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
