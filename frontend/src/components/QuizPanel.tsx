import { useState } from 'react';
import type { QuizQuestion, GradeResult } from '../types';
import { api } from '../api/client';

type Stage = 'idle' | 'loading' | 'answering' | 'grading' | 'result' | 'done';

const SCOPE_COLOR: Record<string, string> = {
  '檔案功能': 'text-blue-400 bg-blue-900/30',
  '技術選型': 'text-yellow-400 bg-yellow-900/30',
  '流程理解': 'text-green-400 bg-green-900/30',
  '關係結構': 'text-purple-400 bg-purple-900/30',
};

const VERDICT_STYLE: Record<string, string> = {
  correct:   'border-green-500 bg-green-900/20 text-green-300',
  partial:   'border-yellow-500 bg-yellow-900/20 text-yellow-300',
  incorrect: 'border-red-500 bg-red-900/20 text-red-300',
};

const VERDICT_LABEL: Record<string, string> = {
  correct:   '✓ 正確',
  partial:   '△ 部分正確',
  incorrect: '✗ 錯誤',
};

export default function QuizPanel() {
  const [stage, setStage] = useState<Stage>('idle');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState('');
  const [results, setResults] = useState<(GradeResult & { question: string })[]>([]);
  const [currentResult, setCurrentResult] = useState<GradeResult | null>(null);
  const [error, setError] = useState('');

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
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 flex-shrink-0">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">🎯 測驗模式</span>
        {stage !== 'idle' && (
          <button onClick={reset} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
            重新開始
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">

        {/* Idle */}
        {stage === 'idle' && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <span className="text-4xl">🎯</span>
            <p className="text-gray-300 text-sm font-medium">準備好測驗你對這個專案的理解了嗎？</p>
            <p className="text-gray-500 text-xs leading-relaxed">
              AI 將從檔案功能、技術選型、流程理解、關係結構<br />四個角度出 5 道問答題，並批改你的回答
            </p>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button
              onClick={start}
              className="mt-2 bg-violet-600 hover:bg-violet-500 text-white text-sm px-6 py-2.5 rounded-lg transition-colors font-medium"
            >
              開始測驗
            </button>
          </div>
        )}

        {/* Loading */}
        {stage === 'loading' && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 text-sm">
            <span className="text-3xl animate-spin">⏳</span>
            <p>AI 正在出題中...</p>
          </div>
        )}

        {/* Answering */}
        {stage === 'answering' && questions[current] && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SCOPE_COLOR[questions[current].scope] ?? 'text-gray-400 bg-gray-800'}`}>
                {questions[current].scope}
              </span>
              <span className="text-xs text-gray-500">第 {current + 1} / {questions.length} 題</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1">
              <div
                className="bg-violet-500 h-1 rounded-full transition-all"
                style={{ width: `${((current) / questions.length) * 100}%` }}
              />
            </div>
            <p className="text-gray-100 text-sm leading-relaxed">{questions[current].question}</p>
            <textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder="輸入你的回答..."
              rows={5}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 resize-none focus:outline-none focus:border-violet-500 placeholder-gray-600"
              autoFocus
            />
            <button
              onClick={submit}
              disabled={!answer.trim()}
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs px-4 py-2 rounded-lg transition-colors"
            >
              送出答案
            </button>
          </div>
        )}

        {/* Grading */}
        {stage === 'grading' && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 text-sm">
            <span className="text-3xl animate-pulse">🤔</span>
            <p>AI 正在批改...</p>
          </div>
        )}

        {/* Result */}
        {stage === 'result' && currentResult && questions[current] && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">第 {current + 1} / {questions.length} 題</span>
              <span className="text-xs text-gray-500">得分：{currentResult.score}</span>
            </div>
            <p className="text-gray-300 text-xs leading-relaxed">{questions[current].question}</p>
            <div className={`rounded-lg border p-3 text-xs leading-relaxed ${VERDICT_STYLE[currentResult.verdict]}`}>
              <p className="font-semibold mb-1">{VERDICT_LABEL[currentResult.verdict]}</p>
              <p>{currentResult.explanation}</p>
            </div>
            <button
              onClick={next}
              className="bg-violet-600 hover:bg-violet-500 text-white text-xs px-4 py-2 rounded-lg transition-colors"
            >
              {current + 1 < questions.length ? '下一題 →' : '查看總結'}
            </button>
          </div>
        )}

        {/* Done */}
        {stage === 'done' && (
          <div className="flex flex-col gap-4">
            <div className="text-center py-4">
              <p className="text-4xl mb-2">{totalScore >= 80 ? '🏆' : totalScore >= 50 ? '📚' : '💪'}</p>
              <p className="text-gray-100 text-lg font-semibold">總分：{totalScore} 分</p>
              <p className="text-gray-500 text-xs mt-1">
                {totalScore >= 80 ? '對這個專案已相當熟悉！' : totalScore >= 50 ? '有一定了解，繼續加油！' : '多看看報告，再試一次！'}
              </p>
            </div>
            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className={`rounded-lg border p-2.5 text-xs ${VERDICT_STYLE[r.verdict]}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{VERDICT_LABEL[r.verdict]}</span>
                    <span>{r.score} 分</span>
                  </div>
                  <p className="text-gray-400 truncate">{questions[i]?.question}</p>
                </div>
              ))}
            </div>
            <button
              onClick={reset}
              className="bg-violet-600 hover:bg-violet-500 text-white text-xs px-4 py-2 rounded-lg transition-colors"
            >
              再測一次
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
