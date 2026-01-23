# Positions Collection

**Purpose**: Stores active positions for users' portfolio simulations. Each document represents an open position in a specific portfolio.

## Structure

- `_id`: ObjectId
- `Username`: String - Portfolio owner
- `PortfolioNumber`: Number - Portfolio index (0-9)
- `Symbol`: String - Stock ticker symbol
- `Shares`: Number - Number of shares held
- `AvgPrice`: Number - Average entry price per share
- `Leverage`: Number - Leverage multiplier applied to position (1 is no leverage, up to 10x)
- `IsShort`: Boolean - Whether this is a short position

## Example Document

[Positions.example.json](./sample-data/Positions.example.json)
