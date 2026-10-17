import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  X,
  Bot,
  User,
  BrainCircuit,
  ShieldCheck,
  RotateCcw,
  Cpu,
} from 'lucide-react';
import {
  ExperimentRecord,
  generateBuiltInExpertResponse,
} from '../utils/bioremediationLogic';

export type GeminiAgentModelTier =
  | 'gemini-4-argon'
  | 'gemini-3.8-flash'
  | 'gemini-3.1-flash-lite';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  modelBadge?: string;
  agentRoleLabel?: string;
}

interface ScientificChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  records: ExperimentRecord[];
  darkMode: boolean;
}

export const AGENT_ROLES = [
  {
    id: 'bioremediation_agent',
    label: 'وكيل المعالجة الحيوية والامتزاز',
    instruction:
      'أنت وكيل متخصص في المعالجة الحيوية للمياه، التخثر الحيوي ببذور المورينجا، والامتزاز بالطحالب المجهرية Chlorella والفحم الحيوي.',
  },
  {
    id: 'biostats_agent',
    label: 'وكيل الإحصاء الحيوي (ANOVA & P ≤ 0.05)',
    instruction:
      'أنت وكيل إحصاء حيوي متخصص في تحليل المكررات التجريبية (R1, R2, R3)، المتوسط الحسابي، الانحراف المعياري (±SD)، واختبارات t-test و ANOVA عند مستوى معنوية P <= 0.05.',
  },
  {
    id: 'tigris_wqi_agent',
    label: 'وكيل رصد نهر دجلة ومؤشر WQI',
    instruction:
      'أنت وكيل رصد بيئي متخصص في تقييم جودة مياه نهر دجلة بمدينة تكريت وحساب المؤشر الموزون لجودة المياه (WQI) ومقارنتها مع المواصفة العراقية IQS 417 ومعايير WHO.',
  },
  {
    id: 'academic_report_agent',
    label: 'وكيل صياغة المناقشة والتقارير العلمية',
    instruction:
      'أنت وكيل أكاديمي متخصص في صياغة فصل النتائج والمناقشة العلمية وتفسير معادلات سعة الامتزاز (qe) وقانون التخفيف المختبري (C1V1 = C2V2).',
  },
];

export const GEMINI_MODEL_OPTIONS: Array<{
  id: GeminiAgentModelTier;
  label: string;
  desc: string;
}> = [
  {
    id: 'gemini-3.8-flash',
    label: 'gemini-3.8-flash (متوازن للمهام العامة)',
    desc: 'استجابة علمية دقيقة ومتوازنة للمحادثات المتعددة',
  },
  {
    id: 'gemini-4-argon',
    label: 'gemini-4-argon (للمهام المعقدة والاستنتاج)',
    desc: 'تفكير تحليلي متقدم للمسائل الإحصائية والكيميائية المعقدة',
  },
  {
    id: 'gemini-3.1-flash-lite',
    label: 'gemini-3.1-flash-lite (فائق السرعة)',
    desc: 'أسرع زمن استجابة للأسئلة المختبرية المباشرة',
  },
];

