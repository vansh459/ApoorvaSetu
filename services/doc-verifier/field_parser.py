"""Deterministic field extraction from approval-document text.

The parser never decides whether a document is valid or acceptable. It reports
candidate values with a confidence level so a human officer can confirm them.
"""

from __future__ import annotations

import re
from datetime import date
from typing import Dict, Optional, Tuple

Field = Dict[str, Optional[str]]

ISO_DATE = r"\d{4}-\d{2}-\d{2}"
NUMERIC_DATE = r"\d{1,2}[./-]\d{1,2}[./-]\d{2,4}"
DAY_MONTH_YEAR = r"\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]{3,9},?\s+\d{4}"
MONTH_DAY_YEAR = r"[A-Za-z]{3,9}\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}"
DATE_TOKEN = r"(?:%s|%s|%s|%s)" % (ISO_DATE, NUMERIC_DATE, DAY_MONTH_YEAR, MONTH_DAY_YEAR)

MONTHS = {
    "jan": 1, "january": 1,
    "feb": 2, "february": 2,
    "mar": 3, "march": 3,
    "apr": 4, "april": 4,
    "may": 5,
    "jun": 6, "june": 6,
    "jul": 7, "july": 7,
    "aug": 8, "august": 8,
    "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "dec": 12, "december": 12,
}

ISSUE_DATE_LABELS = [
    "date of issue",
    "issue date",
    "issued on",
    "date of grant",
    "granted on",
    "date of registration",
]
EXPIRY_DATE_LABELS = [
    "valid till",
    "valid upto",
    "valid up to",
    "valid until",
    "date of expiry",
    "expiry date",
    "expires on",
    "valid through",
]
REGISTRATION_LABELS = [
    "registration number",
    "registration no",
    "registration details",
    "regd. no",
    "regd no",
    "reg. no",
    "reg no",
]
ISSUING_AUTHORITY_LABELS = [
    "issuing authority",
    "issued by",
    "granted by",
    "authority issuing",
]
INSTITUTION_LABELS = [
    "name of the institution",
    "institution name",
    "name of institution",
    "name of the college",
    "college name",
    "name of the university",
    "university name",
    "name of the institute",
    "institute name",
]

DOCUMENT_TYPE_KEYWORDS = {
    "AICTE_APPROVAL_LETTER": [
        "extension of approval",
        "aicte approval",
        "approval letter",
        "letter of approval",
        "letter of extension",
        "eoa",
    ],
    "FIRE_SAFETY_NOC": [
        "fire safety",
        "no objection certificate",
        "fire noc",
        "fire department",
        "fire fighting",
    ],
    "UNIVERSITY_AFFILIATION": [
        "university affiliation",
        "affiliation certificate",
        "affiliation",
    ],
    "AUDITED_FINANCIALS": [
        "audited balance sheet",
        "audited financial statement",
        "audited financial",
        "balance sheet",
        "financial statements",
        "chartered accountant",
    ],
    "BUILDING_STABILITY": [
        "structural stability",
        "building stability",
        "stability certificate",
    ],
    "LAND_LEASE_DEED": [
        "registered lease deed",
        "lease deed",
        "lease agreement",
    ],
    "LAND_OWNERSHIP_DEED": [
        "ownership deed",
        "title deed",
        "land deed",
        "possession certificate",
    ],
    "BARRIER_FREE_AFFIDAVIT": [
        "barrier free environment",
        "barrier free",
        "barrier-free",
    ],
    "FACULTY_DECLARATION": [
        "faculty cadre ratio",
        "cadre ratio",
        "faculty declaration",
    ],
}

INSTITUTION_TERMS = (
    r"(?:Institute|Institution|College|University|Polytechnic|Academy|"
    r"School\s+of\s+[A-Za-z]+|Vidyalaya|Vidya\s+Mandir)"
)

EXCLUDED_INSTITUTION_LINES = re.compile(
    r"(?:AICTE|All\s+India\s+Council|University\s+Grants\s+Commission|"
    r"Government\s+of|Ministry\s+of|Department\s+of|Directorate\s+of|"
    r"Technical\s+Education\s+Department|Annexure|Certificate\s+No)",
    re.I,
)


def normalize_text(text: str) -> str:
    text = text.replace("\u00a0", " ").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _safe_date(year: int, month: int, day: int) -> Optional[date]:
    try:
        return date(year, month, day)
    except ValueError:
        return None


