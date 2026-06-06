import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Download, Lightbulb, RefreshCw, ChevronDown, FileText, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import type { FileItem } from '../types';
import { useT } from '../i18n/LocaleContext';

interface Props {
  reports: [string, string];
  isAnalyzing: boolean;
  generatingReportIndex: number | null;
  analyzeProgress: { current: number; total: number };
  files: FileItem[];
  onFileClick: (path: string) => void;
  openFilePaths: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onFileTabClose: (path: string) => void;
}

const PROSE_BASE = `prose prose-sm max-w-none break-words
  [&_table]:block [&_table]:overflow-x-auto [&_pre]:overflow-x-auto [&_img]:max-w-full
  prose-headings:text-gray-900 prose-h1:text-lg prose-h2:text-base
  prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900
  prose-code:text-indigo-700 prose-code:bg-indigo-50 prose-code:rounded prose-code:px-1
  prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200
  prose-a:text-indigo-600 prose-th:text-gray-700 prose-td:text-gray-600
  prose-blockquote:border-indigo-300 prose-blockquote:text-gray-600`;

function parseFileSections(md: string) {
  const parts = md.split(/\n(?=### )/);
  if (parts.length <= 1) return null;
  return parts.map(part => {
    const nl = part.indexOf('\n');
    return {
      title: (nl > 0 ? part.slice(0, nl) : part).replace(/^### /, '').trim(),
      content: nl > 0 ? part.slice(nl + 1) : '',
    };
  });
}

function parseReportSections(md: string) {
  const parts = md.split(/\n(?=## )/);
  const header = parts[0];
  const sections = parts.slice(1).map(part => {
    const nl = part.indexOf('\n');
    return {
      title: (nl > 0 ? part.slice(0, nl) : part).replace(/^## /, '').trim(),
      content: nl > 0 ? part.slice(nl + 1) : '',
    };
  });
  return { header, sections };
}

function AnalogyBlock({ aKey, title, content, analogy, loading, error, onExplain }: {
  aKey: string;
  title: string;
  content: string;
  analogy?: string;
  loading?: boolean;
  error?: string;
  onExplain: (key: string, title: string, content: string) => void;
}) {
  const t = useT();
  return (
    <div className="not-prose mt-4 pt-3 border-t border-gray-100 flex flex-col gap-2">
      <button
        onClick={() => onExplain(aKey, title, content)}
        disabled={loading}
        className="self-start flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg
          bg-amber-50 hover:bg-amber-100 border border-amber-200
          text-amber-700 transition-colors disabled:opacity-50"
      >
        {loading
          ? <Loader2 size={12} className="animate-spin" />
          : (analogy || error) ? <RefreshCw size={12} /> : <Lightbulb size={12} />}
        {loading ? t('explaining') : (analogy || error) ? t('reExplainBtn').replace('🔄 ', '') : t('analogyBtn').replace('💡 ', '')}
      </button>
      {error && (
        <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
          {error}
        </div>
      )}
      {analogy && (
        <div className="text-sm text-amber-800 leading-relaxed bg-amber-50 rounded-lg px-4 py-3 border border-amber-200">
          {analogy}
        </div>
      )}
    </div>
  );
}

function TabDot({ tabIndex, generatingReportIndex, content }: {
  tabIndex: number;
  generatingReportIndex: number | null;
  content: string;
}) {
  if (content) return <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />;
  if (generatingReportIndex !== null && generatingReportIndex >= tabIndex)
    return <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />;
  return <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />;
}

export default function ReportView({
  reports, isAnalyzing, generatingReportIndex, analyzeProgress,
  files, onFileClick,
  openFilePaths, activeTab, onTabChange, onFileTabClose,
}: Props) {
  const t = useT();
  const reportTabLabels = [t('reportTab0'), t('reportTab1')];
  const [expanded, setExpanded] = useState<Record<string, Set<number>>>({});
  const [analogies, setAnalogies] = useState<Record<string, string>>({});
  const [analogyLoading, setAnalogyLoading] = useState<Record<string, boolean>>({});
  const [analogyErrors, setAnalogyErrors] = useState<Record<string, string>>({});

  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollPositions = useRef(new Map<string, number>());

  const handleScroll = () => {
    if (scrollRef.current)
      scrollPositions.current.set(activeTab, scrollRef.current.scrollTop);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const timer = setTimeout(() => {
      el.scrollTop = scrollPositions.current.get(activeTab) ?? 0;
    }, 0);
    return () => clearTimeout(timer);
  }, [activeTab]);

  const toggleSection = (tab: string, idx: number) => {
    setExpanded(prev => {
      const s = new Set(prev[tab] ?? new Set<number>());
      s.has(idx) ? s.delete(idx) : s.add(idx);
      return { ...prev, [tab]: s };
    });
  };

  const isExpanded = (tab: string, idx: number) => expanded[tab]?.has(idx) ?? false;

  const handleExplain = useCallback(async (key: string, title: string, content: string) => {
    setAnalogyLoading(prev => ({ ...prev, [key]: true }));
    setAnalogies(prev => ({ ...prev, [key]: '' }));
    setAnalogyErrors(prev => ({ ...prev, [key]: '' }));
    try {
      await api.explainStream(
        title,
        content,
        (chunk) => setAnalogies(prev => ({ ...prev, [key]: (prev[key] ?? '') + chunk })),
        () => setAnalogyLoading(prev => ({ ...prev, [key]: false })),
      );
    } catch (err) {
      console.error('[比喻解釋] 失敗', err);
      const msg = err instanceof Error ? err.message : t('connectionFailed');
      setAnalogyErrors(prev => ({ ...prev, [key]: msg }));
      setAnalogyLoading(prev => ({ ...prev, [key]: false }));
    }
  }, [t]);

  const pct = analyzeProgress.total > 0
    ? Math.round((analyzeProgress.current / analyzeProgress.total) * 100)
    : 0;
  const hasAnyReport = reports.some(r => r.length > 0);
  const isReportTab = activeTab.startsWith('report-');
  const reportIndex = isReportTab ? parseInt(activeTab.split('-')[1]) as 0 | 1 : 0;

  const fileMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of files) {
      const basename = f.path.split('/').pop() ?? '';
      map.set(basename.toLowerCase(), f.path);
      const noExt = basename.replace(/\.[^/.]+$/, '');
      if (!map.has(noExt.toLowerCase())) map.set(noExt.toLowerCase(), f.path);
    }
    return map;
  }, [files]);

  const codeComponents = useMemo(() => ({
    code({ children, className }: { children?: React.ReactNode; className?: string }) {
      const text = String(children).trim();
      const match = fileMap.get(text.toLowerCase());
      if (match && !className) {
        return (
          <button
            onClick={() => onFileClick(match)}
            className="font-mono text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded px-1 py-0.5 cursor-pointer transition-colors text-xs"
            title={match}
          >
            {children}
          </button>
        );
      }
      return <code className={className}>{children}</code>;
    },
  }), [fileMap, onFileClick]);

  if (!hasAnyReport && !isAnalyzing && generatingReportIndex === null && openFilePaths.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 gap-4">
        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
          <FileText size={24} className="text-gray-300" />
        </div>
        <div>
          <p className="text-gray-500 text-sm mb-1">{t('reportEmpty0')}</p>
          <p className="text-gray-400 text-sm">{t('reportEmpty1')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {isAnalyzing && (
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-2.5">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
            <span>{t('analyzingFiles', { current: analyzeProgress.current, total: analyzeProgress.total })}</span>
            <span className="font-medium text-indigo-600">{pct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1">
            <div className="bg-indigo-500 h-1 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {generatingReportIndex !== null && !isAnalyzing && (
        <div className="flex-shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
          <Loader2 size={12} className="text-amber-500 animate-spin flex-shrink-0" />
          <span className="text-xs text-amber-700">
            {t('writingReport', { n: generatingReportIndex + 1, name: reportTabLabels[generatingReportIndex as 0 | 1] })}
          </span>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex-shrink-0 flex items-center border-b border-gray-200 bg-white overflow-x-auto">
        <div className="flex min-w-0">
          {reportTabLabels.map((label, i) => (
            <button
              key={i}
              onClick={() => onTabChange(`report-${i}`)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px whitespace-nowrap flex-shrink-0
                ${activeTab === `report-${i}`
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <TabDot tabIndex={i} generatingReportIndex={generatingReportIndex} content={reports[i]} />
              {label}
            </button>
          ))}

          {openFilePaths.length > 0 && (
            <div className="w-px bg-gray-200 my-2 flex-shrink-0 mx-1" />
          )}

          {openFilePaths.map(path => (
            <div
              key={path}
              className={`flex items-center gap-0.5 pl-3 pr-1.5 py-2.5 border-b-2 -mb-px flex-shrink-0 transition-colors
                ${activeTab === path
                  ? 'border-indigo-500 text-gray-800'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
            >
              <button
                onClick={() => onTabChange(path)}
                className="text-xs font-mono whitespace-nowrap max-w-32 truncate"
                title={path}
              >
                {path.split('/').pop()}
              </button>
              <button
                onClick={e => { e.stopPropagation(); onFileTabClose(path); }}
                className="ml-1 text-gray-300 hover:text-gray-500 transition-colors text-xs leading-none flex-shrink-0 w-4 h-4 flex items-center justify-center rounded hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {isReportTab && reports[reportIndex] && (
          <button
            onClick={() => {
              const blob = new Blob([reports[reportIndex]], { type: 'text/markdown' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${reportTabLabels[reportIndex]}.md`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="ml-auto mr-3 flex-shrink-0 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors px-2 py-1 rounded hover:bg-gray-100"
            title={t('exportTitle')}
          >
            <Download size={12} />
            {t('exportBtn').replace('↓ ', '')}
          </button>
        )}
      </div>

      {/* Content */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scrollbar-thin px-8 py-6"
      >
        {isReportTab ? (
          reports[reportIndex] ? (() => {
            const { header, sections } = parseReportSections(reports[reportIndex]);
            return (
              <div className="max-w-3xl mx-auto">
                <div className={PROSE_BASE}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={reportIndex === 0 ? codeComponents : undefined}
                  >
                    {header}
                  </ReactMarkdown>
                </div>

                <div className="mt-4 space-y-2">
                  {sections.map((sec, i) => (
                    <div key={i} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                      <button
                        onClick={() => toggleSection(activeTab, i)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
                      >
                        <span className="text-sm font-semibold text-gray-800">{sec.title}</span>
                        <ChevronDown
                          size={15}
                          className={`text-gray-400 transition-transform duration-200 flex-shrink-0 ml-2 ${isExpanded(activeTab, i) ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {isExpanded(activeTab, i) && (() => {
                        const aKey = `${activeTab}::${i}`;
                        return (
                          <div className={`px-5 py-4 border-t border-gray-100 ${PROSE_BASE}`}>
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={reportIndex === 0 ? codeComponents : undefined}
                            >
                              {sec.content}
                            </ReactMarkdown>
                            <AnalogyBlock
                              aKey={aKey}
                              title={sec.title}
                              content={sec.content}
                              analogy={analogies[aKey]}
                              loading={analogyLoading[aKey]}
                              error={analogyErrors[aKey]}
                              onExplain={handleExplain}
                            />
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </div>
            );
          })() : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              {generatingReportIndex !== null && generatingReportIndex < reportIndex
                ? t('waitingReport', { n: reportIndex + 1 })
                : generatingReportIndex === reportIndex
                ? t('writing')
                : t('notGenerated')}
            </div>
          )
        ) : (
          (() => {
            const file = files.find(f => f.path === activeTab);
            return (
              <div className="max-w-3xl mx-auto">
                <div className="mb-5 pb-4 border-b border-gray-100">
                  <p className="font-mono text-base text-indigo-700 font-medium mb-0.5">
                    {activeTab.split('/').pop()}
                  </p>
                  <p className="text-xs text-gray-400 font-mono">{activeTab}</p>
                </div>
                {file?.description ? (() => {
                  const fileSecs = parseFileSections(file.description);
                  if (fileSecs) {
                    return (
                      <div className="space-y-2">
                        {fileSecs.map((sec, i) => (
                          <div key={i} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                            <button
                              onClick={() => toggleSection(activeTab, i)}
                              className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
                            >
                              <span className="text-sm font-semibold text-gray-800">{sec.title}</span>
                              <ChevronDown
                                size={15}
                                className={`text-gray-400 transition-transform duration-200 flex-shrink-0 ml-2 ${isExpanded(activeTab, i) ? 'rotate-180' : ''}`}
                              />
                            </button>
                            {isExpanded(activeTab, i) && (() => {
                              const aKey = `${activeTab}::${i}`;
                              return (
                                <div className={`px-5 py-4 border-t border-gray-100 ${PROSE_BASE}`}>
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{sec.content}</ReactMarkdown>
                                  <AnalogyBlock
                                    aKey={aKey}
                                    title={sec.title}
                                    content={sec.content}
                                    analogy={analogies[aKey]}
                                    loading={analogyLoading[aKey]}
                                    error={analogyErrors[aKey]}
                                    onExplain={handleExplain}
                                  />
                                </div>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return (
                    <div className={PROSE_BASE}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{file.description}</ReactMarkdown>
                    </div>
                  );
                })() : (
                  <span className="text-gray-400 text-sm">{t('notAnalyzed')}</span>
                )}
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}
