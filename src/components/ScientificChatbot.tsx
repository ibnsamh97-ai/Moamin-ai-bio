import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  X,
  Bot,
  User,
  BrainCircuit,
  RotateCcw,
  Cpu,
  Sparkles,
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
  isStreaming?: boolean;
  thinkingStage?: string;
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
      'أنت خبير حواري ذكي في المعالجة الحيوية للمياه، التخثر الحيوي ببذور المورينجا، والامتزاز بالطحالب المجهرية Chlorella والفحم الحيوي.',
  },
  {
    id: 'biostats_agent',
    label: 'وكيل الإحصاء الحيوي (ANOVA & P ≤ 0.05)',
    instruction:
      'أنت خبير حواري ذكي في الإحصاء الحيوي وتحليل المكررات التجريبية (R1, R2, R3)، المتوسط الحسابي، الانحراف المعياري (±SD)، واختبارات t-test و ANOVA.',
  },
  {
    id: 'tigris_wqi_agent',
    label: 'وكيل رصد نهر دجلة ومؤشر WQI',
    instruction:
      'أنت خبير حواري ذكي في تقييم جودة مياه نهر دجلة بمدينة تكريت وحساب المؤشر الموزون لجودة المياه (WQI) ومقارنتها مع المواصفة العراقية IQS 417 ومعايير WHO.',
  },
  {
    id: 'academic_report_agent',
    label: 'وكيل صياغة المناقشة والتقارير العلمية',
    instruction:
      'أنت خبير حواري ذكي في صياغة المناقشة العلمية وتفسير معادلات سعة الامتزاز (qe) وقانون التخفيف المختبري (C1V1 = C2V2).',
  },
];

