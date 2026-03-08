"""Audit the housing inventory data for quality and completeness."""

from data import load_housing_data


def run_audit(rows=None):
    """Run all audit checks, return results dict."""
    if rows is None:
        rows = load_housing_data()

    results = {
        "summary": audit_summary(rows),
        "geocoding": audit_geocoding(rows),
        "numeric": audit_numeric(rows),
        "completeness": audit_completeness(rows),
        "neighborhoods": audit_neighborhoods(rows),
        "duplicates": audit_duplicates(rows),
    }
    results["pass_count"] = sum(1 for r in results.values() if isinstance(r, dict) and r.get("status") == "pass")
    results["warn_count"] = sum(1 for r in results.values() if isinstance(r, dict) and r.get("status") == "warn")
    results["fail_count"] = sum(1 for r in results.values() if isinstance(r, dict) and r.get("status") == "fail")
    results["total_checks"] = results["pass_count"] + results["warn_count"] + results["fail_count"]
    return results


def audit_summary(rows):
    """Basic dataset summary."""
    return {
        "status": "pass",
        "title": "Dataset Summary",
        "total_rows": len(rows),
        "detail": f"{len(rows)} projects loaded from CSV.",
    }


def audit_geocoding(rows):
    """Check geocoding coverage and quality."""
    geocoded = [r for r in rows if r.get("Latitude") and r.get("Longitude")]
    missing = [r for r in rows if not r.get("Latitude") or not r.get("Longitude")]

    quality_counts = {}
    for r in geocoded:
        q = r.get("Geocode_Quality", "unknown")
        quality_counts[q] = quality_counts.get(q, 0) + 1

    pct = len(geocoded) / len(rows) * 100 if rows else 0
    status = "pass" if pct >= 99 else "warn" if pct >= 95 else "fail"

    return {
        "status": status,
        "title": "Geocoding Coverage",
        "geocoded": len(geocoded),
        "missing": len(missing),
        "missing_projects": [r["Project_Name"] for r in missing],
        "pct": round(pct, 1),
        "quality_breakdown": quality_counts,
        "detail": f"{len(geocoded)}/{len(rows)} projects geocoded ({pct:.1f}%). {len(missing)} missing.",
    }


def audit_numeric(rows):
    """Check that unit counts are consistent."""
    issues = []
    for r in rows:
        name = r["Project_Name"]
        total = r["TtlProjUnits"]
        restricted = r["Total Income-Restricted"]
        market = r["TtlMarket"]

        # Restricted + market should equal total
        if restricted + market != total:
            issues.append({
                "project": name,
                "issue": f"Restricted ({restricted}) + Market ({market}) = {restricted + market}, but Total = {total}",
            })

        # No negative numbers
        for key in ("TtlProjUnits", "Total Income-Restricted", "TtlMarket"):
            if r[key] < 0:
                issues.append({"project": name, "issue": f"{key} is negative ({r[key]})"})

        # Restricted shouldn't exceed total
        if restricted > total and total > 0:
            issues.append({
                "project": name,
                "issue": f"Restricted units ({restricted}) exceed total units ({total})",
            })

    status = "pass" if not issues else "warn" if len(issues) < 10 else "fail"
    return {
        "status": status,
        "title": "Numeric Consistency",
        "issue_count": len(issues),
        "issues": issues[:20],
        "detail": f"{len(issues)} numeric inconsistencies found." if issues else "All unit counts are consistent.",
    }


def audit_completeness(rows):
    """Check for missing required fields."""
    required = ["Project_Name", "Neighborhood", "Zip Code", "TtlProjUnits", "Tenure", "Public/ Private"]
    missing_by_field = {}

    for r in rows:
        for field in required:
            val = r.get(field)
            if val is None or (isinstance(val, str) and not val.strip()) or val == 0:
                if field not in missing_by_field:
                    missing_by_field[field] = []
                missing_by_field[field].append(r["Project_Name"])

    total_missing = sum(len(v) for v in missing_by_field.values())
    status = "pass" if total_missing == 0 else "warn" if total_missing < 20 else "fail"

    field_summary = {k: len(v) for k, v in missing_by_field.items()}

    return {
        "status": status,
        "title": "Field Completeness",
        "missing_by_field": field_summary,
        "total_missing": total_missing,
        "detail": f"{total_missing} missing values across {len(missing_by_field)} fields." if total_missing else "All required fields populated.",
    }


def audit_neighborhoods(rows):
    """Check neighborhood distribution."""
    hood_counts = {}
    for r in rows:
        h = r["Neighborhood"]
        hood_counts[h] = hood_counts.get(h, 0) + 1

    sorted_hoods = sorted(hood_counts.items(), key=lambda x: -x[1])
    empty_hoods = [h for h, c in hood_counts.items() if not h.strip()]

    return {
        "status": "pass" if not empty_hoods else "warn",
        "title": "Neighborhood Distribution",
        "neighborhood_count": len(hood_counts),
        "distribution": sorted_hoods,
        "empty_neighborhood_count": len(empty_hoods),
        "detail": f"{len(hood_counts)} neighborhoods. Top: {sorted_hoods[0][0]} ({sorted_hoods[0][1]} projects).",
    }


def audit_duplicates(rows):
    """Check for duplicate project names."""
    name_counts = {}
    for r in rows:
        name = r["Project_Name"]
        name_counts[name] = name_counts.get(name, 0) + 1

    dupes = {k: v for k, v in name_counts.items() if v > 1}
    status = "pass" if not dupes else "warn"

    return {
        "status": status,
        "title": "Duplicate Detection",
        "duplicate_count": len(dupes),
        "duplicates": dupes,
        "detail": f"{len(dupes)} duplicate project names found." if dupes else "No duplicate project names.",
    }


if __name__ == "__main__":
    results = run_audit()
    print(f"\nAudit complete: {results['pass_count']} pass, {results['warn_count']} warn, {results['fail_count']} fail\n")
    for key in ("summary", "geocoding", "numeric", "completeness", "neighborhoods", "duplicates"):
        r = results[key]
        icon = {"pass": "PASS", "warn": "WARN", "fail": "FAIL"}[r["status"]]
        print(f"[{icon}] {r['title']}: {r['detail']}")
