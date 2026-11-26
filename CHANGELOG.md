# Changelog

All notable changes to Ereuna are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
versions follow [calendar versioning](https://calver.org/) as `YYYY.M.PATCH`: the year
and month a release ships, then how many releases came before it that month
(`2026.11.0`, then `2026.11.1`). Ereuna is a web app, so nobody stays on an old
version. The number says how recent a release is; a release that needs something
done to upgrade opens with `### Upgrading`.

**The rewrite has never been deployed and is not production-ready** (see the README's
[current status](README.md#current-status--read-this-first)). Until it is, a version
here marks a point in development, and its date is the day the number was set.

## [Unreleased]

### Upgrading

1. Set `METRICS_TOKEN` to a random value of at least 32 characters in the production
   env of the API, the worker and the ingestor. Each one refuses to start without it.

### Changed

- Supported browsers are now Safari and iOS 26, Chrome and Edge 136, Firefox 134 and newer, the first of each that runs all of ES2025. They were Safari and iOS 14 and up.

### Fixed

- The nightly no longer marks symbols delisted on a night its price update failed, and it refuses a delisting scan that would retire more than 5% of active symbols at once. Weeks of failed price updates used to delist the whole market.

### Security

- In production, `/metrics` answers only with a bearer token: the API, the worker and the ingestor refuse to start without `METRICS_TOKEN`. It used to be optional, and unset left the endpoint open.

## [2026.11.0] - 2026-11-21

### Upgrading

1. Install Node 26. `engines` asks for `>=26`.
2. Delete `ORGANIZE_ON_START` from `worker/.env`; nothing reads it. To run the nightly
   batch now, use `npm run nightly`.
3. After restoring a backup older than two weeks, run `npm run backfill` before the
   nightly. The nightly only fills gaps from the last 14 days.

### Added

- `npm run nightly` runs the nightly batch once and exits, and `npm run backfill`
  catches daily bars up after an old restore. Only one runs at a time.
- The nightly fills any trading day it missed in the last 14 days, instead of
  leaving a hole.
- The screener shows each symbol's latest price and today's change, live during the
  session.
- An open position's value updates on the server as the session trades.
- `npm run dev:sim` runs the whole live path against a simulated Tiingo feed, on its
  own copy of the database, so no Tiingo key is needed.
- `npm run dev` starts the worker and the ingestor alongside the frontend and API.

### Changed

- The live feed is Tiingo's 24x5 consolidated websocket.
- A watchlist and a portfolio each hold at most 100 symbols.
- Stored daily bars are traded prices restated for splits only. Dividends are kept
  separately.
- Every worker process shares one Tiingo request budget,
  `TIINGO_REQUESTS_PER_HOUR` (9,500 by default). After a 429 they all stop for an
  hour.
- A restore checks the backup against its manifest before it drops anything.
- The nightly leaves crypto out and fetches financial statements for stocks only.

### Fixed

- Watchlist rows, screener prices and every chart on a page follow the live feed,
  and a quote keeps its last price after the closing bell.
- Candles are written again. The rewrite had them upserted, which MongoDB refuses on
  a time series collection.
- The synthetic closing bar is stamped at 15:59 New York all year, instead of an
  hour early from November to March.
- The nightly keeps its hour across a daylight-saving change.
- Trades outside an open session no longer reach a candle.
- A crash in the aggregator no longer loses the batch it was writing.
- Stopping the ingestor unsubscribes from Tiingo before it exits.
- A heartbeat before Tiingo's acknowledgement is no longer logged as a rejected
  subscription.
- Screener figures are read in the unit the nightly stores them in, and an account
  that never picked columns gets the default ones.
- The arrow keys focus the selected watchlist row, after switching lists too.

### Security

- Dependencies updated, and their install scripts no longer run.

## [2026.10.2] - 2026-10-08

The first entry in this file. Everything before it is folded in here, because no
release was ever written down one by one, and the version numbers changed scheme
three times:

- **2024-11 to 2025-10, `v3.8.2` to `3.9.2`.** The original app, while it ran in
  production. Numbers were written into commit subjects, not tagged, and several
  commits often shared one.
- **2025-12 to 2026-03, `2025.248` to `2026.7`.** A switch to year-based numbers for
  a rolling release. The second number counted releases; it was not the month.
- **2026-08 onward, `2026.8.0` and this release.** The rewrite, domain by domain,
  against written standards. Here the second number became the month, and the patch
  digit was added because npm needs three numbers. None of the rewrite has been
  deployed.

The README describes what the rewrite covers.
