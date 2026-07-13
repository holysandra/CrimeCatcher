import hashlib
import html
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Dict, Iterable, List, Optional
from urllib.parse import quote_plus, urlparse

import feedparser
import httpx

from models.schemas import Article


ADVERSE_KEYWORDS = [
    "fraud",
    "money laundering",
    "laundering",
    "sanctions",
    "bribery",
    "corruption",
    "enforcement",
    "investigation",
    "indictment",
    "conviction",
    "lawsuit",
    "regulatory",
    "trafficking",
    "shell company",
    "beneficial ownership",
    "terrorist financing",
    "tax evasion",
    "safeguarding",
    "financial crime",
]

MAJOR_MEDIA_DOMAINS = {
    "reuters.com",
    "bloomberg.com",
    "ft.com",
    "wsj.com",
    "bbc.com",
    "bbc.co.uk",
    "nytimes.com",
    "theguardian.com",
    "apnews.com",
    "cnbc.com",
}

REGULATORY_DOMAINS = {
    "fca.org.uk",
    "sec.gov",
    "justice.gov",
    "fincen.gov",
    "treasury.gov",
    "home.treasury.gov",
    "gov.uk",
    "fatf-gafi.org",
    "europa.eu",
}

GDELT_DOC_API = "https://api.gdeltproject.org/api/v2/doc/doc"
GOOGLE_NEWS_RSS = "https://news.google.com/rss/search?q={query}&hl=en-US&gl=US&ceid=US:en"
NEWSAPI_ENDPOINT = "https://newsapi.org/v2/everything"


def _clean_text(value: Optional[str]) -> str:
    if not value:
        return ""
    text = re.sub(r"<[^>]+>", " ", value)
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def _domain(url: str) -> str:
    host = urlparse(url).netloc.lower().removeprefix("www.")
    return host


def _id_for(*parts: str) -> str:
    digest = hashlib.sha1("||".join(parts).encode("utf-8")).hexdigest()[:14]
    return f"src_{digest}"


def infer_source_type(source_name: str, url: str) -> str:
    domain = _domain(url)
    lowered = f"{source_name} {domain}".lower()
    if "sanction" in lowered or "ofac" in lowered:
        return "Sanctions List"
    if domain in REGULATORY_DOMAINS or any(token in lowered for token in ["regulator", "fca", "sec", "fincen", "fatf"]):
        return "Regulatory"
    if "court" in lowered:
        return "Court"
    if "justice" in lowered or "police" in lowered or "prosecutor" in lowered:
        return "Law Enforcement"
    if domain in MAJOR_MEDIA_DOMAINS or any(token in lowered for token in ["reuters", "bloomberg", "bbc", "financial times"]):
        return "Major Media"
    if any(token in lowered for token in ["ngo", "transparency", "amnesty"]):
        return "NGO"
    if any(token in lowered for token in ["annual report", "company", "investor"]):
        return "Company Disclosure"
    return "Local Media"


def to_article(raw: Dict[str, str]) -> Article:
    return Article(
        title=raw["title"],
        date=raw.get("publishedAt", ""),
        link=raw["url"],
        source=raw["sourceName"],
        summary=raw.get("snippet", ""),
        content=raw.get("fullText") or raw.get("snippet", ""),
    )


