from typing import AsyncIterator


class ChatEngine:
    def __init__(self):
        self.history: list[dict] = []
        self.context: str = ""

    def set_context(self, context: str):
        self.context = context
        self.history = []

    async def send(self, message: str, provider) -> AsyncIterator[str]:
        self.history.append({"role": "user", "content": message})
        chunks: list[str] = []
        async for chunk in provider.chat(self.history, self.context):
            chunks.append(chunk)
            yield chunk
        self.history.append({"role": "assistant", "content": "".join(chunks)})

    def clear(self):
        self.history = []
