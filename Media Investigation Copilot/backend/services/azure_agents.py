"""Runs the deployed Azure AI Foundry multi-agent workflow and returns its JSON report.

The 4-agent workflow is deployed in Foundry Agent Service as a *hosted agent*.
Hosted agents expose an OpenAI-compatible **Responses** endpoint:

    {project_endpoint}/agents/{name}/endpoint/protocols/openai/responses?api-version=v1

We invoke it with a single Responses call (`{"input": "<company>"}`), authenticated
with a Microsoft Entra ID bearer token from azure-identity's DefaultAzureCredential
(works with `az login` locally, a service principal via env vars, or managed identity
when deployed — no static key stored). The workflow is configured to emit the report
as JSON, which we parse out of the response text.

If Azure isn't configured yet (missing project endpoint / workflow name), a bundled
sample report is returned so the UI keeps working. The response carries a "mode" field
("live" or "sample") so the frontend can show which path produced the data.

Docs:
- Hosted agents & the Responses endpoint shape:
  https://learn.microsoft.com/azure/foundry/agents/concepts/hosted-agents
- Responses API: https://learn.microsoft.com/azure/foundry/openai/how-to/responses
"""

from __future__ import annotations

import asyncio
import json
import re
from pathlib import Path
from typing import Any

import httpx

from config import get_settings

SAMPLE_PATH = Path(__file__).resolve().parent.parent / "data" / "sample_agent_report.json"


def _load_sample() -> dict[str, Any]:
    data = json.loads(SAMPLE_PATH.read_text(encoding="utf-8"))
    data["mode"] = "sample"
    return data


def _extract_json(text: str) -> dict[str, Any]:
    """Parse a JSON object from the workflow output, tolerating markdown fences."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z0-9]*\n?", "", cleaned)
        cleaned = re.sub(r"\n?```$", "", cleaned).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            return json.loads(cleaned[start : end + 1])
        raise


def _responses_output_text(data: dict[str, Any]) -> str:
    """Pull the assistant text out of an OpenAI Responses payload.

    Handles the convenience `output_text` field as well as the raw
    `output[].content[].text` structure (where text may be a string or
    a {"value": ...} object).
    """
    # Some gateways wrap the result under "response".
    if isinstance(data.get("response"), dict):
        data = data["response"]

    output_text = data.get("output_text")
    if isinstance(output_text, str) and output_text.strip():
        return output_text

    parts: list[str] = []
    for item in data.get("output", []) or []:
        if not isinstance(item, dict):
            continue
        for block in item.get("content", []) or []:
            if not isinstance(block, dict):
                continue
            if block.get("type") in ("output_text", "text", None):
                text_value = block.get("text")
                if isinstance(text_value, str):
                    parts.append(text_value)
                elif isinstance(text_value, dict) and isinstance(text_value.get("value"), str):
                    parts.append(text_value["value"])
    return "\n".join(p for p in parts if p).strip()


def _get_entra_token(scope: str) -> str:
    from azure.identity import DefaultAzureCredential

    credential = DefaultAzureCredential()
    return credential.get_token(scope).token


async def _run_via_foundry(company: str) -> dict[str, Any]:
    settings = get_settings()

    # Token acquisition is blocking; run it off the event loop.
    token = await asyncio.to_thread(_get_entra_token, settings.foundry_token_scope)

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    # Invoke the deployed workflow by reference on the project Responses API.
    # The property must be named "agent_reference" (the older "agent" is rejected).
    agent_reference: dict[str, Any] = {
        "name": settings.foundry_agent_name,
        "type": "agent_reference",
    }
    if settings.foundry_agent_version:
        agent_reference["version"] = settings.foundry_agent_version

    payload: dict[str, Any] = {"input": company, "agent_reference": agent_reference}

    async with httpx.AsyncClient(timeout=settings.azure_agent_timeout_seconds) as client:
        response = await client.post(settings.responses_url, headers=headers, json=payload)

    if response.status_code >= 400:
        raise RuntimeError(
            f"Foundry workflow call failed ({response.status_code}): {response.text[:500]}"
        )

    data = response.json()
    text = _responses_output_text(data)
    if not text:
        raise RuntimeError(
            "Foundry workflow returned no text output. Raw response: " + json.dumps(data)[:500]
        )

    report = _extract_json(text)
    report["mode"] = "live"
    return report


async def run_agent_investigation(company: str) -> dict[str, Any]:
    """Run the deployed workflow (or return the sample) for a company/entity name."""
    settings = get_settings()
    if not settings.azure_configured:
        return _load_sample()

    return await asyncio.wait_for(
        _run_via_foundry(company),
        timeout=settings.azure_agent_timeout_seconds + 30,
    )
