import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  X,
  Bot,
  User,
  BrainCircuit,
  ShieldCheck,
} from 'lucide-react';
import {
  ExperimentRecord,
  generateBuiltInExpertResponse,
} from '../utils/bioremediationLogic';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  modelBadge?: string;
}

interface ScientificChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  records: ExperimentRecord[];
  darkMode: boolean;
}

export const ScientificChatbot: React.FC<ScientificChatbotProps> = ({
  isOpen,
  onClose,
  records,
  darkMode,
}) => {
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>(
    'المعالجة الحيوية بالطحالب والمستخلصات النباتية'
  );
  const [input, setInput] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      text: 'مرحباً بك يا باحث مؤمن خلف عبدالله (قسم علوم الحياة / كلية التربية للعلوم الصرفة / جامعة تكريت). أنا المساعد العلمي الذكي لمنصة EcoBio AI والمزود بمحرك الخبير البيئي الداخلي (Built-In Scientific Expert Engine). يمكنك سؤالي عن تفسير نتائج كفاءة الإزالة، المعنوية الإحصائية (P ≤ 0.05)، سعة الامتزاز (qe)، أو مؤشر جودة المياه (WQI).',
      modelBadge: 'Built-In Scientific Expert Engine',
    },
  ]);

  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const sendQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || isSending) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInput('');
    setIsSending(true);

    const builtInExpertReply = generateBuiltInExpertResponse(trimmed, {
      specialty: selectedSpecialty,
      researchNotes:
        'مشروع تخرج الباحث مؤمن خلف عبدالله — قسم علوم الحياة / كلية التربية للعلوم الصرفة / جامعة تكريت',
      records,
      wqiScore: 21.4,
      qeValue: records[0]?.adsorptionCapacityQe ?? 217.85,
      optimalDose: 65,
      optimalTime: 45,
      optimalPh: 7.2,
    });

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedHistory.map((m) => ({
            role: m.role,
            text: m.text,
          })),
          modelTier: 'pro',
          experimentSummary: records.map((r) => ({
            pollutant: r.pollutantName,
            ci: r.ci,
            cf: r.cf,
            efficiency: r.efficiency,
            treatment: r.treatmentType,
          })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.reply && !String(data.reply).includes('تعذر')) {
          setMessages((prev) => [
            ...prev,
            {
              id: `a-${Date.now()}`,
              role: 'assistant',
              text: data.reply,
              modelBadge:
                data.modelUsed || 'Built-In Scientific Expert Engine',
            },
          ]);
          setIsSending(false);
          return;
        }
      }
    } catch {
      // Anti-Error Engine intercepts any connection failure and uses Built-In Expert Engine
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: builtInExpertReply,
        modelBadge: 'Built-In Scientific Expert Engine (Anti-Error Active)',
      },
    ]);
    setIsSending(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/60"
      role="dialog"
      aria-modal="true"
      aria-label="المساعد العلمي الذكي ومحرك الخبير البيئي"
    >
      <div
        className={`w-full max-w-lg h-full flex flex-col justify-between border-r shadow-2xl ${
          darkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-600 text-white">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold">
                  المساعد الذكي ومحرك الخبير البيئي المدمج
                </h2>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>حماية Anti-Error مفعلة · جامعة تكريت</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق نافذة المساعد العلمي"
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Specialization Selector */}
          <div>
            <label
              htmlFor="drawer-specialty-select"
              className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1"
            >
              توجيه وتدريب المساعد على التخصص:
            </label>
            <select
              id="drawer-specialty-select"
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className={`w-full rounded-lg border px-2.5 py-1.5 text-xs ${
                darkMode
                  ? 'bg-slate-950 border-slate-700 text-slate-100'
                  : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            >
              <option value="المعالجة الحيوية بالطحالب والمستخلصات النباتية">
                المعالجة الحيوية بالطحالب والمستخلصات النباتية
              </option>
              <option value="الإحصاء الحيوي وتفسير ANOVA / t-test (P ≤ 0.05)">
                الإحصاء الحيوي وتفسير ANOVA / t-test (P ≤ 0.05)
              </option>
              <option value="حركية الامتزاز (qe) والمؤشر الموحد لجودة المياه (WQI)">
                حركية الامتزاز (qe) والمؤشر الموحد لجودة المياه (WQI)
              </option>
            </select>
          </div>
        </div>

        {/* Scrollable Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  msg.role === 'user'
                    ? 'bg-teal-600 text-white'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                {msg.role === 'user' ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>

              <div
                className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed whitespace-pre-line ${
                  msg.role === 'user'
                    ? 'bg-teal-600 text-white'
                    : darkMode
                    ? 'bg-slate-950 border border-slate-800 text-slate-200'
                    : 'bg-slate-100 text-slate-800'
                }`}
              >
                {msg.text}
                {msg.modelBadge && (
                  <div className="mt-2 pt-1.5 border-t border-slate-200/40 dark:border-slate-800 text-[10px] font-mono text-emerald-500">
                    Engine: {msg.modelBadge}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="text-xs text-slate-400 font-mono px-3">
              جاري صياغة التحليل العلمي الرصين...
            </div>
          )}
          <div ref={threadEndRef} />
        </div>

        {/* Quick Prompts & Input Form */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() =>
                sendQuestion(
                  'فسّر علمياً قيم كفاءة الإزالة وسعة الامتزاز qe ومؤشر WQI والمعنوية الإحصائية P ≤ 0.05.'
                )
              }
              className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors cursor-pointer"
            >
              تفسير الإزالة و qe و WQI والمعنوية
            </button>
            <button
              type="button"
              onClick={() =>
                sendQuestion(
                  'كيف يعمل مستخلص المورينجا والطحالب المجهرية في إزالة العكورة والمعادن الثقيلة؟'
                )
              }
              className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors cursor-pointer"
            >
              آلية التخثر والامتزاز الحيوي
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendQuestion(input);
            }}
            className="flex gap-2"
          >
            <label htmlFor="chatbot-input" className="sr-only">
              اكتب سؤالك العلمي
            </label>
            <input
              id="chatbot-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اسأل المساعد العلمي الذكي..."
              className={`flex-1 rounded-lg border px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                darkMode
                  ? 'bg-slate-950 border-slate-700 text-slate-100'
                  : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
            <button
              type="submit"
              disabled={isSending}
              aria-label="إرسال السؤال"
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
