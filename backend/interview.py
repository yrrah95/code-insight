import json
import re
from typing import AsyncIterator

_QUESTION_PROMPT = """\
你是一位出題老師，要幫助工程師理解以下程式碼專案：

{context}

已出過的題目（不要重複）：
{asked}

請根據上述程式碼，出一題四選一的選擇題，測試工程師對程式碼的真正理解。

規則：
- 只問在以上程式碼中確實存在的具體內容
- 4 個選項，只有 1 個正確，其他是合理但錯誤的選項
- 選項要有明確的對錯（不要模稜兩可）
- 從以下角度輪流出題：架構設計、資料流、技術選型、程式邏輯、模組職責

嚴格按照以下 JSON 格式輸出，不要輸出其他任何文字或說明：
{{"q": "問題文字", "choices": ["A. 選項一", "B. 選項二", "C. 選項三", "D. 選項四"], "correct": 0}}
correct 是正確答案的 0-based 索引（A=0, B=1, C=2, D=3）
"""

_FEEDBACK_CORRECT = """\
關於以下這道選擇題，用戶答對了：

問題：{question}
正確答案：{correct_choice}

請用 2-3 句話：先給一句簡短肯定，再解釋這個概念在專案中的重要作用，加深理解。
不要加標題，直接回應，用繁體中文。
"""

_FEEDBACK_WRONG = """\
關於以下這道選擇題，用戶答錯了：

問題：{question}
用戶選了：{user_choice}
正確答案：{correct_choice}

請用 2-3 句話：用友善方式（不要直說「你答錯了」，改說「這題確實需要看一下代碼...」）解釋正確答案的原因。
不要加標題，直接回應，用繁體中文。
"""

_REPORT_PROMPT = """\
以下是一場關於程式碼專案的選擇題測驗結果：

答對 {correct} 題 / 共 {total} 題

詳細記錄：
{summary}

專案背景：
{context}

請生成一份簡潔的學習報告：

## 掌握得好的地方
（根據答對的題目，指出理解了哪些概念，2-3 條）

## 需要加強的地方
（根據答錯的題目，指出哪些地方需要深入了解，2-3 條）

## 建議下一步
（2-3 句具體建議，例如「重新閱讀 backend/xxx.py，重點看...」）

用繁體中文。直接開始報告，不要加前言。
"""


async def _collect(provider, prompt: str) -> str:
    chunks: list[str] = []
    async for chunk in provider.generate(prompt):
        chunks.append(chunk)
    return "".join(chunks)


def _parse_question(text: str) -> dict:
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    start = text.find('{')
    end = text.rfind('}')
    if start != -1 and end > start:
        try:
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            pass
    raise ValueError(f"無法解析題目 JSON: {text[:200]}")


class InterviewEngine:
    MAX_QUESTIONS = 10

    def __init__(self):
        self.questions: list[dict] = []
        self.context: str = ""

    def set_context(self, context: str):
        self.context = context
        self.questions = []

    @property
    def answered_count(self) -> int:
        return sum(1 for q in self.questions if q.get("user_answer") is not None)

    @property
    def can_finish(self) -> bool:
        return self.answered_count >= 5

    @property
    def auto_finish(self) -> bool:
        return self.answered_count >= self.MAX_QUESTIONS

    @property
    def score(self) -> tuple[int, int]:
        answered = [q for q in self.questions if q.get("user_answer") is not None]
        correct = sum(1 for q in answered if q["user_answer"] == q["correct"])
        return correct, len(answered)

    @property
    def progress_pct(self) -> int:
        return min(100, round(self.answered_count / self.MAX_QUESTIONS * 100))

    async def next_question(self, provider) -> dict:
        asked = "\n".join(f"- {q['q'][:60]}" for q in self.questions) or "（無）"
        prompt = _QUESTION_PROMPT.format(context=self.context, asked=asked)
        text = await _collect(provider, prompt)
        question = _parse_question(text)
        question["user_answer"] = None
        self.questions.append(question)
        return {"q": question["q"], "choices": question["choices"], "correct": question["correct"]}

    async def answer(self, choice: int, provider) -> AsyncIterator[str]:
        if not self.questions:
            return
        q = self.questions[-1]
        q["user_answer"] = choice
        is_correct = q["correct"] == choice

        if is_correct:
            prompt = _FEEDBACK_CORRECT.format(
                question=q["q"],
                correct_choice=q["choices"][q["correct"]],
            )
        else:
            prompt = _FEEDBACK_WRONG.format(
                question=q["q"],
                user_choice=q["choices"][choice],
                correct_choice=q["choices"][q["correct"]],
            )

        async for chunk in provider.generate(prompt):
            yield chunk

    async def generate_report(self, provider) -> AsyncIterator[str]:
        correct, total = self.score
        lines = []
        for i, q in enumerate(self.questions):
            if q.get("user_answer") is not None:
                ua = q["user_answer"]
                mark = "✓" if ua == q["correct"] else "✗"
                lines.append(
                    f"Q{i+1} {mark}: {q['q']}\n   選了：{q['choices'][ua]}，正確：{q['choices'][q['correct']]}"
                )
        summary = "\n".join(lines) or "無記錄"
        prompt = _REPORT_PROMPT.format(
            correct=correct, total=total, summary=summary, context=self.context
        )
        async for chunk in provider.generate(prompt):
            yield chunk

    def clear(self):
        self.questions = []
