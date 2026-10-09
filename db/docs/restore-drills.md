# Restore drills

> **An untested backup is not a backup.**
>
> `mongodump` exiting 0 proves that a file was written. It does not prove the file
> can be read back, that the dump was of the right database, or that the app
> boots against the result. The only thing that proves a backup works is a
> restore.

`npm run db:check` reads the table below. If the newest drill is more than **90
days** old, or there has never been one, every run prints a warning until someone
runs one.

## When to run a drill

- **Quarterly**, at minimum.
- **Before any risky migration** — back up, restore onto a scratch database,
  verify, _then_ run the migration against the real one.
- **After changing anything in the backup or restore path** — `scripts/backup.ts`,
  `scripts/restore.ts`, `scripts/lib/`, or the collection set.

## How to run one

1. Take a backup: `npm run backup`. It writes `backups/<timestamp>/manifest.json`
   with the document count of every collection and the bucket count of every
   candle collection, counted in the dump's own files.
2. Point `db/.env`'s `MONGO_DB` at a scratch database — `EreunaDrill`, say.
   The restore maps the backup's database onto whichever one `db/.env` names.
3. Restore: `npm run restore -- backups/<timestamp>`. It counts the dump against
   the manifest before it asks you to type the target's name, and fails unless the
   restored database matches the manifest too.
4. Point the API's `.env` at the same scratch database and boot it.
   `ensureIndexes()` reapplies the manifest — check the log line reports the
   expected count.
5. **Smoke-test the critical flows**, because this is the part that actually
   catches problems:
    - **log in** (proves `Users`, the Argon2 hashes and the token secrets survived)
    - **open a chart** on daily and on an intraday timeframe (proves the time
      series collections came back as time series, with their buckets readable)
    - **run a screener** (proves `AssetInfo` and the screener results path)
    - **open a portfolio** (proves the trade log replays)
6. Point both `.env` files back at the real database, and drop the scratch one.
7. **Add a row below.** A drill nobody recorded did not happen.

## Log

Newest last. Keep the date format — the gate parses it.

<!--
Example row:
| 2026-10-08 | larry  | backups/2026-10-08T13-40-12 | pass | 18m. Counts matched. Login/chart/screener/portfolio OK. |
-->

| Date | Ran by | Backup restored | Result | Notes |
| ---- | ------ | --------------- | ------ | ----- |
|      |        |                 |        |       |