def _expand_year(value: str) -> int:
    year = int(value)
    if year < 100:
        year += 1900 if year >= 70 else 2000
    return year


def parse_date_token(token: str) -> Optional[date]:
    cleaned = token.strip().replace(",", " ")
    cleaned = re.sub(r"(\d)(?:st|nd|rd|th)\b", r"\1", cleaned, flags=re.I)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    match = re.fullmatch(r"(\d{4})-(\d{1,2})-(\d{1,2})", cleaned)
    if match:
        return _safe_date(int(match.group(1)), int(match.group(2)), int(match.group(3)))

    match = re.fullmatch(r"(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})", cleaned)
    if match:
        first, second = int(match.group(1)), int(match.group(2))
        year = _expand_year(match.group(3))
        if first > 12 and second <= 12:
            return _safe_date(year, second, first)
        if second > 12 and first <= 12:
            return _safe_date(year, first, second)
        # Indian approval documents are day-first unless the value is unambiguously month-first.
        return _safe_date(year, second, first)

    match = re.fullmatch(r"(\d{1,2}) ([A-Za-z]{3,9}) (\d{4})", cleaned)
    if match:
        month = MONTHS.get(match.group(2).lower())
        if month:
            return _safe_date(int(match.group(3)), month, int(match.group(1)))

    match = re.fullmatch(r"([A-Za-z]{3,9}) (\d{1,2}) (\d{4})", cleaned)
    if match:
        month = MONTHS.get(match.group(1).lower())
        if month:
            return _safe_date(int(match.group(3)), month, int(match.group(2)))

    return None


def _evidence(text: str, start: int, end: int, radius: int = 40) -> str:
    snippet = text[max(0, start - radius): min(len(text), end + radius)]
    return re.sub(r"\s+", " ", snippet).strip()[:200]


def _find_labeled_date(text: str, labels: list[str]) -> Optional[Tuple[date, str]]:
    for label in labels:
        pattern = re.compile(
            re.escape(label) + r"\s*(?:date\s*)?[:\-–]?\s*(" + DATE_TOKEN + r")",
            re.I,
        )
        match = pattern.search(text)
        if match:
            parsed = parse_date_token(match.group(1))
            if parsed:
                return parsed, _evidence(text, match.start(), match.end())
    return None


def _find_fallback_date(text: str) -> Optional[Tuple[date, str]]:
    for match in re.finditer(DATE_TOKEN, text, re.I):
        parsed = parse_date_token(match.group(0))
        if parsed:
            return parsed, _evidence(text, match.start(), match.end())
    return None


def _find_registration(text: str) -> Optional[Tuple[str, str]]:
    for label in REGISTRATION_LABELS:
        pattern = re.compile(
            re.escape(label)
            + r"\.?\s*(?:number|no\.?|details)?\.?\s*[:\-–]?\s*([A-Za-z0-9][A-Za-z0-9/._\- ]{2,40})",
            re.I,
        )
        match = pattern.search(text)
        if match:
            value = re.sub(r"\s+", " ", match.group(1)).strip(" .,:-")
            value = re.split(r"\b(?:dated|date|valid|issued|address)\b", value, flags=re.I)[0].strip()
            if len(value) >= 3:
                return value[:60], _evidence(text, match.start(), match.end())

    match = re.search(
        r"\b(?:Reg(?:d)?\.?\s*(?:No|Number)\.?|Registration\s+(?:No|Number))\s*[:\-–]?\s*"
        r"([A-Z0-9][A-Z0-9/\-]{3,30})",
        text,
        re.I,
    )
    if match:
        return match.group(1).strip(), _evidence(text, match.start(), match.end())
    return None


def _clean_authority(value: str) -> str:
    value = re.split(r"\s{2,}|\n|;", value)[0]
    value = re.sub(r"\b(?:date|dated|valid|reg(?:d)?\.?\s*no)\b.*$", "", value, flags=re.I)
    return value.strip(" .,:-")[:120]


def _find_issuing_authority(text: str) -> Optional[Tuple[str, str]]:
    for label in ISSUING_AUTHORITY_LABELS:
        pattern = re.compile(re.escape(label) + r"\s*[:\-–]?\s*([^\n;]{3,120})", re.I)
        match = pattern.search(text)
        if match:
            value = _clean_authority(match.group(1))
            if value:
                return value, _evidence(text, match.start(), match.end())

    fallback = re.search(
        r"\b((?:Directorate|Director|Department|Commissioner|Municipal\s+Corporation|"
        r"University|AICTE|All\s+India\s+Council)[^\n;]{0,80})",
        text,
        re.I,
    )
    if fallback:
        return _clean_authority(fallback.group(1)), _evidence(text, fallback.start(), fallback.end())
    return None


