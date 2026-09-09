# Ticker marks

This tree is deliberately empty. No ticker logos are distributed with this
repository — the marks belong to the companies they identify, and the set this
project was developed against came from a third party whose terms do not cover
redistribution. Bring your own, from a source whose licence you have read.

## Layout

One directory per exchange, one file per ticker:

```
api/assets/logos/
    NASDAQ/AAPL.svg
    NYSE/BRK.B.svg
    CRYPTO/BTCUSD.svg
```

`api/src/routes/asset/logos.ts` allow-lists both path segments rather than
escaping them, so the names have to match what it accepts:

- **exchange** — `^[A-Z]{2,10}$`
- **file** — `^[A-Z0-9][A-Z0-9.:-]{0,14}\.svg$` (the colon is there for the
  crypto pairs, e.g. `XAUT:USD.svg`)

The exchange directory is whatever `AssetInfo.Exchange` holds for the asset;
`NASDAQ`, `NYSE`, `NMFQS` and `CRYPTO` are the ones this dataset uses.

## Running without them

An empty tree is a supported state, not a broken one. A missing file answers a
bare 404 by design — most tickers have no mark, so the miss is the ordinary
case — and `AssetLogo.vue` renders the ticker's first two letters instead. The
app looks complete without a single SVG here.

## Notes

- `LOGOS_DIR` overrides this location; unset, it resolves to this directory.
- Everything here except this file is gitignored, so a populated tree never
  shows up as uncommitted work.
- SVGs are served under `default-src 'none'; ... sandbox`, so anything a mark
  tries to load is blocked. Files still come off the API's own origin, so use a
  source you trust.
