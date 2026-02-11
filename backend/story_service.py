"""Service layer for story generation."""

import json
from collections.abc import AsyncGenerator
from typing import Any

import aiohttp

from .config import Settings
from .life_analysis import analyze_life_type
from .models import LifeInfo
from .prompt_builder import build_prompt


class StoryService:
    """Encapsulate OpenAI generation workflows."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.request_timeout = aiohttp.ClientTimeout(total=180)

    def _validate_settings(self) -> None:
        api_key = (self.settings.openai_api_key or "").strip()
        base_url = (self.settings.openai_base_url or "").strip()
        placeholder_keys = {
            "",
            "your-api-key",
            "your-api-key-1",
            "your-api-key-here",
            "sk-xxx",
        }

        if api_key.lower() in placeholder_keys or api_key.lower().startswith("your-api-key"):
            raise ValueError(
                "OPENAI_API_KEY 未正确配置。请在 .env 中设置可用密钥，并重启服务。"
            )

        if not base_url:
            raise ValueError(
                "OPENAI_BASE_URL 未配置。请在 .env 中设置可访问的 OpenAI 兼容地址（例如 https://xxx/v1）。"
            )

    def _prepare(self, info: LifeInfo) -> tuple[str, int, str]:
        life_type, score = analyze_life_type(info)
        prompt = build_prompt(info, life_type, score)
        return life_type, score, prompt

    @property
    def _chat_completions_url(self) -> str:
        base_url = (self.settings.openai_base_url or "").rstrip("/")
        return f"{base_url}/chat/completions"

    def _build_headers(self, stream: bool = False) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.settings.openai_api_key}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0",
            "Accept": "text/event-stream" if stream else "application/json",
        }

    @staticmethod
    def _extract_upstream_error(status: int, body: str) -> str:
        default_message = f"上游请求失败（HTTP {status}）"
        if not body:
            return default_message

        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            return body.strip() or default_message

        if isinstance(data, dict):
            error = data.get("error")
            if isinstance(error, dict):
                message = error.get("message")
                if isinstance(message, str) and message.strip():
                    return message.strip()
            if isinstance(error, str) and error.strip():
                return error.strip()
            message = data.get("message")
            if isinstance(message, str) and message.strip():
                return message.strip()

        return default_message

    @staticmethod
    def _extract_story_from_dict(data: dict[str, Any]) -> str:
        choices = data.get("choices") or []
        if not choices:
            raise ValueError("上游返回为空：缺少 choices。")
        first = choices[0] if isinstance(choices[0], dict) else {}
        message = first.get("message") or {}
        if not isinstance(message, dict):
            raise ValueError("上游返回格式异常：message 结构错误。")
        story = message.get("content")
        if isinstance(story, str) and story:
            return story
        if isinstance(first.get("text"), str) and first["text"]:
            return first["text"]
        raise ValueError("上游返回为空：缺少 message.content。")

    @staticmethod
    def _extract_content_from_chunk_payload(payload_text: str) -> str:
        try:
            data = json.loads(payload_text)
        except json.JSONDecodeError:
            return ""

        choices = data.get("choices") or []
        if not choices or not isinstance(choices[0], dict):
            return ""
        first = choices[0]
        delta = first.get("delta") or {}
        if not isinstance(delta, dict):
            delta = {}
        content = delta.get("content")
        if isinstance(content, str):
            return content

        message = first.get("message") or {}
        if isinstance(message, dict) and isinstance(message.get("content"), str):
            return message["content"]

        text = first.get("text")
        if isinstance(text, str):
            return text

        return ""

    async def _request_completion(self, prompt: str) -> str:
        payload = {
            "model": self.settings.model_name,
            "messages": [{"role": "user", "content": prompt}],
        }
        async with aiohttp.ClientSession(timeout=self.request_timeout) as session:
            async with session.post(
                self._chat_completions_url,
                headers=self._build_headers(stream=False),
                json=payload,
            ) as response:
                body = await response.text()
                if response.status >= 400:
                    raise ValueError(self._extract_upstream_error(response.status, body))
                try:
                    data = json.loads(body)
                except json.JSONDecodeError as exc:
                    raise ValueError("上游返回格式异常：无法解析 JSON。") from exc
                return self._extract_story_from_dict(data)

    async def _stream_content(self, prompt: str) -> AsyncGenerator[str, None]:
        payload = {
            "model": self.settings.model_name,
            "messages": [{"role": "user", "content": prompt}],
            "stream": True,
        }
        async with aiohttp.ClientSession(timeout=self.request_timeout) as session:
            async with session.post(
                self._chat_completions_url,
                headers=self._build_headers(stream=True),
                json=payload,
            ) as response:
                if response.status >= 400:
                    body = await response.text()
                    raise ValueError(self._extract_upstream_error(response.status, body))

                buffer = ""

                async for raw_chunk in response.content.iter_any():
                    piece = raw_chunk.decode("utf-8", errors="ignore")
                    if not piece:
                        continue

                    buffer += piece
                    lines = buffer.split("\n")
                    buffer = lines.pop() if lines else ""

                    for raw_line in lines:
                        line = raw_line.strip()
                        if not line or not line.startswith("data:"):
                            continue

                        payload_text = line[5:].strip()
                        if not payload_text or payload_text == "[DONE]":
                            continue

                        content = self._extract_content_from_chunk_payload(payload_text)
                        if content:
                            yield content

                tail = buffer.strip()
                if tail.startswith("data:"):
                    payload_text = tail[5:].strip()
                    if payload_text and payload_text != "[DONE]":
                        content = self._extract_content_from_chunk_payload(payload_text)
                        if content:
                            yield content

    async def generate_story(self, info: LifeInfo) -> dict[str, Any]:
        self._validate_settings()
        life_type, score, prompt = self._prepare(info)
        story = await self._request_completion(prompt)

        return {
            "success": True,
            "life_type": life_type,
            "stability_score": score,
            "story": story,
        }

    async def stream_story_events(self, info: LifeInfo) -> AsyncGenerator[str, None]:
        self._validate_settings()
        life_type, score, prompt = self._prepare(info)
        yield self.build_sse(
            {
                "type": "analysis",
                "life_type": life_type,
                "stability_score": score,
            }
        )

        async for content in self._stream_content(prompt):
            yield self.build_sse({"type": "content", "content": content})

        yield self.build_sse({"type": "done"})

    @staticmethod
    def build_sse(payload: dict[str, Any]) -> str:
        return f"data: {json.dumps(payload)}\n\n"