def _clean_institution(value: str) -> str:
    value = re.split(r"\s{2,}|\s*\|\s*|\s*;\s*|\n", value)[0]
    value = re.sub(r"\b(?:address|reg(?:d)?\.?\s*no|phone|email|website)\b.*$", "", value, flags=re.I)
    return value.strip(" .,:-")[:120]


def _find_institution(text: str) -> Optional[Tuple[str, str, str]]:
    """Returns (value, confidence, evidence)."""

    for label in INSTITUTION_LABELS:
        pattern = re.compile(re.escape(label) + r"\s*[:\-–]\s*([^\n;]{3,140})", re.I)
        match = pattern.search(text)
        if match:
            value = _clean_institution(match.group(1))
            if value:
                return value, "high", _evidence(text, match.start(), match.end())

    for line in text.splitlines()[:40]:
        candidate = line.strip()
        if not candidate or len(candidate) > 140:
            continue
        if EXCLUDED_INSTITUTION_LINES.search(candidate):
            continue
        if not re.search(INSTITUTION_TERMS, candidate, re.I):
            continue
        if len(re.findall(r"[A-Za-z]{2,}", candidate)) < 2:
            continue
        cleaned = _clean_institution(candidate)
        if cleaned and len(cleaned) >= 8:
            return cleaned, "medium", candidate[:200]

    return None, "low", ""


def _find_document_type(text: str) -> Optional[Tuple[str, str, str]]:
    lowered = text.lower()
    scores: Dict[str, int] = {}
    evidence: Dict[str, str] = {}

    for code, keywords in DOCUMENT_TYPE_KEYWORDS.items():
        score = 0
        for keyword in keywords:
            if len(keyword) <= 5 and " " not in keyword:
                hits = len(re.findall(r"\b" + re.escape(keyword) + r"\b", lowered))
            else:
                hits = lowered.count(keyword)
            if hits:
                score += hits * (2 if " " in keyword else 1)
                if code not in evidence:
                    index = lowered.find(keyword)
                    evidence[code] = _evidence(text, index, index + len(keyword))
        if score:
            scores[code] = score

    if not scores:
        return None, "low", ""

    code = max(scores, key=scores.get)
    score = scores[code]
    confidence = "high" if score >= 4 else "medium"
    return code, confidence, evidence.get(code, "")


def _field(value: Optional[str], confidence: str, evidence: str = "") -> Field:
    return {
        "value": value or None,
        "confidence": confidence if value else "low",
        "evidence": evidence[:200],
    }


def extract_fields(raw_text: str) -> Dict[str, Field]:
    text = normalize_text(raw_text)

    issue = _find_labeled_date(text, ISSUE_DATE_LABELS)
    if issue is None:
        issue = _find_fallback_date(text)
        issue_confidence = "medium"
    else:
        issue_confidence = "high"

    expiry = _find_labeled_date(text, EXPIRY_DATE_LABELS)
    expiry_confidence = "high" if expiry else "low"

    registration = _find_registration(text)
    authority = _find_issuing_authority(text)
    institution = _find_institution(text)
    document_type = _find_document_type(text)

    return {
        "institutionName": _field(
            institution[0] if institution else None,
            institution[1] if institution else "low",
            institution[2] if institution else "",
        ),
        "documentType": _field(
            document_type[0] if document_type else None,
            document_type[1] if document_type else "low",
            document_type[2] if document_type else "",
        ),
        "registrationNumber": _field(
            registration[0] if registration else None,
            "high" if registration else "low",
            registration[1] if registration else "",
        ),
        "issueDate": _field(
            issue[0].isoformat() if issue else None,
            issue_confidence if issue else "low",
            issue[1] if issue else "",
        ),
        "expiryDate": _field(
            expiry[0].isoformat() if expiry else None,
            expiry_confidence,
            expiry[1] if expiry else "",
        ),
        "issuingAuthority": _field(
            authority[0] if authority else None,
            "high" if authority else "low",
            authority[1] if authority else "",
        ),
    }
