import { useState } from 'react';
import { GraduationCap, RotateCcw, Loader2, Trophy, BookOpen, Dumbbell } from 'lucide-react';
import type { QuizQuestion, GradeResult } from '../types';
import { api } from '../api/client';
import { useT } from '../i18n/LocaleContext';

type Stage = 'idle' | 'loading' | 'answering' | 'grading' | 'result' | 'done';

const SCOPE_COLOR: Record<string, string> = {
  '檔案功能': 'text-blue-700 bg-blue-50 border border-blue-200',
  '技術選型': 'text-amber-700 bg-amber-50 border border-amber-200',
  '流程理解': 'text-emerald-700 bg-emerald-50 border border-emerald-200',
  '關係結構': 'text-purple-700 bg-purple-50 border border-purple-200',
};

const VERDICT_STYLE: Record<string, string> = {
  correct:   'border-emerald-200 bg-emerald-50 text-emerald-700',
  partial:   'border-amber-200 bg-amber-50 text-amber-700',
  incorrect: 'border-red-200 bg-red-50 text-red-700',
};

export default function QuizPanel() {
  const t = useT();
  const [stage, setStage] = useState<Stage>('idle');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState('');
  const [results, setResults] = useState<(GradeResult & { question: string })[]>([]);
  const [currentResult, setCurrentResult] = useState<GradeResult | null>(null);
  const [error, setError] = useState('');

  const verdictLabel: Record<string, string> = {
    correct: t('verdictCorrect'),
    partial: t('verdictPartial'),
    incorrect: t('verdictIncorrect'),
  };

  const scopeLabel = (scope: string) => {
    const map: Record<string, string> = {
      '檔案功能': t('scopeFileFunction'),
      '技術選型': t('scopeTechSelection'),
      '流程理解': t('scopeWorkflow'),
      '關係結構': t('scopeRelationship'),
    };
    return map[scope] ?? scope;
  };

  const start = async () => {
    setStage('loading');
    setError('');
    setResults([]);
    setCurrent(0);
    try {
      const data = await api.generateQuiz();
      setQuestions(data.questions);
      setStage('answering');
    } catch (e) {
      setError((e as Error).message);
      setStage('idle');
    }
  };

  const submit = async () => {
    if (!answer.trim()) return;
    setStage('grading');
    try {
      const q = questions[current];
      const result = await api.gradeAnswer(q.question, answer.trim());
      setCurrentResult(result);
      setResults(prev => [...prev, { ...result, question: q.question }]);
      setStage('result');
    } catch (e) {
      setError((e as Error).message);
      setStage('answering');
    }
  };

  const next = () => {
    const nextIdx = current + 1;
    if (nextIdx >= questions.length) {
      setStage('done');
    } else {
      setCurrent(nextIdx);
      setAnswer('');
      setCurrentResult(null);
      setStage('answering');
    }
  };

  const reset = () => {
    setStage('idle');
    setQuestions([]);
    setCurrent(0);
    setAnswer('');
    setResults([]);
    setCurrentResult(null);
    setError('');
  };

  const totalScore = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
    : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <GraduationCap size={14} className="text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('quizHeader').replace('🎯 ', '')}</span>
        </div>
        {stage !== 'idle' && (
          <button onClick={reset} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
            <RotateCcw size={12} />
            {t('restart')}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">

        {stage === 'idle' && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
              <GraduationCap size={22} className="text-indigo-500" />
            </div>
            <div>
              <p className="text-gray-700 text-sm font-medium mb-2">{t('quizReadyTitle')}</p>
              <p className="text-gray-400 text-xs leading-relaxed max-w-56">{t('quizReadyDesc')}</p>
            </div>
            {error && <p className="text-red-500 text-xs bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">{error}</p>}
            <button
              onClick={start}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-6 py-2.5 rounded-xl transition-colors font-medium"
            >
              {t('startQuiz')}
            </button>
          </div>
        )}

        {stage === 'loading' && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 text-sm">
            <Loader2 size={24} className="animate-spin text-indigo-400" />
            <p>{t('generating')}</p>
          </div>
        )}

        {stage === 'answering' && questions[current] && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${SCOPE_COLOR[questions[current].scope] ?? 'text-gray-500 bg-gray-100'}`}>
                {scopeLabel(questions[current].scope)}
              </span>
              <span className="text-xs text-gray-400">{t('questionProgress', { current: current + 1, total: questions.length })}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1">
              <div
                className="bg-indigo-500 h-1 rounded-full transition-all"
                style={{ width: `${(current / questions.length) * 100}%` }}
              />
            </div>
            <p className="text-gray-800 text-sm leading-relaxed">{questions[current].question}</p>
            <textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder={t('answerPlaceholder')}
              rows={5}
              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-800 resize-none focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder-gray-400 transition-all"
              autoFocus
            />
            <button
              onClick={submit}
              disabled={!answer.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs px-4 py-2.5 rounded-xl transition-colors font-medium"
            >
              {t('submitAnswer')}
            </button>
          </div>
        )}

        {stage === 'grading' && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 text-sm">
            <Loader2 size={24} className="animate-spin text-indigo-400" />
            <p>{t('grading')}</p>
          </div>
        )}

        {stage === 'result' && currentResult && questions[current] && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">{t('questionProgress', { current: current + 1, total: questions.length })}</span>
              <span className="text-xs font-medium text-gray-600">{t('scoreLabel', { score: currentResult.score })}</span>
            </div>
            <p className="text-gray-600 text-xs leading-relaxed">{questions[current].question}</p>
            <div className={`rounded-xl border p-3.5 text-xs leading-relaxed ${VERDICT_STYLE[currentResult.verdict]}`}>
              <p className="font-semibold mb-1">{verdictLabel[currentResult.verdict]}</p>
              <p>{currentResult.explanation}</p>
            </div>
            <button
              onClick={next}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2.5 rounded-xl transition-colors font-medium"
            >
              {current + 1 < questions.length ? t('nextQuestion') : t('viewSummary')}
            </button>
          </div>
        )}

        {stage === 'done' && (
          <div className="flex flex-col gap-4">
            <div className="text-center py-4">
              <div className="flex justify-center mb-3">
                {totalScore >= 80
                  ? <Trophy size={32} className="text-amber-500" />
                  : totalScore >= 50
                  ? <BookOpen size={32} className="text-indigo-400" />
                  : <Dumbbell size={32} className="text-gray-400" />}
              </div>
              <p className="text-gray-900 text-lg font-semibold">{t('totalScore', { score: totalScore })}</p>
              <p className="text-gray-400 text-xs mt-1">
                {totalScore >= 80 ? t('highScore') : totalScore >= 50 ? t('midScore') : t('lowScore')}
              </p>
            </div>
            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className={`rounded-xl border p-2.5 text-xs ${VERDICT_STYLE[r.verdict]}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{verdictLabel[r.verdict]}</span>
                    <span className="font-medium">{r.score}</span>
                  </div>
                  <p className="opacity-70 truncate">{questions[i]?.question}</p>
                </div>
              ))}
            </div>
            <button
              onClick={reset}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2.5 rounded-xl transition-colors font-medium"
            >
              {t('retakeQuiz')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
