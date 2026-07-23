from dotenv import load_dotenv
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from typing import Any

from models.schemas import AgentInvestigationRequest, InvestigationRequest, InvestigationResponse
from services.azure_agents import AzureWorkflowError, run_agent_investigation
from services.live_investigation import run_live_investigation


load_dotenv(Path(__file__).resolve().parent / ".env")

app = FastAPI(
    title="AI Adverse Media Investigation Copilot",
    description="Banking hackathon MVP for adverse media research and AML risk summarization.",
    version="1.0.0",
)

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin, "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root() -> dict[str, str]:
    return {"name": "AI Adverse Media Investigation Copilot", "status": "ready"}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "healthy"}


@app.post("/investigate", response_model=InvestigationResponse)
async def investigate(request: InvestigationRequest) -> InvestigationResponse:
    try:
        return await run_live_investigation(
            request.query,
            entity_type=request.entity_type or "",
            jurisdiction=request.jurisdiction or "",
            lookback_days=request.lookback_days or 1095,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/agents/investigate")
async def agents_investigate(request: AgentInvestigationRequest) -> dict[str, Any]:
    """Run the 4-agent Azure AI Foundry workflow and return its JSON report.

    The workflow output is validated and normalized to the dashboard schema.
    Azure failures include a stable error code for the frontend.
    """
    try:
        return await run_agent_investigation(request.company)
    except AzureWorkflowError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.as_detail()) from exc
    except TimeoutError as exc:
        detail = {
            "code": "AZURE_CONNECTION_FAILED",
            "title": "Azure workflow timed out",
            "message": "Azure did not finish the workflow before the configured timeout.",
            "hint": "Retry the investigation or increase AZURE_AGENT_TIMEOUT_SECONDS.",
        }
        raise HTTPException(status_code=504, detail=detail) from exc
