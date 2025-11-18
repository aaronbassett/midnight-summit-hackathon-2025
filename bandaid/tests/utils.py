"""Test utilities and helper functions."""

import asyncio
from collections.abc import Coroutine
from typing import Any


async def run_with_timeout(coro: Coroutine, timeout: float = 5.0) -> Any:
    """Run an async coroutine with a timeout."""
    try:
        return await asyncio.wait_for(coro, timeout=timeout)
    except TimeoutError as e:
        raise AssertionError(f"Operation timed out after {timeout}s") from e


def create_chat_request(content: str, model: str = "gpt-3.5-turbo") -> dict:
    """Create an OpenAI-format chat completion request."""
    return {
        "model": model,
        "messages": [{"role": "user", "content": content}],
    }


def create_completion_request(prompt: str, model: str = "gpt-3.5-turbo") -> dict:
    """Create an OpenAI-format completion request."""
    return {
        "model": model,
        "prompt": prompt,
    }


def create_embedding_request(
    input_text: str | list[str], model: str = "text-embedding-ada-002"
) -> dict:
    """Create an OpenAI-format embedding request."""
    return {
        "model": model,
        "input": input_text,
    }


def create_streaming_chunk(content: str, finish_reason: str | None = None) -> dict:
    """Create a streaming response chunk."""
    chunk = {
        "id": "chatcmpl-test",
        "object": "chat.completion.chunk",
        "created": 1234567890,
        "model": "gpt-3.5-turbo",
        "choices": [
            {
                "index": 0,
                "delta": {"content": content} if content else {},
                "finish_reason": finish_reason,
            }
        ],
    }
    return chunk


def extract_redaction_type(redacted_text: str) -> list[str]:
    """Extract types of redactions from redacted text."""
    redaction_types = []
    markers = [
        "EMAIL_REDACTED",
        "PHONE_REDACTED",
        "SSN_REDACTED",
        "CC_REDACTED",
        "ADDRESS_REDACTED",
        "KEY_REDACTED",
        "SEED_REDACTED",
    ]
    for marker in markers:
        if marker in redacted_text:
            redaction_types.append(marker)
    return redaction_types
