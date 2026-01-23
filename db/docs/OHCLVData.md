# OHCLVData Collection

**Purpose**: Timeseries collection storing daily OHLCV (Open, High, Low, Close, Volume) candle data for all assets.

## Structure

- `_id`: ObjectId
- `timestamp`: Date - Candle date
- `tickerID`: String - Stock ticker symbol
- `open`: Number - Opening price
- `high`: Number - Highest price
- `low`: Number - Lowest price
- `close`: Number - Closing price
- `volume`: Number - Trading volume
- `divCash`: Number - Dividend cash amount 
- `splitFactor`: Number - Stock split factor 

**Note**: Corporate action fields (`divCash`, `splitFactor`) are only included for appropriate assets (Stocks, Funds), not for crypto.

## Example Document

[OHCLVData.example.json](./sample-data/OHCLVData.example.json)
