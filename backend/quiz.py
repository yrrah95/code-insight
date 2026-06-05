import json
import re

GENERATE_PROMPT = """根據以下專案摘要，出 5 道繁體中文問答題，均勻涵蓋這四個範圍（每範圍至少 1 題）：
1. 檔案功能：某支檔案或模組的主要職責
2. 技術選型：為什麼選用某框架、函式庫或設計模式
3. 流程理解：某個操作的完整執行路徑（例如登入、送出表單）
4. 關係結構：哪些模組互相依賴、呼叫關係

嚴格只回傳一個 JSON array，格式如下，不要任何其他文字或 markdown code block：
[
  {{"id": 1, "scope": "檔案功能", "question": "..."}},
  {{"id": 2, "scope": "技術選型", "question": "..."}},
  ...
]

專案摘要：
{context}"""

GRADE_PROMPT = """你是一位嚴謹的程式碼教師。請根據以下資訊批改學員的回答。

問題：{question}
學員回答：{answer}

參考資料（專案摘要）：
{context}

嚴格只回傳一個 JSON 物件，格式如下，不要任何其他文字或 markdown code block：
{{"verdict": "correct", "score": 90, "explanation": "..."}}

verdict 規則：
- "correct"：回答掌握了核心概念，基本正確
- "partial"：部分正確或有遺漏
- "incorrect"：方向錯誤或沒有根據

score：0-100 整數
explanation：繁體中文，2-4 句，說明正確答案並指出學員回答的優缺點"""


def _extract_json(text: str):
    """從 LLM 回應中提取 JSON，忽略前後雜訊"""
    text = text.strip()
    # 嘗試去除 markdown code block
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return json.loads(text.strip())


async def generate_questions(context: str, provider) -> list[dict]:
    prompt = GENERATE_PROMPT.format(context=context[:12000])
    chunks: list[str] = []
    async for chunk in provider.analyze_file("__quiz_generate__", prompt):
        chunks.append(chunk)
    raw = "".join(chunks)
    questions = _extract_json(raw)
    if not isinstance(questions, list):
        raise ValueError("LLM 未回傳正確的 JSON array")
    return questions


async def grade_answer(question: str, answer: str, context: str, provider) -> dict:
    prompt = GRADE_PROMPT.format(
        question=question,
        answer=answer,
        context=context[:8000],
    )
    chunks: list[str] = []
    async for chunk in provider.analyze_file("__quiz_grade__", prompt):
        chunks.append(chunk)
    raw = "".join(chunks)
    result = _extract_json(raw)
    return {
        "verdict": result.get("verdict", "incorrect"),
        "score": int(result.get("score", 0)),
        "explanation": result.get("explanation", ""),
    }
