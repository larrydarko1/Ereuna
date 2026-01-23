# Trades Collection

**Purpose**: Stores trade history for users' portfolio simulations. Each document represents a transaction: buy/sell trade, cash deposit, or cash withdrawal.

## Document Types

This collection contains three types of documents:

### 1. Buy/Sell Trades

Standard trading transactions for buying or selling assets.

**Structure:**

- `_id`: ObjectId
- `Date`: String - Trade execution date (ISO 8601 format)
- `Symbol`: String - Stock ticker symbol (uppercase)
- `Action`: String - Trade action: "Buy" or "Sell"
- `Shares`: Number - Number of shares traded
- `Price`: Number - Price per share at execution
- `Total`: Number - Total transaction value (Shares × Price)
- `Commission`: Number - Trading commission/fees (default: 0)
- `Leverage`: Number - Leverage multiplier (1-10, default: 1)
- `IsShort`: Boolean - Whether this is a short position (default: false)
- `Username`: String - Portfolio owner
- `PortfolioNumber`: Number - Portfolio index (0-9)
- `Timestamp`: String - Precise execution timestamp (ISO 8601) for same-day ordering

### 2. Cash Deposit

Simulates adding cash to a portfolio.

**Structure:**

- `_id`: ObjectId
- `Date`: String - Deposit date (ISO 8601 format)
- `Symbol`: String - Fixed value: "-"
- `Action`: String - Fixed value: "Cash Deposit"
- `Shares`: String - Fixed value: "-"
- `Price`: String - Fixed value: "-"
- `Total`: Number - Deposit amount (positive)
- `Username`: String - Portfolio owner
- `PortfolioNumber`: Number - Portfolio index (0-9)

### 3. Cash Withdrawal

Simulates withdrawing cash from a portfolio.

**Structure:**

- `_id`: ObjectId
- `Date`: String - Withdrawal date (ISO 8601 format)
- `Symbol`: String - Fixed value: "-"
- `Action`: String - Fixed value: "Cash Withdrawal"
- `Shares`: String - Fixed value: "-"
- `Price`: String - Fixed value: "-"
- `Total`: Number - Withdrawal amount (negative)
- `Username`: String - Portfolio owner
- `PortfolioNumber`: Number - Portfolio index (0-9)

## Example Documents

- Buy/Sell Trade: [Trades-BuySell.example.json](./sample-data/Trades-BuySell.example.json)
- Cash Deposit: [Trades-CashDeposit.example.json](./sample-data/Trades-CashDeposit.example.json)
- Cash Withdrawal: [Trades-CashWithdrawal.example.json](./sample-data/Trades-CashWithdrawal.example.json)

## Notes

- Each portfolio can have up to 1000 trades
- Cash movements use "-" for Symbol, Shares, and Price fields
- Withdrawals have negative Total values
- Timestamp field provides sub-day ordering for trades executed on the same date
- Leverage and IsShort fields support advanced trading strategies (long/short, margin trading)
