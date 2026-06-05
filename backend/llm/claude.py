from typing import AsyncIterator
from anthropic import AsyncAnthropic
from .base import LLMProvider

FILE_ANALYZE_PROMPT = """請用繁體中文分析這支程式檔案，用讓完全不懂程式的人也能看懂的語言說明。

檔案路徑：{filepath}

程式碼：
```
{content}
```

請依以下格式輸出，每節 2~3 句，口語化、不用技術術語：

### 這支程式在做什麼
說明這個檔案的用途與作用。

### 和哪些檔案有依賴關係
根據程式碼中的 import、using 等引用，說明這支程式依賴哪些其他檔案或模組，以及為什麼需要它們。

### 執行順序是什麼
說明這支程式在系統運作時，什麼情況下會被呼叫、大致的執行流程是什麼。

### 最容易出問題的地方
說明這支程式中哪些地方最容易出現錯誤或需要特別注意。"""


class ClaudeProvider(LLMProvider):
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-6"):
        self.client = AsyncAnthropic(api_key=api_key)
        self.model = model

    async def analyze_file(self, filepath: str, content: str) -> AsyncIterator[str]:
        prompt = FILE_ANALYZE_PROMPT.format(filepath=filepath, content=content[:8000])
        async with self.client.messages.stream(
            model=self.model,
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            async for text in stream.text_stream:
                yield text

    async def generate(self, prompt: str) -> AsyncIterator[str]:
        async with self.client.messages.stream(
            model=self.model,
            max_tokens=16000,
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            async for text in stream.text_stream:
                yield text

    async def chat(self, messages: list[dict], context: str) -> AsyncIterator[str]:
        system = (
            "你是一個程式碼分析助理，專門幫助工程師理解程式碼專案。\n"
            "以下是已分析的專案摘要，請根據這些資訊回答使用者的問題：\n\n"
            f"{context}\n\n"
            "請用繁體中文回答，盡量具體，並指出相關的檔案路徑。"
        )
        async with self.client.messages.stream(
            model=self.model,
            max_tokens=1000,
            system=system,
            messages=messages,
        ) as stream:
            async for text in stream.text_stream:
                yield text
