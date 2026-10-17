import React, { useState, useMemo, useEffect } from 'react';
import {
  Calculator,
  Eye,
  Sliders,
  MapPin,
  FileText,
  Sun,
  Moon,
  Download,
  MessageSquare,
  Settings,
  Box,
  FlaskConical,
  Award,
  Sparkles,
} from 'lucide-react';
import {
  ExperimentRecord,
  SamplingStation,
  INITIAL_EXPERIMENT_RECORDS,
  INITIAL_SAMPLING_STATIONS,
  simulateDoseResponseCurve,
} from './utils/bioremediationLogic';
import { CalculatorTab } from './components/CalculatorTab';
import { VisionLabTab } from './components/VisionLabTab';
import { SimulatorTab } from './components/SimulatorTab';
import { GeoMapTab } from './components/GeoMapTab';
import { DiscussionAndScienceTab } from './components/DiscussionAndScienceTab';
import { Interactive3DBioLab } from './components/Interactive3DBioLab';
import { LabSolutionsAndWqiTab } from './components/LabSolutionsAndWqiTab';
import { WelcomeSplash3D } from './components/WelcomeSplash3D';
import { HolographicIdModal } from './components/HolographicIdModal';
import { ScientificChatbot } from './components/ScientificChatbot';
import {
  SettingsModal,
  UserSettings,
  DEFAULT_USER_SETTINGS,
} from './components/SettingsModal';
import { exportStandaloneSingleFileHTML } from './utils/singleFileExporter';
import { generateAndDownloadAcademicPDF } from './utils/pdfReportGenerator';

type ActiveTabId =
  | 'calculator'
  | 'biolab3d'
  | 'solutions_wqi'
  | 'vision'
  | 'simulator'
  | 'geomap'
  | 'discussion';

const STORAGE_KEY = 'ecobio_user_settings_v2';

