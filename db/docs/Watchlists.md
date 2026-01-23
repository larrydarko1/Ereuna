# Watchlists Collection

**Purpose**: Stores user-created watchlists for tracking groups of stocks and assets.

## Structure

- `_id`: ObjectId
- `Name`: String - Watchlist name
- `UsernameID`: String - Watchlist owner
- `List`: Array of objects - Asset entries
  - `ticker`: String - Stock symbol
  - `exchange`: String - Exchange code (e.g., "NASDAQ", "NYSE")
- `createdAt`: Date - Creation timestamp
- `lastUpdated`: Date - Last modification timestamp

## Example Document

[Watchlists.example.json](./sample-data/Watchlists.example.json)
