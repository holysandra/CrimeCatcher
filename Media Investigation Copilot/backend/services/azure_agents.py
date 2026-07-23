"""Run the deployed Azure AI Foundry workflow and validate its JSON report."""

from __future__ import annotations

import asyncio
import json
import re
from typing import Any

import httpx
from pydantic import ValidationError

from config import get_settings
from models.agent_report import validate_agent_report

POLL_INTERVAL_SECONDS = 2


class AzureWorkflowError(Exception):
    """A safe, classified workflow failure that can be shown by the frontend."""

    def __init__(
        self,
        code: str,
        title: str,
        message: str,
        *,
        status_code: int = 503,
        hint: str = "",
    ) -> None:
        super().__init__(message)
        self.code = code
        self.title = title
        self.message = message
        self.status_code = status_code
        self.hint = hint

    def as_detail(self) -> dict[str, str]:
        return {
            "code": self.code,
            "title": self.title,
            "message": self.message,
            "hint": self.hint,
        }


def _extract_json(text: str) -> dict[str, Any]:
    """Parse the final report from fenced, wrapped, or multi-node JSON output."""

    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z0-9]*\n?", "", cleaned)
        cleaned = re.sub(r"\n?```$", "", cleaned).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Azure workflows can expose more than one node's JSON output. Decode each
    # top-level object without being confused by braces inside JSON strings.
    decoder = json.JSONDecoder()
    objects: list[dict[str, Any]] = []
    cursor = 0
    while cursor < len(cleaned):
        start = cleaned.find("{", cursor)
        if start == -1:
            break
        try:
            value, end = decoder.raw_decode(cleaned, start)
        except json.JSONDecodeError:
            cursor = start + 1
            continue
        if isinstance(value, dict):
            objects.append(value)
        cursor = end

    if not objects:
        raise json.JSONDecodeError("No JSON object found in workflow output", cleaned, 0)

    # Prefer a complete final report when one node emitted it as a unit.
    required_report_keys = {
        "case_id",
        "input_name",
        "assessment_date",
        "subject_reports",
        "qa_status",
    }
    complete_reports = [
        item
        for item in objects
        if required_report_keys.issubset(item) and isinstance(item.get("subject_reports"), list)
    ]
    if complete_reports:
        return complete_reports[-1]

    # Otherwise assemble disjoint top-level sections emitted by sequential nodes.
    merged: dict[str, Any] = {}
    for item in objects:
        merged.update(item)
    return merged


def _responses_output_text(data: dict[str, Any]) -> str:
    """Pull assistant text from convenience or raw Responses API shapes."""

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
    return "\n".join(part for part in parts if part).strip()


def _get_entra_token(scope: str) -> str:
    from azure.identity import DefaultAzureCredential

    credential = DefaultAzureCredential()
    return credential.get_token(scope).token


def _raise_for_foundry_error(response: httpx.Response, workflow_name: str) -> None:
    if response.status_code < 400:
        return

    response_text = response.text[:1000]
    lower_text = response_text.lower()
    workflow_reference_error = any(
        marker in lower_text
        for marker in (
            "agent not found",
            "agent_not_found",
            "agentnotfound",
            "invalid agent_reference",
            "could not find agent",
            "does not exist",
        )
    )
    if response.status_code == 404 or workflow_reference_error:
        raise AzureWorkflowError(
            "WORKFLOW_NOT_FOUND",
            "Workflow name not found",
            f'Azure could not find the workflow "{workflow_name}" in the configured CrimeCatcher project.',
            status_code=404,
            hint="Confirm the deployed workflow name and version in Microsoft Foundry, then try again.",
        )
    if response.status_code in (401, 403):
        raise AzureWorkflowError(
            "AZURE_AUTHENTICATION_FAILED",
            "Azure access denied",
            "The backend reached Azure, but Microsoft Entra ID rejected the request.",
            hint="Run az login or verify the service principal or managed identity has access to the Foundry project.",
        )
    if response.status_code == 429:
        raise AzureWorkflowError(
            "AZURE_RATE_LIMITED",
            "Azure is busy",
            "Azure Foundry rate-limited the workflow request.",
            status_code=429,
            hint="Wait briefly and run the investigation again.",
        )
    if response.status_code >= 500:
        raise AzureWorkflowError(
            "AZURE_CONNECTION_FAILED",
            "Azure connection failed",
            f"Azure Foundry returned service error {response.status_code}.",
            hint="Check Azure service health and the project endpoint, then retry.",
        )
    raise AzureWorkflowError(
        "WORKFLOW_EXECUTION_FAILED",
        "Azure workflow failed",
        f"Azure rejected the workflow request with status {response.status_code}.",
        status_code=502,
        hint=response_text,
    )


