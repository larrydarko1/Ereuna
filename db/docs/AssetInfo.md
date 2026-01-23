# AssetInfo Collection

**Purpose**: Stores metadata and fundamental data for all assets in the database (stocks, ETFs, mutual funds, crypto).

## Structure

Schema varies by asset type. Fields for Stock type:

### Basic Information
- `_id`: ObjectId
- `Symbol`: String - Ticker symbol
- `AssetType`: String - "Stock", "ETF", "Mutual Fund", or "Crypto"
- `Name`: String - Full company/asset name
- `Description`: String - Asset description
- `Exchange`: String - Trading exchange (e.g., "NASDAQ", "NYSE")
- `Currency`: String - Trading currency
- `Country`: String - Country of incorporation
- `Sector`: String - Business sector
- `Industry`: String - Industry classification
- `Address`: String - Company headquarters address
- `ISIN`: String - International Securities Identification Number
- `IPO`: Date - Initial public offering date
- `companyWebsite`: String - Company website URL
- `Delisted`: Boolean - Whether asset is still trading

### Market Data
- `MarketCapitalization`: Number - Market cap in currency units
- `SharesOutstanding`: Long - Total shares outstanding
- `PERatio`: Number - Price-to-earnings ratio
- `PEGRatio`: Number - Price/earnings to growth ratio
- `BookValue`: Number - Book value per share
- `DividendYield`: Number - Annual dividend yield (decimal)
- `EPS`: Number - Earnings per share
- `PriceToSalesRatioTTM`: Number - Price-to-sales ratio (trailing twelve months)
- `PriceToBookRatio`: Number - Price-to-book ratio
- `DividendDate`: Date - Last dividend payment date
- `EV`: Long - Enterprise value
- `PriceToSalesRatio`: Number - Current price-to-sales ratio
- `fiftytwoWeekHigh`: Number - 52-week high price
- `fiftytwoWeekLow`: Number - 52-week low price
- `AlltimeHigh`: Number - All-time high price
- `AlltimeLow`: Number - All-time low price
- `PriceTarget`: Number - Analyst price target
- `IntrinsicValue`: Number - Calculated intrinsic value
- `CAGR`: Number - Compound annual growth rate
- `CAGRYears`: Number - Years of CAGR calculation

### Volume / Volatility Metrics
- `AvgVolume1M`: Number - Average volume over 1 month
- `AvgVolume1W`: Number - Average volume over 1 week
- `AvgVolume1Y`: Number - Average volume over 1 year
- `AvgVolume6M`: Number - Average volume over 6 months
- `RelVolume1M`: Number - Relative volume 1 month
- `RelVolume1W`: Number - Relative volume 1 week
- `RelVolume1Y`: Number - Relative volume 1 year
- `RelVolume6M`: Number - Relative volume 6 months
- `ADV1M`: Number - Average daily volatiliy percentage 1 month
- `ADV1W`: Number - Average daily volatiliy percentage 1 week
- `ADV1Y`: Number - Average daily volatiliy percentage 1 year
- `ADV4M`: Number - Average daily volatiliy percentage 4 months

### Technical Indicators
- `MA10`: Number - 10-day moving average
- `MA20`: Number - 20-day moving average
- `MA50`: Number - 50-day moving average
- `MA100`: Number - 100-day moving average
- `MA200`: Number - 200-day moving average
- `RSScore1W`: Number - Relative strength score 1 week (1-100)
- `RSScore1M`: Number - Relative strength score 1 month (1-100)
- `RSScore4M`: Number - Relative strength score 4 months (1-100)
- `RSI`: Number - Relative strength index
- `Gap`: Number - Gap percentage

### Performance Metrics
- `percoff52WeekHigh`: Number - Percentage off 52-week high (decimal)
- `percoff52WeekLow`: Number - Percentage off 52-week low (decimal)
- `1mchange`: Number - 1 month price change (decimal)
- `1ychange`: Number - 1 year price change (decimal)
- `4mchange`: Number - 4 month price change (decimal)
- `6mchange`: Number - 6 month price change (decimal)
- `todaychange`: Number - Today's price change (decimal)
- `weekchange`: Number - Week's price change (decimal)
- `ytdchange`: Number - Year-to-date change (decimal)
- `percentage_change_1w`: Number - 1 week percentage change
- `percentage_change_1m`: Number - 1 month percentage change
- `percentage_change_4m`: Number - 4 month percentage change

### Growth Metrics
- `EPSQoQ`: Number - EPS quarter-over-quarter growth (decimal)
- `EarningsQoQ`: Number - Earnings quarter-over-quarter growth (decimal)
- `RevQoQ`: Number - Revenue quarter-over-quarter growth (decimal)
- `EPSYoY`: Number - EPS year-over-year growth (decimal)
- `EarningsYoY`: Number - Earnings year-over-year growth (decimal)
- `RevYoY`: Number - Revenue year-over-year growth (decimal)

### Current Price Data
- `TimeSeries`: Object
  - `open`: Number - Opening price
  - `high`: Number - High price
  - `low`: Number - Low price
  - `close`: Number - Closing price
  - `volume`: Number - Trading volume

### Corporate Actions
- `dividends`: Array of objects
  - `payment_date`: Date - Dividend payment date
  - `amount`: Number - Dividend amount per share
- `splits`: Array of objects
  - `effective_date`: Date - Stock split effective date
  - `split_factor`: Number - Split ratio

### Financial Statements

