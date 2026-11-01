import pytest

fastapi = pytest.importorskip("fastapi")
pytest.importorskip("httpx")
fitz = pytest.importorskip("pymupdf", reason="PyMuPDF is required for API tests")

from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402


def make_pdf(text: str) -> bytes:
    document = fitz.open()
    page = document.new_page()
    page.insert_text((72, 72), text, fontsize=11)
    data = document.tobytes()
    document.close()
    return data


@pytest.fixture()
def client():
    return TestClient(main.app)


def test_health_reports_capabilities(client):
    response = client.get("/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] in ("ok", "degraded")
    assert "capabilities" in payload
    assert payload["limits"]["maxPages"] > 0


def test_extract_requires_shared_token_when_configured(client, monkeypatch):
    monkeypatch.setattr(main, "SHARED_TOKEN", "secret-token")
    pdf = make_pdf("FIRE SAFETY NO OBJECTION CERTIFICATE")

    response = client.post("/extract", content=pdf, headers={"Content-Type": "application/pdf"})

    assert response.status_code == 403
    assert response.json()["error"] == "FORBIDDEN"


def test_extract_rejects_non_pdf(client, monkeypatch):
    monkeypatch.setattr(main, "SHARED_TOKEN", "")

    response = client.post(
        "/extract",
        content=b"plain text",
        headers={"Content-Type": "application/pdf", "X-File-Name": "notes.txt"},
    )

    assert response.status_code == 415
    assert response.json()["error"] == "INVALID_PDF"


def test_extract_returns_contract_shape(client, monkeypatch):
    monkeypatch.setattr(main, "SHARED_TOKEN", "")
    pdf = make_pdf(
        "Name of the Institution: Sunrise Institute of Technology\n"
        "AUDITED BALANCE SHEET\nIssue Date: 31/03/2024"
    )

    response = client.post(
        "/extract",
        content=pdf,
        headers={"Content-Type": "application/pdf", "X-File-Name": "audit.pdf"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["fileName"] == "audit.pdf"
    extraction = payload["extraction"]
    assert extraction["method"] in ("text", "ocr", "hybrid")
    assert extraction["fields"]["issueDate"]["value"] == "2024-03-31"
    assert set(extraction["fields"]) == {
        "institutionName",
        "documentType",
        "registrationNumber",
        "issueDate",
        "expiryDate",
        "issuingAuthority",
    }