async def search_gdelt_articles(
    entity_name: str,
    keywords: Optional[List[str]] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    max_results: int = 20,
) -> List[Dict[str, str]]:
    keyword_query = " OR ".join(keywords or ADVERSE_KEYWORDS[:12])
    query = f'"{entity_name}" AND ({keyword_query})'
    params = {
        "query": query,
        "mode": "artlist",
        "format": "json",
        "maxrecords": str(max_results),
        "sort": "hybridrel",
    }
    if start_date:
        params["startdatetime"] = re.sub(r"[^0-9]", "", start_date)[:8] + "000000"
    if end_date:
        params["enddatetime"] = re.sub(r"[^0-9]", "", end_date)[:8] + "235959"

    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            response = await client.get(GDELT_DOC_API, params=params, headers={"User-Agent": "Mozilla/5.0"})
            response.raise_for_status()
            payload = response.json()
    except Exception:
        return []

    retrieved_at = datetime.now(timezone.utc).isoformat()
    articles: List[Dict[str, str]] = []
    for item in payload.get("articles", [])[:max_results]:
        url = item.get("url", "")
        source_name = item.get("sourceCommonName") or _domain(url) or "GDELT"
        title = _clean_text(item.get("title"))
        if not title or not url:
            continue
        articles.append(
            {
                "id": _id_for(title, url),
                "title": title,
                "url": url,
                "sourceName": source_name,
                "sourceDomain": _domain(url),
                "publishedAt": item.get("seendate", ""),
                "retrievedAt": retrieved_at,
                "language": item.get("language", ""),
                "country": item.get("sourceCountry", ""),
                "snippet": _clean_text(item.get("title")),
                "fullText": _clean_text(item.get("title")),
                "sourceType": infer_source_type(source_name, url),
                "provider": "GDELT",
            }
        )
    return articles


async def search_google_news_rss(entity_name: str, max_results: int = 12) -> List[Dict[str, str]]:
    search = quote_plus(f'"{entity_name}" ({ " OR ".join(ADVERSE_KEYWORDS[:12]) })')
    url = GOOGLE_NEWS_RSS.format(query=search)
    retrieved_at = datetime.now(timezone.utc).isoformat()
    try:
        async with httpx.AsyncClient(timeout=8, follow_redirects=True) as client:
            response = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            response.raise_for_status()
        feed = feedparser.parse(response.text)
    except Exception:
        return []

    articles: List[Dict[str, str]] = []
    for entry in feed.entries[:max_results]:
        link = getattr(entry, "link", "")
        source = getattr(getattr(entry, "source", None), "title", "") or "Google News"
        title = _clean_text(getattr(entry, "title", ""))
        summary = _clean_text(getattr(entry, "summary", ""))
        articles.append(
            {
                "id": _id_for(title, link),
                "title": title,
                "url": link,
                "sourceName": _clean_text(source),
                "sourceDomain": _domain(link),
                "publishedAt": getattr(entry, "published", ""),
                "retrievedAt": retrieved_at,
                "language": "en",
                "country": "",
                "snippet": summary,
                "fullText": summary,
                "sourceType": infer_source_type(source, link),
                "provider": "RSS",
            }
        )
    return articles


async def search_news_api_articles(entity_name: str, max_results: int = 12) -> List[Dict[str, str]]:
    api_key = os.getenv("NEWS_API_KEY") or os.getenv("VITE_NEWS_API_KEY") or os.getenv("NEXT_PUBLIC_NEWS_API_KEY")
    if not api_key:
        return []
    query = f'"{entity_name}" AND ({ " OR ".join(ADVERSE_KEYWORDS[:10]) })'
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            response = await client.get(
                NEWSAPI_ENDPOINT,
                params={
                    "q": query,
                    "language": "en",
                    "sortBy": "relevancy",
                    "pageSize": max_results,
                    "apiKey": api_key,
                },
            )
            response.raise_for_status()
            payload = response.json()
    except Exception:
        return []

    retrieved_at = datetime.now(timezone.utc).isoformat()
    articles: List[Dict[str, str]] = []
    for item in payload.get("articles", [])[:max_results]:
        url = item.get("url", "")
        source_name = (item.get("source") or {}).get("name") or _domain(url) or "NewsAPI"
        title = _clean_text(item.get("title"))
        if not title or not url:
            continue
        articles.append(
            {
                "id": _id_for(title, url),
                "title": title,
                "url": url,
                "sourceName": source_name,
                "sourceDomain": _domain(url),
                "publishedAt": item.get("publishedAt", ""),
                "retrievedAt": retrieved_at,
                "language": "en",
                "country": "",
                "snippet": _clean_text(item.get("description")),
                "fullText": _clean_text(item.get("content") or item.get("description")),
                "sourceType": infer_source_type(source_name, url),
                "provider": "NewsAPI",
            }
        )
    return articles


