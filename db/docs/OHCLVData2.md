# OHCLVData2 Collection

**Purpose**: Timeseries collection storing weekly OHLCV (Open, High, Low, Close, Volume) candle data for all assets.

## Structure

- `_id`: ObjectId
- `timestamp`: Date - Week start date
- `tickerID`: String - Stock ticker symbol
- `open`: Number - Opening price
- `high`: Number - Highest price
- `low`: Number - Lowest price
- `close`: Number - Closing price
- `volume`: Number - Trading volume

**Note**: This collection does not support corporate action fields (no `divCash` or `splitFactor`).

## Example Document

[OHCLVData2.example.json](./sample-data/OHCLVData2.example.json)
