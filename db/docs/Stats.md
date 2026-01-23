# Stats Collection

**Purpose**: Stores system-wide statistics and configuration data. Contains 3 distinct document types identified by their `_id` values.

## Document Types

### 1. Market Statistics Document (`_id: "marketStats"`)

Stores aggregated market data and analytics for the main dashboard.

**Structure:**

- `_id`: String - Fixed value "marketStats"
- `updatedAt`: Date - Last update timestamp

**Moving Average Statistics:**
- `SMA5`, `SMA10`, `SMA20`, `SMA50`, `SMA100`, `SMA150`, `SMA200`: Object
  - Each contains breakdowns by asset category:
    - `ALL`: { `up`: Number, `down`: Number } - Percentage above/below MA
    - `Stock`: { `up`: Number, `down`: Number }
    - `ETF`: { `up`: Number, `down`: Number }
    - `Mutual Fund`: { `up`: Number, `down`: Number }
    - `OTC`: { `up`: Number, `down`: Number }
    - `PINK`: { `up`: Number, `down`: Number }
    - `Crypto`: { `up`: Number, `down`: Number }

**Industry & Sector Rankings:**
- `industryTierList`: Array of objects
  - `industry`: String - Industry name
  - `avgRSScore`: Number - Average relative strength score
  - `count`: Number - Number of assets in industry
- `sectorTierList`: Array of objects
  - `sector`: String - Sector name
  - `avgRSScore`: Number - Average relative strength score
  - `count`: Number - Number of assets in sector

**Index Performance:**
- `indexPerformance`: Object with major indices
  - Each index (e.g., `SPY`, `QQQ`, `DIA`, `IWM`, `EEM`, `EFA`):
    - `1W`: Number - 1-week return
    - `1M`: Number - 1-month return
    - `3M`: Number - 3-month return
    - `6M`: Number - 6-month return
    - `1Y`: Number - 1-year return
    - `YTD`: Number - Year-to-date return

**Market Movers:**
- `top10DailyGainers`: Array of objects
  - `Symbol`: String - Ticker symbol
  - `daily_return`: Number - Daily return percentage
- `top10DailyLosers`: Array of objects
  - `Symbol`: String - Ticker symbol
  - `daily_return`: Number - Daily return percentage (negative)

**Valuation Lists:**
- `top10Overvalued`: Array - Most overvalued assets
- `top10Undervalued`: Array - Most undervalued assets

**Market Breadth:**
- `advanceDecline`: Object
  - `advancing`: Number - Percentage advancing
  - `declining`: Number - Percentage declining
  - `unchanged`: Number - Percentage unchanged
- `newHighsLows`: Object - New highs and lows statistics
- `marketOutlook`: Object - Overall market outlook data

### 2. VAT Rates Document (`_id: "vat_rates"`)

Discontinued/testing document for VAT rates from when the project planned to become a commercial service.

**Structure:**

- `_id`: String - Fixed value "vat_rates"
- `countries`: Array of objects
  - `code`: String - ISO 2-letter country code (e.g., "AT", "BE")
  - `name`: String - Country name
  - `vat`: Number - VAT rate as decimal (e.g., 0.2 = 20%)
- `lastUpdated`: Date - Last update timestamp

### 3. Holidays Document (`_id: "Holidays"`)

Stores US market holidays for trading calendar functionality.

**Structure:**

- `_id`: String - Fixed value "Holidays"
- `Holidays`: Array of objects
  - `date`: String - Holiday date in YYYY-MM-DD format
  - `name`: String - Holiday name (e.g., "Thanksgiving", "Christmas")

## Example Documents

- Market Statistics: [Stats-marketStats.example.json](./sample-data/Stats-marketStats.example.json)
- VAT Rates: [Stats-vat_rates.example.json](./sample-data/Stats-vat_rates.example.json)
- Holidays: [Stats-Holidays.example.json](./sample-data/Stats-Holidays.example.json)

## Notes

- This collection stores exactly 3 documents with fixed `_id` values
- `marketStats` is updated daily by aggregator microservice
- `vat_rates` is discontinued but remains for reference
- `Holidays` tracks US market closures (NYSE/NASDAQ calendar)
