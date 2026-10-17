import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Plus,
  Compass,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import {
  SamplingStation,
  computeWaterQualityIndex,
} from '../utils/bioremediationLogic';

interface GeoMapTabProps {
  stations: SamplingStation[];
  onAddStation: (st: SamplingStation) => void;
  onDeleteStation: (id: string) => void;
  onResetStations: () => void;
  darkMode: boolean;
}

export const GeoMapTab: React.FC<GeoMapTabProps> = ({
  stations,
  onAddStation,
  onDeleteStation,
  onResetStations,
  darkMode,
}) => {
  const [name, setName] = useState<string>('');
  const [locationArea, setLocationArea] = useState<string>(
    'ضفاف نهر دجلة - تكريت'
  );
  const [lat, setLat] = useState<string>('34.6125');
  const [lng, setLng] = useState<string>('43.6820');
  const [sampleType, setSampleType] = useState<string>('مياه نهرية سطحية');
  const [turbidity, setTurbidity] = useState<string>('38.0');
  const [bod, setBod] = useState<string>('14.5');
  const [tds, setTds] = useState<string>('780');
  const [ph, setPh] = useState<string>('7.6');
  const [notes, setNotes] = useState<string>(
    'تم أخذ العينة ميدانياً وحفظها في عبوات معقمة بدرجة 4 مئوية.'
  );
  const [formMsg, setFormMsg] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Leaflet Map centered on Tikrit / Saladin Governorate (Tigris River)
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [34.615, 43.682],
      zoom: 12,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors | محافظة صلاح الدين - تكريت',
      maxZoom: 18,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = layerGroup;

    map.on('click', (e: L.LeafletMouseEvent) => {
      setLat(e.latlng.lat.toFixed(4));
      setLng(e.latlng.lng.toFixed(4));
      setFormMsg(
        `تم التقاط الإحداثيات من الخريطة: (${e.latlng.lat.toFixed(
          4
        )}, ${e.latlng.lng.toFixed(4)})`
      );
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Render station markers whenever stations list updates
  useEffect(() => {
    const layerGroup = markersLayerRef.current;
    if (!layerGroup) return;

    layerGroup.clearLayers();

    stations.forEach((st) => {
      const colorMap = {
        low: { fill: '#10b981', stroke: '#047857', label: 'منخفض (آمن)' },
        medium: {
          fill: '#f59e0b',
          stroke: '#b45309',
          label: 'متوسط (مراقبة)',
        },
        high: {
          fill: '#ef4444',
          stroke: '#b91c1c',
          label: 'مرتفع (تلوث حرج)',
        },
      };
      const style = colorMap[st.pollutionLevel];

      const marker = L.circleMarker([st.lat, st.lng], {
        radius: 10,
        fillColor: style.fill,
        color: style.stroke,
        weight: 2.5,
        opacity: 1,
        fillOpacity: 0.85,
      });

      const popupHtml = `
        <div style="direction:rtl;text-align:right;font-family:'Cairo',sans-serif;min-width:210px;">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px;color:#0f172a;">${st.name}</div>
          <div style="font-size:11px;color:#475569;margin-bottom:6px;">${st.locationArea} · ${st.sampleType}</div>
          <div style="font-size:11px;font-family:monospace;background:#f8fafc;padding:6px;border-radius:6px;border:1px solid #e2e8f0;">
            <div>مستوى التلوث: <strong style="color:${style.fill}">${style.label}</strong> (WQI: ${st.wqi})</div>
            <div>العكورة: ${st.turbidityNTU} NTU | BOD₅: ${st.bodMgL} mg/L</div>
            <div>TDS: ${st.tdsMgL} mg/L | pH: ${st.ph}</div>
            <div>الإحداثيات: ${st.lat.toFixed(4)}°N, ${st.lng.toFixed(4)}°E</div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.addTo(layerGroup);
    });
  }, [stations]);

  const handleAddStationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numLat = parseFloat(lat);
    const numLng = parseFloat(lng);
    const numTurb = parseFloat(turbidity) || 15;
    const numBod = parseFloat(bod) || 6;
    const numTds = parseFloat(tds) || 500;
    const numPh = parseFloat(ph) || 7.4;

    if (!name.trim()) {
      setFormMsg('يرجى إدخال اسم محطة أخذ العينات.');
      return;
    }
    if (Number.isNaN(numLat) || Number.isNaN(numLng)) {
      setFormMsg('يرجى إدخال إحداثيات جغرافية صحيحة.');
      return;
    }

    const { wqi, pollutionLevel } = computeWaterQualityIndex(
      numTurb,
      numBod,
      numTds,
      numPh
    );

    const newSt: SamplingStation = {
      id: `st-${Date.now()}`,
      name: name.trim(),
      locationArea: locationArea.trim() || 'مدينة تكريت - نهر دجلة',
      lat: numLat,
      lng: numLng,
      sampleType,
      pollutionLevel,
      turbidityNTU: numTurb,
      bodMgL: numBod,
      tdsMgL: numTds,
      ph: numPh,
      heavyMetalsMgL: pollutionLevel === 'high' ? 0.14 : 0.02,
      wqi,
      date: new Date().toISOString().slice(0, 10),
      notes: notes.trim(),
    };

    onAddStation(newSt);
    setName('');
    setFormMsg(`تمت إضافة "${newSt.name}" إلى خريطة الرصد بنجاح.`);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([numLat, numLng], 13);
    }
  };

  const levelText = (lvl: 'low' | 'medium' | 'high') => {
    if (lvl === 'low') return '● منخفض (آمن)';
    if (lvl === 'medium') return '▲ متوسط (مراقبة)';
    return '✖ مرتفع (تلوث حرج)';
  };

  const levelColorClass = (lvl: 'low' | 'medium' | 'high') => {
    if (lvl === 'low') return 'text-emerald-600 dark:text-emerald-400';
    if (lvl === 'medium') return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Add Station Form (4 cols) */}
        <div
          className={`lg:col-span-4 rounded-xl border p-6 flex flex-col justify-between ${
            darkMode
              ? 'bg-slate-900 border-slate-800'
              : 'bg-white border-slate-200'
          }`}
        >
          <div>
            <div className="pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-bold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>إضافة محطة رصد بيئي جديدة</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                انقر مباشرة على خريطة نهر دجلة / تكريت لالتقاط الإحداثيات أو
                أدخلها يدوياً
              </p>
            </div>

            <form onSubmit={handleAddStationSubmit} className="space-y-3.5">
              <div>
                <label
                  htmlFor="st-name"
                  className="block text-xs font-semibold mb-1"
                >
                  اسم محطة أخذ العينات
                </label>
                <input
                  id="st-name"
                  type="text"
                  placeholder="مثال: محطة الكورنيش - تكريت"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    darkMode
                      ? 'bg-slate-950 border-slate-700 text-slate-100'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="st-lat"
                    className="block text-xs font-semibold mb-1"
                  >
                    خط العرض (Latitude)
                  </label>
                  <input
                    id="st-lat"
                    type="number"
                    step="any"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className={`w-full rounded-lg border px-3 py-2 text-xs font-mono tabular-nums ${
                      darkMode
                        ? 'bg-slate-950 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label
                    htmlFor="st-lng"
                    className="block text-xs font-semibold mb-1"
                  >
                    خط الطول (Longitude)
                  </label>
                  <input
                    id="st-lng"
                    type="number"
                    step="any"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className={`w-full rounded-lg border px-3 py-2 text-xs font-mono tabular-nums ${
                      darkMode
                        ? 'bg-slate-950 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="st-type"
                  className="block text-xs font-semibold mb-1"
                >
                  نوع العينة الميدانية
                </label>
                <select
                  id="st-type"
                  value={sampleType}
                  onChange={(e) => setSampleType(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-xs ${
                    darkMode
                      ? 'bg-slate-950 border-slate-700 text-slate-100'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="مياه نهرية سطحية">مياه نهرية سطحية</option>
                  <option value="مياه صرف زراعي / مبازل">
                    مياه صرف زراعي / مبازل
                  </option>
                  <option value="مياه صرف صحي / صناعي">
                    مياه صرف صحي / صناعي
                  </option>
                  <option value="مياه معالجة حيوياً">مياه معالجة حيوياً</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="st-turb"
                    className="block text-xs font-semibold mb-1"
                  >
                    العكورة (NTU)
                  </label>
                  <input
                    id="st-turb"
                    type="number"
                    step="any"
                    value={turbidity}
                    onChange={(e) => setTurbidity(e.target.value)}
                    className={`w-full rounded-lg border px-3 py-1.5 text-xs font-mono tabular-nums ${
                      darkMode
                        ? 'bg-slate-950 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label
                    htmlFor="st-bod"
                    className="block text-xs font-semibold mb-1"
                  >
                    المتطلب الحيوي BOD₅ (mg/L)
                  </label>
                  <input
                    id="st-bod"
                    type="number"
                    step="any"
                    value={bod}
                    onChange={(e) => setBod(e.target.value)}
                    className={`w-full rounded-lg border px-3 py-1.5 text-xs font-mono tabular-nums ${
                      darkMode
                        ? 'bg-slate-950 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="st-tds"
                    className="block text-xs font-semibold mb-1"
                  >
                    الأملاح TDS (mg/L)
                  </label>
                  <input
                    id="st-tds"
                    type="number"
                    step="any"
                    value={tds}
                    onChange={(e) => setTds(e.target.value)}
                    className={`w-full rounded-lg border px-3 py-1.5 text-xs font-mono tabular-nums ${
                      darkMode
                        ? 'bg-slate-950 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label
                    htmlFor="st-ph"
                    className="block text-xs font-semibold mb-1"
                  >
                    الدالة الحامضية (pH)
                  </label>
                  <input
                    id="st-ph"
                    type="number"
                    step="0.1"
                    value={ph}
                    onChange={(e) => setPh(e.target.value)}
                    className={`w-full rounded-lg border px-3 py-1.5 text-xs font-mono tabular-nums ${
                      darkMode
                        ? 'bg-slate-950 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {formMsg && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  {formMsg}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>تسجيل المحطة على الخريطة</span>
              </button>
            </form>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>إجمالي المحطات: {stations.length}</span>
            <button
              type="button"
              onClick={onResetStations}
              className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة المحطات الافتراضية</span>
            </button>
          </div>
        </div>

        {/* Interactive Leaflet Map (8 cols) */}
        <div
          className={`lg:col-span-8 rounded-xl border p-6 flex flex-col justify-between ${
            darkMode
              ? 'bg-slate-900 border-slate-800'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <Compass className="w-5 h-5 text-teal-600 shrink-0" />
                <span>
                  خريطة الرصد البيئي الميداني — محافظة صلاح الدين / مدينة تكريت
                  (نهر دجلة)
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                انقر على أي موقع على مجرى نهر دجلة لتحديد الإحداثيات أو استعرض
                بيانات المحطات المسجلة
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="text-emerald-600 dark:text-emerald-400">
                ● منخفض (WQI &lt; 35)
              </span>
              <span className="text-amber-600 dark:text-amber-400">
                ▲ متوسط (35 - 68)
              </span>
              <span className="text-rose-600 dark:text-rose-400">
                ✖ مرتفع (&gt; 68)
              </span>
            </div>
          </div>

          <div
            ref={mapContainerRef}
            data-testid="leaflet-map-container"
            className="w-full h-96 lg:h-[430px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800"
          />
        </div>
      </div>

      {/* Stations Table */}
      <div
        className={`rounded-xl border p-6 ${
          darkMode
            ? 'bg-slate-900 border-slate-800'
            : 'bg-white border-slate-200'
        }`}
      >
        <h3 className="text-base font-bold mb-4">
          جدول محطات أخذ العينات الميدانية المسجلة في حوض نهر دجلة (تكريت)
        </h3>
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
                <th className="py-3 px-3 font-semibold">اسم المحطة والموقع</th>
                <th className="py-3 px-3 font-semibold">الإحداثيات (Lat, Lng)</th>
                <th className="py-3 px-3 font-semibold">نوع العينة</th>
                <th className="py-3 px-3 font-semibold">العكورة / BOD₅ / TDS</th>
                <th className="py-3 px-3 font-semibold">مؤشر WQI ومستوى التلوث</th>
                <th className="py-3 px-3 font-semibold text-center">حذف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {stations.map((st) => (
                <tr
                  key={st.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                >
                  <td className="py-3 px-3">
                    <div className="font-semibold">{st.name}</div>
                    <div className="text-xs text-slate-400">
                      {st.locationArea}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono tabular-nums text-xs">
                    {st.lat.toFixed(4)}°N, {st.lng.toFixed(4)}°E
                  </td>
                  <td className="py-3 px-3 text-xs">{st.sampleType}</td>
                  <td className="py-3 px-3 font-mono tabular-nums text-xs">
                    {st.turbidityNTU} NTU · {st.bodMgL} mg/L · {st.tdsMgL} mg/L
                  </td>
                  <td className="py-3 px-3 text-xs font-semibold">
                    <span className={levelColorClass(st.pollutionLevel)}>
                      {levelText(st.pollutionLevel)} — WQI: {st.wqi}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onDeleteStation(st.id)}
                      aria-label={`حذف محطة ${st.name}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
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
