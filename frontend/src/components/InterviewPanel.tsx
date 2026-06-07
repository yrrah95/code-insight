import { useState, useRef, useEffect, useMemo } from 'react';
import { Mic, Trophy, RotateCcw, Loader2, FileDown, CheckCircle2, XCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api } from '../api/client';
import type { QuizScore } from '../api/client';
import { useT } from '../i18n/LocaleContext';

type Stage = 'idle' | 'loading' | 'answering' | 'revealing' | 'explained' | 'reporting' | 'done';

interface Question {
  q: string;
  choices: string[];
  correct: number;
}

interface Props {
  hasAnalysis: boolean;
  isAnalyzing: boolean;
}

// ── Confetti burst ──────────────────────────────────────────
function Confetti({ active }: { active: boolean }) {
  const particles = useMemo(() => {
    const colors = ['#4ade80', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa', '#fb923c', '#34d399'];
    return Array.from({ length: 24 }, (_, i) => {
      const angle = (i / 24) * Math.PI * 2;
      const distance = 50 + (i % 5) * 14;
      return {
        color: colors[i % colors.length],
        tx: Math.cos(angle) * distance,
        ty: Math.sin(angle) * distance,
        rot: (i * 43) % 360,
        delay: i * 18,
        size: 5 + (i % 3) * 2,
      };
    });
  }, []);

  if (!active) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible rounded-xl z-10">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            left: '50%',
            top: '50%',
            animationName: 'confetti-fly',
            animationDuration: '0.75s',
            animationDelay: `${p.delay}ms`,
            animationFillMode: 'forwards',
            animationTimingFunction: 'ease-out',
            ['--tx' as string]: `${p.tx}px`,
            ['--ty' as string]: `${p.ty}px`,
            ['--rot' as string]: `${p.rot}deg`,
          }}
        />
      ))}
    </div>
  );
}