#### Annual Financials
- `AnnualFinancials`: Array of objects
  - `fiscalDateEnding`: Date
  - `totalRevenue`: Long - Total revenue
  - `netIncome`: Long - Net income
  - `cashAndEq`: Long - Cash and equivalents
  - `debtNonCurrent`: Long - Long-term debt
  - `assetsCurrent`: Long - Current assets
  - `equity`: Long - Shareholders equity
  - `investmentsNonCurrent`: Long - Non-current investments
  - `acctRec`: Long - Accounts receivable
  - `totalAssets`: Long - Total assets
  - `debtCurrent`: Long - Current debt
  - `assetsNonCurrent`: Long - Non-current assets
  - `sharesBasic`: Long - Basic shares outstanding
  - `debt`: Long - Total debt
  - `taxLiabilities`: Number - Tax liabilities
  - `accoci`: Long - Accumulated other comprehensive income
  - `liabilitiesNonCurrent`: Long - Non-current liabilities
  - `investmentsCurrent`: Long - Current investments
  - `ppeq`: Long - Property, plant & equipment
  - `liabilitiesCurrent`: Long - Current liabilities
  - `retainedEarnings`: Long - Retained earnings
  - `taxAssets`: Number - Tax assets
  - `intangibles`: Number - Intangible assets
  - `totalLiabilities`: Long - Total liabilities
  - `inventory`: Long - Inventory
  - `investments`: Long - Total investments
  - `acctPay`: Long - Accounts payable
  - `deposits`: Number - Deposits
  - `investmentsAcqDisposals`: Long - Investment acquisitions/disposals
  - `payDiv`: Long - Dividends paid
  - `businessAcqDisposals`: Number - Business acquisitions/disposals
  - `capex`: Long - Capital expenditures
  - `ncff`: Long - Net cash flow from financing
  - `depamor`: Long - Depreciation and amortization
  - `ncf`: Long - Net cash flow
  - `ncfo`: Long - Net cash flow from operations
  - `issrepayEquity`: Long - Issuance/repayment of equity
  - `freeCashFlow`: Long - Free cash flow
  - `ncfi`: Long - Net cash flow from investing
  - `ncfx`: Number - Effect of exchange rates on cash
  - `shareFactor`: Number - Share adjustment factor
  - `reportedEPS`: Number - Reported earnings per share

#### Quarterly Financials
- `quarterlyFinancials`: Array of objects (same fields as annual plus):
  - `longTermDebtEquity`: Number - Long-term debt to equity ratio
  - `roa`: Number - Return on assets
  - `bookVal`: Long - Book value
  - `roe`: Number - Return on equity
  - `grossMargin`: Number - Gross profit margin
  - `revenueQoQ`: Number - Revenue quarter-over-quarter growth
  - `currentRatio`: Number - Current ratio
  - `debtEquity`: Number - Debt to equity ratio
  - `rps`: Number - Revenue per share
  - `profitMargin`: Number - Profit margin
  - `bvps`: Number - Book value per share
  - `epsQoQ`: Number - EPS quarter-over-quarter growth

### Experimental Features (Incomplete/Halted)

- `NextEarnings`: Object - **Incomplete** - Planned AlphaVantage API integration
  - `reportDate`: Date - Earnings report date
  - `fiscalDateEnding`: Date - Fiscal period ending
  - `estimate`: Number - EPS estimate
  - `timeOfTheDay`: String - "pre-market" or "post-market"

- `AI`: Array - **Highly experimental, halted**
  - `Report`: String - AI-generated analysis report
  - `Model`: String - AI model used (e.g., "Qwen")
  - `Recommendation`: String - Buy/Sell/Hold recommendation
  - `IntrinsicValue`: Number - AI calculated intrinsic value
  - `UpdatedAt`: Date - Report generation date

- `Signals`: Array - Trading signals
  - `date`: String - Signal date
  - `type`: String - "BUY" or "SELL"
  - `strategy`: String - Strategy name (e.g., "RSI_Oversold")
  - `indicator_value`: Number - Indicator value that triggered signal
  - `price`: Number - Price at signal
  - `description`: String - Signal description

### ETF Specific Fields

**Note**: ETF data was aggregated manually on a quarterly basis. There is no current external API integration. However, Tiingo supports these assets and can provide fund data for institutional clients.

- `AUM`: Long - Assets Under Management
- `FundCategory`: String - Fund category classification (e.g., "Large Growth")
- `fundFamily`: String - Fund family/provider name
- `netExpenseRatio`: Number - Net expense ratio percentage

### Mutual Fund Specific Fields

**Note**: Mutual fund data was aggregated manually on a quarterly basis. There is no current external API integration. However, Tiingo supports these assets and can provide fund data for institutional clients.

- `AUM`: Number - Assets Under Management
- `netExpenseRatio`: Number - Net expense ratio percentage

### Crypto Specific Fields

**Note**: Crypto integration was still in progress. Some fields were planned to be added to the schema and may be added in the future.

- `baseCurrency`: String - Base currency code (e.g., "btc")
- `quoteCurrency`: String - Quote currency code (e.g., "eur", "usd")

## Example Documents

- Stock: [AssetInfo.example.json](./sample-data/AssetInfo-Stock.example.json)
- ETF: [AssetInfo-ETF.example.json](./sample-data/AssetInfo-ETF.example.json)
- Mutual Fund: [AssetInfo-Fund.example.json](./sample-data/AssetInfo-Fund.example.json)
- Crypto: [AssetInfo-Crypto.example.json](./sample-data/AssetInfo-Crypto.example.json)
