# FinancialUpdatesProgress Collection

**Purpose**: Stores a single tracking document for failed financial data updates related to the discontinued AlphaVantage API integration plan. Used to identify symbols needing manual aggregation or retry attempts.

## Structure

This collection contains a single document with fixed `_id: "failed_updates"` that tracks symbols where API updates failed.

- `_id`: String - Fixed value "failed_updates"
- `symbols`: Array[String] - List of symbols with failed updates
- `failedUpdates`: Array of objects
  - `symbol`: String - Stock ticker
  - `error`: String - Initial error message
  - `failedAt`: Date - When first failure occurred
  - `attempts`: Number - Number of retry attempts
  - `lastError`: String - Most recent error message
  - `lastFailedAt`: Date - Most recent failure timestamp
- `createdAt`: Date - Document creation timestamp
- `lastUpdated`: Date - Last modification timestamp

## Example Document

[FinancialUpdatesProgress.example.json](./sample-data/FinancialUpdatesProgress.example.json)
