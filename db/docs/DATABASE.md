# EreunaDB - MongoDB Database Architecture

```
EreunaDB/
├── Financial Data Collections
│   ├── AssetInfo                    # Asset metadata (Stock, ETF, Fund, Crypto)
│   │   ├── [Stock Assets](AssetInfo.md#stock)
│   │   ├── [ETF Assets](AssetInfo.md#etf)
│   │   ├── [Mutual Fund Assets](AssetInfo.md#mutual-fund)
│   │   └── [Crypto Assets](AssetInfo.md#crypto)
│   ├── [OHCLVData_daily](OHCLVData_daily.md)              # Daily price data
│   ├── [OHCLVData_weekly](OHCLVData_weekly.md)            # Weekly price data
│   ├── [OHCLVData_1m](OHCLVData_1m.md)                    # 1-minute candles
│   ├── [OHCLVData_5m](OHCLVData_5m.md)                    # 5-minute candles
│   ├── [OHCLVData_15m](OHCLVData_15m.md)                  # 15-minute candles
│   ├── [OHCLVData_30m](OHCLVData_30m.md)                  # 30-minute candles
│   ├── [OHCLVData_1hr](OHCLVData_1hr.md)                  # 1-hour candles
│   └── [News](News.md)                                     # Financial news articles
│
├── User & Portfolio Collections
│   ├── [Users](Users.md)                                   # Account, auth, preferences
│   ├── [Portfolios](Portfolios.md)                         # Portfolio simulations
│   ├── [Positions](Positions.md)                           # Active holdings
│   ├── [Trades](Trades.md)                                 # Trade history (buy/sell/cash)
│   ├── [Watchlists](Watchlists.md)                         # User watchlists
│   ├── [Notes](Notes.md)                                   # User notes on symbols
│   └── [ChartDrawings](ChartDrawings.md)                   # TradingView drawings
│
├── Screener Collections
│   └── [Screeners](Screeners.md)                           # Saved screener configurations
│
├── System Collections
│   ├── [Stats](Stats.md)                                   # Market stats, VAT, holidays
│   ├── [systemSettings](systemSettings.md)                 # Maintenance mode control
│   ├── [Alerts](Alerts.md)                                 # Platform communications
│   └── [Docs](Docs.md)                                     # Feature announcements
│
└── Discontinued Collections
    ├── [Calendar](Calendar.md)                             # Earnings tracking (legacy)
    ├── [FinancialUpdatesProgress](FinancialUpdatesProgress.md)  # Failed API updates (legacy)
    ├── [Agents](Agents.md)                                 # Unused affiliate program
    ├── [Receipts](Receipts.md)                             # Payment receipts (legacy)
    └── [Refunds](Refunds.md)                               # Refund tracking (legacy)
```
---

**Note:** Each collection has detailed documentation with sample JSON examples in the `docs/sample-data/` directory.