def search_official_sources(entity_name: str, jurisdiction: Optional[str] = None) -> List[Dict[str, str]]:
    retrieved_at = datetime.now(timezone.utc).isoformat()
    encoded = quote_plus(f'"{entity_name}" financial crime')
    seeds = [
        ("Financial Conduct Authority", f"https://www.fca.org.uk/search-results?search_term={encoded}", "Regulatory"),
        ("U.S. Department of Justice", f"https://www.justice.gov/search?keys={encoded}", "Law Enforcement"),
        ("U.S. Securities and Exchange Commission", f"https://www.sec.gov/search?keys={encoded}", "Regulatory"),
        ("FinCEN", f"https://www.fincen.gov/search/node/{encoded}", "Regulatory"),
        ("OFAC Sanctions Search", f"https://sanctionssearch.ofac.treas.gov/", "Sanctions List"),
        ("FATF", f"https://www.fatf-gafi.org/en/search.html?q={encoded}", "Official"),
    ]
    if jurisdiction and jurisdiction.lower() in {"united kingdom", "uk", "england"}:
        seeds.insert(0, ("UK Companies House", f"https://find-and-update.company-information.service.gov.uk/search?q={quote_plus(entity_name)}", "Official"))

    return [
        {
            "id": _id_for(name, url),
            "title": f"Official search link for {entity_name}: {name}",
            "url": url,
            "sourceName": name,
            "sourceDomain": _domain(url),
            "publishedAt": "",
            "retrievedAt": retrieved_at,
            "language": "en",
            "country": jurisdiction or "",
            "snippet": f"Curated official-source search endpoint for analyst verification of {entity_name}.",
            "fullText": "",
            "sourceType": source_type,
            "provider": "OfficialSearch",
            "isSearchSeed": True,
        }
        for name, url, source_type in seeds
    ]


def dedupe_sources(articles: Iterable[Dict[str, str]]) -> List[Dict[str, str]]:
    seen: set[str] = set()
    unique: List[Dict[str, str]] = []
    for article in articles:
        url_key = re.sub(r"[?#].*$", "", article.get("url", "").lower()).strip("/")
        title_key = re.sub(r"\W+", " ", article.get("title", "").lower()).strip()
        key = url_key or title_key
        if not key or key in seen:
            continue
        seen.add(key)
        article["duplicateGroupId"] = hashlib.sha1(title_key.encode("utf-8")).hexdigest()[:10]
        unique.append(article)
    return unique


async def retrieve_public_sources(entity_name: str, jurisdiction: Optional[str] = None, max_results: int = 30, lookback_days: int = 1095) -> List[Dict[str, str]]:
    gdelt, rss, news_api = await _gather_sources(entity_name, max_results, lookback_days)
    official = search_official_sources(entity_name, jurisdiction)
    live_articles = [*gdelt, *rss, *news_api]
    if live_articles:
        return dedupe_sources([*live_articles, *official])[:max_results]
    return official[:8]


async def _gather_sources(entity_name: str, max_results: int, lookback_days: int) -> tuple[List[Dict[str, str]], List[Dict[str, str]], List[Dict[str, str]]]:
    gdelt: List[Dict[str, str]] = []
    rss: List[Dict[str, str]] = []
    news_api: List[Dict[str, str]] = []
    try:
        start = (datetime.now(timezone.utc) - timedelta(days=lookback_days)).date().isoformat()
        gdelt = await search_gdelt_articles(entity_name, start_date=start, max_results=max(10, max_results // 2))
    except Exception:
        gdelt = []
    try:
        rss = await search_google_news_rss(entity_name, max_results=max(8, max_results // 3))
    except Exception:
        rss = []
    try:
        news_api = await search_news_api_articles(entity_name, max_results=8)
    except Exception:
        news_api = []
    return gdelt, rss, news_api
