# Screeners Collection

**Purpose**: Stores custom screener configurations for each user. Each screener contains filter criteria to search for assets matching specific fundamental, technical, and market conditions.

## Structure

### Basic Fields

- `_id`: ObjectId
- `Name`: String - Screener name (1-20 characters)
- `UsernameID`: String - Owner's username
- `Include`: Boolean - Whether to include this screener in combined results
- `CreatedAt`: Date - Creation timestamp

### Price & Valuation Filters

All numeric ranges are `[min, max]` arrays.

- `Price`: [Number, Number] - Price range
- `MarketCap`: [Number, Number] - Market capitalization range
- `PE`: [Number, Number] - Price-to-Earnings ratio
- `ForwardPE`: [Number, Number] - Forward P/E ratio
- `PEG`: [Number, Number] - Price/Earnings to Growth ratio
- `EPS`: [Number, Number] - Earnings per share
- `PS`: [Number, Number] - Price-to-Sales ratio
- `PB`: [Number, Number] - Price-to-Book ratio
- `Beta`: [Number, Number] - Beta coefficient
- `EV`: [Number, Number] - Enterprise value
- `IV`: [Number, Number] - Intrinsic value

### Profitability & Financial Health

- `ROE`: [Number, Number] - Return on Equity (%)
- `ROA`: [Number, Number] - Return on Assets (%)
- `currentRatio`: [Number, Number] - Current ratio
- `assetsCurrent`: [Number, Number] - Current assets
- `liabilitiesCurrent`: [Number, Number] - Current liabilities
- `debtCurrent`: [Number, Number] - Current debt
- `cashAndEq`: [Number, Number] - Cash and equivalents
- `freeCashFlow`: [Number, Number] - Free cash flow
- `profitMargin`: [Number, Number] - Profit margin (%)
- `grossMargin`: [Number, Number] - Gross margin (%)
- `debtEquity`: [Number, Number] - Debt-to-Equity ratio
- `bookVal`: [Number, Number] - Book value

### Growth Metrics

- `EPSQoQ`: [Number, Number] - EPS quarter-over-quarter growth (%)
- `EPSYoY`: [Number, Number] - EPS year-over-year growth (%)
- `EarningsQoQ`: [Number, Number] - Earnings QoQ growth (%)
- `EarningsYoY`: [Number, Number] - Earnings YoY growth (%)
- `RevQoQ`: [Number, Number] - Revenue QoQ growth (%)
- `RevYoY`: [Number, Number] - Revenue YoY growth (%)
- `CAGR`: [Number, Number] - Compound Annual Growth Rate (%)

### Dividend & Income

- `DivYield`: [Number, Number] - Dividend yield (%)

### Volume & Liquidity

- `AvgVolume1W`: [Number, Number] - Average volume 1 week
- `AvgVolume1M`: [Number, Number] - Average volume 1 month
- `AvgVolume6M`: [Number, Number] - Average volume 6 months
- `AvgVolume1Y`: [Number, Number] - Average volume 1 year
- `RelVolume1W`: [Number, Number] - Relative volume 1 week
- `RelVolume1M`: [Number, Number] - Relative volume 1 month
- `RelVolume6M`: [Number, Number] - Relative volume 6 months
- `RelVolume1Y`: [Number, Number] - Relative volume 1 year

### Relative Strength & Volatility

- `RSScore1W`: [Number, Number] - Relative Strength score 1 week (0-100)
- `RSScore1M`: [Number, Number] - Relative Strength score 1 month (0-100)
- `RSScore4M`: [Number, Number] - Relative Strength score 4 months (0-100)
- `ADV1W`: [Number, Number] - Average Daily Volatility 1 week
- `ADV1M`: [Number, Number] - Average Daily Volatility 1 month
- `ADV4M`: [Number, Number] - Average Daily Volatility 4 months
- `ADV1Y`: [Number, Number] - Average Daily Volatility 1 year

### Technical Indicators

- `RSI`: [Number, Number] - Relative Strength Index (0-100)
- `Gap`: [Number, Number] - Gap percentage
- `changePerc`: [Number, Number, String[]?] - Price change percentage with optional timeframe array (e.g., ["1D", "1W", "1M"])

### Price Performance

- `NewHigh`: Array - New high filters (e.g., ["52W", "ATH", "1M", "3M"])
- `NewLow`: Array - New low filters (e.g., ["52W", "ATL", "1M", "3M"])
- `MA200`: Array - Moving average 200 relationship (e.g., ["above", "below", "crossing_above", "crossing_below"])
- `MA50`: Array - Moving average 50 relationship
- `MA20`: Array - Moving average 20 relationship
- `MA10`: Array - Moving average 10 relationship
- `CurrentPrice`: Array - Current price vs. moving averages
- `PercOffWeekHigh`: [Number, Number] - Percentage off 52-week high
- `PercOffWeekLow`: [Number, Number] - Percentage off 52-week low

### Classification Filters

- `AssetTypes`: Array[String] - Asset types (e.g., ["Stock", "ETF", "Mutual Fund", "Crypto"])
- `Sectors`: Array[String] - Sector names (e.g., ["Technology", "Healthcare"])
- `Exchanges`: Array[String] - Exchange codes (e.g., ["NASDAQ", "NYSE"])
- `Countries`: Array[String] - Country codes (e.g., ["US", "GB"])
- `IPO`: [Number, Number] - Days since IPO range

### Fund-Specific Filters

- `FundFamilies`: Array[String] - Fund family names (ETF/Mutual Fund only)
- `FundCategories`: Array[String] - Fund categories (ETF/Mutual Fund only)
- `NetExpenseRatio`: [Number, Number] - Net expense ratio range (%)

### AI & Recommendations

- `AIRecommendations`: Array[String] - AI recommendation values (e.g., ["Strong Buy", "Buy", "Hold", "Sell", "Strong Sell"])

## Example Document

[Screeners.example.json](./sample-data/Screeners.example.json)

## Notes

- Most numeric filters are optional `[min, max]` ranges
- String array filters support multiple selections
- Moving average filters accept relationship descriptors
- Empty or null values indicate no filter applied for that criterion
- Each user can have up to 20 screeners
- Screeners with `Include: true` are combined in aggregate results (multi-screener)
