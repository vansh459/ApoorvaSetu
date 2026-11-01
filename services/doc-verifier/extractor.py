"""PDF text extraction with an OCR fallback for scanned approval documents."""

from __future__ import annotations

import os
import re
from typing import Dict, List, Optional

from field_parser import extract_fields, normalize_text

try:  # PyMuPDF exposes both import names depending on the installed version.
    import pymupdf as fitz  # type: ignore
except ImportError:  # pragma: no cover - exercised only when the extra is absent
    try:
        import fitz  # type: ignore
    except ImportError:
        fitz = None  # type: ignore

try:
    import pytesseract  # type: ignore
    from PIL import Image  # type: ignore

    tesseract_cmd = os.getenv("TESSERACT_CMD", "").strip()
    if tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
    pytesseract.get_tesseract_version()
    OCR_AVAILABLE = True
except Exception:  # pragma: no cover - depends on the host image
    pytesseract = None  # type: ignore
    Image = None  # type: ignore
    OCR_AVAILABLE = False

MAX_PAGES = int(os.getenv("DOC_MAX_PAGES", "25"))
OCR_MIN_CHARS = int(os.getenv("DOC_OCR_MIN_CHARS", "40"))
OCR_DPI = int(os.getenv("DOC_OCR_DPI", "200"))
TEXT_PREVIEW_CHARS = int(os.getenv("DOC_TEXT_PREVIEW_CHARS", "1500"))
OCR_LANG = os.getenv("TESSERACT_LANG", "eng")
OCR_CONFIG = os.getenv("TESSERACT_CONFIG", "--psm 6")


class ExtractionError(Exception):
    def __init__(self, code: str, message: str, status: int = 422) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


def capabilities() -> Dict[str, bool]:
    return {
        "text_extraction": fitz is not None,
        "ocr": OCR_AVAILABLE,
    }


def _ocr_page(page) -> str:  # pragma: no cover - needs the tesseract binary
    if not OCR_AVAILABLE or pytesseract is None or Image is None:
        return ""
    scale = OCR_DPI / 72.0
    pixmap = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
    image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
    try:
        return pytesseract.image_to_string(image, lang=OCR_LANG, config=OCR_CONFIG) or ""
    except Exception:
        return ""


def extract_pdf(data: bytes, file_name: str = "") -> Dict:
    if fitz is None:
        raise ExtractionError(
            "EXTRACTOR_UNAVAILABLE",
            "PDF text extraction is unavailable on this host. Install the Python dependencies.",
            503,
        )
    if not data.lstrip().startswith(b"%PDF-"):
        raise ExtractionError("INVALID_PDF", "The uploaded file is not a PDF document.", 415)

    try:
        document = fitz.open(stream=data, filetype="pdf")
    except Exception:
        raise ExtractionError("INVALID_PDF", "The PDF could not be opened or is corrupted.", 422)

    try:
        if document.needs_pass:
            raise ExtractionError("ENCRYPTED_PDF", "Password-protected PDFs are not supported.", 422)

        page_count = int(document.page_count)
        if page_count == 0:
            raise ExtractionError("EMPTY_PDF", "The PDF does not contain any pages.", 422)

        warnings: List[str] = []
        pages_to_read = min(page_count, MAX_PAGES)
        if page_count > pages_to_read:
            warnings.append(
                f"Only the first {pages_to_read} of {page_count} pages were read."
            )

        page_texts: List[str] = []
        ocr_pages = 0
        text_layer_pages = 0

        for index in range(pages_to_read):
            page = document.load_page(index)
            try:
                text = page.get_text("text") or ""
            except Exception:
                text = ""
            text = normalize_text(text)

            if len(text) >= OCR_MIN_CHARS:
                text_layer_pages += 1
            elif OCR_AVAILABLE:
                ocr_text = normalize_text(_ocr_page(page))
                if len(ocr_text) > len(text):
                    text = ocr_text
                    ocr_pages += 1
            else:
                warnings.append(
                    "Some pages have no text layer and OCR is not installed on the extraction host."
                )

            page_texts.append(text)

        full_text = normalize_text("\n\n".join(part for part in page_texts if part))

        if ocr_pages == 0:
            method = "text"
        elif text_layer_pages == 0:
            method = "ocr"
        else:
            method = "hybrid"

        if len(full_text) < OCR_MIN_CHARS:
            warnings.append("No readable text was found in the document.")

        fields = extract_fields(full_text)
        preview = re.sub(r"\s+", " ", full_text)[:TEXT_PREVIEW_CHARS]

        return {
            "method": method,
            "pageCount": page_count,
            "textPreview": preview,
            "fields": fields,
            "warnings": warnings,
        }
    finally:
        document.close()


def describe_extraction(extraction: Dict) -> str:  # pragma: no cover - helper for logs
    fields = extraction.get("fields") or {}
    found = [name for name, field in fields.items() if field.get("value")]
    return f"{extraction.get('method')} / {extraction.get('pageCount')} page(s); fields: {', '.join(found) or 'none'}"
