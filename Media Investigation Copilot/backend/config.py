"""Runtime configuration for the deployed Azure AI Foundry multi-agent workflow.

A multi-agent workflow deployed in Foundry Agent Service is a *hosted agent*
exposed over an OpenAI-compatible Responses endpoint. It is addressed by the
workflow's deployed NAME (not an ``asst_`` id) under the project endpoint, and
secured with Microsoft Entra ID.

All values are read from environment variables (loaded from backend/.env by
main.py). Nothing here contains secrets.
"""

import os


class Settings:
    def __init__(self) -> None:
        # Foundry PROJECT endpoint, e.g.
        # https://<account>.services.ai.azure.com/api/projects/<project-name>
        # (NOT the https://<account>.openai.azure.com/openai/v1 model endpoint.)
        self.foundry_project_endpoint: str = os.getenv("FOUNDRY_PROJECT_ENDPOINT", "").strip().rstrip("/")

        # The deployed workflow (hosted agent) name from Foundry -> Agents.
        self.foundry_agent_name: str = os.getenv("FOUNDRY_AGENT_NAME", "").strip()

        # Optional pinned version; defaults to the latest deployed version.
        self.foundry_agent_version: str = os.getenv("FOUNDRY_AGENT_VERSION", "").strip()

        # Entra token scope for the project Responses endpoint. Exposed as config
        # so it can be adjusted without a code change if Azure changes it.
        self.foundry_token_scope: str = os.getenv("FOUNDRY_TOKEN_SCOPE", "https://ai.azure.com/.default").strip()

        # Optional api-version query. The /openai/v1/ path already implies v1, so
        # this is empty by default; only set it if a live call says it's required.
        self.foundry_api_version: str = os.getenv("FOUNDRY_API_VERSION", "").strip()

        # How long (seconds) to wait for the workflow before giving up.
        self.azure_agent_timeout_seconds: int = int(os.getenv("AZURE_AGENT_TIMEOUT_SECONDS", "900"))

    @property
    def azure_configured(self) -> bool:
        """True only when both the project endpoint and workflow name are present."""
        return bool(self.foundry_project_endpoint and self.foundry_agent_name)

    @property
    def responses_url(self) -> str:
        """Project-level Responses URL.

        Workflow-kind agents are invoked here (by agent reference in the body),
        NOT on the endpoint-scoped /agents/{name}/endpoint/... route, which only
        supports prompt and hosted agents.
        """
        base = f"{self.foundry_project_endpoint}/openai/v1/responses"
        if self.foundry_api_version:
            return f"{base}?api-version={self.foundry_api_version}"
        return base

    @property
    def conversations_url(self) -> str:
        """Project-level Conversations URL (workflow agents require a conversation)."""
        base = f"{self.foundry_project_endpoint}/openai/v1/conversations"
        if self.foundry_api_version:
            return f"{base}?api-version={self.foundry_api_version}"
        return base


def get_settings() -> Settings:
    return Settings()