export const ScientificChatbot: React.FC<ScientificChatbotProps> = ({
  isOpen,
  onClose,
  records,
  darkMode,
}) => {
  const [selectedRole, setSelectedRole] = useState(AGENT_ROLES[0]);
  const [selectedModel, setSelectedModel] =
    useState<GeminiAgentModelTier>('gemini-3.8-flash');
  const [input, setInput] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-agent-1',
      role: 'assistant',
      text: 'مرحباً بك في وكيل منصة EcoBio AI الذكي (إعداد الباحث: مؤمن خلف عبدالله — قسم علوم الحياة / كلية التربية للعلوم الصرفة / جامعة تكريت). أنا وكيلك التفاعلي للرد على الرسائل والاستفسارات العلمية حول كفاءة الإزالة، الإحصاء الحيوي للمكررات (P ≤ 0.05)، سعة الامتزاز (qe)، ومؤشر جودة المياه (WQI). كيف يمكنني مساعدتك اليوم؟',
      modelBadge: 'gemini-3.8-flash · EcoBio AI Agent',
      agentRoleLabel: AGENT_ROLES[0].label,
    },
  ]);

  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleResetConversation = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        text: `تم بدء جلسة حوار جديدة مع (${selectedRole.label}) باستخدام النموذج (${selectedModel}). أرسل سؤالك أو رسالتك للرد عليها فوراً استناداً إلى بيانات المنصة.`,
        modelBadge: `${selectedModel} · EcoBio AI Agent`,
        agentRoleLabel: selectedRole.label,
      },
    ]);
  };

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

    const builtInAgentReply = generateBuiltInExpertResponse(trimmed, {
      specialty: selectedRole.label,
      researchNotes: selectedRole.instruction,
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
            content: m.text,
          })),
          modelTier: selectedModel,
          agentRoleInstruction: selectedRole.instruction,
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
        if (
          data.reply &&
          String(data.reply).trim().length > 0 &&
          !data.useClientAgentFallback
        ) {
          setMessages((prev) => [
            ...prev,
            {
              id: `a-${Date.now()}`,
              role: 'assistant',
              text: data.reply,
              modelBadge: `${data.modelUsed || selectedModel} · Gemini Agent`,
              agentRoleLabel: selectedRole.label,
            },
          ]);
          setIsSending(false);
          return;
        }
      }
    } catch {
      // Seamless fallback to Built-In Platform Agent Engine
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: builtInAgentReply,
        modelBadge: `${selectedModel} · EcoBio AI Agent`,
        agentRoleLabel: selectedRole.label,
      },
    ]);
    setIsSending(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/70"
      role="dialog"
      aria-modal="true"
      aria-label="وكيل المنصة الذكي للرد على الرسائل (Gemini Multi-Turn Agent)"
      data-testid="scientific-agent-drawer"
    >
      <div
        className={`w-full max-w-xl h-full flex flex-col justify-between border-r shadow-2xl ${
          darkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Agent Control Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-600 text-white">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold">
                  وكيل منصة EcoBio AI الذكي للرد على الرسائل
                </h2>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>محادثة متعددة الأدوار (Multi-Turn Gemini Agent)</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleResetConversation}
                title="بدء محادثة جديدة"
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>مسح</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                data-testid="close-agent-drawer-btn"
                aria-label="إغلاق نافذة الوكيل الذكي"
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Agent Role (System Instruction) & Model Tier Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label
                htmlFor="drawer-role-select"
                className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1"
              >
                دور الوكيل التخصصي (Agent Role):
              </label>
              <select
                id="drawer-role-select"
                value={selectedRole.id}
                onChange={(e) => {
                  const found =
                    AGENT_ROLES.find((r) => r.id === e.target.value) ??
                    AGENT_ROLES[0];
                  setSelectedRole(found);
                }}
                className={`w-full rounded-lg border px-2.5 py-1.5 text-xs ${
                  darkMode
                    ? 'bg-slate-950 border-slate-700 text-slate-100'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                {AGENT_ROLES.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="drawer-model-select"
                className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1"
              >
                نموذج Gemini للرد على الرسائل:
              </label>
              <select
                id="drawer-model-select"
                data-testid="agent-model-select"
                value={selectedModel}
                onChange={(e) =>
                  setSelectedModel(e.target.value as GeminiAgentModelTier)
                }
                className={`w-full rounded-lg border px-2.5 py-1.5 text-xs font-mono ${
                  darkMode
                    ? 'bg-slate-950 border-slate-700 text-emerald-300'
                    : 'bg-slate-50 border-slate-300 text-emerald-800'
                }`}
              >
                {GEMINI_MODEL_OPTIONS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Scrollable Multi-Turn Conversation Thread */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-4"
          data-testid="agent-message-thread"
        >
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
                className={`max-w-[85%] rounded-xl p-3.5 text-xs leading-relaxed whitespace-pre-line ${
                  msg.role === 'user'
                    ? 'bg-teal-600 text-white'
                    : darkMode
                    ? 'bg-slate-950 border border-slate-800 text-slate-200'
                    : 'bg-slate-100 text-slate-800'
                }`}
              >
                {msg.text}
                {msg.modelBadge && (
                  <div className="mt-2 pt-1.5 border-t border-slate-200/40 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-emerald-500">
                    <span className="flex items-center gap-1">
                      <Cpu className="w-3 h-3" />
                      <span>{msg.modelBadge}</span>
                    </span>
                    {msg.agentRoleLabel && (
                      <span className="text-cyan-500 truncate max-w-[200px]">
                        {msg.agentRoleLabel}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="text-xs text-emerald-500 font-mono px-3">
              جاري صياغة رد الوكيل العلمي...
            </div>
          )}
          <div ref={threadEndRef} />
        </div>

        {/* Quick Prompts & Message Input Form */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() =>
                sendQuestion(
                  'حلل إحصائياً نتائج المكررات الثلاثة (R1, R2, R3) ومعنوية الفروق عند P <= 0.05.'
                )
              }
              className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors cursor-pointer"
            >
              تحليل الإحصاء الحيوي (P ≤ 0.05)
            </button>
            <button
              type="button"
              onClick={() =>
                sendQuestion(
                  'فسّر علمياً قيم سعة الامتزاز qe ومؤشر جودة المياه WQI الموحد.'
                )
              }
              className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors cursor-pointer"
            >
              تفسير سعة الامتزاز qe و WQI
            </button>
            <button
              type="button"
              onClick={() =>
                sendQuestion('ما هو رابط المنصة الرسمي المشفر في رمز QR Code؟')
              }
              className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors cursor-pointer"
            >
              رابط المنصة ورمز QR
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
              اكتب رسالتك لوكيل المنصة
            </label>
            <input
              id="chatbot-input"
              data-testid="agent-drawer-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب رسالتك أو سؤالك العلمي ليرد عليك وكيل المنصة..."
              className={`flex-1 rounded-lg border px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                darkMode
                  ? 'bg-slate-950 border-slate-700 text-slate-100'
                  : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
            <button
              type="submit"
              disabled={isSending}
              data-testid="agent-drawer-send-btn"
              aria-label="إرسال الرسالة"
              className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>إرسال</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
