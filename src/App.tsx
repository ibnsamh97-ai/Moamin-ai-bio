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
import { ScientificChatbot } from './components/ScientificChatbot';
import {
  SettingsModal,
  UserSettings,
  DEFAULT_USER_SETTINGS,
} from './components/SettingsModal';
import { exportStandaloneSingleFileHTML } from './utils/singleFileExporter';

type ActiveTabId =
  | 'calculator'
  | 'vision'
  | 'simulator'
  | 'geomap'
  | 'discussion';

const STORAGE_KEY = 'ecobio_user_settings_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTabId>('calculator');
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // User Settings State (persisted in localStorage)
  const [userSettings, setUserSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_USER_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // Fallback to default
    }
    return DEFAULT_USER_SETTINGS;
  });

  const darkMode = userSettings.darkMode;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userSettings));
    } catch {
      // Ignore storage errors
    }
  }, [userSettings]);

  // Shared Scientific State across all 5 tabs
  const [records, setRecords] = useState<ExperimentRecord[]>(
    INITIAL_EXPERIMENT_RECORDS
  );
  const [stations, setStations] = useState<SamplingStation[]>(
    INITIAL_SAMPLING_STATIONS
  );

  // Simulator State initialized from userSettings defaults
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
    setUserSettings(DEFAULT_USER_SETTINGS);
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

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div
        className={`min-h-screen transition-colors ${
          darkMode
            ? 'bg-slate-950 text-slate-100'
            : 'bg-slate-50 text-slate-900'
        }`}
      >
        {/* Top Navigation Bar (Strict 3-Zone Top Bar Contract) */}
        <header
          className={`flex items-center justify-between gap-8 px-6 py-4 border-b transition-colors ${
            darkMode
              ? 'bg-slate-900/95 border-slate-800'
              : 'bg-white border-slate-200'
          }`}
        >
          {/* Zone 1: Single text element wordmark */}
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

          {/* Zone 2: 5 clean single-line text navigation links */}
          <nav
            aria-label="أقسام المنصة العلمية"
            className="hidden md:flex items-center gap-6 text-sm font-semibold"
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
              حاسبة الكفاءة
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
              المختبر البصري
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('simulator')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'simulator'
                  ? 'text-emerald-600 dark:text-emerald-400 underline underline-offset-8 decoration-2'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              محاكي الجرعة
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
              المفسر العلمي
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              إعدادات المنصة
            </button>
          </div>
        </header>

        {/* Main Workspace Container */}
        <main className="max-w-[1380px] mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Scientific Researcher Identity & Workspace Toolbar */}
          <section
            className={`rounded-xl border p-6 transition-colors ${
              darkMode
                ? 'bg-slate-900 border-slate-800'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                  <span>مشروع تخرج أكاديمي — قسم علوم الحياة</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    المعلوماتية الحيوية والبيئية (Bioinformatics &amp;
                    Bioremediation)
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                  EcoBio AI | المنصة الذكية لتقييم المعالجة الحيوية ورصد التلوث
                  البيئي
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-slate-900 dark:text-white">
                    إعداد الباحث: مؤمن خلف عبدالله
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>قسم علوم الحياة (مشروع تخرج)</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    منطقة الدراسة: حوض نهر دجلة — محافظة صلاح الدين / تكريت
                  </span>
                </div>
              </div>

              {/* Workspace Secondary Utilities (Theme Toggle, AI Assistant, Settings, & Single-File HTML Export) */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className={`px-3.5 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    darkMode
                      ? 'border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800'
                      : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    تفضيلات القياس ({userSettings.concentrationUnit} ·{' '}
                    {userSettings.turbidityUnit})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={toggleDarkMode}
                  aria-label="تبديل المظهر الفاتح أو الداكن"
                  className={`px-3.5 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    darkMode
                      ? 'border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800'
                      : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {darkMode ? (
                    <>
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span>الوضع الفاتح المختبري</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 text-slate-600" />
                      <span>الوضع الداكن</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsChatOpen(true)}
                  className={`px-3.5 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    darkMode
                      ? 'border-emerald-800 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>المستشار العلمي الذكي</span>
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
                  className={`px-3.5 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    darkMode
                      ? 'border-slate-700 bg-slate-950 text-teal-400 hover:bg-slate-800'
                      : 'border-slate-300 bg-slate-50 text-teal-700 hover:bg-slate-100'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تصدير ملف HTML واحد مستقل</span>
                </button>
              </div>
            </div>

            {/* 4-Column Quantitative KPI Strip */}
            <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">
                  متوسط كفاءة الإزالة الحيوية
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span
                    className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400"
                    data-testid="kpi-avg-efficiency"
                  >
                    {avgEfficiency}%
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    ({records.length} تجارب)
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">
                  نقطة الكفاءة القصوى المتوقعة
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
                <span className="text-xs text-slate-500 dark:text-slate-400 block">
                  محطات الرصد الميداني (صلاح الدين)
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-bold font-mono tabular-nums">
                    {stations.length}
                  </span>
                  <span className="text-xs text-slate-400">
                    محطات على نهر دجلة
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">
                  الأس الهيدروجيني والمرجع القياسي
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
                    pH {userSettings.defaultPh}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {userSettings.preferredStandard}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Interactive 5-Tab Bar (Accessible Segmented Control for Desktop & Mobile) */}
          <div
            role="tablist"
            aria-label="التبويبات الوظيفية للمنصة"
            className={`grid grid-cols-2 sm:grid-cols-5 gap-2 p-1.5 rounded-xl border ${
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
              className={`py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'calculator'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Calculator className="w-4 h-4 shrink-0" />
              <span>1. حاسبة كفاءة المعالجة</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'vision'}
              onClick={() => setActiveTab('vision')}
              className={`py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'vision'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Eye className="w-4 h-4 shrink-0" />
              <span>2. المختبر البصري الذكي</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'simulator'}
              onClick={() => setActiveTab('simulator')}
              className={`py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'simulator'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Sliders className="w-4 h-4 shrink-0" />
              <span>3. المحاكي التنبؤي للجرعة</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'geomap'}
              onClick={() => setActiveTab('geomap')}
              className={`py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'geomap'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <MapPin className="w-4 h-4 shrink-0" />
              <span>4. خريطة الرصد الميداني</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'discussion'}
              onClick={() => setActiveTab('discussion')}
              className={`col-span-2 sm:col-span-1 py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'discussion'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>5. المفسر العلمي للنتائج</span>
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
                simulationResult={simulationResult}
                stationsCount={stations.length}
                darkMode={darkMode}
              />
            )}
          </div>
        </main>

        {/* Quiet Academic Footer */}
        <footer
          className={`mt-12 border-t px-6 py-5 text-xs transition-colors ${
            darkMode
              ? 'border-slate-800 bg-slate-900/60 text-slate-400'
              : 'border-slate-200 bg-white text-slate-500'
          }`}
        >
          <div className="max-w-[1380px] mx-auto flex flex-wrap items-center justify-between gap-4">
            <div>
              EcoBio AI — المنصة الذكية لتقييم المعالجة الحيوية ورصد التلوث
              البيئي · إعداد الباحث: مؤمن خلف عبدالله (قسم علوم الحياة - مشروع
              تخرج)
            </div>
            <div className="flex items-center gap-4">
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
                <span>فتح محادثة المستشار الأكاديمي</span>
              </button>
            </div>
          </div>
        </footer>

        {/* User Settings Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={userSettings}
          onSaveSettings={handleSaveSettings}
          onResetSettings={handleResetSettings}
        />

        {/* Multi-turn Gemini Scientific Chatbot Slide-over */}
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
