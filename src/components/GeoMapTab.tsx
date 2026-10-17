import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Plus,
  Compass,
  Trash2,
  RotateCcw,
  Layers,
  ExternalLink,
  Navigation,
  Search,
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

type MapTileMode = 'voyager' | 'satellite' | 'dark';

const TILE_LAYERS: Record<
  MapTileMode,
  { url: string; fallbackUrl: string; label: string; attribution: string }
> = {
  voyager: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    fallbackUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    label: 'خريطة شوارع وأنهار (OSM)',
    attribution: '&copy; OpenStreetMap contributors | نهر دجلة - تكريت',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    fallbackUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    label: 'قمر صناعي (Satellite)',
    attribution: '&copy; Esri World Imagery | حوض نهر دجلة - تكريت',
  },
  dark: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    fallbackUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    label: 'خريطة طبوغرافية مائية',
    attribution: '&copy; Esri Topographic | نهر دجلة - تكريت',
  },
};

// Hydrographic coordinates of the Tigris River course passing through Tikrit
const TIGRIS_RIVER_COURSE: [number, number][] = [
  [34.695, 43.642],
  [34.6785, 43.654],
  [34.662, 43.663],
  [34.648, 43.671],
  [34.6391, 43.685],
  [34.622, 43.684],
  [34.6045, 43.6865],
  [34.588, 43.698],
  [34.569, 43.7115],
  [34.552, 43.724],
];

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

  const [tileMode, setTileMode] = useState<MapTileMode>('voyager');
  const [selectedStationId, setSelectedStationId] = useState<string>(
    stations[0]?.id || ''
  );

  // Google Maps Grounding State
  const [mapsQuery, setMapsQuery] = useState<string>('');
  const [mapsGroundingText, setMapsGroundingText] = useState<string>('');
  const [mapsPlaces, setMapsPlaces] = useState<
    Array<{ title: string; uri: string; reviewSnippets?: string[] }>
  >([]);
  const [isLoadingMapsAi, setIsLoadingMapsAi] = useState<boolean>(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const markerMapRef = useRef<Record<string, L.CircleMarker>>({});

  const selectedStation =
    stations.find((s) => s.id === selectedStationId) || stations[0] || null;

  // Focus & fly to a specific station on the map and open its popup
  const handleFocusStationOnMap = useCallback((st: SamplingStation) => {
    setSelectedStationId(st.id);
    setLat(st.lat.toFixed(4));
    setLng(st.lng.toFixed(4));
    const map = mapInstanceRef.current;
    if (!map) return;

    map.invalidateSize();
    map.flyTo([st.lat, st.lng], 13, { duration: 0.6 });
    const marker = markerMapRef.current[st.id];
    if (marker) {
      setTimeout(() => {
        marker.openPopup();
      }, 300);
    }
  }, []);

  // Initialize Leaflet Map centered on Tikrit / Saladin Governorate (Tigris River)
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || mapInstanceRef.current) return;

    const map = L.map(container, {
      center: [34.622, 43.682],
      zoom: 12,
      scrollWheelZoom: true,
      zoomControl: true,
    });

    const initialConfig = TILE_LAYERS[tileMode];
    const tLayer = L.tileLayer(initialConfig.url, {
      attribution: initialConfig.attribution,
      maxZoom: 19,
      crossOrigin: true,
    });

    // Automatic fallback if primary tile server fails
    tLayer.on('tileerror', () => {
      if (tileLayerRef.current && initialConfig.fallbackUrl) {
        tileLayerRef.current.setUrl(initialConfig.fallbackUrl);
      }
    });

    tLayer.addTo(map);
    tileLayerRef.current = tLayer;

    // Draw hydrographic course of the Tigris River through Tikrit
    L.polyline(TIGRIS_RIVER_COURSE, {
      color: '#06b6d4',
      weight: 6,
      opacity: 0.55,
      lineCap: 'round',
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = layerGroup;

    map.on('click', (e: L.LeafletMouseEvent) => {
      setLat(e.latlng.lat.toFixed(4));
      setLng(e.latlng.lng.toFixed(4));
      setFormMsg(
        `تم التقاط الإحداثيات الميدانية من الخريطة: (${e.latlng.lat.toFixed(
          4
        )}°N, ${e.latlng.lng.toFixed(4)}°E)`
      );
    });

    mapInstanceRef.current = map;

    // Multi-stage invalidateSize + ResizeObserver so map ALWAYS opens at full dimensions
    requestAnimationFrame(() => map.invalidateSize());
    const t1 = window.setTimeout(() => map.invalidateSize(), 120);
    const t2 = window.setTimeout(() => map.invalidateSize(), 450);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        map.invalidateSize();
      });
      observer.observe(container);
    }

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      observer?.disconnect();
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  // Switch tile mode dynamically
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const cfg = TILE_LAYERS[tileMode];
    const newLayer = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: 19,
      crossOrigin: true,
    });

    newLayer.on('tileerror', () => {
      newLayer.setUrl(cfg.fallbackUrl);
    });

    newLayer.addTo(map);
    tileLayerRef.current = newLayer;
    map.invalidateSize();
  }, [tileMode]);

  // Render station markers whenever stations list updates
  useEffect(() => {
    const layerGroup = markersLayerRef.current;
    const map = mapInstanceRef.current;
    if (!layerGroup || !map) return;

    layerGroup.clearLayers();
    markerMapRef.current = {};

    stations.forEach((st, idx) => {
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
        radius: 11,
        fillColor: style.fill,
        color: '#ffffff',
        weight: 2.5,
        opacity: 1,
        fillOpacity: 0.92,
      });

      const popupHtml = `
        <div style="direction:rtl;text-align:right;font-family:'Cairo',sans-serif;min-width:225px;">
          <div style="font-weight:800;font-size:13px;margin-bottom:3px;color:#0f172a;">${st.name}</div>
          <div style="font-size:11px;color:#475569;margin-bottom:6px;">${st.locationArea} · ${st.sampleType}</div>
          <div style="font-size:11px;font-family:'Cairo',sans-serif;background:#f8fafc;padding:7px;border-radius:8px;border:1px solid #e2e8f0;line-height:1.6;">
            <div>مستوى التلوث: <strong style="color:${style.fill}">${style.label}</strong> (WQI: ${st.wqi})</div>
            <div>العكورة: ${st.turbidityNTU} NTU | BOD5: ${st.bodMgL} mg/L</div>
            <div>TDS: ${st.tdsMgL} mg/L | pH: ${st.ph}</div>
            <div style="direction:ltr;text-align:right;">${st.lat.toFixed(4)}°N, ${st.lng.toFixed(4)}°E</div>
          </div>
          <div style="margin-top:6px;text-align:left;">
            <a href="https://www.google.com/maps/search/?api=1&query=${st.lat},${st.lng}" target="_blank" rel="noopener noreferrer" style="font-size:11px;font-weight:700;color:#059669;text-decoration:none;">
              فتح الموقع في خرائط Google &larr;
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.bindTooltip(`${idx + 1}. ${st.name.replace(/محطة\s*\(\d+\):\s*/, '')}`, {
        direction: 'top',
        offset: [0, -10],
      });

      marker.on('click', () => {
        setSelectedStationId(st.id);
        setLat(st.lat.toFixed(4));
        setLng(st.lng.toFixed(4));
      });

      marker.addTo(layerGroup);
      markerMapRef.current[st.id] = marker;
    });

    // Open the first station popup automatically so the map is immediately informative
    if (stations.length > 0) {
      const activeSt =
        stations.find((s) => s.id === selectedStationId) || stations[0];
      const activeMarker = markerMapRef.current[activeSt.id];
      if (activeMarker) {
        setTimeout(() => {
          map.invalidateSize();
          activeMarker.openPopup();
        }, 250);
      }
    }
  }, [stations]);

  const handleRunGoogleMapsGrounding = async (customQuery?: string) => {
    setIsLoadingMapsAi(true);
    try {
      const targetStation = selectedStation || stations[0];
      const res = await fetch('/api/gemini/maps-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query:
            customQuery ||
            mapsQuery ||
            `تحليل جغرافي وبيئي لموقع ${
              targetStation?.name || 'نهر دجلة في مدينة تكريت'
            } والمعالم المائية القريبة في محافظة صلاح الدين`,
          latitude: targetStation?.lat ?? 34.6125,
          longitude: targetStation?.lng ?? 43.682,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMapsGroundingText(data.text || '');
        setMapsPlaces(Array.isArray(data.places) ? data.places : []);
      }
    } catch {
      // Keep existing state
    } finally {
      setIsLoadingMapsAi(false);
    }
  };

  useEffect(() => {
    handleRunGoogleMapsGrounding(
      'ما هي أبرز محطات المياه والجسور والمعالم البيئية والجامعية القريبة من نهر دجلة في مدينة تكريت؟'
    );
  }, []);

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
    setSelectedStationId(newSt.id);
    setName('');
    setFormMsg(`تمت إضافة "${newSt.name}" وفتح موقعها على الخريطة بنجاح.`);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
      mapInstanceRef.current.flyTo([numLat, numLng], 14, { duration: 0.6 });
    }
  };

  const levelText = (lvl: 'low' | 'medium' | 'high') => {
    if (lvl === 'low') return 'منخفض (آمن)';
    if (lvl === 'medium') return 'متوسط (مراقبة)';
    return 'مرتفع (تلوث حرج)';
  };

  const levelDotClass = (lvl: 'low' | 'medium' | 'high') => {
    if (lvl === 'low') return 'bg-emerald-500';
    if (lvl === 'medium') return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const levelColorClass = (lvl: 'low' | 'medium' | 'high') => {
    if (lvl === 'low') return 'text-emerald-600 dark:text-emerald-400';
    if (lvl === 'medium') return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  return (
    <div className="space-y-6">
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
                    المتطلب الحيوي BOD5 (mg/L)
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

        {/* Interactive Leaflet Map + Layer Switcher + Station Quick-Bar (8 cols) */}
        <div
          className={`lg:col-span-8 rounded-xl border p-6 flex flex-col justify-between ${
            darkMode
              ? 'bg-slate-900 border-slate-800'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="space-y-3 mb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Compass className="w-5 h-5 text-teal-600 shrink-0" />
                  <span>
                    خريطة الرصد البيئي الميداني — محافظة صلاح الدين / مدينة
                    تكريت (نهر دجلة)
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  انقر على أي محطة للانتقال إليها مباشرة على الخريطة أو انقر على
                  مجرى النهر لالتقاط إحداثيات جديدة
                </p>
              </div>

              {/* Layer Mode Switcher */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                <Layers className="w-3.5 h-3.5 text-teal-500 mx-1" />
                {(['voyager', 'satellite', 'dark'] as MapTileMode[]).map(
                  (mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setTileMode(mode)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                        tileMode === mode
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      {TILE_LAYERS[mode].label}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Quick Station Selector Pills & Legend */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {stations.map((st, idx) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleFocusStationOnMap(st)}
                    data-testid={`focus-station-btn-${idx}`}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      selectedStation?.id === st.id
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-500'
                        : darkMode
                        ? 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full inline-block ${levelDotClass(
                        st.pollutionLevel
                      )}`}
                    />
                    <span>
                      محطة ({idx + 1}):{' '}
                      {st.name.replace(/محطة\s*\(\d+\):\s*/, '')}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 text-[11px] font-semibold">
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  <span>منخفض (&lt;35)</span>
                </span>
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  <span>متوسط (35-68)</span>
                </span>
                <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                  <span>مرتفع (&gt;68)</span>
                </span>
              </div>
            </div>
          </div>

          {/* Leaflet Map Container with explicit LTR direction so RTL never breaks tiles */}
          <div
            ref={mapContainerRef}
            dir="ltr"
            data-testid="leaflet-map-container"
            className="w-full h-[380px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 relative"
          />

          {/* Selected Station Inspector Strip Below Map */}
          {selectedStation && (
            <div
              className={`mt-3 p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
                darkMode
                  ? 'bg-slate-950 border-slate-800'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="space-y-0.5">
                <div className="font-bold flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full inline-block ${levelDotClass(
                      selectedStation.pollutionLevel
                    )}`}
                  />
                  <span>{selectedStation.name}</span>
                  <span className="text-slate-400 font-normal">
                    ({selectedStation.locationArea})
                  </span>
                </div>
                <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  العكورة: {selectedStation.turbidityNTU} NTU · BOD5:{' '}
                  {selectedStation.bodMgL} mg/L · TDS: {selectedStation.tdsMgL}{' '}
                  mg/L · pH: {selectedStation.ph} · WQI: {selectedStation.wqi}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleFocusStationOnMap(selectedStation)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>تكبير الموقع على الخريطة</span>
                </button>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${selectedStation.lat},${selectedStation.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 font-bold flex items-center gap-1.5 hover:bg-cyan-500/20"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>فتح في خرائط Google</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Google Maps Grounding Panel for Tigris River & Tikrit */}
      <div
        className={`rounded-xl border p-6 ${
          darkMode
            ? 'bg-slate-900 border-slate-800'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>
                الربط الجغرافي الذكي مع خرائط Google (Google Maps Grounding —
                نهر دجلة وتكريت)
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              استعلام جغرافي حي عن محطات المياه والمعالم البيئية والمختبرية على
              مجرى نهر دجلة في محافظة صلاح الدين
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRunGoogleMapsGrounding();
            }}
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <input
              type="text"
              value={mapsQuery}
              onChange={(e) => setMapsQuery(e.target.value)}
              placeholder="ابحث في خرائط تكريت ونهر دجلة..."
              className={`flex-1 sm:w-72 rounded-lg border px-3 py-1.5 text-xs ${
                darkMode
                  ? 'bg-slate-950 border-slate-700 text-slate-100'
                  : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
            <button
              type="submit"
              disabled={isLoadingMapsAi}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{isLoadingMapsAi ? 'جاري البحث...' : 'تحليل الموقع'}</span>
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <div
            className={`lg:col-span-7 rounded-xl border p-4 text-xs leading-relaxed whitespace-pre-line ${
              darkMode
                ? 'bg-slate-950 border-slate-800 text-slate-200'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            {mapsGroundingText ||
              'جاري تحميل البيانات الجغرافية لحوض نهر دجلة في مدينة تكريت...'}
          </div>

          <div className="lg:col-span-5 grid grid-cols-1 gap-2.5">
            {mapsPlaces.map((pl, i) => (
              <a
                key={i}
                href={pl.uri}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                  darkMode
                    ? 'bg-slate-950 border-slate-800 hover:border-emerald-500/50'
                    : 'bg-slate-50 border-slate-200 hover:border-emerald-500'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {pl.title}
                  </div>
                  {pl.reviewSnippets?.[0] && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {pl.reviewSnippets[0]}
                    </div>
                  )}
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
              </a>
            ))}
          </div>
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
                <th className="py-3 px-3 font-semibold">
                  الإحداثيات (Lat, Lng)
                </th>
                <th className="py-3 px-3 font-semibold">نوع العينة</th>
                <th className="py-3 px-3 font-semibold">
                  العكورة / BOD5 / TDS
                </th>
                <th className="py-3 px-3 font-semibold">
                  مؤشر WQI ومستوى التلوث
                </th>
                <th className="py-3 px-3 font-semibold text-center">
                  إجراءات الخريطة
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {stations.map((st) => (
                <tr
                  key={st.id}
                  onClick={() => handleFocusStationOnMap(st)}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
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
                    <span
                      className={`inline-flex items-center gap-1.5 ${levelColorClass(
                        st.pollutionLevel
                      )}`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full inline-block ${levelDotClass(
                          st.pollutionLevel
                        )}`}
                      />
                      <span>
                        {levelText(st.pollutionLevel)} — WQI: {st.wqi}
                      </span>
                    </span>
                  </td>
                  <td
                    className="py-3 px-3 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleFocusStationOnMap(st)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold cursor-pointer"
                      >
                        عرض على الخريطة
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteStation(st.id)}
                        aria-label={`حذف محطة ${st.name}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
