"""Proxy server implementation using LiteLLM.

Provides OpenAI-compatible endpoints that proxy requests through LiteLLM
with security validation via hooks.
"""

import litellm
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from bandaid.config import get_config
from bandaid.observability.logger import get_logger
from bandaid.proxy.hooks import (
    async_post_call_hook,
    async_post_call_streaming_iterator_hook,
    async_pre_call_hook,
)

logger = get_logger(__name__)


def configure_litellm() -> None:
    """Configure LiteLLM with providers and hooks."""
    try:
        config = get_config()

        # Set API keys for providers
        for provider_config in config.providers:
            provider_name = provider_config.provider.upper()

            # Decrypt API key
            from bandaid.config import get_config_manager

            manager = get_config_manager()
            api_key = manager.decrypt_api_key(provider_config.api_key)

            # Set environment variable for LiteLLM
            if provider_name == "OPENAI":
                litellm.openai_key = api_key
            elif provider_name == "ANTHROPIC":
                litellm.anthropic_key = api_key
            elif provider_name == "COHERE":
                litellm.cohere_key = api_key
            elif provider_name == "GOOGLE":
                litellm.gemini_api_key = api_key  # type: ignore[attr-defined]

            logger.info("provider configured", provider=provider_name)

        # Register hooks (including streaming hook for T091-T092)
        litellm.callbacks = [
            {  # type: ignore[list-item]
                "async_pre_call_hook": async_pre_call_hook,
                "async_post_call_hook": async_post_call_hook,
                "async_post_call_streaming_iterator_hook": async_post_call_streaming_iterator_hook,
            }
        ]

        logger.info("litellm configured with security hooks (including streaming support)")

    except Exception as e:
        logger.error("failed to configure litellm", error=str(e), exc_info=True)
        raise


# Create router for proxy endpoints
router = APIRouter(prefix="/v1", tags=["proxy"])


@router.post("/chat/completions")
async def chat_completions(request: Request):
    """OpenAI-compatible chat completions endpoint.

    Proxies requests through LiteLLM with security validation.

    Args:
        request: FastAPI request

    Returns:
        LLM response or StreamingResponse
    """
    try:
        # Parse request body
        body = await request.json()

        model = body.get("model")
        messages = body.get("messages", [])
        stream = body.get("stream", False)

        if not model:
            raise HTTPException(status_code=400, detail="model is required")

        if not messages:
            raise HTTPException(status_code=400, detail="messages is required")

        logger.info(
            "chat completion request",
            model=model,
            stream=stream,
            message_count=len(messages),
        )

        # Call LiteLLM (hooks will be triggered automatically)
        response = await litellm.acompletion(
            model=model,
            messages=messages,
            stream=stream,
            **{k: v for k, v in body.items() if k not in ["model", "messages", "stream"]},
        )

        if stream:
            # Return streaming response
            async def generate():
                async for chunk in response:
                    yield chunk.model_dump_json() + "\n"

            return StreamingResponse(
                generate(),
                media_type="text/event-stream",
            )
        else:
            # Return complete response
            return response.model_dump()

    except HTTPException:
        # Re-raise HTTP exceptions (from hooks)
        raise

    except Exception as e:
        logger.error("chat completion failed", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={"error": "completion_failed", "message": str(e)},
        ) from e


@router.post("/completions")
async def completions(request: Request):
    """OpenAI-compatible legacy completions endpoint with streaming support (T093).

    Args:
        request: FastAPI request

    Returns:
        LLM response or StreamingResponse
    """
    try:
        body = await request.json()

        model = body.get("model")
        prompt = body.get("prompt")
        stream = body.get("stream", False)

        if not model:
            raise HTTPException(status_code=400, detail="model is required")

        if not prompt:
            raise HTTPException(status_code=400, detail="prompt is required")

        logger.info("completion request", model=model, prompt_length=len(prompt), stream=stream)

        # Call LiteLLM (hooks will be triggered automatically)
        response = await litellm.atext_completion(
            model=model,
            prompt=prompt,
            stream=stream,
            **{k: v for k, v in body.items() if k not in ["model", "prompt", "stream"]},
        )

        if stream:
            # Return streaming response
            async def generate():
                async for chunk in response:
                    yield chunk.model_dump_json() + "\n"

            return StreamingResponse(
                generate(),
                media_type="text/event-stream",
            )
        else:
            # Return complete response
            return response.model_dump()

    except HTTPException:
        raise

    except Exception as e:
        logger.error("completion failed", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={"error": "completion_failed", "message": str(e)},
        ) from e


@router.post("/embeddings")
async def embeddings(request: Request):
    """OpenAI-compatible embeddings endpoint.

    Args:
        request: FastAPI request

    Returns:
        Embeddings response
    """
    try:
        body = await request.json()

        model = body.get("model")
        input_text = body.get("input")

        if not model:
            raise HTTPException(status_code=400, detail="model is required")

        if not input_text:
            raise HTTPException(status_code=400, detail="input is required")

        logger.info("embedding request", model=model)

        # Call LiteLLM
        response = await litellm.aembedding(
            model=model,
            input=input_text,
            **{k: v for k, v in body.items() if k not in ["model", "input"]},
        )

        return response.model_dump()

    except HTTPException:
        raise

    except Exception as e:
        logger.error("embedding failed", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={"error": "embedding_failed", "message": str(e)},
        ) from e
