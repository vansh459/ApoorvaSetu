"""FastAPI wrapper around the deterministic PDF extraction pipeline.

The service only extracts text and candidate fields. It never approves,
rejects, or scores an application; those decisions stay with AICTE officers.
"""

from __future__ import annotations

import hmac
import os
from pathlib import Path
from urllib.parse import unquote

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from extractor import OCR_AVAILABLE, MAX_PAGES, ExtractionError, capabilities, extract_pdf, fitz

SERVICE_NAME = "ApoorvaSetu Document Extraction Service"
SERVICE_VERSION = "1.0.0"
MAX_BYTES = int(os.getenv("DOC_MAX_BYTES", str(10 * 1024 * 1024)))
SHARED_TOKEN = os.getenv("DOC_VERIFIER_TOKEN", "").strip()

app = FastAPI(
    title=SERVICE_NAME,
    version=SERVICE_VERSION,
    description=(
        "Deterministic PDF text extraction and OCR for AICTE approval documents. "
        "Findings are advisory and require human verification."
    ),
)


def _clean_file_name(value: str) -> str:
    name = Path(unquote(value or "")).name.strip()
    return name[:160] or "document.pdf"


def _error(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": code, "message": message})


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok" if fitz is not None else "degraded",
        "service": SERVICE_NAME,
        "version": SERVICE_VERSION,
        "capabilities": capabilities(),
        "limits": {
            "maxBytes": MAX_BYTES,
            "maxPages": MAX_PAGES,
            "ocrAvailable": OCR_AVAILABLE,
        },
    }


@app.post("/extract")
async def extract(request: Request) -> JSONResponse:
    if SHARED_TOKEN:
        provided = request.headers.get("x-verifier-token", "")
        if not hmac.compare_digest(provided, SHARED_TOKEN):
            return _error(403, "FORBIDDEN", "A valid verifier token is required.")

    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > MAX_BYTES:
        return _error(413, "PAYLOAD_TOO_LARGE", "The document exceeds the maximum upload size.")

    body = await request.body()
    if not body:
        return _error(400, "EMPTY_BODY", "The request body must contain the PDF bytes.")
    if len(body) > MAX_BYTES:
        return _error(413, "PAYLOAD_TOO_LARGE", "The document exceeds the maximum upload size.")

    file_name = _clean_file_name(request.headers.get("x-file-name", ""))

    try:
        extraction = extract_pdf(body, file_name)
    except ExtractionError as error:
        return _error(error.status, error.code, error.message)
    except Exception:
        return _error(500, "EXTRACTION_FAILED", "The document could not be processed.")

    return JSONResponse(
        status_code=200,
        content={
            "service": SERVICE_NAME,
            "version": SERVICE_VERSION,
            "fileName": file_name,
            "fileSize": len(body),
            "extraction": extraction,
        },
    )
