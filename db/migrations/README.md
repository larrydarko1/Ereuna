# Migrations

Forward-only. `migrate-mongo`, timestamp-prefixed, one migration per schema
change.

```bash
npm run db:migrate           # apply pending migrations
npm run db:migrate:status    # what has run
npm run db:migrate:create -- <name>
npm run db:checksums         # after adding a migration, record its hash
```

The connection comes from `db/.env` (copy `db/.env.example`). It is read there
and nowhere else, so `npm run db:migrate` cannot pick up a different database
from the one the operator meant.

## There is no `down`

**Migrations must not export a `down()` function.** `npm run db:check` fails if
one appears, and so does `db/__tests__/migrations-contract.test.ts`.

This is not stylistic. A reversal that loses data is not a rollback; it is a
second, unreviewed migration that runs under pressure during an incident. The
bootstrap migration's `down()` would drop every collection in the database —
one mistyped `MONGO_URI` from total loss — and the legacy-drop migration has no
`down()` that means anything at all, because the rows it removes are gone.

**To undo a migration, write a new forward migration that corrects the state.**
That gets review, a test and a changelog entry; `down` gives none of them.

## Migrations never create indexes

Indexes have exactly one definition site: the manifest at
`packages/shared/src/db/indexes.ts`. `ensureIndexes()` applies `INDEXES` when
the API boots, and the worker applies `OHLCV_INDEXES` and `REFERENCE_INDEXES`
when it does — each process owns the collections it writes.

**To add an index:** add an entry to the manifest. It is created on the next
boot, in every environment. Nothing to write here.

**To drop an index:** that *is* a migration, and `dropIndex` is allowed here for
exactly that reason. A drop must run once; a drop at boot would rebuild the
index on every restart of every replica.

## Rules

- **Idempotent.** Running twice does what running once did. Every migration in
  here keys its deletions on the absence of a field the current shape always
  carries, which is what makes a second run — and a run against a database that
  only ever held current data — a no-op.
- **Never edit a merged migration.** It has already run somewhere; editing it
  changes nothing there and desynchronises environments. `.checksums.json`
  records what each file hashed to and `npm run db:check` fails if one moves.
- **Migration vs script.** If it must run exactly once in every environment,
  it is a migration. If it is "do this when needed", it is a script.
