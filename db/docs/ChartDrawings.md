# ChartDrawings Collection

**Purpose**: Stores chart drawing features (trend lines, boxes, annotations, etc.) for each user and symbol, related to the TradingView Lightweight Charts fork.

## Structure

Each document represents a user's drawings for a specific symbol and timeframe.

### Basic Fields

- `_id`: ObjectId
- `symbol`: String - Stock ticker symbol
- `timeframe`: String - Chart timeframe (e.g., "daily")
- `user`: String - Username
- `createdAt`: Date - Document creation timestamp
- `updatedAt`: Date - Last modification timestamp

### Drawing Arrays

All drawing types are stored as arrays that can contain multiple items:

- `trendLines`: Array - Line drawings connecting two points
- `boxes`: Array - Rectangle/box drawings
- `priceLevels`: Array - Horizontal price level lines
- `textAnnotations`: Array - Text notes on the chart
- `freehandPaths`: Array - Free-form drawings

### Trend Line Object Structure

Each trend line in the `trendLines` array contains:

- `id`: String - Unique identifier (e.g., "tl_1767466023652_dlqk28hxh")
- `point1`: Object - First endpoint
  - `time`: String - Date in YYYY-MM-DD format
  - `price`: Number - Price value at this point
  - `x`: Number - Canvas x-coordinate
  - `y`: Number - Canvas y-coordinate
- `point2`: Object - Second endpoint (same structure as point1)
- `color`: String - Hex color code (e.g., "#a9b1d6")
- `lineWidth`: Number - Line thickness
- `lineStyle`: String - Line style (e.g., "solid")
- `locked`: Boolean - Whether drawing is locked from editing
- `extended`: Boolean - Whether line extends beyond endpoints

## Example Document

[ChartDrawings.example.json](./sample-data/ChartDrawings.example.json)
