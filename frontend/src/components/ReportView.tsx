import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../api/client';
import type { FileItem } from '../types';

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

const REPORT_TABS = ['技術報告', '業務說明'] as const;

const PROSE_BASE = `prose prose-invert prose-sm break-words
  [&_table]:block [&_table]:overflow-x-auto [&_pre]:overflow-x-auto [&_img]:max-w-full
  prose-headings:text-gray-100 prose-h1:text-lg prose-h2:text-base
  prose-p:text-gray-300 prose-li:text-gray-300 prose-strong:text-gray-200
  prose-code:text-violet-300 prose-pre:bg-gray-900
  prose-a:text-violet-400 prose-th:text-gray-300 prose-td:text-gray-400`;

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
  return (
    <div className="not-prose mt-4 pt-3 border-t border-gray-700/50 flex flex-col gap-2">
      <button
        onClick={() => onExplain(aKey, title, content)}
        disabled={loading}
        className="self-start text-xs px-3 py-1.5 rounded-lg
          bg-amber-900/30 hover:bg-amber-800/40 border border-amber-700/40
          text-amber-300 transition-colors disabled:opacity-50"
      >
        {loading ? '解釋中...' : (analogy || error) ? '🔄 重新解釋' : '💡 比喻解釋'}
      </button>
      {error && (
        <div className="text-xs text-red-400 bg-red-900/20 rounded px-3 py-2 border border-red-800/30">
          ⚠️ {error}
        </div>
      )}
      {analogy && (
        <div className="text-sm text-amber-200/80 leading-relaxed
          bg-amber-900/10 rounded-lg px-4 py-3 border border-amber-700/20">
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
  if (content) return <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />;
  if (generatingReportIndex !== null && generatingReportIndex >= tabIndex)
    return <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />;
  return <span className="w-1.5 h-1.5 rounded-full bg-gray-600 inline-block" />;
}

export default function ReportView({
  reports, isAnalyzing, generatingReportIndex, analyzeProgress,
  files, onFileClick,
  openFilePaths, activeTab, onTabChange, onFileTabClose,
}: Props) {
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
    const t = setTimeout(() => {
      el.scrollTop = scrollPositions.current.get(activeTab) ?? 0;
    }, 0);
    return () => clearTimeout(t);
  }, [activeTab]);

  const toggleSection = (tab: string, idx: number) => {
    setExpanded(prev => {
      const s = new Set(prev[tab] ?? new Set<number>());
      s.has(idx) ? s.delete(idx) : s.add(idx);
      return { ...prev, [tab]: s };
    });
  };

  const isExpanded = (tab: string, idx: number) =>
    expanded[tab]?.has(idx) ?? false;

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
      const msg = err instanceof Error ? err.message : '連線失敗，請確認後端已啟動';
      setAnalogyErrors(prev => ({ ...prev, [key]: msg }));
      setAnalogyLoading(prev => ({ ...prev, [key]: false }));
    }
  }, []);

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
            className="font-mono text-violet-300 bg-violet-900/30 hover:bg-violet-700/40 border border-violet-700/50 rounded px-1 py-0.5 cursor-pointer transition-colors"
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
      <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm text-center p-8">
        <span className="text-5xl mb-4">📋</span>
        <p className="text-gray-400 mb-1">掃描並分析專案後，</p>
        <p>將自動產生兩份技術報告</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {isAnalyzing && (
        <div className="flex-shrink-0 bg-gray-900 border-b border-gray-800 px-4 py-2">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
            <span>逐檔分析中... {analyzeProgress.current} / {analyzeProgress.total} 檔案</span>
            <span>{pct}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-1">
            <div className="bg-violet-500 h-1 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {generatingReportIndex !== null && !isAnalyzing && (
        <div className="flex-shrink-0 bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center gap-2">
          <span className="text-xs text-amber-400 animate-pulse">✦</span>
          <span className="text-xs text-gray-400">
            正在撰寫第 {generatingReportIndex + 1} / 2 份報告（{REPORT_TABS[generatingReportIndex as 0 | 1]}）...
          </span>
        </div>
      )}

      {/* 頁籤列 */}
      <div className="flex-shrink-0 flex items-center border-b border-gray-800 bg-gray-900/50 overflow-x-auto">
        <div className="flex min-w-0">
          {REPORT_TABS.map((label, i) => (
            <button
              key={i}
              onClick={() => onTabChange(`report-${i}`)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px whitespace-nowrap flex-shrink-0
                ${activeTab === `report-${i}`
                  ? 'border-violet-500 text-gray-100'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
            >
              <TabDot tabIndex={i} generatingReportIndex={generatingReportIndex} content={reports[i]} />
              {label}
            </button>
          ))}

          {openFilePaths.length > 0 && (
            <div className="w-px bg-gray-700 my-2 flex-shrink-0" />
          )}

          {openFilePaths.map(path => (
            <div
              key={path}
              className={`flex items-center gap-0.5 pl-3 pr-1.5 py-2.5 border-b-2 -mb-px flex-shrink-0 transition-colors
                ${activeTab === path
                  ? 'border-violet-400 text-gray-100'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
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
                className="ml-1 text-gray-600 hover:text-gray-300 transition-colors text-xs leading-none flex-shrink-0"
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
              a.download = `${REPORT_TABS[reportIndex]}.md`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="ml-auto mr-3 flex-shrink-0 text-xs text-gray-500 hover:text-gray-200 transition-colors px-2 py-1 rounded hover:bg-gray-800"
            title="匯出為 Markdown"
          >
            ↓ 匯出
          </button>
        )}
      </div>

      {/* 內容區域（捲動位置記憶） */}
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
                {/* 報告標題 */}
                <div className={PROSE_BASE}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={reportIndex === 0 ? codeComponents : undefined}
                  >
                    {header}
                  </ReactMarkdown>
                </div>

                {/* 章節 Accordion */}
                <div className="mt-4 space-y-2">
                  {sections.map((sec, i) => (
                    <div key={i} className="border border-gray-800 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleSection(activeTab, i)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-900/80 hover:bg-gray-800 transition-colors text-left"
                      >
                        <span className="text-sm font-semibold text-gray-200">{sec.title}</span>
                        <span
                          className="text-gray-500 text-xs transition-transform duration-200 flex-shrink-0 ml-2"
                          style={{ display: 'inline-block', transform: isExpanded(activeTab, i) ? 'rotate(180deg)' : 'rotate(0deg)' }}
                        >
                          ▼
                        </span>
                      </button>
                      {isExpanded(activeTab, i) && (() => {
                        const aKey = `${activeTab}::${i}`;
                        return (
                          <div className={`px-5 py-4 border-t border-gray-800 ${PROSE_BASE}`}>
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
            <div className="flex items-center justify-center h-full text-gray-600 text-sm">
              {generatingReportIndex !== null && generatingReportIndex < reportIndex
                ? `等待第 ${reportIndex + 1} 份報告產生...`
                : generatingReportIndex === reportIndex
                ? '撰寫中...'
                : '尚未產生'}
            </div>
          )
        ) : (
          // 檔案說明頁籤
          (() => {
            const file = files.find(f => f.path === activeTab);
            return (
              <div className="max-w-3xl mx-auto">
                <div className="mb-5">
                  <p className="font-mono text-base text-violet-300 mb-1">
                    {activeTab.split('/').pop()}
                  </p>
                  <p className="text-xs text-gray-600">{activeTab}</p>
                </div>
                {file?.description ? (() => {
                  const fileSecs = parseFileSections(file.description);
                  if (fileSecs) {
                    return (
                      <div className="space-y-2">
                        {fileSecs.map((sec, i) => (
                          <div key={i} className="border border-gray-800 rounded-lg overflow-hidden">
                            <button
                              onClick={() => toggleSection(activeTab, i)}
                              className="w-full flex items-center justify-between px-4 py-3 bg-gray-900/80 hover:bg-gray-800 transition-colors text-left"
                            >
                              <span className="text-sm font-semibold text-gray-200">{sec.title}</span>
                              <span
                                className="text-gray-500 text-xs flex-shrink-0 ml-2"
                                style={{ display: 'inline-block', transition: 'transform .2s', transform: isExpanded(activeTab, i) ? 'rotate(180deg)' : 'rotate(0deg)' }}
                              >▼</span>
                            </button>
                            {isExpanded(activeTab, i) && (() => {
                              const aKey = `${activeTab}::${i}`;
                              return (
                                <div className="px-5 py-4 border-t border-gray-800 prose prose-invert prose-base break-words
                                  prose-headings:text-gray-100 prose-p:text-gray-300 prose-li:text-gray-300
                                  prose-strong:text-gray-200 prose-code:text-violet-300 prose-a:text-violet-400">
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
                    <div className="prose prose-invert prose-base break-words
                      prose-headings:text-gray-100 prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
                      prose-p:text-gray-300 prose-li:text-gray-300 prose-strong:text-gray-200
                      prose-code:text-violet-300 prose-pre:bg-gray-900 prose-a:text-violet-400">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{file.description}</ReactMarkdown>
                    </div>
                  );
                })() : (
                  <span className="text-gray-600 text-sm">尚未分析</span>
                )}
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}
