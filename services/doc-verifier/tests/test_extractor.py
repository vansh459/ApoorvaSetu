import pytest

fitz = pytest.importorskip("pymupdf", reason="PyMuPDF is required for extraction tests")

from extractor import ExtractionError, extract_pdf  # noqa: E402


def make_pdf(text: str, pages: int = 1) -> bytes:
    document = fitz.open()
    for _ in range(pages):
        page = document.new_page()
        page.insert_text((72, 72), text, fontsize=11)
    data = document.tobytes()
    document.close()
    return data


def test_extracts_text_layer_document():
    data = make_pdf(
        "Name of the Institution: Sunrise Institute of Technology\n"
        "FIRE SAFETY NO OBJECTION CERTIFICATE\n"
        "Registration Number: FSN/2024/1187\n"
        "Issue Date: 12 March 2024\n"
        "Valid Till: 11 March 2027\n"
        "Issued by: Municipal Fire Department"
    )

    extraction = extract_pdf(data, "fire-noc.pdf")

    assert extraction["method"] == "text"
    assert extraction["pageCount"] == 1
    assert extraction["fields"]["documentType"]["value"] == "FIRE_SAFETY_NOC"
    assert extraction["fields"]["issueDate"]["value"] == "2024-03-12"
    assert extraction["fields"]["expiryDate"]["value"] == "2027-03-11"
    assert extraction["textPreview"]


def test_rejects_non_pdf_bytes():
    with pytest.raises(ExtractionError) as error:
        extract_pdf(b"not a pdf", "notes.txt")

    assert error.value.code == "INVALID_PDF"
    assert error.value.status == 415


def test_rejects_corrupt_pdf_container():
    with pytest.raises(ExtractionError) as error:
        extract_pdf(b"%PDF-1.7 broken", "broken.pdf")

    assert error.value.code == "INVALID_PDF"
