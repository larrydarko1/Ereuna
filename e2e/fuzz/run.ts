/**
 * API fuzzing. Schemathesis builds thousands of requests from the API contract
 * (as OpenAPI, from @ereuna/shared/openapi), sends them to a real API on the
 * E2E database, and fails on what the contract says cannot happen: a 5xx, a
 * success its response schema refuses, a refusal with a code the shared list
 * does not know, or invalid input the API accepted. What it judges and what it
 * lets pass is in schemathesis.toml beside this file.
 *
 *   npm run test:fuzz
 *
 * Needs what the E2E suite needs (MongoDB, e2e/.env.e2e) plus python3 and
 * redis-server: the first run installs the pinned Schemathesis into
 * e2e/fuzz/.venv. FUZZ_MAX_TIME sets the budget in seconds (default 120);
 * FUZZ_SEED replays a run, from the seed its summary prints. Reports land in
 * e2e/fuzz/report/, and Schemathesis keeps the failures it found in
 * e2e/fuzz/.schemathesis/ to replay them first next time (both git-ignored).
 *
 * A run shares nothing with your dev setup but MongoDB, where it owns the E2E
 * database. Redis is a server of its own that saves nothing to disk: it starts
 * with the run and stops with it, so the rate-limit buckets and cache entries
 * the run writes are gone when it ends.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { connect, createServer } from 'node:net';
import { resolve } from 'node:path';

import { config as loadEnv } from 'dotenv';

import { openApiDocument } from '@ereuna/shared/openapi';

import { API_LOG, API_URL } from '../support/constants';
import globalSetup from '../support/global-setup';
import { clearRateLimitBuckets, createRedis } from '../support/rate-limit';

const FUZZ_DIR = import.meta.dirname;
const ROOT = resolve(FUZZ_DIR, '..', '..');
const VENV = resolve(FUZZ_DIR, '.venv');
const REPORT_DIR = resolve(FUZZ_DIR, 'report');
const SCHEMATHESIS = resolve(VENV, 'bin', 'schemathesis');
const REQUIREMENTS = resolve(FUZZ_DIR, 'requirements.txt');
/** The requirements the venv was last installed from, to tell when a pin changed. */
const INSTALLED = resolve(VENV, 'requirements.installed.txt');

/** Where the run's own Redis listens. Loopback only. */
const STAND_IN_HOST = '127.0.0.1';

/** The user every request is sent as. Its password meets every rule the register route holds it to. */
const FUZZER = { username: 'fuzzer', password: 'Fuzz-pass-1!' };

/**
 * How often the rate-limit buckets are emptied. Every request comes from one
 * user, so the limiter would answer nearly all of them with a 429 and the run
 * would test the limiter instead of the routes. The limiter has its own tests.
 */
const LIMIT_RESET_MS = 250;

/** How to stop each process the run started, newest last. */
const started: (() => void)[] = [];

/** Stops what the run started, newest first, so the API goes before the Redis it uses. */
function stopEverything(): void {
    for (const stop of started.splice(0).reverse()) stop();
}

async function main(): Promise<number> {
    Object.assign(process.env, loadEnv({ path: resolve(FUZZ_DIR, '..', '.env.e2e'), quiet: true }).parsed);
    await refuseRunningApi();
    installFuzzTools();

    try {
        // Before anything reads REDIS_*: the setup, the API and the limiter reset all use these
        Object.assign(process.env, await startRedis());

        // Drops the E2E database (refusing any other), clears the limiter and the API log
        await globalSetup();
        mkdirSync(REPORT_DIR, { recursive: true });
        const spec = resolve(REPORT_DIR, 'openapi.json');
        writeFileSync(spec, JSON.stringify(openApiDocument(), null, 2));

        startApi();
        await waitForApi();
        const token = await signInFuzzer();
        const limits = createRedis();
        await limits.connect();
        const reset = setInterval(() => void clearRateLimitBuckets(limits).catch(() => undefined), LIMIT_RESET_MS);
        try {
            return await runSchemathesis(spec, token);
        } finally {
            clearInterval(reset);
            limits.disconnect();
        }
    } finally {
        stopEverything();
        console.log(`[fuzz] API log: ${API_LOG}`);
    }
}

/** A server already on the port may be pointed at the dev database: the fuzzer must own the one it hits. */
async function refuseRunningApi(): Promise<void> {
    const answered = await fetch(`${API_URL}/healthz`).then(
        () => true,
        () => false,
    );
    if (answered) {
        throw new Error(
            `[fuzz] An API is already listening on ${API_URL}. Stop it: the fuzzer starts its own, on the E2E database.`,
        );
    }
}

/** The pinned Schemathesis in a venv of its own, installed again whenever a pin changes. */
function installFuzzTools(): void {
    const wanted = readFileSync(REQUIREMENTS, 'utf8');
    if (existsSync(INSTALLED) && readFileSync(INSTALLED, 'utf8') === wanted) return;

    console.log(`[fuzz] installing ${REQUIREMENTS} into ${VENV}`);
    run('python3', ['-m', 'venv', VENV]);
    run(resolve(VENV, 'bin', 'pip'), ['install', '--quiet', '-r', REQUIREMENTS]);
    writeFileSync(INSTALLED, wanted);
}

