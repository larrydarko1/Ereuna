#!/usr/bin/env node
/**
 * Dependency audit gate with a reviewed allowlist.
 * `npm audit` has no ignore mechanism, so a single upstream-blocked advisory
 * turns CI permanently red — and the usual reaction (dropping --audit-level to
 * critical) silently swallows every future high finding too. This wraps the
 * audit instead: high/critical advisories fail the build unless their GHSA is
 * explicitly listed below, with a reason and an expiry.
 * The allowlist is deliberately awkward to maintain. Each entry must say why it
 * cannot be fixed here and when to look again. Expired entries fail the build
 * on their own, so a "temporary" exception cannot quietly become permanent.
 */
import { execFileSync } from 'node:child_process';

/**
 * Reviewed exceptions. Empty, and the goal is for it to stay that way: an entry
 * is an advisory this repo has decided to ship with, which is only ever right
 * when the fix is genuinely out of reach here.
 */
const ALLOWLIST = [];


const FAIL_SEVERITIES = new Set(['high', 'critical']);

function runAudit() {
    try {
        return execFileSync('npm', ['audit', '--json', '--omit=dev'], {
            encoding: 'utf8',
            maxBuffer: 32 * 1024 * 1024,
        });
    } catch (err) {
        if (typeof err.stdout === 'string' && err.stdout.length > 0) return err.stdout;
        throw err;
    }
}

/**
 * Flatten npm's vulnerability tree into one row per (package, advisory).
 * `via` holds advisory objects for direct hits and plain package-name strings
 * where the package is only a carrier for a dependency's advisory — carriers
 * would double-count, so only the objects are collected.
 */
function findings(report) {
    const rows = [];
    for (const [name, vuln] of Object.entries(report.vulnerabilities ?? {})) {
        for (const via of vuln.via ?? []) {
            if (typeof via !== 'object' || via.url === undefined) continue;
            const id = via.url.split('/').pop();
            rows.push({ package: name, id, title: via.title, severity: via.severity ?? vuln.severity });
        }
    }
    return rows;
}

const today = new Date().toISOString().slice(0, 10);
const report = JSON.parse(runAudit());
const rows = findings(report).filter((r) => FAIL_SEVERITIES.has(r.severity));

const allowed = new Map(ALLOWLIST.map((e) => [e.id, e]));
const blocking = [];
const waived = [];
const expired = [];

for (const row of rows) {
    const entry = allowed.get(row.id);
    if (entry === undefined) {
        blocking.push(row);
    } else if (entry.expires < today) {
        expired.push({ ...row, entry });
    } else {
        waived.push({ ...row, entry });
    }
}

const seen = new Set(rows.map((r) => r.id));
const unused = ALLOWLIST.filter((e) => !seen.has(e.id));

for (const { entry } of waived) {
    console.log(`  ~ ${entry.id} (${entry.package}) waived until ${entry.expires}`);
}

for (const entry of unused) {
    console.log(`\n! ${entry.id} (${entry.package}) is allowlisted but no longer reported.`);
    console.log('  → Upstream shipped the fix. Remove the allowlist entry and any workaround it references.');
}

if (expired.length > 0) {
    console.error(`\n✘ ${expired.length} allowlisted advisory/ies past their review date:\n`);
    for (const { entry } of expired) {
        console.error(`  ${entry.id} (${entry.package}) — expired ${entry.expires}`);
        console.error(`    → Re-check upstream. Extend the date only with a fresh reason, or remove it.\n`);
    }
}

if (blocking.length > 0) {
    console.error(`\n✘ ${blocking.length} unreviewed high/critical advisory/ies:\n`);
    for (const row of blocking) {
        console.error(`  ${row.severity.toUpperCase()} ${row.id} — ${row.package}`);
        console.error(`    ${row.title}`);
        console.error(`    → Upgrade it. Allowlist it in this file only if upstream makes that impossible.\n`);
    }
}

if (blocking.length > 0 || expired.length > 0) process.exit(1);

console.log(`\nAudit clean: no unreviewed high/critical advisories (${waived.length} waived).`);
