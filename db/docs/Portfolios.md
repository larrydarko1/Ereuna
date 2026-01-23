# Portfolios Collection

**Purpose**: Stores portfolio simulation data for users. Each user can have up to 10 portfolio documents, each tracking performance metrics and trade analytics.

## Structure

### Basic Fields

- `_id`: ObjectId
- `Username`: String - Portfolio owner
- `Number`: Number - Portfolio index (0-9)
- `cash`: Number - Available cash balance
- `BaseValue`: Number - Initial portfolio value
- `benchmarks`: Array[String] - Comparison benchmarks (e.g., ["SPY", "QQQ", "DIA"])

### Performance Metrics

- `realizedPL`: Number - Total realized profit/loss
- `realizedPLPercent`: Number - Realized P/L as percentage
- `profitFactor`: Number - Ratio of gross profit to gross loss
- `sortinoRatio`: Number - Risk-adjusted return metric
- `riskRewardRatio`: Number - Average risk vs reward ratio

### Trade Statistics

- `winnerCount`: Number - Number of winning trades
- `winnerPercent`: Number - Percentage of winning trades
- `loserCount`: Number - Number of losing trades
- `loserPercent`: Number - Percentage of losing trades
- `breakevenCount`: Number - Number of breakeven trades
- `breakevenPercent`: Number - Percentage of breakeven trades

### Average Metrics

- `avgGain`: Number - Average gain percentage on winners
- `avgGainAbs`: Number - Average absolute gain amount
- `avgLoss`: Number - Average loss percentage on losers
- `avgLossAbs`: Number - Average absolute loss amount
- `avgPositionSize`: Number - Average position size
- `avgHoldTimeWinners`: Number - Average holding period for winners (days)
- `avgHoldTimeLosers`: Number - Average holding period for losers (days)
- `gainLossRatio`: Number - Ratio of average gain to average loss

### Best/Worst Trades

- `biggestWinner`: Object
  - `ticker`: String - Symbol of biggest winner
  - `amount`: Number - Profit amount
  - `tradeCount`: Number - Number of trades for this symbol
- `biggestLoser`: Object
  - `ticker`: String - Symbol of biggest loser
  - `amount`: Number - Loss amount
  - `tradeCount`: Number - Number of trades for this symbol

### Historical Data

- `portfolioValueHistory`: Array of objects - Daily portfolio value tracking
  - `date`: String - Date in YYYY-MM-DD format
  - `value`: Number - Portfolio value on that date

### Trade Distribution

- `tradeReturnsChart`: Object - Distribution of trade returns
  - `labels`: Array[String] - Return range labels (e.g., "-8 to -6%")
  - `bins`: Array of objects - Histogram bins
    - `min`: Number - Bin minimum percentage
    - `max`: Number - Bin maximum percentage
    - `range`: String - Display range
    - `count`: Number - Number of trades in this range
    - `positive`: Boolean - Whether range is profitable
  - `medianBinIndex`: Number - Index of median bin

## Example Document

[Portfolios.example.json](./sample-data/Portfolios.example.json)
