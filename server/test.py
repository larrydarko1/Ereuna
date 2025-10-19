#!/usr/bin/env python3
"""
Simple utility to extract new IPO tickers from server/supported_tickers.csv
Filters applied:
 - exchange in {NYSE, NASDAQ, NYSE ARCA, NYSE MKT}
 - assetType includes Stock, ETF, or Mutual Fund
 - endDate exactly matches 2025-10-10

Compares the ticker column against existing symbols in MongoDB (EreunaDB.AssetInfo.Symbol)
and prints the list of tickers not yet present in the DB.

Usage: ensure `pymongo` is installed and MONGO_URI env var is set (defaults to mongodb://localhost:27017)

$ pip install pymongo
$ python server/test.py
"""

import csv
import os
from pathlib import Path
from typing import Set

try:
    from pymongo import MongoClient
except Exception as e:
    raise SystemExit("pymongo is required. Install with: pip install pymongo")

CSV_PATH = Path(__file__).resolve().parents[1] / 'server' / 'supported_tickers.csv'
TARGET_DATE = '2025-10-10'
# Accept both correct and common misspelling 'NASDAW'
ALLOWED_EXCHANGES = {"NYSE", "NASDAQ", "NYSE ARCA", "NYSE MKT"}
# Asset types: accept Stock, ETF, Mutual Fund (various spellings/casing)
ALLOWED_ASSET_TYPE_KEYWORDS = ["Stock", "ETF", "Mutual Fund"]


def normalize_header_map(row: dict) -> dict:
    """Return a new dict with lower-cased keys for robust access."""
    return {k.strip().lower(): (v.strip() if isinstance(v, str) else v) for k, v in row.items()}


def load_candidate_tickers(csv_path: Path) -> Set[str]:
    """Parse CSV and return set of tickers that match filters."""
    tickers = set()
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV not found at: {csv_path}")

    with csv_path.open(newline='', encoding='utf-8') as fh:
        reader = csv.DictReader(fh)
        for raw_row in reader:
            if not raw_row:
                continue
            row = normalize_header_map(raw_row)
            # find ticker key (expect 'ticker')
            ticker = row.get('ticker') or row.get('symbol')
            if not ticker:
                continue
            ticker = ticker.upper()

            exchange = (row.get('exchange') or '').upper()
            # normalize common misspelling
            if exchange == 'NASDAW':
                exchange = 'NASDAQ'

            # Accept only allowed exchanges
            if exchange not in {e.upper() for e in ALLOWED_EXCHANGES}:
                continue

            # asset type can be under several headers
            asset_type = (row.get('assettype') or row.get('asset type') or row.get('type') or '').upper()
            if not any(k in asset_type for k in ALLOWED_ASSET_TYPE_KEYWORDS):
                # If the cell is empty but there's a different header 'assetclass' etc, try that
                continue

            # endDate matching
            end_date = (row.get('enddate') or row.get('end date') or row.get('date') or '').strip()
            if end_date != TARGET_DATE:
                continue

            tickers.add(ticker)
    return tickers


def fetch_existing_symbols(mongo_uri: str) -> Set[str]:
    """Connect to MongoDB and return set of Symbols in EreunaDB.AssetInfo."""
    client = MongoClient(mongo_uri)
    try:
        db = client['EreunaDB']
        coll = db['AssetInfo']
        # Project only Symbol to minimize transfer
        cursor = coll.find({}, { 'Symbol': 1, '_id': 0 })
        symbols = { (doc.get('Symbol') or '').upper() for doc in cursor }
        return symbols
    finally:
        client.close()


def main():
    csv_path = CSV_PATH
    print(f"Reading CSV: {csv_path}")
    try:
        candidates = load_candidate_tickers(csv_path)
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return

    print(f"Found {len(candidates)} candidate tickers from CSV (after filtering)")

    mongo_uri = os.environ.get('MONGO_URI') or os.environ.get('MONGODB_URI') or 'mongodb://localhost:27017'
    print(f"Connecting to MongoDB: {mongo_uri.split('@')[-1] if '@' in mongo_uri else mongo_uri}")
    try:
        existing = fetch_existing_symbols(mongo_uri)
    except Exception as e:
        print(f"Error connecting to MongoDB or fetching symbols: {e}")
        return

    print(f"Found {len(existing)} existing symbols in AssetInfo collection")

    new_ipos = sorted(candidates - existing)

    print("\n=== NEW IPOS TO ADD ===")
    if not new_ipos:
        print("(none)")
    else:
        for s in new_ipos:
            print(s)
    print("=== END ===\n")


if __name__ == '__main__':
    main()
