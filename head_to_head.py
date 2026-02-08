#!/usr/bin/env python3
"""Head-to-head comparison: Cole Hocker vs Cooper Teare using World Athletics proxy API."""

import requests
from collections import defaultdict

BASE = "https://worldathletics.nimarion.de"


def search_athlete(name: str) -> dict:
    """Search for an athlete by name, return best match."""
    resp = requests.get(f"{BASE}/athletes/search", params={"name": name})
    resp.raise_for_status()
    results = resp.json()
    if not results:
        raise ValueError(f"No results for '{name}'")
    # Best match = lowest levenshtein distance
    best = min(results, key=lambda x: x.get("levenshteinDistance", 999))
    print(f"  Found: {best['firstname']} {best['lastname']} (ID: {best['id']}, {best['country']})")
    return best


def get_results(athlete_id: int, year: int = None) -> list:
    """Fetch competition results for an athlete, optionally filtered by year."""
    params = {}
    if year:
        params["year"] = year
    resp = requests.get(f"{BASE}/athletes/{athlete_id}/results", params=params)
    resp.raise_for_status()
    return resp.json()


def build_race_index(results: list, athlete_name: str) -> dict:
    """
    Build an index of races keyed by (date, discipline, competition_name).
    Returns dict mapping key -> {mark, place, competition, ...}
    """
    index = {}
    for r in results:
        # The API returns results as Performance objects
        # Key on date + discipline + competition to match shared races
        date = r.get("date", "")
        discipline = r.get("discipline", "")
        comp = r.get("competition", "")
        # Some results have nested competition info
        if isinstance(comp, dict):
            comp_name = comp.get("name", "")
        else:
            comp_name = str(comp)

        key = (date, discipline, comp_name)
        index[key] = {
            "mark": r.get("mark", ""),
            "place": r.get("place", ""),
            "venue": r.get("venue", r.get("location", "")),
            "wind": r.get("wind", ""),
            "competition": comp_name,
            "discipline": discipline,
            "date": date,
            "athlete": athlete_name,
        }
    return index


def find_head_to_head(results_a: list, name_a: str, results_b: list, name_b: str) -> list:
    """Find races where both athletes competed, return sorted head-to-head list."""
    index_a = build_race_index(results_a, name_a)
    index_b = build_race_index(results_b, name_b)

    shared_keys = set(index_a.keys()) & set(index_b.keys())
    matchups = []
    for key in shared_keys:
        a = index_a[key]
        b = index_b[key]

        # Determine winner by place (lower = better)
        try:
            place_a = int(a["place"]) if a["place"] else 999
            place_b = int(b["place"]) if b["place"] else 999
        except (ValueError, TypeError):
            place_a, place_b = 999, 999

        if place_a < place_b:
            winner = name_a
        elif place_b < place_a:
            winner = name_b
        else:
            winner = "Tie"

        matchups.append({
            "date": a["date"],
            "discipline": a["discipline"],
            "competition": a["competition"],
            "venue": a["venue"],
            f"{name_a}_mark": a["mark"],
            f"{name_a}_place": a["place"],
            f"{name_b}_mark": b["mark"],
            f"{name_b}_place": b["place"],
            "winner": winner,
        })

    matchups.sort(key=lambda x: x["date"])
    return matchups


def print_results(matchups: list, name_a: str, name_b: str):
    """Pretty-print head-to-head results."""
    if not matchups:
        print("\nNo shared races found in available results.")
        return

    wins = defaultdict(int)
    for m in matchups:
        wins[m["winner"]] += 1

    print(f"\n{'='*80}")
    print(f"  HEAD-TO-HEAD: {name_a} vs {name_b}")
    print(f"  Record: {name_a} {wins.get(name_a, 0)} - {wins.get(name_b, 0)} {name_b}")
    if wins.get("Tie", 0):
        print(f"  Ties: {wins['Tie']}")
    print(f"  Total shared races: {len(matchups)}")
    print(f"{'='*80}\n")

    for i, m in enumerate(matchups, 1):
        print(f"  Race {i}: {m['date']}  |  {m['discipline']}  |  {m['competition']}")
        if m["venue"]:
            print(f"          Venue: {m['venue']}")
        print(f"          {name_a}: {m[f'{name_a}_mark']}  (place: {m[f'{name_a}_place']})")
        print(f"          {name_b}: {m[f'{name_b}_mark']}  (place: {m[f'{name_b}_place']})")
        print(f"          Winner: {m['winner']}")
        print()


def main():
    print("Searching for athletes...\n")
    hocker = search_athlete("Cole Hocker")
    teare = search_athlete("Cooper Teare")

    name_a = f"{hocker['firstname']} {hocker['lastname']}"
    name_b = f"{teare['firstname']} {teare['lastname']}"

    print(f"\nFetching all results for {name_a}...")
    results_a = get_results(hocker["id"])
    print(f"  Got {len(results_a)} results")

    print(f"Fetching all results for {name_b}...")
    results_b = get_results(teare["id"])
    print(f"  Got {len(results_b)} results")

    matchups = find_head_to_head(results_a, name_a, results_b, name_b)
    print_results(matchups, name_a, name_b)

    # Also dump raw keys for debugging if no matches found
    if not matchups:
        print("\n--- DEBUG: Sample keys from each athlete ---")
        idx_a = build_race_index(results_a, name_a)
        idx_b = build_race_index(results_b, name_b)
        print(f"\n{name_a} sample keys (first 5):")
        for k in list(idx_a.keys())[:5]:
            print(f"  {k}")
        print(f"\n{name_b} sample keys (first 5):")
        for k in list(idx_b.keys())[:5]:
            print(f"  {k}")


if __name__ == "__main__":
    main()
