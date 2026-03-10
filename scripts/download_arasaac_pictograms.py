#!/usr/bin/env python3
"""Download ARASAAC pictograms used by the app and write a local manifest.

The script scans the existing symbol data files, looks up the best ARASAAC
pictogram for each item, downloads the PNG locally, and writes metadata to
``src/data/arasaac-pictograms.json``.

The app can then render local pictogram images with emoji fallback.

License note:
ARASAAC resources are distributed under CC BY-NC-SA 4.0 and are only suitable
for non-commercial use unless you have separate written permission.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCES = [
    ROOT / "src" / "data" / "hierarchy.js",
    ROOT / "src" / "data" / "symbols.js",
    ROOT / "src" / "features" / "board" / "CategoryGrid.jsx",
]
MANIFEST_PATH = ROOT / "src" / "data" / "arasaac-pictograms.json"
OUTPUT_DIR = ROOT / "public" / "pictograms" / "arasaac"
ATTRIBUTION_PATH = OUTPUT_DIR / "ATTRIBUTION.txt"
API_BASE = "https://api.arasaac.org/api"
USER_AGENT = "Speakeasy-ARASAAC-Downloader/1.0"
ITEM_RE = re.compile(
    r"\{\s*id:\s*\"(?P<id>[^\"]+)\"\s*,\s*emoji:\s*\"(?P<emoji>[^\"]+)\"\s*,\s*label:\s*\"(?P<label>[^\"]+)\"",
    re.DOTALL,
)
IGNORED_IDS = {"quick", "emergency", "favorites"}
SEARCH_OVERRIDES = {
    "s_bye": "goodbye",
    "s_thanks": "thank you",
    "s_idk": "I don't know",
    "x_little": "a little",
    "x_done": "finished",
    "x_diff": "different",
    "q_whatTime": "what time",
    "q_canI": "can I",
    "q_canYou": "can you",
    "q3_happened": "what happened",
    "q3_name": "name",
    "q3_problem": "problem",
    "q3_next": "next",
    "q3_do": "do",
    "q3_say": "say",
    "q3_spell": "spell",
    "q3_use": "use",
    "q3_get": "get",
    "q3_feel": "feel",
    "q3_fix": "fix",
    "pe_i": "I",
    "pe_you": "you",
    "pe_we": "we",
    "pe_they": "they",
    "question": "question",
    "describe": "describe",
    "feel": "feel",
    "need": "need",
    "do": "do",
    "talk": "talk",
    "place": "place",
}
ATTRIBUTION_TEXT = """ARASAAC pictograms in this folder are used under the CC BY-NC-SA 4.0 license.
Author: Sergio Palao.
Source: ARASAAC / Government of Aragón (https://arasaac.org).
Commercial use is not allowed without separate written permission.
Any derivative distribution must keep the same license and attribution.
"""


@dataclass(frozen=True)
class Target:
    id: str
    label: str
    emoji: str
    source_file: str


class ArasaacClient:
    def __init__(self, language: str, resolution: int, timeout: float) -> None:
        self.language = language
        self.resolution = resolution
        self.timeout = timeout
        self._search_cache: dict[str, list[dict]] = {}
        self._metadata_cache: dict[int, dict] = {}

    def _read_json(self, url: str) -> dict | list:
        request = Request(url, headers={"User-Agent": USER_AGENT})
        with urlopen(request, timeout=self.timeout) as response:
            return json.load(response)

    def _read_bytes(self, url: str) -> bytes:
        request = Request(url, headers={"User-Agent": USER_AGENT})
        with urlopen(request, timeout=self.timeout) as response:
            return response.read()

    def best_search(self, search_text: str) -> list[dict]:
        key = search_text.strip().lower()
        if key not in self._search_cache:
            attempts = [search_text.strip()]
            if " " in search_text.strip():
                attempts.append(f'"{search_text.strip()}"')

            last_error: Exception | None = None
            for attempt in attempts:
                url = f"{API_BASE}/pictograms/{self.language}/bestsearch/{quote(attempt, safe='')}"
                try:
                    self._search_cache[key] = list(self._read_json(url))
                    break
                except HTTPError as exc:
                    last_error = exc
                    if exc.code != 404:
                        raise
            else:
                raise last_error or RuntimeError(f"No ARASAAC response for search: {search_text}")
        return self._search_cache[key]

    def metadata(self, pictogram_id: int) -> dict:
        if pictogram_id not in self._metadata_cache:
            url = f"{API_BASE}/pictograms/{self.language}/{pictogram_id}"
            self._metadata_cache[pictogram_id] = dict(self._read_json(url))
        return self._metadata_cache[pictogram_id]

    def download_png(self, pictogram_id: int) -> bytes:
        url = f"{API_BASE}/pictograms/{pictogram_id}?download=false&resolution={self.resolution}"
        return self._read_bytes(url)


def normalize(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def extract_targets(paths: Iterable[Path]) -> list[Target]:
    seen: dict[str, Target] = {}
    for path in paths:
        raw = path.read_text(encoding="utf-8")
        for match in ITEM_RE.finditer(raw):
            item_id = match.group("id")
            if item_id in IGNORED_IDS:
                continue
            seen.setdefault(
                item_id,
                Target(
                    id=item_id,
                    label=match.group("label"),
                    emoji=match.group("emoji"),
                    source_file=path.relative_to(ROOT).as_posix(),
                ),
            )
    return sorted(seen.values(), key=lambda item: item.id)


def choose_result(target: Target, results: list[dict]) -> dict | None:
    query = normalize(SEARCH_OVERRIDES.get(target.id, target.label))
    if not results:
        return None

    def score(result: dict) -> tuple[int, int]:
        keywords = [normalize(entry.get("keyword", "")) for entry in result.get("keywords", [])]
        tags = [normalize(value) for value in result.get("tags", [])]
        categories = [normalize(value) for value in result.get("categories", [])]
        keyword_meanings = [normalize(entry.get("meaning", "")) for entry in result.get("keywords", [])]

        points = 0
        if query and query in keywords:
            points += 120
        if query and any(query == meaning for meaning in keyword_meanings):
            points += 80
        if query and any(query in keyword or keyword in query for keyword in keywords if keyword):
            points += 50
        if query and any(query in meaning or meaning in query for meaning in keyword_meanings if meaning):
            points += 35
        if result.get("aac"):
            points += 25
        if result.get("aacColor"):
            points += 10
        if any("core vocabulary" in value for value in tags + categories):
            points += 12
        if not result.get("violence"):
            points += 2
        if result.get("schematic"):
            points += 1
        return (points, -int(result.get("_id", 0)))

    return max(results, key=score)


def description_for(metadata: dict) -> str:
    description = (metadata.get("desc") or "").strip()
    if description:
        return description
    keyword_meanings = [entry.get("meaning", "").strip() for entry in metadata.get("keywords", []) if entry.get("meaning")]
    if keyword_meanings:
        return " | ".join(keyword_meanings)
    return ""


def load_manifest() -> dict[str, dict]:
    if not MANIFEST_PATH.exists():
        return {}
    try:
        return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def save_manifest(manifest: dict[str, dict]) -> None:
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")


def ensure_attribution_file() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    ATTRIBUTION_PATH.write_text(ATTRIBUTION_TEXT, encoding="utf-8")


def write_png_if_needed(path: Path, png_data: bytes, refresh: bool) -> None:
    if path.exists() and not refresh:
        return
    path.write_bytes(png_data)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--language", default="en", help="ARASAAC language code used for search/metadata (default: en)")
    parser.add_argument("--resolution", type=int, default=500, choices=(500, 2500), help="PNG resolution to download (default: 500)")
    parser.add_argument("--limit", type=int, default=0, help="Only process the first N targets (default: all)")
    parser.add_argument("--ids", nargs="*", help="Only process these target ids")
    parser.add_argument("--refresh", action="store_true", help="Redownload images and overwrite manifest entries")
    parser.add_argument("--timeout", type=float, default=20.0, help="HTTP timeout in seconds (default: 20)")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    ensure_attribution_file()
    manifest = load_manifest()
    targets = extract_targets(DEFAULT_SOURCES)

    if args.ids:
        requested = set(args.ids)
        targets = [target for target in targets if target.id in requested]
    if args.limit > 0:
        targets = targets[: args.limit]

    client = ArasaacClient(language=args.language, resolution=args.resolution, timeout=args.timeout)
    downloaded = 0
    reused = 0
    failed: list[tuple[str, str]] = []

    for index, target in enumerate(targets, start=1):
        search_text = SEARCH_OVERRIDES.get(target.id, target.label)
        existing = manifest.get(target.id)
        if existing and not args.refresh:
            local_path = existing.get("localPath", "")
            if local_path:
                local_file = ROOT / local_path.lstrip("/")
                if local_file.exists():
                    reused += 1
                    print(f"[{index}/{len(targets)}] reuse {target.id} -> {local_path}")
                    continue

        try:
            results = client.best_search(search_text)
            best = choose_result(target, results)
            if not best:
                failed.append((target.id, "no search result"))
                print(f"[{index}/{len(targets)}] skip {target.id}: no result")
                continue

            pictogram_id = int(best["_id"])
            metadata = client.metadata(pictogram_id)
            filename = f"{pictogram_id}_{args.resolution}.png"
            local_file = OUTPUT_DIR / filename
            local_path = f"/pictograms/arasaac/{filename}"
            if not local_file.exists() or args.refresh:
                write_png_if_needed(local_file, client.download_png(pictogram_id), args.refresh)
                downloaded += 1
                action = "download"
            else:
                reused += 1
                action = "reuse"

            manifest[target.id] = {
                "id": target.id,
                "label": target.label,
                "emoji": target.emoji,
                "sourceFile": target.source_file,
                "searchText": search_text,
                "pictogramId": pictogram_id,
                "localPath": local_path,
                "description": description_for(metadata),
                "keywords": [entry.get("keyword") for entry in metadata.get("keywords", []) if entry.get("keyword")],
                "keywordMeanings": [entry.get("meaning") for entry in metadata.get("keywords", []) if entry.get("meaning")],
                "categories": metadata.get("categories", []),
                "tags": metadata.get("tags", []),
                "aac": bool(metadata.get("aac")),
                "schematic": bool(metadata.get("schematic")),
                "source": {
                    "name": "ARASAAC",
                    "url": f"https://beta.arasaac.org/pictograms/{pictogram_id}",
                    "license": "CC BY-NC-SA 4.0",
                    "author": "Sergio Palao",
                    "owner": "Government of Aragón",
                },
            }
            print(f"[{index}/{len(targets)}] {action} {target.id} -> {pictogram_id} ({search_text})")
        except (HTTPError, URLError, TimeoutError, OSError, ValueError) as exc:
            failed.append((target.id, str(exc)))
            print(f"[{index}/{len(targets)}] error {target.id}: {exc}", file=sys.stderr)

    save_manifest(manifest)

    print("\nSummary")
    print(f"  targets   : {len(targets)}")
    print(f"  downloaded: {downloaded}")
    print(f"  reused    : {reused}")
    print(f"  failed    : {len(failed)}")
    if failed:
        print("\nFailures")
        for target_id, reason in failed:
            print(f"  - {target_id}: {reason}")

    return 0 if not failed else 1


if __name__ == "__main__":
    raise SystemExit(main())
