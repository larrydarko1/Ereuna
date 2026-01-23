# OHCLVData1m Collection

**Purpose**: Timeseries collection storing 1-minute intraday OHLCV (Open, High, Low, Close, Volume) candle data for all assets.

## Structure

- `_id`: ObjectId
- `timestamp`: Date - Minute timestamp
- `tickerID`: String - Stock ticker symbol
- `open`: Number - Opening price
- `high`: Number - Highest price
- `low`: Number - Lowest price
- `close`: Number - Closing price
- `volume`: Number - Trading volume

## Example Document

[OHCLVData1m.example.json](./sample-data/OHCLVData1m.example.json)
