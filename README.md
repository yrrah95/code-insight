<div align="center">

# 🔍 CodeInsight

**用 AI 在 5 分鐘內看懂任何陌生專案**

*Understand any codebase in 5 minutes with AI*

[![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python)](https://python.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker)](docker-compose.yml)

</div>

---

## 這是什麼？ / What is this?

**CodeInsight** 是一個本地端 AI 程式碼分析工具。把專案資料夾丟進去，它會：

- 自動掃描所有程式碼檔案並分類
- 用 AI 為每支檔案產生繁體中文說明（依賴關係、執行流程、易出錯的地方）
- 生成技術報告（給工程師主管）與業務說明（給非技術人員）
- 支援 AI 問答與學習測驗

程式碼完全在你自己的機器上運行，不會上傳到任何第三方伺服器（除了 LLM API 呼叫）。

---

**CodeInsight** is a local AI-powered code analysis tool. Drop in any project folder and it will:

- Auto-scan and categorize all source files
- Generate human-readable explanations (dependencies, execution flow, common pitfalls) for each file
- Produce a technical report (for engineers) and a business summary (for non-technical stakeholders)
- Support AI Q&A and learning quizzes

Your code stays on your machine — nothing is sent to any central server (only to your chosen LLM API).

---

## 功能特色 / Features

| 功能 | 說明 |
|------|------|
| 📁 **智能掃描** | 遞迴掃描 30+ 種程式語言，自動分類（Controller、Service、Model 等） |
| 🤖 **AI 檔案分析** | 每支檔案生成：用途說明、依賴關係、執行順序、易出錯的地方 |
| 📊 **雙份報告** | 技術架構報告 + 業務說明報告，各有不同閱讀對象 |
| 💬 **程式碼問答** | 基於已分析的專案上下文，用自然語言提問 |
| 💡 **比喻解釋** | 展開任一章節，點按鈕即可獲得國中生版本的解釋 |
| 🧠 **學習測驗** | 自動生成題目，加深對專案的理解 |
| 💾 **智能快取** | 已分析的檔案自動快取，重新開啟不需重跑 |
| 🔧 **多 LLM 支援** | Claude、OpenAI、DeepSeek、Ollama（本地免費） |

---

## 安裝 / Installation

### 方式一：本地啟動（Windows）

**需求 / Requirements**
- Python 3.11+
- Node.js 20+
- Git

```bash
# 1. Clone 專案
git clone https://github.com/yrrah95/code-insight.git
cd code-insight

# 2. 複製並設定 LLM 設定
cp backend/settings.example.json backend/settings.json
# 編輯 backend/settings.json，填入你的 API Key（見下方 Configuration）

# 3. 啟動（自動安裝依賴 + 開啟瀏覽器）
./start.ps1
```

服務啟動後自動開啟 `http://localhost:5173`

---

### 方式二：Docker（跨平台）

**需求 / Requirements**
- Docker Desktop（含 Docker Compose）

```bash
# 1. Clone 專案
git clone https://github.com/yrrah95/code-insight.git
cd code-insight

# 2. 複製並設定 LLM 設定
cp backend/settings.example.json backend/settings.json
# 編輯 backend/settings.json，填入你的 API Key

# 3. 啟動（第一次需要幾分鐘建置）
SCAN_PATH=/path/to/your/projects docker-compose up --build
```

> **Windows（PowerShell）：**
> ```powershell
> $env:SCAN_PATH="C:\path\to\your\projects"; docker-compose up --build
> ```

開啟瀏覽器訪問 `http://localhost`，路徑欄輸入 `/workspace` 或 `/workspace/子資料夾`

---

## 設定 / Configuration

編輯 `backend/settings.json`（參考 `backend/settings.example.json`）：

```json
{
  "provider": "claude",
  "api_key": "your-api-key-here",
  "model": "",
  "ollama_url": "http://localhost:11434"
}
```

### 支援的 LLM Provider

| Provider | `provider` 值 | 取得 API Key | 預設模型 |
|----------|--------------|-------------|---------|
| **Anthropic Claude** | `claude` | [console.anthropic.com](https://console.anthropic.com) | claude-sonnet-4-6 |
| **OpenAI** | `openai` | [platform.openai.com](https://platform.openai.com) | gpt-4o |
| **DeepSeek** | `deepseek` | [platform.deepseek.com](https://platform.deepseek.com) | deepseek-chat |
| **Ollama（本地免費）** | `ollama` | 不需要 | llama3.2 |

### 使用 Ollama（完全免費，本地運行）

```bash
# 1. 安裝 Ollama：https://ollama.com/download

# 2. 下載模型（擇一）
ollama pull llama3.2       # 推薦，速度快
ollama pull deepseek-r1    # 推理能力強

# 3. 設定 backend/settings.json
```

```json
{
  "provider": "ollama",
  "api_key": "",
  "model": "llama3.2",
  "ollama_url": "http://localhost:11434"
}
```

### 設定欄位說明

| 欄位 | 說明 | 必填 |
|------|------|------|
| `provider` | LLM 提供商：`claude` / `openai` / `deepseek` / `ollama` | ✅ |
| `api_key` | 對應 provider 的 API Key（Ollama 留空） | 視 provider |
| `model` | 指定模型名稱，留空使用各 provider 預設值 | ❌ |
| `ollama_url` | Ollama 服務位址，僅 Ollama 模式有效 | ❌ |

---

## 使用教學 / Usage

### Step 1 — 掃描專案

啟動後點擊「選擇資料夾」（本地模式）或直接輸入路徑，再按「掃描」。  
左側 FileTree 會列出所有程式碼檔案，依類別折疊（Controller、Service、Model 等）。

### Step 2 — 分析程式碼

按「分析所有檔案」，AI 會逐一分析每支檔案（已快取的自動跳過）。  
點擊 FileTree 中的任一檔案，右側會顯示：
- 這支程式在做什麼
- 和哪些檔案有依賴關係
- 執行順序是什麼
- 最容易出問題的地方

點展開各章節後，按「💡 比喻解釋」可取得更口語化的說明。

### Step 3 — 產生報告

分析完成後點擊「產生報告」，系統會依序生成：

- **技術報告**：整體架構、技術選型、核心流程（適合工程師與技術主管）
- **業務說明**：系統功能、使用情境、完整操作流程（適合非技術人員與客戶）

每個章節預設折疊，點標題展開即可閱讀。

### Step 4 — AI 問答

切換到「聊天」頁籤，直接用自然語言提問：

```
這個系統的認證機制是怎麼實作的？
哪個地方最容易出 bug？
UserService 和 OrderService 之間的關係是什麼？
```

### Step 5 — 學習測驗

切換到「測驗」頁籤，自動生成 5 道問答題，幫助你確認是否真的看懂了這個專案。

### 快取管理

分析結果存在專案目錄下的 `.codeinsight.json`，想重新分析請刪除此檔案，或直接在設定頁面清除。

---

## 支援的程式語言 / Supported Languages

Python、JavaScript、TypeScript、C#、Java、Go、Rust、Ruby、PHP、  
Vue、Svelte、HTML、CSS / SCSS、SQL、JSON、YAML / TOML、Shell Script 等 **30+ 種**。

自動跳過 `node_modules`、`.git`、`dist`、`build`、`__pycache__` 等目錄。

---

## 資料使用政策 / Data Policy

**CodeInsight 不收集任何使用者資料。**

本工具採 **self-hosted** 架構：

| 項目 | 說明 |
|------|------|
| ✅ 分析結果 | 存在你自己機器上的 `.codeinsight.json`，不上傳任何地方 |
| ✅ 中央伺服器 | CodeInsight 沒有中央伺服器，也不會有 |
| ⚠️ LLM API | 程式碼內容會傳給你設定的 AI 服務（Anthropic / OpenAI / DeepSeek） |
| ✅ Ollama 模式 | 完全本地運算，零外部 API 呼叫 |

**建議：** 分析含有機密資訊的專案前，請先閱讀你所選擇的 LLM 提供商的資料使用政策：
- Anthropic：[https://www.anthropic.com/privacy](https://www.anthropic.com/privacy)
- OpenAI：[https://openai.com/policies/privacy-policy](https://openai.com/policies/privacy-policy)
- DeepSeek：[https://www.deepseek.com/privacy](https://www.deepseek.com/privacy)

---

**CodeInsight does not collect any user data.**

This tool is fully **self-hosted**:

| Item | Details |
|------|---------|
| ✅ Analysis results | Stored locally in `.codeinsight.json` — never uploaded anywhere |
| ✅ Central server | CodeInsight has no central server |
| ⚠️ LLM API calls | Source code is sent to your chosen AI provider (Anthropic / OpenAI / DeepSeek) |
| ✅ Ollama mode | 100% local processing — zero external API calls |

**Recommendation:** Before analyzing proprietary code, review the privacy policy of your chosen LLM provider.

---

## 技術堆疊 / Tech Stack

| 層 | 技術 |
|----|------|
| 後端 Backend | Python 3.11 · FastAPI · uvicorn |
| 前端 Frontend | React 19 · TypeScript · Tailwind CSS v4 · Vite |
| AI | Anthropic SDK · OpenAI SDK · httpx（Ollama） |
| 部署 Deploy | Docker · Docker Compose · Nginx |

---

## 授權 / License

[MIT License](LICENSE) — 自由使用、修改、散布。

---

## 貢獻 / Contributing

歡迎 PR 和 Issue！特別期待：

- 🌐 新的 LLM provider 支援
- 🎨 UI / UX 改進
- 🌍 多語系支援（目前輸出為繁體中文）
- 🐛 Bug 回報

---

<div align="center">
Made with ❤️ for engineers who inherit legacy code
</div>
