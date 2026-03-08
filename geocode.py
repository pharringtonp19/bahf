#!/usr/bin/env python3
"""
Geocode Boston affordable housing projects using Google Geocoding API.
Reads the raw CSV, looks up coordinates for each project, and writes an enriched CSV.
Results are cached to disk so you can resume/re-run without re-querying.
"""

import csv
import json
import os
import re
import sys
import time
import urllib.request
import urllib.parse
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

API_KEY = os.getenv("GOOGLE_GEOCODING_API_KEY")
if not API_KEY:
    print("Error: GOOGLE_GEOCODING_API_KEY not found in .env")
    sys.exit(1)

INPUT_CSV = Path(__file__).parent / "raw_files" / "income-restricted-housing-inventory-2022.csv"
OUTPUT_CSV = Path(__file__).parent / "raw_files" / "income-restricted-housing-inventory-2022-geocoded.csv"
CACHE_FILE = Path(__file__).parent / "raw_files" / "geocode_cache_google.json"

# Bounding box for Boston metro area
BOSTON_BOUNDS = {
    "lat_min": 42.22, "lat_max": 42.40,
    "lon_min": -71.19, "lon_max": -70.92,
}


def in_boston(lat, lon):
    return (BOSTON_BOUNDS["lat_min"] <= lat <= BOSTON_BOUNDS["lat_max"] and
            BOSTON_BOUNDS["lon_min"] <= lon <= BOSTON_BOUNDS["lon_max"])


def load_cache():
    if CACHE_FILE.exists():
        return json.loads(CACHE_FILE.read_text())
    return {}


def save_cache(cache):
    CACHE_FILE.write_text(json.dumps(cache, indent=2))


def google_geocode(query):
    """Call Google Geocoding API. Returns (lat, lon, formatted_address) or None."""
    params = urllib.parse.urlencode({
        "address": query,
        "key": API_KEY,
        "components": "administrative_area:MA|country:US",
    })
    url = f"https://maps.googleapis.com/maps/api/geocode/json?{params}"
    try:
        with urllib.request.urlopen(url) as resp:
            data = json.loads(resp.read())
        if data["status"] == "OK" and data["results"]:
            loc = data["results"][0]["geometry"]["location"]
            addr = data["results"][0]["formatted_address"]
            return loc["lat"], loc["lng"], addr
    except Exception as e:
        print(f"    API error: {e}")
    return None


def clean_name(name):
    """Strip x-masked numbers, phase info, parentheticals for better search."""
    # "x Rockland Avenue" -> "Rockland Avenue"
    # "xxxx Blue Hill Ave" -> "Blue Hill Ave"
    cleaned = re.sub(r'^x+\s+', '', name)
    # Remove parenthetical suffixes like "(Phase I)" or "(2-14, ...)"
    cleaned = re.sub(r'\s*\(.*?\)\s*', ' ', cleaned)
    # Remove trailing phase info
    cleaned = re.sub(r'\s+Phase\s+[A-Za-z0-9]+$', '', cleaned, flags=re.IGNORECASE)
    return cleaned.strip()


def build_queries(row):
    """Generate queries from most to least specific."""
    name = row["Project_Name"].strip()
    neighborhood = row["Neighborhood"].strip()
    zip_code = row["Zip Code"].strip()
    cleaned = clean_name(name)

    queries = []

    # 1. Full name + neighborhood + zip
    queries.append(f"{cleaned}, {neighborhood}, Boston, MA {zip_code}")
    # 2. Full name + Boston + zip
    queries.append(f"{cleaned}, Boston, MA {zip_code}")
    # 3. Full name + Boston only
    queries.append(f"{cleaned}, Boston, MA")
    # 4. If name has a slash (two streets), try first part as address
    if "/" in cleaned:
        first_part = cleaned.split("/")[0].strip()
        queries.append(f"{first_part}, {neighborhood}, Boston, MA {zip_code}")

    return queries


def geocode_project(row, cache):
    """Try to geocode a project. Returns (lat, lon, address, quality) or (None, None, None, 'failed')."""
    queries = build_queries(row)
    quality_labels = ["full_match", "city_zip", "city_only", "partial_street"]

    for i, query in enumerate(queries):
        if query in cache:
            entry = cache[query]
            if entry and in_boston(entry["lat"], entry["lon"]):
                quality = quality_labels[min(i, len(quality_labels) - 1)]
                return entry["lat"], entry["lon"], entry.get("address", ""), quality
            continue

        result = google_geocode(query)
        if result:
            lat, lon, addr = result
            cache[query] = {"lat": lat, "lon": lon, "address": addr}
            if in_boston(lat, lon):
                quality = quality_labels[min(i, len(quality_labels) - 1)]
                return lat, lon, addr, quality
        else:
            cache[query] = None

        time.sleep(0.05)  # Light rate limiting (Google allows 50 req/s)

    return None, None, None, "failed"


def main():
    rows = list(csv.DictReader(INPUT_CSV.open()))
    cache = load_cache()
    total = len(rows)
    success = 0
    failed_projects = []

    print(f"Geocoding {total} projects using Google Geocoding API...")
    print(f"Cache has {len(cache)} entries from previous runs.\n")

    for i, row in enumerate(rows):
        name = row["Project_Name"]
        lat, lon, addr, quality = geocode_project(row, cache)
        row["Latitude"] = lat or ""
        row["Longitude"] = lon or ""
        row["Geocoded_Address"] = addr or ""
        row["Geocode_Quality"] = quality

        if lat:
            success += 1
            status = f"OK ({quality})"
        else:
            failed_projects.append(name)
            status = "FAILED"

        # Flush output so progress is visible
        print(f"  [{i+1}/{total}] {status}: {name}", flush=True)

        # Save cache periodically
        if (i + 1) % 50 == 0:
            save_cache(cache)
            print(f"  --- Cache saved ({success}/{i+1} successful so far) ---", flush=True)

    save_cache(cache)

    # Write output
    fieldnames = list(rows[0].keys())
    with OUTPUT_CSV.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nDone! {success}/{total} projects geocoded successfully.")
    print(f"Output: {OUTPUT_CSV}")

    if failed_projects:
        print(f"\n{len(failed_projects)} projects could not be geocoded:")
        for name in failed_projects:
            print(f"  - {name}")


if __name__ == "__main__":
    main()
