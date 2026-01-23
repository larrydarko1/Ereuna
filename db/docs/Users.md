# Users Collection

**Purpose**: Stores user account data, authentication credentials, subscription status, UI preferences, and application settings.

## Structure

### Account & Authentication

- `_id`: ObjectId
- `Username`: String - Unique username (3-25 characters)
- `Password`: String - Argon2id hashed password
- `HashedAuthKey`: String - Argon2id hashed API authentication key
- `LastPasswordChangeTime`: Date - Last password change timestamp
- `LastKeyGenerationTime`: Date - Last API key generation timestamp
- `LastLogin`: Date - Last login timestamp

### Multi-Factor Authentication (MFA)

- `MFA`: Boolean - Whether MFA is enabled
- `secret`: String or null - TOTP secret for MFA
- `qrCode`: String or null - QR code data URL for MFA setup

### Subscription Status

- `Paid`: Boolean - Whether user has active subscription
- `Expires`: Date - Subscription expiration date

### UI Preferences

- `theme`: String - UI theme selection (e.g., "default")
- `Language`: String - Language preference (e.g., "En", "Es")
- `defaultSymbol`: String - Default chart symbol to load

### Watchlist & Hidden Assets

- `WatchPanel`: Array[String] - Pinned symbols for quick access (max 16)
- `Hidden`: Array[String] - Symbols hidden from screener results

### Screener Table Configuration

- `Table`: Array[String] - Column keys for screener table
  - Available columns: name, price, volume, perc_change, rs_score1w, rs_score1m, rs_score4m, assettype, adv1w, adv1m, adv4m, adv1y, intrinsic_value, market_cap, ipo, sector, exchange, country, pe_ratio, ps_ratio, current_assets, current_debt, cash, fcf, current_liabilities, current_ratio, roe, roa, peg, currency, dividend_yield, pb_ratio, eps, industry, book_value, shares, all_time_high, all_time_low, high_52w, low_52w, isin, gap, ev, rsi, fund_family, fund_category, net_expense_ratio, cagr, ai_recommendation

### Panel Layouts

Customizable panel layouts for different sections of the application.

**panel** (Asset details panels):
- Array of objects with:
  - `order`: Number - Display order
  - `tag`: String - Panel identifier (e.g., "Summary", "EpsTable", "Notes")
  - `name`: String - Display name (localized)
  - `hidden`: Boolean - Whether panel is hidden

**panel2** (Asset information fields):
- Array of objects with:
  - `order`: Number - Display order
  - `tag`: String - Field identifier (e.g., "Symbol", "MarketCap")
  - `name`: String - Display name
  - `hidden`: Boolean - Whether field is hidden

### Chart Settings

- `ChartSettings`: Object - Chart display configuration
  - `indicators`: Array of objects
    - `type`: String - Indicator type (e.g., "EMA", "SMA")
    - `timeframe`: Number - Period length
    - `visible`: Boolean - Whether indicator is displayed
  - `intrinsicValue`: Object
    - `visible`: Boolean - Whether to show intrinsic value line
  - `markers`: Object
    - `earnings`: Boolean - Show earnings markers
    - `dividends`: Boolean - Show dividend markers
    - `splits`: Boolean - Show stock split markers
  - `chartType`: String - Chart style (e.g., "candlestick", "line", "area")

## Example Document

[Users.example.json](./sample-data/Users.example.json)

## Security Notes

- Passwords hashed with Argon2id (memory-hard algorithm)
- API keys also hashed with Argon2id for secure authentication
- MFA secrets stored encrypted
- Discontinued subscription-related fields remain for historical data

**Note**: Developer is aware of potential security improvements (MFA secret encryption at rest, rate limiting, session management, password history). Current implementation prioritized for proof-of-work scope.
