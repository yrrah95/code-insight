# Contributing to CodeInsight

感謝你有興趣貢獻 CodeInsight！以下是參與方式。

*Thank you for your interest in contributing to CodeInsight! Here's how to get involved.*

---

## 回報問題 / Reporting Issues

在提交 Issue 之前，請先搜尋現有 Issue 確認尚未被回報。

*Before submitting an issue, please search existing issues to avoid duplicates.*

**Bug 回報請包含 / Bug reports should include:**
- 作業系統與版本 / OS and version
- Python 與 Node.js 版本 / Python and Node.js versions
- 使用的 LLM Provider / LLM Provider being used
- 重現步驟 / Steps to reproduce
- 預期行為與實際行為 / Expected vs actual behavior

---

## 提交 Pull Request

1. Fork 此 repository
2. 建立你的功能分支：`git checkout -b feature/my-feature`
3. 確認本地能正常執行
4. 提交 commit：`git commit -m "Add: my feature description"`
5. Push 到你的 fork：`git push origin feature/my-feature`
6. 開啟 Pull Request，填寫描述說明改動內容

---

## 開發環境設定 / Dev Setup

```bash
# Backend
cd backend
pip install -r requirements.txt
cp settings.example.json settings.json
# 編輯 settings.json 填入你的 API Key
uvicorn main:app --reload --port 8000

# Frontend（另一個終端）
cd frontend
npm install
npm run dev
```

前端開啟 `http://localhost:5173`

---

## 歡迎貢獻的方向 / Good First Contributions

- 🌐 新增 LLM provider（Gemini、Mistral 等）
- 🌍 改善英文翻譯品質
- 🐛 Bug 修復
- 🎨 UI 改進
- 📦 新的程式語言支援測試

---

## 程式碼風格 / Code Style

- Python：遵循 PEP 8，使用現有命名慣例
- TypeScript/React：遵循現有元件結構，使用 `useT()` 處理所有 UI 字串
- 新的 UI 字串必須同時加入 `frontend/src/i18n/zh.ts` 和 `en.ts`

---

## 授權 / License

提交 PR 即表示你同意將你的貢獻以 [MIT License](LICENSE) 授權。

*By submitting a PR, you agree to license your contribution under the [MIT License](LICENSE).*
