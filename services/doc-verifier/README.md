# ApoorvaSetu Document Extraction Service

Deterministic PDF text extraction and OCR for AICTE approval documents. The
service extracts text and candidate fields only. It never approves, rejects, or
scores an application; every finding must be reviewed by an AICTE officer.

## What it does

1. Validates the PDF container and size/page limits.
2. Extracts the text layer with PyMuPDF.
3. Falls back to Tesseract OCR for scanned pages with no usable text layer.
4. Parses candidate values for institution name, document type, registration
   number, issue date, expiry date, and issuing authority.
5. Returns each field with a confidence level and the evidence snippet.

The Node API (`server/documentVerifier.ts`) calls this service, then the React
application runs the authoritative deterministic checks and stores the review
report.

## API

### `GET /health`

```json
{
  "status": "ok",
  "capabilities": { "text_extraction": true, "ocr": true },
  "limits": { "maxBytes": 10485760, "maxPages": 25, "ocrAvailable": true }
}
```

### `POST /extract`

Send the raw PDF bytes as the request body. Optional headers:

| Header            | Purpose                                  |
| ----------------- | ---------------------------------------- |
| `X-File-Name`     | Original file name, URL-encoded if needed |
| `X-Verifier-Token`| Shared secret, when `DOC_VERIFIER_TOKEN` is set |
| `Content-Type`    | `application/pdf`                        |

```bash
curl -s http://localhost:8090/extract \
  -H 'Content-Type: application/pdf' \
  -H 'X-File-Name: fire-noc.pdf' \
  --data-binary @fire-noc.pdf | jq
```

Response (shape consumed by `DocumentExtraction` in `src/types/index.ts`):

```json
{
  "extraction": {
    "method": "hybrid",
    "pageCount": 2,
    "textPreview": "FIRE SAFETY NO OBJECTION CERTIFICATE ...",
    "fields": {
      "institutionName": { "value": "Sunrise Institute of Technology", "confidence": "high", "evidence": "..." },
      "documentType": { "value": "FIRE_SAFETY_NOC", "confidence": "high", "evidence": "..." },
      "registrationNumber": { "value": "FSN/2024/1187", "confidence": "high", "evidence": "..." },
      "issueDate": { "value": "2024-03-12", "confidence": "high", "evidence": "..." },
      "expiryDate": { "value": "2027-03-11", "confidence": "high", "evidence": "..." },
      "issuingAuthority": { "value": "Municipal Fire Department", "confidence": "high", "evidence": "..." }
    },
    "warnings": []
  }
}
```

Errors use `{ "error": "CODE", "message": "..." }` with status 400, 403, 413,
415, 422, or 503.

## Configuration

| Variable                | Default      | Meaning                                  |
| ----------------------- | ------------ | ---------------------------------------- |
| `DOC_MAX_BYTES`         | `10485760`   | Maximum upload size (10 MB)              |
| `DOC_MAX_PAGES`         | `25`         | Maximum pages read per document          |
| `DOC_OCR_MIN_CHARS`     | `40`         | Text below this triggers OCR fallback    |
| `DOC_OCR_DPI`           | `200`        | Rasterisation DPI for OCR                |
| `DOC_TEXT_PREVIEW_CHARS`| `1500`       | Characters returned in `textPreview`     |
| `DOC_VERIFIER_TOKEN`    | unset        | Optional shared secret with the Node API |
| `TESSERACT_CMD`         | unset        | Explicit path to the tesseract binary    |
| `TESSERACT_LANG`        | `eng`        | Tesseract language pack                  |
| `TESSERACT_CONFIG`      | `--psm 6`    | Tesseract page segmentation mode         |

## Local development

```bash
cd services/doc-verifier
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt

# macOS: brew install tesseract
uvicorn main:app --reload --port 8090
```

Then start the Node API with `DOC_VERIFIER_URL=http://localhost:8090` (the
default) and run the SPA with `npm run dev`.

## Tests

```bash
cd services/doc-verifier
python -m pytest -q
```

Tests that need PyMuPDF or Tesseract skip automatically when those components
are not installed.

## Docker

```bash
docker build -t apoorvasetu-doc-verifier services/doc-verifier
docker run --rm -p 8090:8090 apoorvasetu-doc-verifier
```

`docker-compose.yml` starts this service as the `doc-verifier` sidecar.
