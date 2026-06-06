import { useState, useEffect } from 'react';
import {
  Gamepad2, Layout, Cog, Package, Database, Link2, Wrench,
  Puzzle, FileText, Globe, Route, Settings, Anchor, Store,
  TestTube, Folder, ChevronRight, ChevronDown,
} from 'lucide-react';
import type { FileItem } from '../types';
import { useT } from '../i18n/LocaleContext';

interface Props {
  files: FileItem[];
  selectedPath?: string | null;
  onFileClick?: (path: string) => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Controllers: <Gamepad2 size={13} />,
  Views: <Layout size={13} />,
  Services: <Cog size={13} />,
  Models: <Package size={13} />,
  Repositories: <Database size={13} />,
  Middleware: <Link2 size={13} />,
  Utilities: <Wrench size={13} />,
  Components: <Puzzle size={13} />,
  Pages: <FileText size={13} />,
  API: <Globe size={13} />,
  Routes: <Route size={13} />,
  Configuration: <Settings size={13} />,
  Hooks: <Anchor size={13} />,
  Store: <Store size={13} />,
  Tests: <TestTube size={13} />,
  Other: <Folder size={13} />,
};

export default function FileTree({ files, selectedPath, onFileClick }: Props) {
  const t = useT();
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});

  const byCategory = files.reduce<Record<string, FileItem[]>>((acc, f) => {
    (acc[f.category] ??= []).push(f);
    return acc;
  }, {});

  const toggle = (cat: string) =>
    setOpenCats(prev => ({ ...prev, [cat]: !prev[cat] }));

  useEffect(() => {
    if (!selectedPath) return;
    const file = files.find(f => f.path === selectedPath);
    if (file) setOpenCats(prev => ({ ...prev, [file.category]: true }));
  }, [selectedPath, files]);

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 text-xs p-6 text-center gap-3">
        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
          <Folder size={18} className="text-gray-300" />
        </div>
        <p className="leading-relaxed text-gray-400">{t('fileTreeEmpty')}</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto scrollbar-thin h-full py-1">
      {Object.entries(byCategory).sort(([a], [b]) => a.localeCompare(b)).map(([category, catFiles]) => (
        <div key={category}>
          <button
            onClick={() => toggle(category)}
            className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <span className="text-gray-400 flex-shrink-0">
              {CATEGORY_ICONS[category] ?? <Folder size={13} />}
            </span>
            <span className="flex-1 text-left">{category}</span>
            <span className="text-gray-300 font-normal mr-1">{catFiles.length}</span>
            {openCats[category]
              ? <ChevronDown size={12} className="text-gray-400 flex-shrink-0" />
              : <ChevronRight size={12} className="text-gray-400 flex-shrink-0" />}
          </button>
          {openCats[category] && catFiles.map((f) => {
            const isSelected = f.path === selectedPath;
            return (
              <div
                key={f.path}
                onClick={() => onFileClick?.(f.path)}
                title={f.path}
                className={`w-full flex items-center gap-2 px-4 py-1.5 text-xs transition-colors border-l-2
                  ${isSelected
                    ? 'bg-indigo-50 border-indigo-500 cursor-default'
                    : `border-transparent ${onFileClick ? 'hover:bg-gray-50 cursor-pointer' : ''}`
                  }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${f.description ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                <span className={`truncate flex-1 font-mono text-xs ${isSelected ? 'text-indigo-700 font-medium' : 'text-gray-500'}`}>
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
