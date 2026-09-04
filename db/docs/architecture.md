# EreunaDB — database architecture

> **Database name**: `EreunaDB`, set by `MONGO_DB`. Every process connects to
> the same database; the separation between them is by collection and by
> writer, not by database.

## Table of contents

- [Overview](#overview)
- [Who writes what](#who-writes-what)
- [Collections by domain](#collections-by-domain)
    - [Identity](#identity)
    - [Research](#research)
    - [Portfolio](#portfolio)
    - [Market data](#market-data)
- [Design decisions](#design-decisions)
- [Index strategy](#index-strategy)
- [Migration history](#migration-history)

---

## Overview

EreunaDB contains **20 collections** across four domains. Nine are written by
the API on behalf of a signed-in user; eleven hold market data and are written
only by the worker and the ingestor.

The names of all twenty live in `packages/shared/src/db/indexes.ts`, which is
also where every index is declared. Nothing else names a collection: the
bootstrap migration imports the list, the drift gate reads it, and this document
is checked against it.

Example documents are in [`examples/`](examples/), one per collection. They are
fake, and they are held to the TypeScript type that declares the shape — an
example with a field the type does not have fails `npm run db:check`, which is
what stops this directory describing a schema that no longer exists.

## Who writes what

```
┌──────────────┐
│  API         │  Users, RefreshTokens, Screeners, Watchlists,
│  api/src/    │  Portfolios, Positions, Trades, Notes, ChartDrawings
└──────────────┘  reads everything else
        │
        ├────────────────→  MongoDB (EreunaDB)
        │
┌──────────────┐
│  worker      │  aggregate: OHCLVData*      (candles, from the Redis stream)
│  worker/src/ │  organize:  AssetInfo, News, Calendar, Stats
└──────────────┘
        │
┌──────────────┐
│  ingestor    │  reads AssetInfo and Stats to decide what to subscribe to.
│ ingestor/src/│  Writes nothing — every trade it receives goes to Redis.
└──────────────┘
```

- **API** — one `MongoClient` per process via `connectDb()` / `getDb()` in
  `api/src/lib/db.ts`. Applies `INDEXES` at boot and closes the client on
  SIGTERM/SIGINT so in-flight queries drain.
- **worker** — its own client, its own process. Applies `OHLCV_INDEXES`, and
  `REFERENCE_INDEXES` as well when it runs the `organize` role. It never
  applies the API's manifest, because it does not write those collections.
- **ingestor** — its own client, read-only against the database.
- **migrations** — the `migrate-mongo` CLI via `db/migrate-mongo-config.js`.
  Owns collections and data. Never indexes.

---

## Collections by domain

### Identity

#### Users

One document per account. There is no email address anywhere on it: recovery is
a single-use code, not a link, so the database holds no contactable identity.

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | The user id every other collection foreign-keys to. |
| `username` | string | As typed, and as displayed. |
| `usernameLower` | string | Lowercased login key. Unique — this is what makes login an equality match rather than a case-insensitive regex scan. |
| `passwordHash` | string | Argon2id. |
| `totpSecretEncrypted` | string \| null | AES-256-GCM ciphertext. The plaintext secret is never stored. |
| `pendingTotpSecretEncrypted` | string \| null | A secret generated but not yet confirmed with a valid code. Promoted on confirmation. |
| `totpEnabled` | boolean | Whether a second factor is demanded at login. |
| `recoveryCodeHashes` | string[] | Argon2id hashes of single-use codes. The plaintext is shown once, at generation. |
| `passwordResetRequired` | boolean | Raised when a recovery code opened the session; cleared by the next password change. |
| `language` | string | ISO 639-1. One of the eighteen locales. |
| `theme` | string \| null | Null until the user picks one. |
| `defaultSymbol` | string | The symbol the chart opens on. |
| `hiddenSymbols` | string[] | Symbols excluded from this user's screener results. |
| `chartSettings` | object \| null | Style, indicators, intrinsic-value line, corporate-action markers. Null until first configured. |
| `panels` | object \| null | Saved sidebar section order and summary-field order. Null until reordered. |
| `screenerColumns` | string[] | Chosen result columns, in display order. |
| `createdAt` | Date | |
| `updatedAt` | Date | |
| `lastLoginAt` | Date \| null | |
| `passwordChangedAt` | Date \| null | |

#### RefreshTokens

One document per live refresh token. Rotation inserts a new one and marks the
old used; it never extends `expiresAt`.

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | |
| `tokenHash` | string | SHA-256 of the raw token. The client holds the only plaintext copy. Unique. |
| `userId` | ObjectId | |
| `familyId` | string | One family per login. Reuse detection revokes a whole family in one delete. |
| `rememberMe` | boolean | Chooses which of the two session ceilings was applied. |
| `expiresAt` | Date | The absolute ceiling, fixed at login. Also the TTL key, so a stale record deletes itself. |
| `createdAt` | Date | |
| `usedAt` | Date? | Set when this token was exchanged. A second exchange of a used token is the reuse signal. |

### Research

#### Screeners

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | |
| `userId` | ObjectId | |
| `name` | string | |
| `nameLower` | string | Unique per user with `userId`. |
| `include` | boolean | Whether this screener takes part in the combined run. |
| `filters` | object | Field → range, enum list, moving-average relation or flag. Validated against the shared filter registry, never against a free-form shape. |
| `createdAt` | Date | |
| `updatedAt` | Date | |

#### Watchlists

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | |
| `userId` | ObjectId | |
| `name` | string | |
| `nameLower` | string | Unique per user with `userId`. |
| `list` | object[] | `{ ticker, exchange }`. The exchange is stored so a ticker that trades in two places stays unambiguous. |
| `position` | number | Explicit ordering, so reordering does not depend on insertion order. |
| `createdAt` | Date | |
| `updatedAt` | Date | |

#### Notes

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | |
| `userId` | ObjectId | |
| `symbol` | string | |
| `message` | string | |
| `createdAt` | Date | |
| `updatedAt` | Date | |

#### ChartDrawings

One document per (user, symbol, timeframe). Drawings are saved as a whole
document rather than as rows, because the chart loads and saves all of them at
once and never queries inside them.

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | |
| `userId` | ObjectId | |
| `symbol` | string | |
| `timeframe` | string | One of the seven chart timeframes. |
| `drawings` | object | Five arrays: trend lines, boxes, text annotations, freehand paths, price levels. |
| `createdAt` | Date | |
| `updatedAt` | Date | |

### Portfolio

The portfolio is event-sourced. `Trades` is the only thing a write touches;
`Portfolios.cash`, `Portfolios.stats`, `Portfolios.valueHistory` and every
`Positions` document are replayed from the log after each one. Nothing is
incremented in place, which is what makes editing and deleting a trade safe.

#### Trades

The source of truth. Cash movements are trades too — a deposit is an action,
not a balance adjustment.

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | |
| `userId` | ObjectId | |
| `portfolioNumber` | number | Which of the user's portfolio slots. |
| `symbol` | string \| null | Null for deposits and withdrawals, which have no instrument. |
| `action` | string | `buy`, `sell`, `short`, `cover`, `deposit` or `withdrawal`. Shorts are explicit actions, not a negative quantity. |
| `shares` | number | Zero for cash movements. |
| `price` | number | Zero for cash movements. |
| `total` | number | Always positive. The sign of the event is carried by `action`. |
| `commission` | number | Resolved to a concrete number at write time, so a later settings change cannot re-price history. |
| `tradeDate` | Date | The date the user is claiming. Back-dating is allowed, and is validated by replaying the candidate log. |
| `createdAt` | Date | Tiebreaker: replay order is (`tradeDate`, `createdAt`). |

#### Positions

Derived, and rewritten on every replay. One document per symbol per portfolio.

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | |
| `userId` | ObjectId | |
| `portfolioNumber` | number | |
| `symbol` | string | |
| `side` | string | `long` or `short`. Direction lives here, not in the sign of `shares`. |
| `shares` | number | Always positive. |
| `avgPrice` | number | Average entry, excluding commission, which is expensed to cash. |
| `updatedAt` | Date | |

#### Portfolios

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | |
| `userId` | ObjectId | |
| `number` | number | 0–9. A fixed set of slots per user. |
| `cash` | number | May be negative — that is the margin loan. |
| `baseValue` | number | The starting figure returns are measured against. |
| `leverage` | number | A buying-power constraint, not a flag. At 1 it reduces to "spend no more cash than you hold". |
| `defaultCommission` | number | Resolved onto each trade at write time. |
| `benchmarks` | string[] | Symbols the equity curve is plotted against. |
| `stats` | object \| null | The replayed statistics snapshot. Null before the first trade. |
| `valueHistory` | object[] | `{ date, value }`, replayed end to end. |
| `createdAt` | Date | |
| `updatedAt` | Date | |

### Market data

Written by the worker, read by everything. No document here carries an identity —
a last traded price is public, and these collections have no `userId`.

#### AssetInfo

One document per instrument, and the widest document in the database: reference
data, the latest quote, the derived statistics from the nightly run, and the
fundamentals arrays all live on it. It is typed with an index signature for that
reason — the nightly jobs each attach their own fields.

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | |
| `Symbol` | string | Unique. Every nightly job and every market read addresses an asset by it. |
| `Name` | string? | |
| `ISIN` | string? | |
| `AssetType` | string? | Stock, ETF, Fund, Crypto. |
| `Sector` | string? | |
| `Industry` | string? | |
| `Exchange` | string? | |
| `Country` | string? | |
| `Currency` | string? | |
| `Delisted` | boolean? | Set by the nightly delist step. Filtered on by the universe queries, not by the screener. |
| `MarketCapitalization` | number? | |
| `IntrinsicValue` | number? | |
| `dividends` | object[]? | `{ date, amount }`, payment date. |
| `splits` | object[]? | `{ date, ratio }`, effective date. Above one is a forward split. |
| `quarterlyIncome` | object[]? | |
| `quarterlyFinancials` | object[]? | |
| `AnnualFinancials` | object[]? | |

#### OHCLVData

Daily bars. The misspelling is the ingestor's and is load-bearing — it addresses
the collection a decade of bars already live in.

All seven candle collections are MongoDB **time series** collections, with
`timestamp` as the time field and `tickerID` as the meta field. That is a
property of the namespaces themselves, not of anything declared here: it cannot
be changed without rewriting half a billion documents, and it is why upserting a
candle needs MongoDB 8.0 or later, which added upsert support for time series.
Each has a `system.buckets.*` companion holding the compressed buckets; those
are managed by the server and appear in neither the registry nor this document.

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | |
| `tickerID` | string | The bar collections' symbol field. Not `Symbol`, which is AssetInfo's. |
| `timestamp` | Date | Midnight UTC on the session date. |
| `open` | number | |
| `high` | number | |
| `low` | number | |
| `close` | number | |
| `volume` | number | |

#### OHCLVData2

Weekly bars, rebuilt from the daily series by the nightly `weekly` step rather
than aggregated live.

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | |
| `tickerID` | string | |
| `timestamp` | Date | The week's opening session. |
| `open` | number | |
| `high` | number | |
| `low` | number | |
| `close` | number | |
| `volume` | number | |

#### OHCLVData1m

One-minute bars, written by the aggregate role from the Redis trade stream.

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | |
| `tickerID` | string | |
| `timestamp` | Date | Bucket start, with a time of day. |
| `open` | number | |
| `high` | number | |
| `low` | number | |
| `close` | number | |
| `volume` | number | |

#### OHCLVData5m

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | |
| `tickerID` | string | |
| `timestamp` | Date | Bucket start. |
| `open` | number | |
| `high` | number | |
| `low` | number | |
| `close` | number | |
| `volume` | number | |

#### OHCLVData15m

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | |
| `tickerID` | string | |
| `timestamp` | Date | Bucket start. |
| `open` | number | |
| `high` | number | |
| `low` | number | |
| `close` | number | |
| `volume` | number | |

#### OHCLVData30m

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | |
| `tickerID` | string | |
| `timestamp` | Date | Bucket start. |
| `open` | number | |
| `high` | number | |
| `low` | number | |
| `close` | number | |
| `volume` | number | |

#### OHCLVData1hr

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | |
| `tickerID` | string | |
| `timestamp` | Date | Bucket start. |
| `open` | number | |
| `high` | number | |
| `low` | number | |
| `close` | number | |
| `volume` | number | |

#### News

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | |
| `title` | string | |
| `url` | string | Unique, and the upsert key — the same story arriving in two batches updates one row instead of inserting a second. |
| `source` | string? | |
| `summary` | string? | |
| `imageUrl` | string? | |
| `tickers` | string[] | Symbols the article was tagged with. Drives the per-symbol headline panel. |
| `publishedDate` | Date | |

#### Calendar

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | |
| `symbol` | string | |
| `type` | string | `Earnings`, `Dividend` or `Split`. |
| `reportDate` | Date | Unique with `type` and `symbol`, which is the upsert key when the calendar is rebuilt. |

#### Stats

Singleton documents keyed by a string `_id` — `marketStats`, `Holidays`,
`vat_rates`. Each has its own payload, so the type carries an index signature
rather than a field list.

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | string | The document's name, not an ObjectId. |
| `updatedAt` | Date? | When the nightly run last rewrote it. |

---

## Design decisions

- **Derived data is replayed, never incremented.** The portfolio is the whole
  argument: `Positions`, `cash`, `stats` and `valueHistory` are all functions of
  `Trades`, recomputed after every write. It costs more per write and it is the
  reason a back-dated insert or a deleted trade cannot leave the book wrong.
- **Dividends are derived, never stored.** They are recomputed on each replay
  from the schedule on `AssetInfo` and the holdings on each payment date. A
  short position owes the dividend rather than receiving it.
- **Lowercased sort keys are stored, not computed.** `usernameLower` and
  `nameLower` exist so uniqueness and lookup are indexed equality matches. A
  case-insensitive regex is a collection scan, and it cannot enforce uniqueness
  at all.
- **Ordering is explicit.** `Watchlists.position` and the arrays inside
  `Users.panels` carry their own order. Insertion order is not an ordering.
- **Market data carries no identity.** Nothing in the market-data domain has a
  `userId`, which is why those endpoints are the only ones that can be cached
  across users.

## Index strategy

Every index in the database is declared in
`packages/shared/src/db/indexes.ts` and nowhere else, split by writer:

| Manifest | Applied by | Covers |
| --- | --- | --- |
| `INDEXES` | API, at boot | The nine collections the API writes |
| `OHLCV_INDEXES` | worker, both roles | The seven candle collections |
| `REFERENCE_INDEXES` | worker, `organize` role | AssetInfo, News, Calendar |

Each entry carries a `why`. An index without a query behind it is a write cost
nobody has agreed to, and the contract test fails an entry that cannot state
one.

No candle index is unique. The aggregate role is a singleton and upserts on
exactly `(tickerID, timestamp)`, so it cannot produce a duplicate — while the
existing collections predate the constraint, and a `createIndex` that failed on
old data would stop the worker booting rather than surface as a warning.

The candle index is `(tickerID, timestamp)` **ascending**, even though every
chart read is newest-first. `tickerID` is an equality match, so the sort falls on
`timestamp` alone and MongoDB walks the index backwards to serve it at the same
cost. A descending copy would answer no query the ascending one does not, and
declaring one would have cost an index build across some 580 million existing
bars — hours on `OHCLVData5m` alone. Two collections carried such a copy under
the name `idx_tickerid_timestamp_desc`; `20260904000100-drop-legacy-schema`
removes them.

`AssetInfo` carries one index, on `Symbol`. The rebuilt screener composes its
query from the filter registry alone and never constrains `Delisted`, so the
eighteen `Delisted`-prefixed compound indexes the old restore script created
could not serve a single screener read; they were dropped by
`20260904000100-drop-legacy-schema`. A screener run is a scan of roughly 28,000
documents with a projection, which is the shape the query genuinely has.

Adding an index is an entry in the manifest — it is created on the next boot in
every environment. **Dropping** one is a migration, because a drop applied at
boot would rebuild the index on every restart.

## Migration history

| Migration | What it did |
| --- | --- |
| `20260904000000-bootstrap-ereuna-collections` | Creates every collection in the registry, so a database built from nothing has the same namespaces as one that has been running for a year. |
| `20260904000100-drop-legacy-schema` | Removes what the rebuild left behind: ten collections nothing reads, the documents still in the pre-rebuild shape, and thirty-two indexes serving queries no longer issued. |
| `20260904000200-reshape-market-data` | Brings the market data the rebuild kept into the shape the rebuilt code reads: renames `News.description` to `summary`, collapses the duplicate `AssetInfo` and `News` rows that would stop the manifest's unique indexes building, and removes the progress-tracker document the old code kept among the calendar events. |
