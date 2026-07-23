from dotenv import load_dotenv
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from typing import Any

from models.schemas import AgentInvestigationRequest, InvestigationRequest, InvestigationResponse
from services.live_investigation import run_live_investigation
from services.local_report import adapt_local_investigation


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
    """Run the non-Azure public-source workflow and return a dashboard report."""
    try:
        result = await run_live_investigation(
            request.company,
            entity_type="",
            jurisdiction="",
            lookback_days=1095,
        )
        return adapt_local_investigation(result)
    except RuntimeError as exc:
        detail = {
            "code": "PUBLIC_SOURCE_RETRIEVAL_FAILED",
            "title": "Live investigation failed",
            "message": str(exc),
            "hint": "Check the network connection and public-source availability, then retry.",
        }
        raise HTTPException(status_code=503, detail=detail) from exc