// ── Progress bar ────────────────────────────────────────────
function ProgressBar({ progress }: { progress: number }) {
  const t = useT();
  const complete = progress >= 100;
  return (
    <div className="px-4 pb-2.5">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] text-gray-400 font-medium">{t('progressLabel')}</span>
        <span className={`text-[10px] font-bold tabular-nums ${complete ? 'text-emerald-600' : 'text-indigo-500'}`}>
          {progress}%{complete ? ' 🎉' : ''}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${
            complete
              ? 'bg-gradient-to-r from-emerald-400 to-indigo-500'
              : 'bg-gradient-to-r from-indigo-400 to-indigo-600'
          }`}
          style={{
            width: `${progress}%`,
            animation: complete ? 'progress-complete 1s ease 0.2s 2' : undefined,
          }}
        />
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────
export default function InterviewPanel({ hasAnalysis, isAnalyzing }: Props) {
  const t = useT();
  const [stage, setStage] = useState<Stage>('idle');
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [score, setScore] = useState<QuizScore>({ correct: 0, total: 0 });
  const [progress, setProgress] = useState(0);
  const [canFinish, setCanFinish] = useState(false);
  const [report, setReport] = useState('');
  const [error, setError] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const explanationRef = useRef<HTMLDivElement>(null);
  const correctChoiceRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if ((stage === 'revealing' || stage === 'explained') && explanationRef.current) {
      setTimeout(() => explanationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 300);
    }
  }, [stage, explanation]);

  // ── handlers ─────────────────────────────────────────────

  const handleStart = async () => {
    setStage('loading');
    setError('');
    setScore({ correct: 0, total: 0 });
    setProgress(0);
    setCanFinish(false);
    setReport('');
    try {
      const data = await api.interviewStart();
      setQuestion({ q: data.q, choices: data.choices, correct: data.correct });
      setSelectedChoice(null);
      setExplanation('');
      setStage('answering');
    } catch (e) {
      setError((e as Error).message);
      setStage('idle');
    }
  };

  const handleAnswer = async (choice: number) => {
    if (stage !== 'answering' || !question) return;
    setSelectedChoice(choice);
    const correct = question.correct === choice;
    setIsCorrect(correct);
    setStage('revealing');
    setExplanation('');
    if (correct) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 900);
    }
    let shouldReport = false;
    try {
      await api.interviewAnswer(
        choice,
        (chunk) => setExplanation(prev => prev + chunk),
        (meta) => {
          setScore(meta.score);
          setProgress(meta.progress);
          setCanFinish(meta.canFinish);
          if (meta.autoFinish) {
            shouldReport = true;
            setStage('reporting');
          } else {
            setStage('explained');
          }
        },
      );
      if (shouldReport) handleReport();
    } catch (e) {
      setError((e as Error).message);
      setStage('explained');
    }
  };

  const handleNext = async () => {
    setStage('loading');
    setError('');
    try {
      const data = await api.interviewNext();
      setQuestion({ q: data.q, choices: data.choices, correct: data.correct });
      setSelectedChoice(null);
      setIsCorrect(false);
      setExplanation('');
      setStage('answering');
    } catch (e) {
      setError((e as Error).message);
      setStage('explained');
    }
  };

  const handleReport = async () => {
    setStage('reporting');
    setReport('');
    try {
      await api.interviewReport(
        (chunk) => setReport(prev => prev + chunk),
        () => setStage('done'),
      );
    } catch (e) {
      setError((e as Error).message);
      setStage('explained');
    }
  };

  const handleReset = async () => {
    await api.interviewClear().catch(() => {});
    setStage('idle');
    setQuestion(null);
    setSelectedChoice(null);
    setIsCorrect(false);
    setExplanation('');
    setScore({ correct: 0, total: 0 });
    setProgress(0);
    setCanFinish(false);
    setReport('');
    setError('');
  };

  const handleDownloadReport = () => {
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quiz-report.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── choice button style ───────────────────────────────────

  const choiceClass = (i: number): string => {
    const base = 'relative w-full text-left px-4 py-3 rounded-xl border text-sm leading-snug transition-all duration-200 select-none ';
    const isAnswered = stage === 'revealing' || stage === 'explained';
    if (!isAnswered) {
      return base + 'bg-white border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer active:scale-[0.98]';
    }
    const isThisCorrect = i === question!.correct;
    const isThisSelected = i === selectedChoice;
    if (isThisCorrect) return base + 'bg-green-500 border-green-500 text-white choice-pop cursor-default font-medium';
    if (isThisSelected) return base + 'bg-red-400 border-red-400 text-white choice-shake cursor-default';
    return base + 'bg-gray-50 border-gray-100 text-gray-400 cursor-default opacity-50';
  };

  // ── idle ──────────────────────────────────────────────────

  if (stage === 'idle') {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8 text-center">
        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-5">
          <Mic size={26} className="text-indigo-600" />
        </div>
        <h3 className="text-sm font-semibold text-gray-800 mb-2">{t('interviewReadyTitle')}</h3>
        <p className="text-xs text-gray-500 mb-8 max-w-xs leading-relaxed">
          {isAnalyzing ? t('interviewWaitAnalysis') : t('interviewReadyDesc')}
        </p>
        <button
          onClick={handleStart}
          disabled={!hasAnalysis || isAnalyzing}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm px-7 py-2.5 rounded-xl font-semibold transition-colors shadow-sm shadow-indigo-200"
        >
          {t('startInterview')}
        </button>
        {error && <p className="mt-4 text-xs text-red-500 max-w-xs">{error}</p>}
      </div>
    );
  }

  // ── loading / reporting spinner ───────────────────────────

  if (stage === 'loading' || stage === 'reporting') {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3">
        <Loader2 size={22} className="animate-spin text-indigo-400" />
        <p className="text-xs text-gray-400">
          {stage === 'loading' ? t('generatingQuestion') : t('reportGenerating')}
        </p>
      </div>
    );
  }

  // ── done (report) ─────────────────────────────────────────

  if (stage === 'done') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Trophy size={14} className="text-amber-500" />
            <span className="text-xs font-semibold text-gray-700">{t('reportTitle')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
              {score.correct}/{score.total} ✓
            </span>
            <button
              onClick={handleDownloadReport}
              className="text-xs px-2 py-1 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center gap-1 transition-colors"
            >
              <FileDown size={11} /> {t('downloadReport')}
            </button>
            <button
              onClick={handleReset}
              className="text-xs px-2 py-1 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center gap-1 transition-colors"
            >
              <RotateCcw size={11} /> {t('retakeInterview')}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
          <div className="prose prose-sm prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-800 max-w-none">
            <ReactMarkdown>{report}</ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  // ── question (answering | revealing | explained) ──────────

  const isAnswered = stage === 'revealing' || stage === 'explained';
  const questionNum = score.total + (isAnswered ? 0 : 1);

  return (
    <div className="flex flex-col h-full">
      {/* Header: title + score */}
      <div className="flex-shrink-0 border-b border-gray-100">
        <div className="flex items-center justify-between px-4 pt-2.5 pb-1">
          <div className="flex items-center gap-2">
            <Mic size={13} className="text-indigo-500" />
            <span className="text-xs font-semibold text-gray-700">{t('interviewModeTitle')}</span>
          </div>
          <div className="flex items-center gap-2">
            {score.total > 0 && (
              <>
                <span className="flex items-center gap-0.5 text-[11px] text-emerald-600 font-bold">
                  <CheckCircle2 size={11} className="flex-shrink-0" /> {score.correct}
                </span>
                <span className="flex items-center gap-0.5 text-[11px] text-red-400 font-bold">
                  <XCircle size={11} className="flex-shrink-0" /> {score.total - score.correct}
                </span>
              </>
            )}
            <button
              onClick={handleReset}
              className="text-gray-300 hover:text-gray-500 transition-colors"
              title={t('retakeInterview')}
            >
              <RotateCcw size={12} />
            </button>
          </div>
        </div>
        <ProgressBar progress={progress} />
      </div>

      {/* Question + choices */}
      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
        {question && (
          <div>
            {/* Question label + text */}
            <div className="mb-4">
              <span className="inline-block text-[10px] text-indigo-500 font-semibold uppercase tracking-widest mb-1.5">
                {t('questionNumber', { n: questionNum })}
              </span>
              <p className="text-sm font-medium text-gray-800 leading-relaxed">{question.q}</p>
            </div>

            {/* Choice buttons */}
            <div className="space-y-2.5">
              {question.choices.map((choice, i) => (
                <div key={i} className="relative">
                  <button
                    ref={isAnswered && i === question.correct ? correctChoiceRef : undefined}
                    className={choiceClass(i)}
                    onClick={() => handleAnswer(i)}
                    disabled={isAnswered}
                  >
                    {choice}
                    {isAnswered && i === question.correct && (
                      <CheckCircle2
                        size={15}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white"
                      />
                    )}
                    {isAnswered && i === selectedChoice && !isCorrect && i !== question.correct && (
                      <XCircle
                        size={15}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white"
                      />
                    )}
                    {/* Confetti burst on correct choice */}
                    {isAnswered && i === question.correct && isCorrect && (
                      <Confetti active={showConfetti} />
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* Explanation */}
            {isAnswered && (
              <div
                ref={explanationRef}
                className={`mt-4 px-4 py-3 rounded-xl text-xs leading-relaxed border ${
                  isCorrect
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                    : 'bg-amber-50 border-amber-100 text-amber-800'
                }`}
              >
                {explanation ? (
                  explanation
                ) : (
                  <span className="flex items-center gap-1.5 text-gray-400">
                    <Loader2 size={11} className="animate-spin" /> 解析中...
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer: action buttons */}
      {stage === 'explained' && (
        <div className="flex-shrink-0 border-t border-gray-100 p-3 flex gap-2">
          {error && <p className="text-xs text-red-500 w-full text-center">{error}</p>}
          {canFinish && (
            <button
              onClick={handleReport}
              className="flex-1 text-xs py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Trophy size={12} /> {t('generateReport')}
            </button>
          )}
          <button
            onClick={handleNext}
            className={`text-xs py-2.5 rounded-xl font-semibold transition-colors ${
              canFinish
                ? 'px-5 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                : 'flex-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
            }`}
          >
            {t('nextQuestion')} →
          </button>
        </div>
      )}
    </div>
  );
}
