
from __future__ import annotations

import json
import os
import time

import requests


class AIConfigurationError(Exception):
    pass


class AIProviderError(Exception):
    pass


def generate_ai_json(task: str, data: dict) -> dict:
    api_key = os.environ.get("AI_PROVIDER_API_KEY", "").strip()

    if not api_key:
        raise AIConfigurationError(
            "AI_PROVIDER_API_KEY is not configured."
        )

    endpoint = os.environ.get(
        "AI_PROVIDER_CHAT_COMPLETIONS_URL",
        "https://api.openai.com/v1/chat/completions",
    ).strip()

    model = os.environ.get(
        "AI_PROVIDER_MODEL",
        "gpt-4o-mini",
    ).strip()

    payload = {
        "model": model,
        "temperature": 0.3,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a careful sales assistant. Use only provided "
                    "facts. Never invent prices or promises. Return valid "
                    "JSON only."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Task:\n{task}\n\n"
                    f"Data:\n{json.dumps(data, ensure_ascii=False)}"
                ),
            },
        ],
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        result = None

        for attempt in range(3):
            try:
                response = requests.post(
                    endpoint,
                    headers=headers,
                    json=payload,
                    timeout=30,
                )

                if response.status_code == 503 and attempt < 2:
                    time.sleep(2 ** (attempt + 1))
                    continue

                response.raise_for_status()
                result = response.json()
                break

            except requests.HTTPError:
                if (
                    response.status_code == 503
                    and attempt < 2
                ):
                    time.sleep(2 ** (attempt + 1))
                    continue
                raise

        if result is None:
            raise AIProviderError(
                "AI provider did not return a response."
            )

        content = result["choices"][0]["message"]["content"].strip()

        if content.startswith("```"):
            lines = content.splitlines()

            if lines and lines[0].startswith("```"):
                lines = lines[1:]

            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]

            content = "\n".join(lines).strip()

            if content.lower().startswith("json"):
                content = content[4:].strip()

        parsed = json.loads(content)

        if not isinstance(parsed, dict):
            raise ValueError("Expected a JSON object.")

        return parsed

    except requests.HTTPError as exc:
        details = exc.response.text[:500] if exc.response is not None else str(exc)
        status = exc.response.status_code if exc.response is not None else "unknown"

        raise AIProviderError(
            f"AI provider returned HTTP {status}: {details}"
        ) from exc

    except requests.RequestException as exc:
        raise AIProviderError(
            f"Could not connect to the AI provider: {exc}"
        ) from exc

    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise AIProviderError(
            "The AI provider returned an invalid response."
        ) from exc
