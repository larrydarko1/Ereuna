# Calendar Collection

**Purpose**: Halted/discontinued feature for Alpha Vantage API integration supporting earnings calendar tracking.

## Structure

This collection contains two types of documents:

### 1. Earnings Calendar Entries

Tracks upcoming earnings reports for stocks.

- `_id`: ObjectId
- `symbol`: String - Stock ticker symbol
- `reportDate`: Date - Date earnings will be reported
- `fiscalDateEnding`: Date - End date of fiscal period
- `estimate`: Number - Analyst EPS estimate
- `currency`: String - Currency code (e.g., "USD")
- `timeOfTheDay`: String - "pre-market" or "post-market"
- `type`: String - Event type (e.g., "Earnings")
- `lastUpdated`: Date - Last update timestamp

### 2. Pending Financial Updates Document

Special tracking document with fixed `_id: "pending_financial_updates"` that maintains a queue of symbols needing financial data updates.

- `_id`: String - Fixed value "pending_financial_updates"
- `symbols`: Array[String] - List of symbols pending updates
- `pendingUpdates`: Array of objects
  - `symbol`: String - Stock ticker
  - `addedAt`: Date - When symbol was added to queue
  - `attempts`: Number - Number of update attempts
  - `lastAttempt`: Date or null - Last attempt timestamp
- `createdAt`: Date - Document creation timestamp
- `lastUpdated`: Date - Last modification timestamp

## Example Documents

- Earnings Entry: [Calendar.example.json](./sample-data/Calendar.example.json)
- Pending Updates Tracker: [Calendar-PendingUpdates.example.json](./sample-data/Calendar-PendingUpdates.example.json)
