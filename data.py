"""Load and normalize the housing inventory CSV."""

import csv
from pathlib import Path

DATA_FILE = Path(__file__).parent / "raw_files" / "income-restricted-housing-inventory-2022-geocoded.csv"

VALID_PP = {
    "public": "Public",
    "private": "Private",
    "public/private": "Public/Private",
    "public/ private": "Public/Private",
}


def load_housing_data():
    """Read geocoded CSV, normalize fields, return list of dicts."""
    rows = list(csv.DictReader(DATA_FILE.open()))
    for r in rows:
        # Normalize Public/Private
        pp = (r.get("Public/ Private") or "").lower().strip()
        r["Public/ Private"] = VALID_PP.get(pp, "Private")

        # Normalize Tenure
        t = (r.get("Tenure") or "").lower().strip()
        if "ownership" in t and "rental" in t:
            r["Tenure"] = "Both"
        elif "rental" in t:
            r["Tenure"] = "Rental"
        elif "ownership" in t or "cooperative" in t:
            r["Tenure"] = "Ownership"
        else:
            r["Tenure"] = "Rental"

        # Parse numeric fields
        for key in ("TtlProjUnits", "Total Income-Restricted", "TtlMarket",
                     "RentUnits", "OwnUnits", "MarketRent", "MarketOwn",
                     "Income-Restricted Rental", "Income-Restricted Ownership"):
            try:
                r[key] = int(r.get(key, 0) or 0)
            except (ValueError, TypeError):
                r[key] = 0

    return rows


def compute_stats(rows):
    """Compute summary statistics."""
    return {
        "total_projects": len(rows),
        "total_units": sum(r["TtlProjUnits"] for r in rows),
        "restricted_units": sum(r["Total Income-Restricted"] for r in rows),
        "neighborhoods": len({r["Neighborhood"] for r in rows}),
    }


def get_filter_options(rows):
    """Get sorted unique values for filter dropdowns."""
    return {
        "neighborhoods": sorted({r["Neighborhood"] for r in rows if r["Neighborhood"]}),
        "tenures": sorted({r["Tenure"] for r in rows if r["Tenure"]}),
        "public_private": sorted({r["Public/ Private"] for r in rows if r["Public/ Private"]}),
    }
