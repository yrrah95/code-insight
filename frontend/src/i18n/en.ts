import type { zh } from './zh';

export const en: { [K in keyof typeof zh]: string } = {
  // App — toolbar
  pathPlaceholder: 'Enter project folder path, e.g. C:\\my-project',
  githubUrlPlaceholder: 'GitHub repo URL, e.g. https://github.com/user/repo',
  chooseFolderTitle: 'Choose Folder',
  scanBtn: '📂 Scan',
  scanning: 'Scanning...',
  cloneBtn: 'Clone',
  cloning: 'Cloning...',
  analyzeBtn: '✨ Analyze',
  analyzingProgress: 'Analyzing {current}/{total}',
  filesCount: '{count} files',
  analyzedCount: '{count} analyzed',
  cachedCountLabel: '{count} cached',
  clearCacheBtn: 'Clear Cache',
  cacheClearedMsg: 'Cache cleared',
  interviewModeTitle: 'AI Mock Interviewer',
  settingsTitle: 'LLM Settings',
  fileStructure: 'File Structure',
  allUpToDate: 'All files up to date, no re-analysis needed',
  chatError: 'Error: {message}',
  recentProjects: 'Recent Projects',
  switchToGithub: 'GitHub URL mode',
  switchToLocal: 'Switch to local path',
  exportZipBtn: 'ZIP',
  exportZipTitle: 'Export Full Analysis (ZIP)',
  notificationBody: 'Analysis complete! Reports generated',
  codebaseMdBtn: 'CODEBASE.md',
  codebaseMdTitle: 'Generate CODEBASE.md and save to project',
  codebaseMdSaved: 'CODEBASE.md saved to project directory, ready to commit',

  // Search
  searchPlaceholder: 'Search files...',
  searchResultCount: '{count} results',

  // FileTree
  fileTreeEmpty: 'Enter a project path and scan to see files here',


  // ChatPanel
  chatHeader: 'AI Q&A',
  clearChat: 'Clear Chat',
  chatEmptyTitle: 'After analysis, ask anything about this project here',
  chatEmptyHint: 'E.g.: "Where\'s the entry point?" "What does this service do?"',
  chatDisabled: 'Please scan and analyze a project first',
  chatPlaceholderDisabled: 'Complete analysis first',
  chatPlaceholder: 'Ask a question... (Enter to send)',
  sendBtn: 'Send',

  // InterviewPanel
  interviewReadyTitle: 'Can you actually explain your own code?',
  interviewReadyDesc: 'AI becomes your technical interviewer — generating multiple-choice questions from this exact codebase to test if you can explain the architecture, design decisions, and implementation details. Get it right and celebrate. Finish and get a personalized learning report.',
  startInterview: 'Start Interview',
  interviewWaitAnalysis: 'Please complete analysis before starting the interview',
  progressLabel: 'Understanding',
  generatingQuestion: 'Generating question...',
  questionNumber: 'Question {n}',
  nextQuestion: 'Next',
  generateReport: 'Generate Learning Report',
  reportGenerating: 'Generating learning report...',
  reportTitle: 'Learning Report',
  downloadReport: '↓ Download Report',
  retakeInterview: 'Interview Again',

  // SettingsModal
  settingsModalTitle: 'LLM Settings',
  providerLabel: 'Provider',
  ollamaLocalLabel: 'Ollama (Local)',
  modelLabel: 'Model Name',
  modelDefault: '(Leave blank to use default: {placeholder})',
  cancelBtn: 'Cancel',
  saveBtn: 'Save',
  savingBtn: 'Saving...',
  savedBtn: '✓ Saved',
  saveFailed: 'Save failed: {message}',
};