async def _request(
    client: httpx.AsyncClient,
    method: str,
    url: str,
    *,
    headers: dict[str, str],
    workflow_name: str,
    payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    try:
        response = await client.request(method, url, headers=headers, json=payload)
    except (httpx.ConnectError, httpx.TimeoutException, httpx.NetworkError) as exc:
        raise AzureWorkflowError(
            "AZURE_CONNECTION_FAILED",
            "Azure connection failed",
            "The backend could not connect to the configured Azure Foundry project.",
            hint="Check the project endpoint, network connection, firewall, and Azure service availability.",
        ) from exc

    _raise_for_foundry_error(response, workflow_name)
    try:
        return response.json()
    except ValueError as exc:
        raise AzureWorkflowError(
            "AZURE_CONNECTION_FAILED",
            "Azure returned an invalid response",
            "The Azure endpoint responded, but its response was not valid JSON.",
            hint="Confirm that FOUNDRY_PROJECT_ENDPOINT points to a Microsoft Foundry project endpoint.",
        ) from exc


async def _run_via_foundry(company: str) -> dict[str, Any]:
    settings = get_settings()

    try:
        token = await asyncio.to_thread(_get_entra_token, settings.foundry_token_scope)
    except Exception as exc:
        raise AzureWorkflowError(
            "AZURE_AUTHENTICATION_FAILED",
            "Azure sign-in failed",
            "The backend could not obtain a Microsoft Entra ID token for Azure Foundry.",
            hint="For local development, run az login. For deployment, configure a service principal or managed identity.",
        ) from exc

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    agent_reference: dict[str, Any] = {
        "name": settings.foundry_agent_name,
        "type": "agent_reference",
    }
    if settings.foundry_agent_version:
        agent_reference["version"] = settings.foundry_agent_version

    async with httpx.AsyncClient(timeout=settings.azure_agent_timeout_seconds) as client:
        conversation = await _request(
            client,
            "POST",
            settings.conversations_url,
            headers=headers,
            workflow_name=settings.foundry_agent_name,
            payload={},
        )
        conversation_id = conversation.get("id")
        if not isinstance(conversation_id, str) or not conversation_id:
            raise AzureWorkflowError(
                "WORKFLOW_EXECUTION_FAILED",
                "Azure workflow failed",
                "Azure did not return an identifier for the workflow conversation.",
                status_code=502,
            )

        payload: dict[str, Any] = {
            "input": company,
            "conversation": conversation_id,
            "agent_reference": agent_reference,
        }
        data = await _request(
            client,
            "POST",
            settings.responses_url,
            headers=headers,
            workflow_name=settings.foundry_agent_name,
            payload=payload,
        )

        while data.get("status") in ("queued", "in_progress"):
            response_id = data.get("id")
            if not isinstance(response_id, str) or not response_id:
                raise AzureWorkflowError(
                    "WORKFLOW_EXECUTION_FAILED",
                    "Azure workflow failed",
                    "Azure started the workflow but did not return a response identifier.",
                    status_code=502,
                )
            await asyncio.sleep(POLL_INTERVAL_SECONDS)
            data = await _request(
                client,
                "GET",
                f"{settings.responses_url.rstrip('/')}/{response_id}",
                headers=headers,
                workflow_name=settings.foundry_agent_name,
            )

    if data.get("status") in ("failed", "cancelled", "incomplete"):
        azure_error = data.get("error") or data.get("incomplete_details") or {}
        raise AzureWorkflowError(
            "WORKFLOW_EXECUTION_FAILED",
            "Azure workflow failed",
            "Azure connected successfully, but the investigation workflow did not complete.",
            status_code=502,
            hint=json.dumps(azure_error)[:500],
        )

    text = _responses_output_text(data)
    if not text:
        raise AzureWorkflowError(
            "WORKFLOW_OUTPUT_INVALID",
            "Workflow returned no report",
            "Azure completed the workflow but did not return a JSON report.",
            status_code=502,
            hint="Confirm the workflow's final output node returns the report as JSON text.",
        )

    try:
        report = _extract_json(text)
        report["mode"] = "live"
        if "subject_reports" not in report and any(
            key in report
            for key in ("research_subjects", "research_results", "classified_subjects")
        ):
            raise AzureWorkflowError(
                "WORKFLOW_OUTPUT_INVALID",
                "Workflow returned an intermediate result",
                "Azure ran the workflow, but the final reporting agent did not return the dashboard report JSON.",
                status_code=502,
                hint=(
                    "In the deployed workflow, pass =Local.LatestMessage into "
                    "4RiskScoringAndFinalReportingAgent and map its final messages output. "
                    "The dashboard requires assessment_date, subject_reports, and qa_status."
                ),
            )
        return validate_agent_report(report)
    except AzureWorkflowError:
        raise
    except (json.JSONDecodeError, ValidationError, TypeError, ValueError) as exc:
        returned_fields = sorted(report) if isinstance(locals().get("report"), dict) else []
        raise AzureWorkflowError(
            "WORKFLOW_OUTPUT_INVALID",
            "Workflow JSON does not match the dashboard",
            "Azure completed the workflow, but its JSON could not be mapped to the investigation report schema.",
            status_code=502,
            hint=f"Returned fields: {returned_fields}. Validation: {str(exc)[:600]}",
        ) from exc


async def run_agent_investigation(company: str) -> dict[str, Any]:
    """Run the configured Azure workflow; never fall back to sample data."""

    settings = get_settings()
    if not settings.azure_configured:
        raise AzureWorkflowError(
            "AZURE_CONFIGURATION_ERROR",
            "Azure is not configured",
            "The backend is missing its Azure Foundry project endpoint or workflow name.",
            hint="Set FOUNDRY_PROJECT_ENDPOINT and FOUNDRY_AGENT_NAME in backend/.env.",
        )

    return await asyncio.wait_for(
        _run_via_foundry(company),
        timeout=settings.azure_agent_timeout_seconds + 30,
    )
