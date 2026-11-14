from __future__ import annotations

import argparse
import collections
import hashlib
import json
import re
from pathlib import Path

from bs4 import BeautifulSoup


ROMAN_CHAPTERS = (
    "i ii iii iv v vi vii viii ix x xi xii xiii xiv xv xvi xvii xviii xix xx "
    "xxi xxii xxiii xxiv xxv xxvi xxvii xxviii xxix xxx xxxi xxxii xxxiii "
    "xxxiv xxxv xxxvi xxxvii xxxviii xxxix xl xli xlii xliii xliv xlv xlvi "
    "xlvii xlviii xlix l li"
).split()


def extract(source: Path) -> dict:
    raw = source.read_bytes()
    soup = BeautifulSoup(raw.decode("utf-8"), "html.parser")
    paragraphs = [p.get_text(" ", strip=True) for p in soup.find_all("p")]
    chapter_by_roman = {name: i + 1 for i, name in enumerate(ROMAN_CHAPTERS)}

    headings: dict[int, int] = {}
    for index, text in enumerate(paragraphs):
        match = re.match(r"^([ivxlcdm]+)\s+(.*)$", text, re.I)
        if match and match.group(1).lower() in chapter_by_roman:
            headings[index] = chapter_by_roman[match.group(1).lower()]

    units: list[dict] = []
    unassigned: list[dict] = []
    chapter = 0
    body_start = min(headings)
    for index in range(body_start, len(paragraphs)):
        text = paragraphs[index]
        if text.startswith("Scanned and Edited"):
            break
        if index in headings:
            chapter = headings[index]
            text = re.sub(r"^[ivxlcdm]+\s+", "", text, flags=re.I)

        inferred = (chapter == 31 and index == 101) or (chapter == 36 and index == 112)
        if inferred:
            chapter += 1
            units.append({
                "chapter": chapter,
                "source_verse_label": "1",
                "source_text": text,
                "source_marker": "chapter_and_verse_inferred_from_sequence",
            })
            continue

        marker = re.match(r"^([IVX]+|\d+(?:\s*,\s*\d+)*)(?:\s+)(.*)$", text)
        label = None
        body = text
        if marker and (
            marker.group(1).isdigit()
            or "," in marker.group(1)
            or (chapter == 3 and index == 8 and marker.group(1) == "I")
        ):
            label = marker.group(1).replace(" ", "")
            body = marker.group(2)
            if label == "I":
                label = "1"

        if label is not None:
            units.append({
                "chapter": chapter,
                "source_verse_label": label,
                "source_text": body,
                "source_marker": "printed",
            })
        elif chapter and units:
            units[-1]["source_text"] += " " + body
        elif text.strip():
            unassigned.append({"paragraph": index, "text": text[:120]})

    by_chapter: dict[int, list[str]] = collections.defaultdict(list)
    for unit in units:
        by_chapter[unit["chapter"]].append(unit["source_verse_label"])

    gaps = []
    expanded_reference_count = 0
    for chapter, labels in sorted(by_chapter.items()):
        references = []
        for label in labels:
            numbers = [int(n) for n in label.split(",")]
            expanded_reference_count += len(numbers)
            references.extend(numbers)
        for number in range(1, max(references) + 1):
            if number not in references:
                gaps.append({"chapter": chapter, "verse": number})

    expected_gaps = [
        {"chapter": 5, "verse": 2},
        {"chapter": 8, "verse": 2},
        {"chapter": 14, "verse": 2},
        {"chapter": 35, "verse": 2},
    ]
    assert set(by_chapter) == set(range(1, 52)), "Expected all 51 chapters"
    assert len(units) == 152 and all(u["source_text"].strip() for u in units)
    assert not unassigned, f"Unassigned source paragraphs: {unassigned}"
    assert gaps == expected_gaps, f"Unexpected verse-marker gaps: {gaps}"
    assert [u for u in units if u["source_marker"] != "printed"]
    assert len([u for u in units if u["source_marker"] != "printed"]) == 2

    return {
        "book_code": "TADAM",
        "edition_id": "charles-1913-latin-recension-en",
        "work_title_ar": "حياة آدم وحواء",
        "edition_title": "The Books of Adam and Eve (Latin recension)",
        "source_language": "en",
        "edition_year": 1913,
        "source_url": "https://wesley.nnu.edu/sermons-essays-books/noncanonical-literature/noncanonical-literature-ot-pseudepigrapha/the-books-of-adam-and-eve/",
        "verification_url": "https://www.ccel.org/c/charles/otpseudepig/adamnev.htm",
        "source_description_ar": (
            "ترجمة ر. هـ. تشارلز للصيغة اللاتينية في طبعة أكسفورد 1913؛ "
            "نُقلت وحدات النص من تفريغ مركز ويسلي وقوبلت بصفحة سي سي إي إل، "
            "مع حفظ أرقام الطبعة كما ظهرت."
        ),
        "source_sha256": hashlib.sha256(raw).hexdigest(),
        "verification": {
            "chapters": 51,
            "text_units": len(units),
            "expanded_printed_refs": expanded_reference_count,
            "all_chapters_present": True,
            "all_text_units_nonempty": True,
            "unassigned_paragraphs": len(unassigned),
            "inferred_chapter_boundaries": [32, 37],
            "printed_reference_gaps": expected_gaps,
            "grouped_printed_references": [
                {"chapter": u["chapter"], "label": u["source_verse_label"]}
                for u in units if "," in u["source_verse_label"]
            ],
            "ending_reference": "51:3",
            "completeness": (
                "complete text through printed ending; preserve source numbering "
                "gaps and grouped markers; translation units are not one-to-one "
                "with every database verse"
            ),
        },
        "units": units,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    data = extract(args.source)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "output": str(args.output.resolve()),
        "source_sha256": data["source_sha256"],
        "chapters": data["verification"]["chapters"],
        "units": data["verification"]["text_units"],
        "expanded_refs": data["verification"]["expanded_printed_refs"],
        "missing_markers": data["verification"]["printed_reference_gaps"],
        "grouped_refs": data["verification"]["grouped_printed_references"],
        "ending": data["verification"]["ending_reference"],
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
