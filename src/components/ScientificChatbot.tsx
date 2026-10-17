import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  X,
  Bot,
  User,
  BrainCircuit,
} from 'lucide-react';
import { ExperimentRecord } from '../utils/bioremediationLogic';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  modelUsed?: string;
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
  const [modelTier, setModelTier] = useState<
    'gemini-4-argon' | 'gemini-3.8-flash' | 'gemini-3.1-flash-lite'
  >('gemini-4-argon');
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content:
        'مرحباً بك يا أستاذ مؤمن خلف عبدالله في المساعد البحثي الذكي لمنصة EcoBio AI. يمكنني مساعدتك في الإجابة على أسئلة لجنة المناقشة، أو تفسير آليات التخثر الحيوي بالمورينجا والامتزاز بالطحالب والفحم الحيوي، أو مناقشة نتائجك المختبرية الحالية.',
      modelUsed: 'gemini-4-argon (High Thinking)',
    },
  ]);

  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const contextSummary = records
    .map(
      (r) =>
        `${r.pollutantName}: Ci=${r.ci}, Cf=${r.cf} ${r.unit}, Efficiency=${r.efficiency}% (${r.treatmentType})`
    )
    .join(' | ');

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt ?? input).trim();
    if (!textToSend || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: textToSend,
    };

    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    if (!customPrompt) setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          modelTier,
          contextSummary,
        }),
      });
      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-ai`,
          role: 'assistant',
          content:
            data.reply ||
            'تم تحليل استفسارك العلمي استناداً إلى قراءات المعالجة الحيوية المسجلة.',
          modelUsed: data.modelUsed || modelTier,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-err`,
          role: 'assistant',
          content: 'تعذر الاتصال بالخادم حالياً، يرجى المحاولة مرة أخرى.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-xs"
      role="dialog"
      aria-label="المساعد البحثي الذكي Gemini"
    >
      <div
        className={`w-full max-w-lg h-full flex flex-col border-r shadow-2xl ${
          darkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-600/10 text-emerald-600">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">
                المستشار الأكاديمي الذكي (Gemini AI Assistant)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                محادثة علمية متعددة الأدوار لدعم مناقشة مشروع التخرج
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق المساعد الذكي"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Model Selector Bar */}
        <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between gap-2 text-xs">
          <label htmlFor="chat-model-select" className="font-semibold">
            نموذج الاستدلال العلمي:
          </label>
          <select
            id="chat-model-select"
            value={modelTier}
            onChange={(e) => setModelTier(e.target.value as any)}
            className={`rounded-md border px-2.5 py-1 text-xs font-mono ${
              darkMode
                ? 'bg-slate-900 border-slate-700 text-slate-200'
                : 'bg-white border-slate-300 text-slate-800'
            }`}
          >
            <option value="gemini-4-argon">
              gemini-4-argon (تفكير عميق High Thinking)
            </option>
            <option value="gemini-3.8-flash">
              gemini-3.8-flash (المهام العلمية العامة)
            </option>
            <option value="gemini-3.1-flash-lite">
              gemini-3.1-flash-lite (استجابة فائقة السرعة)
            </option>
          </select>
        </div>

        {/* Quick Questions for Defense Committee */}
        <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() =>
              handleSend(
                'كيف أفسر للجنة المناقشة تفوق بذور المورينجا على الشب الكيميائي؟'
              )
            }
            className="text-[11px] px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors cursor-pointer"
          >
            سؤال اللجنة: المورينجا مقابل الشب؟
          </button>
          <button
            type="button"
            onClick={() =>
              handleSend(
                'اشرح آلية الامتزاز الحيوي للمعادن الثقيلة بواسطة طحلب Chlorella vulgaris'
              )
            }
            className="text-[11px] px-2.5 py-1 rounded-md bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 hover:bg-teal-100 transition-colors cursor-pointer"
          >
            آلية امتزاز الطحالب للمعادن؟
          </button>
        </div>

        {/* Scrollable Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${
                m.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  m.role === 'user'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-teal-600/15 text-teal-600'
                }`}
              >
                {m.role === 'user' ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>
              <div
                className={`max-w-[82%] rounded-xl p-3.5 text-xs leading-relaxed whitespace-pre-line ${
                  m.role === 'user'
                    ? 'bg-emerald-600 text-white'
                    : darkMode
                    ? 'bg-slate-950 border border-slate-800 text-slate-200'
                    : 'bg-slate-100 text-slate-800'
                }`}
              >
                <div>{m.content}</div>
                {m.modelUsed && (
                  <div className="mt-1.5 pt-1 border-t border-slate-200/30 text-[10px] font-mono opacity-75">
                    {m.modelUsed}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="text-xs text-slate-400 font-mono px-2">
              جاري التفكير العلمي العميق وصياغة الإجابة...
            </div>
          )}
          <div ref={threadEndRef} />
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اطرح سؤالك العلمي أو استفسار لجنة المناقشة..."
            aria-label="رسالة المحادثة العلمية"
            className={`flex-1 rounded-lg border px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              darkMode
                ? 'bg-slate-950 border-slate-700 text-slate-100'
                : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            aria-label="إرسال الرسالة"
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>إرسال</span>
          </button>
        </form>
      </div>
    </div>
  );
};
