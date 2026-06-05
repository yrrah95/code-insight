import { useState, useEffect } from 'react';
import type { FileItem } from '../types';

interface Props {
  files: FileItem[];
  selectedPath?: string | null;
  onFileClick?: (path: string) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  Controllers: '🎮',
  Views: '🖼',
  Services: '⚙️',
  Models: '📦',
  Repositories: '🗄️',
  Middleware: '🔗',
  Utilities: '🔧',
  Components: '🧩',
  Pages: '📄',
  API: '🌐',
  Routes: '🛣️',
  Configuration: '⚙️',
  Hooks: '🪝',
  Store: '🏪',
  Tests: '🧪',
  Other: '📁',
};

export default function FileTree({ files, selectedPath, onFileClick }: Props) {
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});

  const byCategory = files.reduce<Record<string, FileItem[]>>((acc, f) => {
    (acc[f.category] ??= []).push(f);
    return acc;
  }, {});

  const toggle = (cat: string) =>
    setOpenCats(prev => ({ ...prev, [cat]: !prev[cat] }));

  // 當 selectedPath 改變時，自動展開對應的 category
  useEffect(() => {
    if (!selectedPath) return;
    const file = files.find(f => f.path === selectedPath);
    if (file) {
      setOpenCats(prev => ({ ...prev, [file.category]: true }));
    }
  }, [selectedPath, files]);

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm p-4 text-center">
        <span className="text-3xl mb-2">📂</span>
        <p>輸入專案路徑並掃描，檔案列表會出現在這裡</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto scrollbar-thin h-full py-2">
      {Object.entries(byCategory).sort(([a], [b]) => a.localeCompare(b)).map(([category, catFiles]) => (
        <div key={category}>
          <button
            onClick={() => toggle(category)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-200 hover:bg-gray-800 transition-colors"
          >
            <span>{CATEGORY_ICONS[category] ?? '📁'}</span>
            <span className="flex-1 text-left">{category}</span>
            <span className="text-gray-600">{catFiles.length}</span>
            <span className="text-gray-600">{openCats[category] ? '⌄' : '›'}</span>
          </button>
          {openCats[category] && catFiles.map((f) => {
            const isSelected = f.path === selectedPath;
            return (
              <div
                key={f.path}
                onClick={() => onFileClick?.(f.path)}
                title={f.path}
                className={`w-full flex items-center gap-2 px-4 py-1 text-xs transition-colors border-l-2
                  ${isSelected
                    ? 'bg-gray-800 border-violet-500 cursor-default'
                    : `border-transparent ${onFileClick ? 'hover:bg-gray-800 cursor-pointer' : ''}`
                  }`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${f.description ? 'bg-green-500' : 'bg-gray-600'}`} />
                <span className={`truncate flex-1 ${isSelected ? 'text-gray-100' : 'text-gray-400'}`}>
                  {f.path.split('/').pop()}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
