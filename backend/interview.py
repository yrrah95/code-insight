from typing import AsyncIterator

_INTERVIEWER_CONTEXT = """\
你是一位耐心、有洞察力的技術面試官。

你正在面試一位開發者，測試他對以下專案的理解程度：

{context}

## 面試規則
1. 每次只問一個問題，等對方回答後再問下一題
2. 從整體架構開始（例如「這個專案主要做什麼？」），逐漸深入技術細節
3. 如果答案不完整或有誤，用引導式問題協助思考：
   - 「你覺得為什麼要這樣設計？」
   - 「如果不這樣做，可能會有什麼問題？」
   - 「能具體說說是怎麼實作的嗎？」
4. 絕對不直接說出答案，即使對方完全猜不到也只給更小的提示
5. 當對方展示出基本理解後，給予肯定並繼續下一題
6. 全程使用繁體中文
"""

_REPORT_PROMPT = """\
以下是一段技術面試的完整對話：

{conversation}

請根據這段對話，生成一份簡潔的學習報告：

## 你展示了理解
（條列出這位開發者答得好、真正理解的概念，每條一句話）

## 需要加強的地方
（條列出需要提示才能回答、答得不確定，或有誤解的地方）

## 建議下一步
（2-3 句具體建議，例如：「閱讀 backend/cache.py，重點看 is_stale() 的邏輯」）

用繁體中文，每個 section 各 2-4 條。直接開始報告，不要加前言。
"""


class InterviewEngine:
    MAX_TURNS = 14  # 約 7 輪問答

    def __init__(self):
        self.history: list[dict] = []
        self.context: str = ""
        self.turn_count: int = 0

    def set_context(self, context: str):
        self.context = context
        self.history = []
        self.turn_count = 0

    @property
    def can_finish(self) -> bool:
        return self.turn_count >= 6

    @property
    def auto_finish(self) -> bool:
        return self.turn_count >= self.MAX_TURNS

    async def start(self, provider) -> AsyncIterator[str]:
        """開始面試，AI 問第一個問題"""
        interviewer_ctx = _INTERVIEWER_CONTEXT.format(context=self.context)
        self.history = [{"role": "user", "content": "請開始面試，問第一個問題。"}]
        chunks: list[str] = []
        async for chunk in provider.chat(self.history, interviewer_ctx):
            chunks.append(chunk)
            yield chunk
        self.history.append({"role": "assistant", "content": "".join(chunks)})

    async def respond(self, user_answer: str, provider) -> AsyncIterator[str]:
        """用戶回答後，AI 繼續面試"""
        self.history.append({"role": "user", "content": user_answer})
        self.turn_count += 1
        interviewer_ctx = _INTERVIEWER_CONTEXT.format(context=self.context)
        chunks: list[str] = []
        async for chunk in provider.chat(self.history, interviewer_ctx):
            chunks.append(chunk)
            yield chunk
        self.history.append({"role": "assistant", "content": "".join(chunks)})

    async def generate_report(self, provider) -> AsyncIterator[str]:
        """根據對話歷史生成學習報告"""
        lines: list[str] = []
        for msg in self.history[1:]:  # 跳過觸發用的 "請開始面試"
            role = "面試官" if msg["role"] == "assistant" else "你"
            lines.append(f"**{role}**: {msg['content']}")
        conversation = "\n\n".join(lines)
        prompt = _REPORT_PROMPT.format(conversation=conversation)
        async for chunk in provider.generate(prompt):
            yield chunk

    def clear(self):
        self.history = []
        self.turn_count = 0
