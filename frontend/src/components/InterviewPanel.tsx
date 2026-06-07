import { useState, useRef, useEffect } from 'react';
import { Mic, Send, RotateCcw, Loader2, FileDown, Trophy } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api } from '../api/client';
import { useT } from '../i18n/LocaleContext';

type Stage = 'idle' | 'starting' | 'interviewing' | 'responding' | 'reporting' | 'done';

interface Message {
  role: 'ai' | 'user';
  content: string;
  streaming?: boolean;
}

interface Props {
  hasAnalysis: boolean;
  isAnalyzing: boolean;
}

export default function InterviewPanel({ hasAnalysis, isAnalyzing }: Props) {
  const t = useT();
  const [stage, setStage] = useState<Stage>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [canFinish, setCanFinish] = useState(false);
  const [report, setReport] = useState('');
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const appendToLastAi = (chunk: string) => {
    setMessages(prev => {
      const msgs = [...prev];
      const last = msgs[msgs.length - 1];
      if (last?.role === 'ai') {
        msgs[msgs.length - 1] = { ...last, content: last.content + chunk };
      }
      return msgs;
    });
  };

  const finalizeLastAi = () => {
    setMessages(prev => {
      const msgs = [...prev];
      const last = msgs[msgs.length - 1];
      if (last?.role === 'ai') msgs[msgs.length - 1] = { ...last, streaming: false };
      return msgs;
    });
  };

  const handleGenerateReport = async () => {
    setStage('reporting');
    setReport('');
    try {
      await api.interviewReport(
        (chunk) => setReport(prev => prev + chunk),
        () => setStage('done'),
      );
    } catch (e) {
      setError((e as Error).message);
      setStage('interviewing');
    }
  };

  const handleStart = async () => {
    setStage('starting');
    setMessages([{ role: 'ai', content: '', streaming: true }]);
    setCanFinish(false);
    setReport('');
    setError('');
    try {
      await api.interviewStart(
        (chunk) => appendToLastAi(chunk),
        () => { finalizeLastAi(); setStage('interviewing'); },
      );
    } catch (e) {
      setError((e as Error).message);
      setStage('idle');
    }
  };

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || stage !== 'interviewing') return;
    setInput('');
    setMessages(prev => [
      ...prev,
      { role: 'user', content: msg },
      { role: 'ai', content: '', streaming: true },
    ]);
    setStage('responding');
    try {
      await api.interviewRespond(
        msg,
        (chunk) => appendToLastAi(chunk),
        (meta) => {
          finalizeLastAi();
          setCanFinish(meta.canFinish);
          if (meta.autoFinish) {
            handleGenerateReport();
          } else {
            setStage('interviewing');
          }
        },
      );
    } catch (e) {
      setError((e as Error).message);
      setStage('interviewing');
    }
  };

  const handleReset = async () => {
    await api.interviewClear().catch(() => {});
    setStage('idle');
    setMessages([]);
    setReport('');
    setCanFinish(false);
    setError('');
    setInput('');
  };

  const handleDownloadReport = () => {
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'interview-report.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (stage === 'idle') {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 text-center">
        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center mb-4">
          <Mic size={20} className="text-indigo-600" />
        </div>
        <h3 className="text-sm font-semibold text-gray-800 mb-2">{t('interviewReadyTitle')}</h3>
        <p className="text-xs text-gray-500 mb-6 max-w-[200px] leading-relaxed">
          {isAnalyzing ? t('interviewWaitAnalysis') : t('interviewReadyDesc')}
        </p>
        <button
          onClick={handleStart}
          disabled={!hasAnalysis || isAnalyzing}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {t('startInterview')}
        </button>
      </div>
    );
  }

  if (stage === 'reporting') {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 text-center gap-3">
        <Loader2 size={20} className="animate-spin text-indigo-500" />
        <p className="text-xs text-gray-500">{t('reportGenerating')}</p>
      </div>
    );
  }

  if (stage === 'done') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Trophy size={13} className="text-amber-500" />
            <span className="text-xs font-semibold text-gray-700">{t('reportTitle')}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleDownloadReport}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <FileDown size={11} />
              {t('downloadReport')}
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <RotateCcw size={11} />
              {t('retakeInterview')}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="prose prose-sm prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-800 max-w-none">
            <ReactMarkdown>{report}</ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Mic size={13} className="text-indigo-500" />
          <span className="text-xs font-semibold text-gray-700">{t('interviewModeTitle')}</span>
        </div>
        <button
          onClick={handleReset}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title={t('retakeInterview')}
        >
          <RotateCcw size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-indigo-600 text-white rounded-br-sm'
                : 'bg-gray-100 text-gray-800 border border-gray-200 rounded-bl-sm'
            }`}>
              {msg.content}
              {msg.streaming && (
                <span className="inline-flex gap-0.5 ml-1 align-middle">
                  <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex-shrink-0 border-t border-gray-100 p-3 flex flex-col gap-2">
        {error && <p className="text-xs text-red-500 px-1">{error}</p>}
        {canFinish && (
          <button
            onClick={handleGenerateReport}
            disabled={stage === 'responding'}
            className="w-full text-xs py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-medium transition-colors disabled:opacity-40"
          >
            ✨ {t('generateReport')}
          </button>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            disabled={stage !== 'interviewing'}
            placeholder={stage === 'starting' ? t('interviewInProgress') : t('answerPlaceholder')}
            className="flex-1 text-xs px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:border-indigo-300 focus:bg-white placeholder-gray-400 disabled:opacity-40 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={stage !== 'interviewing' || !input.trim()}
            className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center disabled:opacity-40 hover:bg-indigo-700 transition-colors flex-shrink-0"
          >
            {stage === 'responding'
              ? <Loader2 size={13} className="text-white animate-spin" />
              : <Send size={13} className="text-white" />
            }
          </button>
        </div>
      </div>
    </div>
  );
}