export default function App() {
  // Show 3D Welcome Splash Screen on initial load unless ?autostart=1 is provided
  const [isSplashOpen, setIsSplashOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return false;
      }
    }
    return true;
  });

  const [activeTab, setActiveTab] = useState<ActiveTabId>('calculator');
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isHoloIdOpen, setIsHoloIdOpen] = useState<boolean>(false);

  const [userSettings, setUserSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_USER_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // Fallback to default
    }
    return { ...DEFAULT_USER_SETTINGS, darkMode: true };
  });

  const darkMode = userSettings.darkMode;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userSettings));
    } catch {
      // Ignore storage errors
    }
  }, [userSettings]);

  const [records, setRecords] = useState<ExperimentRecord[]>(
    INITIAL_EXPERIMENT_RECORDS
  );
  const [stations, setStations] = useState<SamplingStation[]>(
    INITIAL_SAMPLING_STATIONS
  );
  const [globalWqi, setGlobalWqi] = useState<number>(21.4);
  const [globalQe, setGlobalQe] = useState<number>(217.85);

  const [doseMgL, setDoseMgL] = useState<number>(userSettings.defaultDose);
  const [contactTimeMin, setContactTimeMin] = useState<number>(
    userSettings.defaultContactTime
  );
  const [ph, setPh] = useState<number>(userSettings.defaultPh);
  const [treatmentId, setTreatmentId] = useState<string>('plant_extract');

  const handleSaveSettings = (newSettings: UserSettings) => {
    setUserSettings(newSettings);
    setDoseMgL(newSettings.defaultDose);
    setContactTimeMin(newSettings.defaultContactTime);
    setPh(newSettings.defaultPh);
  };

  const handleResetSettings = () => {
    setUserSettings({ ...DEFAULT_USER_SETTINGS, darkMode: true });
    setDoseMgL(DEFAULT_USER_SETTINGS.defaultDose);
    setContactTimeMin(DEFAULT_USER_SETTINGS.defaultContactTime);
    setPh(DEFAULT_USER_SETTINGS.defaultPh);
  };

  const toggleDarkMode = () => {
    setUserSettings((prev) => ({ ...prev, darkMode: !prev.darkMode }));
  };

  const simulationResult = useMemo(
    () =>
      simulateDoseResponseCurve(doseMgL, contactTimeMin, ph, treatmentId),
    [doseMgL, contactTimeMin, ph, treatmentId]
  );

  const avgEfficiency = useMemo(() => {
    if (records.length === 0) return 0;
    const sum = records.reduce((acc, r) => acc + r.efficiency, 0);
    return Number((sum / records.length).toFixed(2));
  }, [records]);

  const handleAddRecord = (rec: ExperimentRecord) => {
    setRecords((prev) => [rec, ...prev]);
  };

  const handleDeleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const handleResetRecords = () => {
    setRecords(INITIAL_EXPERIMENT_RECORDS);
  };

  const handleAddStation = (st: SamplingStation) => {
    setStations((prev) => [st, ...prev]);
  };

  const handleDeleteStation = (id: string) => {
    setStations((prev) => prev.filter((s) => s.id !== id));
  };

  const handleResetStations = () => {
    setStations(INITIAL_SAMPLING_STATIONS);
  };

  const handleQuickPdfExport = () => {
    generateAndDownloadAcademicPDF(
      records,
      stations,
      simulationResult,
      `الفصل الرابع: النتائج والمناقشة العلمية — إعداد الباحث: مؤمن خلف عبدالله — قسم علوم الحياة / كلية التربية للعلوم الصرفة / جامعة تكريت. متوسط كفاءة الإزالة الحيوية: ${avgEfficiency}% مع فرق معنوي إحصائياً عند مستوى P ≤ 0.05 وسعة امتزاز qe = ${globalQe} mg/g ومؤشر جودة مياه موحد WQI = ${globalWqi}.`,
      userSettings
    );
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      {/* 1. Full-Screen 3D Welcome Splash Screen & Onboarding */}
      <WelcomeSplash3D
        isOpen={isSplashOpen}
        onEnterPlatform={() => setIsSplashOpen(false)}
        onOpenSmartAssistant={() => {
          setIsSplashOpen(false);
          setActiveTab('discussion');
        }}
      />

      <div
        className={`min-h-screen overflow-x-hidden transition-colors ${
          darkMode
            ? 'bg-slate-950 text-slate-100'
            : 'bg-slate-50 text-slate-900'
        }`}
      >
        {/* Top Navigation Bar (Strict 3-Zone Top Bar Contract, Zero Emojis) */}
        <header
          className={`flex items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6 py-4 border-b transition-colors ${
            darkMode
              ? 'bg-slate-900/95 border-slate-800'
              : 'bg-white border-slate-200'
          }`}
        >
          {/* Zone 1: Brand Wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('calculator');
            }}
            className="text-lg font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0"
          >
            EcoBio AI
          </a>

          {/* Zone 2: Clean Single-Line Navigation Links */}
          <nav
            aria-label="أقسام المنصة العلمية"
            className="hidden lg:flex items-center gap-5 text-xs font-bold"
          >
            <button
              type="button"
              onClick={() => setActiveTab('calculator')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'calculator'
                  ? 'text-emerald-600 dark:text-emerald-400 underline underline-offset-8 decoration-2'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              الإحصاء الحيوي والكفاءة
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('biolab3d')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'biolab3d'
                  ? 'text-emerald-600 dark:text-emerald-400 underline underline-offset-8 decoration-2'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              المختبر الجزيئي 3D
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('solutions_wqi')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'solutions_wqi'
                  ? 'text-emerald-600 dark:text-emerald-400 underline underline-offset-8 decoration-2'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              المحاليل ومؤشر WQI
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('vision')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'vision'
                  ? 'text-emerald-600 dark:text-emerald-400 underline underline-offset-8 decoration-2'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              المختبر البصري والمطياف
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('geomap')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'geomap'
                  ? 'text-emerald-600 dark:text-emerald-400 underline underline-offset-8 decoration-2'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              خريطة الرصد
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('discussion')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'discussion'
                  ? 'text-emerald-600 dark:text-emerald-400 underline underline-offset-8 decoration-2'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              المساعد الذكي والتقرير
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setIsHoloIdOpen(true)}
              data-testid="open-holo-id-btn"
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              بطاقة هوية المشروع (3D ID)
            </button>
          </div>
        </header>

        {/* Main Workspace Container */}
        <main className="max-w-[1380px] mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Researcher Identity & Futuristic Scientific Dashboard Toolbar */}
          <section
            className={`rounded-xl border p-6 transition-colors ${
              darkMode
                ? 'bg-slate-900 border-slate-800'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="space-y-4">
              <div className="flex flex-col gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    <span>
                      جامعة تكريت — كلية التربية للعلوم الصرفة — قسم علوم الحياة
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                    EcoBio AI | النظام الذكي للمعالجة الحيوية ورصد التلوث البيئي
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-bold text-slate-900 dark:text-white">
                      إعداد الباحث: مؤمن خلف عبدالله
                    </span>
                    <span aria-hidden="true">|</span>
                    <span>
                      قسم علوم الحياة / كلية التربية للعلوم الصرفة / جامعة تكريت
                    </span>
                    <span aria-hidden="true">|</span>
                    <span>منطقة الدراسة: نهر دجلة — مدينة تكريت</span>
                  </div>
                </div>

                {/* Workspace Secondary Action Controls */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsSplashOpen(true)}
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      darkMode
                        ? 'border-slate-700 bg-slate-950 text-emerald-400 hover:bg-slate-800'
                        : 'border-slate-300 bg-slate-50 text-emerald-700 hover:bg-slate-100'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>شاشة الترحيب 3D</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsHoloIdOpen(true)}
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      darkMode
                        ? 'border-slate-700 bg-slate-950 text-cyan-400 hover:bg-slate-800'
                        : 'border-slate-300 bg-slate-50 text-cyan-700 hover:bg-slate-100'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>هوية المشروع ورمز QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleQuickPdfExport}
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      darkMode
                        ? 'border-emerald-800 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>توليد تقرير مختبري رسمي (PDF)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsChatOpen(true)}
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      darkMode
                        ? 'border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800'
                        : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                    <span>المساعد الذكي</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(true)}
                    aria-label="إعدادات المنصة"
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      darkMode
                        ? 'border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800'
                        : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5 text-emerald-500" />
                    <span>الإعدادات</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleDarkMode}
                    aria-label="تبديل المظهر الفاتح أو الداكن"
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      darkMode
                        ? 'border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800'
                        : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {darkMode ? (
                      <>
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        <span>فاتح</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-3.5 h-3.5 text-slate-600" />
                        <span>داكن</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      exportStandaloneSingleFileHTML(
                        records,
                        stations,
                        simulationResult
                      )
                    }
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      darkMode
                        ? 'border-slate-700 bg-slate-950 text-teal-400 hover:bg-slate-800'
                        : 'border-slate-300 bg-slate-50 text-teal-700 hover:bg-slate-100'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ملف HTML مستقل</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 4-Column Quantitative KPI Strip with Geometric CSS Status Dots */}
            <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  <span>متوسط كفاءة الإزالة الحيوية (R1–R3)</span>
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span
                    className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400"
                    data-testid="kpi-avg-efficiency"
                  >
                    {avgEfficiency}%
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    (P ≤ 0.05)
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" />
                  <span>سعة الامتزاز (qe) ومؤشر WQI الموحد</span>
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-bold font-mono tabular-nums text-cyan-600 dark:text-cyan-400">
                    {globalQe} mg/g
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    · WQI {globalWqi}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />
                  <span>نقطة الكفاءة القصوى المتوقعة</span>
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-bold font-mono tabular-nums text-teal-600 dark:text-teal-400">
                    {simulationResult.maxPredictedEfficiency}%
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    عند {simulationResult.optimalDose}{' '}
                    {userSettings.concentrationUnit}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  <span>محطات الرصد الميداني (تكريت)</span>
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-bold font-mono tabular-nums">
                    {stations.length}
                  </span>
                  <span className="text-xs text-slate-400">
                    محطات · pH {userSettings.defaultPh}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Interactive 7-Tab Bar Covering All 8 Requested Platform Modules */}
          <div
            role="tablist"
            aria-label="التبويبات الوظيفية للمنصة"
            className={`grid grid-cols-1 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 p-1.5 rounded-xl border ${
              darkMode
                ? 'bg-slate-900 border-slate-800'
                : 'bg-white border-slate-200'
            }`}
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'calculator'}
              onClick={() => setActiveTab('calculator')}
              className={`py-2.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'calculator'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Calculator className="w-4 h-4 shrink-0" />
              <span>1. الكفاءة والإحصاء الحيوي</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'biolab3d'}
              onClick={() => setActiveTab('biolab3d')}
              className={`py-2.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'biolab3d'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Box className="w-4 h-4 shrink-0" />
              <span>2. المختبر الجزيئي 3D</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'solutions_wqi'}
              onClick={() => setActiveTab('solutions_wqi')}
              className={`py-2.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'solutions_wqi'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FlaskConical className="w-4 h-4 shrink-0" />
              <span>3. المحاليل ومؤشر WQI و qe</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'vision'}
              onClick={() => setActiveTab('vision')}
              className={`py-2.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'vision'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Eye className="w-4 h-4 shrink-0" />
              <span>4. المختبر البصري والمطياف</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'simulator'}
              onClick={() => setActiveTab('simulator')}
              className={`py-2.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'simulator'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Sliders className="w-4 h-4 shrink-0" />
              <span>5. محاكي الجرعة المثالية</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'geomap'}
              onClick={() => setActiveTab('geomap')}
              className={`py-2.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'geomap'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <MapPin className="w-4 h-4 shrink-0" />
              <span>6. خريطة الرصد الميداني</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'discussion'}
              onClick={() => setActiveTab('discussion')}
              className={`py-2.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'discussion'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>7. المساعد الذكي والتقرير PDF</span>
            </button>
          </div>

          {/* Active Tab Content */}
          <div className="min-h-[540px]">
            {activeTab === 'calculator' && (
              <CalculatorTab
                records={records}
                onAddRecord={handleAddRecord}
                onDeleteRecord={handleDeleteRecord}
                onResetRecords={handleResetRecords}
                darkMode={darkMode}
                userSettings={userSettings}
              />
            )}

            {activeTab === 'biolab3d' && (
              <Interactive3DBioLab darkMode={darkMode} />
            )}

            {activeTab === 'solutions_wqi' && (
              <LabSolutionsAndWqiTab
                darkMode={darkMode}
                onUpdateGlobalWqiAndQe={(wqi, qe) => {
                  setGlobalWqi(wqi);
                  setGlobalQe(qe);
                }}
              />
            )}

            {activeTab === 'vision' && <VisionLabTab darkMode={darkMode} />}

            {activeTab === 'simulator' && (
              <SimulatorTab
                doseMgL={doseMgL}
                contactTimeMin={contactTimeMin}
                ph={ph}
                treatmentId={treatmentId}
                onChangeDose={setDoseMgL}
                onChangeTime={setContactTimeMin}
                onChangePh={setPh}
                onChangeTreatment={setTreatmentId}
                simulationResult={simulationResult}
                darkMode={darkMode}
              />
            )}

            {activeTab === 'geomap' && (
              <GeoMapTab
                stations={stations}
                onAddStation={handleAddStation}
                onDeleteStation={handleDeleteStation}
                onResetStations={handleResetStations}
                darkMode={darkMode}
              />
            )}

            {activeTab === 'discussion' && (
              <DiscussionAndScienceTab
                records={records}
                stations={stations}
                simulationResult={simulationResult}
                stationsCount={stations.length}
                darkMode={darkMode}
                userSettings={userSettings}
                globalWqi={globalWqi}
                globalQe={globalQe}
              />
            )}
          </div>
        </main>

        {/* Official Academic Footer */}
        <footer
          className={`mt-12 border-t px-6 py-5 text-xs transition-colors ${
            darkMode
              ? 'border-slate-800 bg-slate-900/60 text-slate-400'
              : 'border-slate-200 bg-white text-slate-500'
          }`}
        >
          <div className="max-w-[1380px] mx-auto flex flex-wrap items-center justify-between gap-4">
            <div>
              EcoBio AI | النظام الذكي للمعالجة الحيوية ورصد التلوث البيئي ·
              إعداد الباحث: مؤمن خلف عبدالله — قسم علوم الحياة / كلية التربية
              للعلوم الصرفة / جامعة تكريت
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setIsHoloIdOpen(true)}
                className="hover:underline flex items-center gap-1 cursor-pointer text-cyan-600 dark:text-cyan-400 font-semibold"
              >
                <Award className="w-3.5 h-3.5" />
                <span>بطاقة هوية المشروع (3D ID)</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>إعدادات المنصة</span>
              </button>
              <button
                type="button"
                onClick={() => setIsChatOpen(true)}
                className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>فتح محادثة المساعد العلمي</span>
              </button>
            </div>
          </div>
        </footer>

        {/* 3D Holographic Project ID Modal */}
        <HolographicIdModal
          isOpen={isHoloIdOpen}
          onClose={() => setIsHoloIdOpen(false)}
          avgEfficiency={avgEfficiency}
          wqiScore={globalWqi}
          totalExperiments={records.length}
        />

        {/* User Settings Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={userSettings}
          onSaveSettings={handleSaveSettings}
          onResetSettings={handleResetSettings}
        />

        {/* Multi-turn Scientific Chatbot Slide-over */}
        <ScientificChatbot
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          records={records}
          darkMode={darkMode}
        />
      </div>
    </div>
  );
}
