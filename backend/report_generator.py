PROMPTS = [
    # 0 — 技術報告（給技術主管）
    """你是一位專業的系統分析師。請根據以下程式碼分析資料，用繁體中文為技術主管撰寫技術報告。
請直接從報告標題開始輸出，不要加任何前言或說明性文字。

報告標題：# {project_name}｜技術分析報告

## 一、整體架構與技術選型
說明這套系統是用什麼技術堆疊組成的，各層之間（例如前端、後端、資料庫）如何協作，讓技術主管能快速掌握系統的技術全貌。

## 二、核心運作流程
描述資料如何在系統中流動、主要功能是透過哪些環節串接完成的，讓技術主管不需要逐行看程式碼就能理解系統的骨架與脈絡。

---
程式碼分析資料：
{context}""",

    # 1 — 業務說明 + 操作指南（給業務人員與客戶）
    """你是一位系統說明專家。請根據以下程式碼分析資料，用繁體中文撰寫一份給業務人員與客戶看的說明文件。
請直接從報告標題開始輸出，不要加任何前言或說明性文字。

報告標題：# {project_name}｜業務說明與操作指南

## 一、這套系統能為您做什麼
用最簡單親切的語言說明系統的用途與帶來的便利。

## 二、支援的核心業務流程
說明這套系統支援哪些業務情境，每個流程用簡短一段文字描述。

## 三、完整操作流程
詳細說明使用者從開始到完成主要操作的每一個步驟，條列清楚，每步都說明白。

## 四、目前的限制與尚未支援的功能
說明使用上需要注意的限制，讓使用者有正確的預期。

語氣友善親切，讓完全不懂程式的人也能看懂並上手使用。

---
程式碼分析資料：
{context}""",
]


def _build_context(files: list[dict]) -> str:
    parts = []
    for f in files:
        if f.get("description"):
            parts.append(f"### `{f['path']}`\n{f['description']}")
    return "\n\n".join(parts)


async def generate_reports(files: list[dict], project_name: str, provider):
    context = _build_context(files)
    for idx, prompt_tpl in enumerate(PROMPTS):
        prompt = prompt_tpl.format(
            project_name=project_name,
            context=context[:20000],
        )
        async for chunk in provider.generate(prompt):
            yield idx, chunk