function run(command: string, args: string[]): void {
    const result = spawnSync(command, args, { stdio: 'inherit' });
    if (result.status !== 0) throw new Error(`[fuzz] ${command} ${args.join(' ')} exited with ${result.status}`);
}

/**
 * The run's own Redis (no snapshot, no append log), as the env the API and the
 * setup read. Unset, those come from api/.env: the dev Redis, where the run's
 * buckets and cache entries would outlive it.
 */
async function startRedis(): Promise<Record<string, string>> {
    const port = await freePort();
    const args = ['--bind', STAND_IN_HOST, '--port', String(port), '--save', '', '--appendonly', 'no'];
    const child = spawn('redis-server', args, { stdio: 'ignore' });
    started.push(() => child.kill('SIGTERM'));
    let failure: Error | undefined;
    child.on('error', (err) => (failure = err));
    child.on('exit', (code) => (failure ??= new Error(`exited with code ${code}`)));

    const deadline = Date.now() + 30_000;
    while (!(await listening(port))) {
        if (failure !== undefined) throw new Error(`[fuzz] redis-server did not start: ${failure.message}`);
        if (Date.now() > deadline) throw new Error(`[fuzz] redis-server did not listen on ${port} within 30s`);
        await new Promise((done) => setTimeout(done, 200));
    }
    return { REDIS_HOST: STAND_IN_HOST, REDIS_PORT: String(port) };
}

/** A port nothing listens on: the system picks one, and it is closed again for the stand-in to take. */
function freePort(): Promise<number> {
    return new Promise((done, fail) => {
        const server = createServer();
        server.once('error', fail);
        server.listen(0, STAND_IN_HOST, () => {
            const address = server.address();
            if (typeof address !== 'object' || address === null) {
                fail(new Error('[fuzz] the system gave no port'));
                return;
            }
            server.close(() => done(address.port));
        });
    });
}

function listening(port: number): Promise<boolean> {
    return new Promise((done) => {
        const socket = connect(port, STAND_IN_HOST);
        socket.once('connect', () => {
            socket.destroy();
            done(true);
        });
        socket.once('error', () => done(false));
    });
}

/** The API on the E2E environment, logging to the file the E2E tripwire reads. */
function startApi(): void {
    const api = spawn('npx', ['tsx', 'src/index.ts'], {
        cwd: resolve(ROOT, 'api'),
        env: { ...process.env, LOG_FILE: API_LOG },
        stdio: 'ignore',
        // Its own process group, so stopping it stops tsx's child too
        detached: true,
    });
    started.push(() => {
        if (api.pid === undefined) return;
        try {
            // The whole group: npx may be gone while the API it started is not
            process.kill(-api.pid, 'SIGTERM');
        } catch {
            // Nothing left in the group
        }
    });
}

async function waitForApi(): Promise<void> {
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
        const up = await fetch(`${API_URL}/healthz`).then(
            (res) => res.ok,
            () => false,
        );
        if (up) return;
        await new Promise((done) => setTimeout(done, 500));
    }
    throw new Error(`[fuzz] The API did not answer ${API_URL}/healthz within 60s. Its log: ${API_LOG}`);
}

/** Registers the fuzzer and returns its access token. */
async function signInFuzzer(): Promise<string> {
    const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(FUZZER),
    });
    const session: unknown = await res.json();
    const token =
        typeof session === 'object' && session !== null && 'accessToken' in session ? session.accessToken : undefined;
    if (!res.ok || typeof token !== 'string') {
        throw new Error(`[fuzz] Could not register the fuzz user: ${res.status} ${JSON.stringify(session)}`);
    }
    return token;
}

/** Schemathesis's exit code: 0 when nothing failed. */
async function runSchemathesis(spec: string, token: string): Promise<number> {
    const seed = process.env['FUZZ_SEED'];
    const args = [
        '--config-file',
        resolve(FUZZ_DIR, 'schemathesis.toml'),
        'run',
        spec,
        '--url',
        API_URL,
        '--header',
        `Authorization: Bearer ${token}`,
        '--max-time',
        process.env['FUZZ_MAX_TIME'] ?? '120',
        '--report',
        'junit',
        '--report-dir',
        REPORT_DIR,
        ...(seed === undefined ? [] : ['--seed', seed]),
    ];
    // Its crash cache goes in the directory it starts in: beside this file, not the repository root
    const fuzzer = spawn(SCHEMATHESIS, args, { cwd: FUZZ_DIR, stdio: 'inherit' });
    return new Promise((done) => {
        fuzzer.on('exit', (code) => {
            done(code ?? 1);
        });
    });
}

// Ctrl-C reaches Redis with the terminal, but not the API in its own process
// group: stop everything here, or that API outlives the run
for (const [signal, code] of [
    ['SIGINT', 130],
    ['SIGTERM', 143],
] as const) {
    process.once(signal, () => {
        stopEverything();
        process.exit(code);
    });
}

main().then(
    (code) => process.exit(code),
    (err: unknown) => {
        console.error(err);
        process.exit(1);
    },
);
