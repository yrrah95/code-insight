import json
from typing import AsyncIterator
import httpx
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


class OllamaProvider(LLMProvider):
    def __init__(self, base_url: str = "http://localhost:11434", model: str = "llama3.2"):
        self.base_url = base_url.rstrip("/")
        self.model = model

    async def analyze_file(self, filepath: str, content: str) -> AsyncIterator[str]:
        prompt = FILE_ANALYZE_PROMPT.format(filepath=filepath, content=content[:8000])
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/api/generate",
                json={"model": self.model, "prompt": prompt, "stream": True},
            ) as resp:
                async for line in resp.aiter_lines():
                    if line:
                        data = json.loads(line)
                        if "response" in data:
                            yield data["response"]

    async def generate(self, prompt: str) -> AsyncIterator[str]:
        async with httpx.AsyncClient(timeout=300) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/api/generate",
                json={"model": self.model, "prompt": prompt, "stream": True},
            ) as resp:
                async for line in resp.aiter_lines():
                    if line:
                        data = json.loads(line)
                        if "response" in data:
                            yield data["response"]

    async def chat(self, messages: list[dict], context: str) -> AsyncIterator[str]:
        system_prompt = (
            f"你是一個程式碼分析助理，請根據以下專案摘要回答問題：\n{context}"
        )
        conversation = f"系統：{system_prompt}\n\n"
        for msg in messages:
            role = "使用者" if msg["role"] == "user" else "助理"
            conversation += f"{role}：{msg['content']}\n"
        conversation += "助理："

        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/api/generate",
                json={"model": self.model, "prompt": conversation, "stream": True},
            ) as resp:
                async for line in resp.aiter_lines():
                    if line:
                        data = json.loads(line)
                        if "response" in data:
                            yield data["response"]
