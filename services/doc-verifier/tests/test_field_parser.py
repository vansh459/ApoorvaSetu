from datetime import date

import pytest

from field_parser import extract_fields, parse_date_token


@pytest.mark.parametrize(
    ("token", "expected"),
    [
        ("2024-03-12", date(2024, 3, 12)),
        ("12/03/2024", date(2024, 3, 12)),
        ("31/03/25", date(2025, 3, 31)),
        ("03/31/2025", date(2025, 3, 31)),
        ("12 March 2024", date(2024, 3, 12)),
        ("12th March 2024", date(2024, 3, 12)),
        ("March 12, 2024", date(2024, 3, 12)),
        ("March 12 2024", date(2024, 3, 12)),
    ],
)
def test_parse_supported_date_formats(token, expected):
    assert parse_date_token(token) == expected


@pytest.mark.parametrize("token", ["31/02/2024", "not a date", "00/00/2024"])
def test_parse_rejects_invalid_dates(token):
    assert parse_date_token(token) is None


def test_extracts_labelled_fire_safety_document():
    text = """
    MUNICIPAL FIRE DEPARTMENT
    FIRE SAFETY NO OBJECTION CERTIFICATE

    Name of the Institution : Sunrise Institute of Technology, Pune
    Registration Number: FSN/2024/1187
    Issue Date: 12 March 2024
    Valid Till: 11 March 2027
    Issued by: Municipal Fire Department, Pune

    This certificate confirms compliance with fire safety norms.
    """

    fields = extract_fields(text)

    assert fields["institutionName"]["value"] == "Sunrise Institute of Technology, Pune"
    assert fields["institutionName"]["confidence"] == "high"
    assert fields["documentType"]["value"] == "FIRE_SAFETY_NOC"
    assert fields["registrationNumber"]["value"] == "FSN/2024/1187"
    assert fields["issueDate"]["value"] == "2024-03-12"
    assert fields["expiryDate"]["value"] == "2027-03-11"
    assert "Municipal Fire Department" in fields["issuingAuthority"]["value"]


def test_extracts_university_affiliation_dates():
    text = """
    UNIVERSITY AFFILIATION CERTIFICATE
    Name of the College: Deccan College of Engineering
    Registration No.: AFF/2023/0042
    Date of Issue: 01/07/2023
    Valid Upto: 30/06/2024
    Issued By: Savitribai Phule Pune University
    """

    fields = extract_fields(text)

    assert fields["documentType"]["value"] == "UNIVERSITY_AFFILIATION"
    assert fields["issueDate"]["value"] == "2023-07-01"
    assert fields["expiryDate"]["value"] == "2024-06-30"
    assert fields["documentType"]["confidence"] in ("medium", "high")


def test_institution_falls_back_to_academic_line():
    text = """
    Government of Maharashtra
    VIDYAA VIKAS COLLEGE OF ENGINEERING AND TECHNOLOGY
    Annual audited financial statements for the year 2023-24.
    """

    fields = extract_fields(text)

    assert fields["institutionName"]["value"]
    assert "VIDYAA VIKAS" in fields["institutionName"]["value"]
    assert fields["institutionName"]["confidence"] == "medium"


def test_missing_fields_are_reported_without_guessing():
    fields = extract_fields("This document contains no identifiable approval details.")

    assert fields["institutionName"]["value"] is None
    assert fields["documentType"]["value"] is None
    assert fields["registrationNumber"]["value"] is None
    assert fields["issueDate"]["value"] is None
    assert fields["expiryDate"]["value"] is None
    assert fields["issuingAuthority"]["value"] is None
    assert fields["issueDate"]["confidence"] == "low"


def test_issue_date_fallback_uses_first_parseable_date():
    fields = extract_fields(
        "AUDITED BALANCE SHEET\nBalance sheet as at 31/03/2024\nChartered Accountant: R. Mehta"
    )

    assert fields["issueDate"]["value"] == "2024-03-31"
    assert fields["issueDate"]["confidence"] == "medium"
    assert fields["expiryDate"]["value"] is None
