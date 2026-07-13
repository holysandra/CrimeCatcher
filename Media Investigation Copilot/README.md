# AI Adverse Media Investigation Copilot

Production-quality hackathon MVP that helps financial crime analysts research a company or person, summarize adverse media, identify AML/fraud risks, extract entities, build a timeline, and produce an investigation recommendation.

The production investigation flow does not fabricate adverse media and does not require an OpenAI API key. It retrieves live public sources, infers the entity profile, detects AFC/fraud typologies with deterministic rules, and returns evidence-linked findings or a clear no-results/error state.

The current version supports these investigation outcomes:

- `Live Public Source Retrieval`: GDELT, Google News RSS, optional NewsAPI, and curated official-source search links.
- `No Relevant Public Sources`: no evidence-supported findings were extracted, so no synthetic risk result is generated.

## Tech Stack

- Frontend: React, Vite, TypeScript, TailwindCSS, shadcn-style UI primitives, Lucide icons
- Backend: FastAPI, Python, async services
- Analysis: deterministic rules-based entity inference, typology detection, confidence scoring, and weighted AFC/Fraud risk scoring
- News: Google News RSS with deduplication
- Public retrieval: GDELT, Google News RSS, optional NewsAPI via `NEWS_API_KEY`, curated official-source links

## Folder Structure

```text
frontend/
backend/
shared/
README.md
```

## Run Locally

### Backend

```bash
cd C:\Users\lysan\Documents\Codex\2026-06-28\build-a-react-page-with-a\backend

python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env

python -m uvicorn main:app --reload --port 8000
```

The backend runs at `http://localhost:8000`.

An OpenAI key is not required. `NEWS_API_KEY` is optional; the app uses free public retrieval first.

### Frontend

```bash
cd C:\Users\lysan\Documents\Codex\2026-06-28\build-a-react-page-with-a\frontend
npm.cmd install
npm.cmd run dev
```

The frontend runs at `http://localhost:5173`.

## API

### `GET /`

Returns service metadata.

### `GET /health`

Returns health status.

### `POST /investigate`

Request:

```json
{
  "query": "Wirecard",
  "lookback_days": 1095
}
```

Response:

```json
{
  "company": "Wirecard",
  "risk_score": 91,
  "risk_level": "High",
  "confidence": 96,
  "summary": "Executive investigation summary...",
  "timeline": [],
  "entities": {
    "people": [],
    "companies": [],
    "countries": [],
    "banks": [],
    "government_agencies": []
  },
  "flags": [],
  "articles": [],
  "recommendation": "Escalate",
  "reasoning": "Risk-based recommendation rationale...",
  "mode": "Live Public Source Retrieval",
  "evidence": [],
  "risk_findings": [],
  "risk_score_breakdown": {}
}
```

## Demo Features

- Modern banking dashboard inspired by Bloomberg Terminal and Microsoft Copilot
- Search workflow with rotating investigation status messages
- Animated progress indicator and responsive loading state
- Default search requires only entity name and lookback period
- Inferred entity type, jurisdiction, and confidence labels
- Live public-source investigation mode with deterministic evidence extraction and entity matching
- No fake investigation output in the production search flow
- Clickable retrieved public source cards
- Transparent weighted risk scoring with red/yellow/green indicators
- Risk score breakdown table with multipliers and source links
- Typology classification across AML, fraud, sanctions, corruption, trafficking, crypto, trade-based laundering, litigation, and adverse media
- Filterable structured findings by flag, typology, source reliability, and recency
- Interactive geography risk map with selectable risk markers
- Event timeline showing recency and escalation
- Source reliability and evidence-quality indicators
- Hallucination guardrail checklist with human-in-the-loop messaging
- Deterministic investigation chatbot grounded in current findings, with no OpenAI dependency
- Case report and senior management summary copy actions
- Analyst feedback buttons for a case-management feedback loop
- Dark mode
- Browser print flow for PDF download

## Frontend AFC Modules

```text
frontend/src/data/riskTypologies.ts
frontend/src/data/riskScoring.ts
frontend/src/data/demoCases.ts
frontend/src/prompts/investigationPrompt.ts
frontend/src/types/investigation.ts
frontend/src/utils/riskScoring.ts
frontend/src/utils/chatbotEngine.ts
frontend/src/utils/reportGenerator.ts
```
