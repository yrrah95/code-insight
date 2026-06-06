import { useState } from 'react';
import {
  Search, FolderOpen, Sparkles, GraduationCap, Settings,
  ChevronRight, Loader2,
} from 'lucide-react';
import { api } from './api/client';
import FileTree from './components/FileTree';
import ReportView from './components/ReportView';
import ChatPanel from './components/ChatPanel';
import QuizPanel from './components/QuizPanel';
import SettingsModal from './components/SettingsModal';
import type { FileItem, ChatMessage } from './types';
import { useLocale, useT } from './i18n/LocaleContext';

function ResizeDivider({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="w-px flex-shrink-0 bg-gray-200 hover:bg-indigo-400 cursor-col-resize transition-colors select-none"
    />
  );
}

export default function App() {
  const t = useT();
  const { locale, toggle } = useLocale();

  const [projectPath, setProjectPath] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState({ current: 0, total: 0 });
  const [reports, setReports] = useState<[string, string]>(['', '']);
  const [generatingReportIndex, setGeneratingReportIndex] = useState<number | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [openFilePaths, setOpenFilePaths] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>('report-0');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [cachedCount, setCachedCount] = useState(0);
  const [error, setError] = useState('');
  const [leftWidth, setLeftWidth] = useState(232);
  const [rightWidth, setRightWidth] = useState(320);

  const makeResizeHandler = (
    startWidth: number,
    setWidth: (w: number) => void,
    minW: number,
    maxW: number,
    direction: 1 | -1,
  ) => (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const onMove = (ev: MouseEvent) =>
      setWidth(Math.max(minW, Math.min(maxW, startWidth + direction * (ev.clientX - startX))));
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleFileClick = (path: string) => {
    setSelectedPath(path);
    setOpenFilePaths(prev => prev.includes(path) ? prev : [...prev, path]);
    setActiveTab(path);
  };

  const handleFileTabClose = (path: string) => {
    setOpenFilePaths(prev => {
      const next = prev.filter(p => p !== path);
      if (activeTab === path)
        setActiveTab(next.length > 0 ? next[next.length - 1] : 'report-0');
      return next;
    });
  };

  const handleScan = async () => {
    if (!projectPath.trim()) return;
    setError('');
    setIsScanning(true);
    setFiles([]);
    setReports(['', '']);
    setOpenFilePaths([]);
    setActiveTab('report-0');
    setChatMessages([]);
    try {
      const result = await api.scan(projectPath.trim());
      setFiles(result.files);
      setCachedCount(result.cached_count ?? 0);
      setAnalyzeProgress({ current: 0, total: result.total });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleAnalyze = async () => {
    if (files.length === 0) return;
    setError('');
    setIsAnalyzing(true);
    setAnalyzeProgress({ current: 0, total: 0 });

    try {
      await api.analyzeStream(
        (index, total, path, _category, description) => {
          setAnalyzeProgress({ current: index + 1, total });
          setFiles(prev =>
            prev.map(f => f.path === path ? { ...f, description, from_cache: false } : f)
          );
        },
        async (skipped) => {
          setIsAnalyzing(false);
          if (skipped) { setError(t('allUpToDate')); return; }
          setReports(['', '']);
          setGeneratingReportIndex(0);
          try {
            await api.reportStream(
              (idx, chunk) => {
                setGeneratingReportIndex(idx);
                setReports(prev => {
                  const r: [string, string] = [...prev] as [string, string];
                  r[idx] += chunk;
                  return r;
                });
              },
              () => setGeneratingReportIndex(null),
            );
          } catch (e) {
            setError((e as Error).message);
            setGeneratingReportIndex(null);
          }
        },
      );
    } catch (e) {
      setError((e as Error).message);
      setIsAnalyzing(false);
    }
  };

  const handleChat = async (message: string) => {
    setChatMessages(prev => [...prev, { role: 'user', content: message }]);
    setIsChatting(true);
    setChatMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }]);

    try {
      await api.chatStream(
        message,
        (chunk) => {
          setChatMessages(prev => {
            const msgs = [...prev];
            const last = msgs[msgs.length - 1];
            if (last?.role === 'assistant') {
              msgs[msgs.length - 1] = { ...last, content: last.content + chunk };
            }
            return msgs;
          });
        },
        () => {
          setChatMessages(prev => {
            const msgs = [...prev];
            const last = msgs[msgs.length - 1];
            if (last?.role === 'assistant') {
              msgs[msgs.length - 1] = { ...last, streaming: false };
            }
            return msgs;
          });
          setIsChatting(false);
        },
      );
    } catch (e) {
      setChatMessages(prev => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = { role: 'assistant', content: t('chatError', { message: (e as Error).message }) };
        return msgs;
      });
      setIsChatting(false);
    }
  };

  const handleClearChat = async () => {
    await api.clearChat().catch(() => {});
    setChatMessages([]);
  };

  const hasAnalysis = files.some(f => f.description);

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-200">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-3 flex-shrink-0">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Search size={14} className="text-white" />
          </div>
          <span className="font-semibold text-sm text-gray-900 tracking-tight">CodeInsight</span>
        </div>

        {/* Path input group */}
        <div className="flex-1 flex items-center gap-2 max-w-2xl">
          <div className="flex-1 flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
            <input
              type="text"
              value={projectPath}
              onChange={e => setProjectPath(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleScan(); }}
              placeholder={t('pathPlaceholder')}
              className="flex-1 px-3 py-1.5 text-xs text-gray-800 bg-transparent focus:outline-none placeholder-gray-400 font-mono"
            />
            <button
              onClick={async () => {
                const path = await api.browse();
                if (path) setProjectPath(path);
              }}
              disabled={isScanning}
              className="px-2.5 py-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-40 border-l border-gray-200 transition-colors"
              title={t('chooseFolderTitle')}
            >
              <FolderOpen size={14} />
            </button>
          </div>
          <button
            onClick={handleScan}
            disabled={isScanning || !projectPath.trim()}
            className="flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 text-xs px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap font-medium"
          >
            {isScanning ? <Loader2 size={13} className="animate-spin" /> : <ChevronRight size={13} />}
            {isScanning ? t('scanning') : (locale === 'zh' ? '掃描' : 'Scan')}
          </button>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || files.length === 0}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap font-medium"
          >
            {isAnalyzing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {isAnalyzing
              ? t('analyzingProgress', { current: analyzeProgress.current, total: analyzeProgress.total })
              : (locale === 'zh' ? '分析' : 'Analyze')}
          </button>
        </div>

        {error && (
          <span className="text-red-600 text-xs max-w-xs truncate bg-red-50 border border-red-200 px-2 py-1 rounded-md">{error}</span>
        )}

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-2">
          {files.length > 0 && (
            <span className="text-xs text-gray-400 hidden sm:block">
              {t('filesCount', { count: files.length })}
              {hasAnalysis && <span className="text-emerald-600"> · {t('analyzedCount', { count: files.filter(f => f.description).length })}</span>}
              {cachedCount > 0 && !isAnalyzing && <span className="text-sky-500"> · {t('cachedCountLabel', { count: cachedCount })}</span>}
            </span>
          )}
          <button
            onClick={() => setShowQuiz(q => !q)}
            disabled={!hasAnalysis}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-medium ${
              showQuiz
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
            title={t('quizModeTitle')}
          >
            <GraduationCap size={13} />
            {locale === 'zh' ? '測驗' : 'Quiz'}
          </button>
          <button
            onClick={toggle}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors px-2 py-1 rounded-md border border-gray-200 hover:border-gray-300 bg-white"
            title={locale === 'zh' ? 'Switch to English' : '切換為繁體中文'}
          >
            {locale === 'zh' ? 'EN' : '繁中'}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title={t('settingsTitle')}
          >
            <Settings size={15} />
          </button>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: File tree */}
        <aside style={{ width: leftWidth }} className="flex-shrink-0 bg-white overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-gray-100 flex-shrink-0">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('fileStructure')}</span>
          </div>
          <FileTree files={files} selectedPath={selectedPath} onFileClick={handleFileClick} />
        </aside>

        <ResizeDivider onMouseDown={makeResizeHandler(leftWidth, setLeftWidth, 160, 400, 1)} />

        {/* Center: Report */}
        <main className="flex-1 overflow-hidden bg-slate-50">
          <ReportView
            reports={reports}
            isAnalyzing={isAnalyzing}
            generatingReportIndex={generatingReportIndex}
            analyzeProgress={analyzeProgress}
            files={files}
            onFileClick={handleFileClick}
            openFilePaths={openFilePaths}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onFileTabClose={handleFileTabClose}
          />
        </main>

        <ResizeDivider onMouseDown={makeResizeHandler(rightWidth, setRightWidth, 240, 500, -1)} />

        {/* Right: Chat / Quiz */}
        <aside style={{ width: rightWidth }} className="flex-shrink-0 bg-white overflow-hidden flex flex-col">
          {showQuiz ? (
            <QuizPanel />
          ) : (
            <ChatPanel
              messages={chatMessages}
              isChatting={isChatting}
              disabled={!hasAnalysis}
              onSend={handleChat}
              onClear={handleClearChat}
            />
          )}
        </aside>
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