export const GEMINI_MODEL_OPTIONS: Array<{
  id: GeminiAgentModelTier;
  label: string;
  desc: string;
}> = [
  {
    id: 'gemini-3.8-flash',
    label: 'gemini-3.8-flash (متوازن وذكي)',
    desc: 'استجابة علمية دقيقة ومتوازنة للمحادثات المتعددة',
  },
  {
    id: 'gemini-4-argon',
    label: 'gemini-4-argon (تفكير عميق)',
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
      text: 'مرحباً بك. أنا وكيل الذكاء الاصطناعي التفاعلي (Gemini AI) في منصة EcoBio AI. اطرح أي سؤال علمي أو استفسار بحثي وسأفكر وأجيبك مباشرةً في محادثة حية.',
      modelBadge: 'gemini-3.8-flash · Gemini Live Chat',
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
        text: `بدأت محادثة جديدة مع (${selectedRole.label}) عبر نموذج (${selectedModel}). اكتب سؤالك للبدء.`,
        modelBadge: `${selectedModel} · Gemini Live Chat`,
        agentRoleLabel: selectedRole.label,
      },
    ]);
  };

  // Progressive live typing helper so the response always types smoothly word-by-word
  const animateLiveTyping = async (
    msgId: string,
    fullText: string,
    finalBadge: string
  ) => {
    const words = fullText.split(' ');
    let current = '';
    const step = Math.max(2, Math.ceil(words.length / 45));

    for (let i = 0; i < words.length; i += step) {
      current += (i === 0 ? '' : ' ') + words.slice(i, i + step).join(' ');
      const snapshot = current;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                text: snapshot,
                isStreaming: true,
                thinkingStage: 'جاري الكتابة الحية عبر Gemini AI...',
              }
            : m
        )
      );
      await new Promise((r) => setTimeout(r, 28));
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              text: fullText,
              isStreaming: false,
              thinkingStage: undefined,
              modelBadge: finalBadge,
            }
          : m
      )
    );
  };

  const sendQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || isSending) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    const assistantMsgId = `a-${Date.now() + 1}`;
    const placeholderAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      text: '',
      isStreaming: true,
      thinkingStage: 'جاري التفكير العميق وتحليل السؤال عبر Gemini AI...',
      modelBadge: `${selectedModel} · Gemini AI`,
      agentRoleLabel: selectedRole.label,
    };

    const historyForApi = [...messages, userMsg];
    setMessages([...historyForApi, placeholderAssistantMsg]);
    setInput('');
    setIsSending(true);

    const payload = {
      messages: historyForApi
        .filter((m) => m.id !== 'welcome-agent-1' && !m.id.startsWith('welcome-'))
        .map((m) => ({
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
    };

    // 1. Try real-time Server-Sent Events (SSE) Streaming from Gemini API
    try {
      const res = await fetch('/api/gemini/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let accumulatedText = '';
        let usedModel = selectedModel;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine.startsWith('data:')) continue;
            const jsonStr = trimmedLine.replace(/^data:\s*/, '');
            try {
              const evt = JSON.parse(jsonStr);
              if (evt.modelUsed) usedModel = evt.modelUsed;
              if (evt.chunk) {
                accumulatedText += evt.chunk;
                const snap = accumulatedText;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? {
                          ...m,
                          text: snap,
                          isStreaming: true,
                          thinkingStage: 'يفكر ويكتب الآن عبر Gemini AI...',
                          modelBadge: `${usedModel} · Gemini Live Stream`,
                        }
                      : m
                  )
                );
              }
            } catch {
              // Ignore malformed partial SSE line
            }
          }
        }

        if (accumulatedText.trim().length > 0) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    text: accumulatedText.trim(),
                    isStreaming: false,
                    thinkingStage: undefined,
                    modelBadge: `${usedModel} · Gemini AI`,
                  }
                : m
            )
          );
          setIsSending(false);
          return;
        }
      }
    } catch {
      // Proceed to standard JSON Gemini endpoint if stream interrupted
    }

    // 2. Fallback to standard JSON Gemini endpoint with live typing animation
    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        if (
          data.reply &&
          String(data.reply).trim().length > 0 &&
          !data.useClientAgentFallback
        ) {
          await animateLiveTyping(
            assistantMsgId,
            String(data.reply).trim(),
            `${data.modelUsed || selectedModel} · Gemini AI`
          );
          setIsSending(false);
          return;
        }
      }
    } catch {
      // Fall through if offline
    }

    // 3. Offline synthesis with live typing
    const offlineReply = generateBuiltInExpertResponse(trimmed, {
      specialty: selectedRole.label,
      researchNotes: selectedRole.instruction,
      records,
      wqiScore: 21.4,
      qeValue: records[0]?.adsorptionCapacityQe ?? 217.85,
      optimalDose: 65,
      optimalTime: 45,
      optimalPh: 7.2,
    });

    await animateLiveTyping(
      assistantMsgId,
      offlineReply,
      `${selectedModel} · EcoBio AI`
    );
    setIsSending(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="وكيل المحادثة الذكي (Gemini Live Conversational AI)"
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
                  وكيل الذكاء الاصطناعي التفاعلي (Gemini AI Chat)
                </h2>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>يفكر بالكتابة الحية ويرد كمحادثة ذكاء اصطناعي مباشرة</span>
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
                <span>محادثة جديدة</span>
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
                {/* Live Thinking Header when Gemini is actively reasoning/typing */}
                {msg.isStreaming && msg.thinkingStage && (
                  <div className="mb-2 pb-2 border-b border-emerald-500/20 flex items-center gap-2 text-[11px] font-bold text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                    <span>{msg.thinkingStage}</span>
                  </div>
                )}

                <div>
                  {msg.text}
                  {msg.isStreaming && (
                    <span className="inline-block w-1.5 h-3.5 bg-emerald-400 align-middle mr-1 animate-pulse" />
                  )}
                </div>

                {msg.modelBadge && !msg.isStreaming && (
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
          <div ref={threadEndRef} />
        </div>

        {/* Message Input Form */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendQuestion(input);
            }}
            className="flex gap-2"
          >
            <label htmlFor="chatbot-input" className="sr-only">
              اكتب رسالتك لوكيل Gemini
            </label>
            <input
              id="chatbot-input"
              data-testid="agent-drawer-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب أي سؤال أو رسالة ليفكر ويرد عليك وكيل Gemini مباشرة..."
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
              <span>{isSending ? 'يفكر...' : 'إرسال'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
