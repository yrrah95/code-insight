from abc import ABC, abstractmethod
from typing import AsyncIterator


class LLMProvider(ABC):
    @abstractmethod
    async def analyze_file(self, filepath: str, content: str) -> AsyncIterator[str]:
        pass

    @abstractmethod
    async def generate(self, prompt: str) -> AsyncIterator[str]:
        """直接呼叫 LLM 產生長文，不套檔案分析模板。"""
        pass

    @abstractmethod
    async def chat(self, messages: list[dict], context: str) -> AsyncIterator[str]:
        pass
