import React, { useState, useEffect } from 'react';
import {
  Settings,
  X,
  Sun,
  Moon,
  Sliders,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { TREATMENT_TYPES } from '../utils/bioremediationLogic';

export interface UserSettings {
  darkMode: boolean;
  concentrationUnit: 'mg/L' | 'ppm' | 'µg/L';
  turbidityUnit: 'NTU' | 'FTU';
  defaultTreatmentType: string;
  defaultDose: number;
  defaultContactTime: number;
  defaultPh: number;
  preferredStandard: 'IQS 417' | 'WHO' | 'EPA';
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  darkMode: false,
  concentrationUnit: 'mg/L',
  turbidityUnit: 'NTU',
  defaultTreatmentType: TREATMENT_TYPES[0].name,
  defaultDose: 65,
  defaultContactTime: 45,
  defaultPh: 7.2,
  preferredStandard: 'IQS 417',
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSaveSettings: (newSettings: UserSettings) => void;
  onResetSettings: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetSettings,
}) => {
  const [draft, setDraft] = useState<UserSettings>(settings);
  const [savedBanner, setSavedBanner] = useState<boolean>(false);

  useEffect(() => {
    setDraft(settings);
    setSavedBanner(false);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(draft);
    setSavedBanner(true);
    setTimeout(() => {
      setSavedBanner(false);
      onClose();
    }, 450);
  };

  const handleReset = () => {
    setDraft(DEFAULT_USER_SETTINGS);
    onResetSettings();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div
        className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden transition-colors ${
          draft.darkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-600/10 text-emerald-600">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 id="settings-modal-title" className="text-base font-bold">
                إعدادات المنصة والتفضيلات المختبرية (User Settings)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                تخصيص المظهر، وحدات القياس، والقيم الافتراضية للحاسبة والمحاكي
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة الإعدادات"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 1. Theme Toggle Section */}
          <div>
            <span className="block text-xs font-bold mb-2.5 text-slate-700 dark:text-slate-300">
              1. مظهر المنصة (Theme Mode)
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, darkMode: false }))}
                className={`py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  !draft.darkMode
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-800'
                    : 'border-slate-700 bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>الوضع الفاتح المختبري (Light)</span>
              </button>

              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, darkMode: true }))}
                className={`py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  draft.darkMode
                    ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900'
                }`}
              >
                <Moon className="w-4 h-4 text-teal-500" />
                <span>الوضع الداكن العلمي (Dark)</span>
              </button>
            </div>
          </div>

          {/* 2. Preferred Measurement Units */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div>
              <label
                htmlFor="settings-conc-unit"
                className="block text-xs font-semibold mb-1.5"
              >
                وحدة التراكيز الكيميائية
              </label>
              <select
                id="settings-conc-unit"
                value={draft.concentrationUnit}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    concentrationUnit: e.target.value as UserSettings['concentrationUnit'],
                  }))
                }
                className={`w-full rounded-lg border px-3 py-2 text-xs font-mono ${
                  draft.darkMode
                    ? 'bg-slate-950 border-slate-700 text-slate-100'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="mg/L">mg/L (ملغم/لتر)</option>
                <option value="ppm">ppm (جزء بالمليون)</option>
                <option value="µg/L">µg/L (مايكروغرام/لتر)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="settings-turb-unit"
                className="block text-xs font-semibold mb-1.5"
              >
                وحدة قياس العكورة
              </label>
              <select
                id="settings-turb-unit"
                value={draft.turbidityUnit}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    turbidityUnit: e.target.value as UserSettings['turbidityUnit'],
                  }))
                }
                className={`w-full rounded-lg border px-3 py-2 text-xs font-mono ${
                  draft.darkMode
                    ? 'bg-slate-950 border-slate-700 text-slate-100'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="NTU">NTU (Nephelometric)</option>
                <option value="FTU">FTU (Formazin Unit)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="settings-standard"
                className="block text-xs font-semibold mb-1.5"
              >
                المرجع القياسي المفضل
              </label>
              <select
                id="settings-standard"
                value={draft.preferredStandard}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    preferredStandard: e.target.value as UserSettings['preferredStandard'],
                  }))
                }
                className={`w-full rounded-lg border px-3 py-2 text-xs font-mono ${
                  draft.darkMode
                    ? 'bg-slate-950 border-slate-700 text-slate-100'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="IQS 417">المواصفة العراقية IQS 417</option>
                <option value="WHO">منظمة الصحة العالمية WHO</option>
                <option value="EPA">وكالة حماية البيئة EPA</option>
              </select>
            </div>
          </div>

          {/* 3. Default Experimental Input Values */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold">
              <Sliders className="w-4 h-4 text-emerald-600" />
              <span>
                3. القيم الافتراضية لحقول الإدخال المختبرية (Default Field
                Values)
              </span>
            </div>

            <div>
              <label
                htmlFor="settings-default-treatment"
                className="block text-xs font-semibold mb-1.5"
              >
                المادة المعالجة الافتراضية عند الإدخال
              </label>
              <select
                id="settings-default-treatment"
                value={draft.defaultTreatmentType}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    defaultTreatmentType: e.target.value,
                  }))
                }
                className={`w-full rounded-lg border px-3 py-2 text-xs ${
                  draft.darkMode
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
                  htmlFor="settings-default-dose"
                  className="block text-xs font-semibold mb-1"
                >
                  الجرعة الافتراضية ({draft.concentrationUnit})
                </label>
                <input
                  id="settings-default-dose"
                  type="number"
                  step="any"
                  min={1}
                  max={500}
                  value={draft.defaultDose}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      defaultDose: Number(e.target.value) || 65,
                    }))
                  }
                  className={`w-full rounded-lg border px-3 py-2 text-xs font-mono tabular-nums ${
                    draft.darkMode
                      ? 'bg-slate-950 border-slate-700 text-slate-100'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label
                  htmlFor="settings-default-time"
                  className="block text-xs font-semibold mb-1"
                >
                  وقت التماس الافتراضي (دقيقة)
                </label>
                <input
                  id="settings-default-time"
                  type="number"
                  step="any"
                  min={1}
                  max={300}
                  value={draft.defaultContactTime}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      defaultContactTime: Number(e.target.value) || 45,
                    }))
                  }
                  className={`w-full rounded-lg border px-3 py-2 text-xs font-mono tabular-nums ${
                    draft.darkMode
                      ? 'bg-slate-950 border-slate-700 text-slate-100'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label
                  htmlFor="settings-default-ph"
                  className="block text-xs font-semibold mb-1"
                >
                  الأس الهيدروجيني الافتراضي (pH)
                </label>
                <input
                  id="settings-default-ph"
                  type="number"
                  step="0.1"
                  min={1}
                  max={14}
                  value={draft.defaultPh}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      defaultPh: Number(e.target.value) || 7.2,
                    }))
                  }
                  className={`w-full rounded-lg border px-3 py-2 text-xs font-mono tabular-nums ${
                    draft.darkMode
                      ? 'bg-slate-950 border-slate-700 text-slate-100'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>
          </div>

          {savedBanner && (
            <div
              role="status"
              className="p-3 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>تم حفظ وتطبيق إعدادات المنصة بنجاح!</span>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة الافتراضي</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                حفظ وتطبيق الإعدادات
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
