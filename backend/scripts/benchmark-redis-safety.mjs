#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { performance } from 'perf_hooks';
import {
    acquireDistributedLock,
    closeCache,
    getCachedJson,
    initCache,
    invalidateByPrefix,
    isCacheAvailable,
    releaseDistributedLock,
    setCachedJson,
} from '../core/cache.js';
import { buildIdempotencyCacheKey } from '../utils/idempotency.js';

const parseArgs = (argv) => {
    const parsed = {};
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (!token.startsWith('--')) continue;

        const key = token.slice(2);
        const next = argv[i + 1];
        if (!next || next.startsWith('--')) {
            parsed[key] = true;
            continue;
        }

        parsed[key] = next;
        i += 1;
    }
    return parsed;
};

const percentile = (arr, p) => {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
    return sorted[Math.max(0, idx)];
};

const summarizeSamples = (samples) => {
    const durations = samples.map((v) => v.ms);
    const avgMs = durations.reduce((sum, ms) => sum + ms, 0) / (durations.length || 1);

    return {
        count: samples.length,
        minMs: Math.min(...durations),
        maxMs: Math.max(...durations),
        avgMs,
        p95Ms: percentile(durations, 95),
    };
};

const benchLockAcquireRelease = async ({ iterations, keyPrefix }) => {
    const samples = [];
    let acquiredCount = 0;

    for (let i = 0; i < iterations; i += 1) {
        const key = `${keyPrefix}:acquire-release:${i}`;
        const start = performance.now();
        const lock = await acquireDistributedLock(key, { ttlSeconds: 10 });
        if (lock.acquired) {
            acquiredCount += 1;
            await releaseDistributedLock(key, lock.token);
        }
        samples.push({ ms: performance.now() - start });
    }

    return {
        name: 'lock:acquire-release',
        stats: summarizeSamples(samples),
        meta: {
            iterations,
            acquiredCount,
            acquisitionRatePct: iterations ? (acquiredCount / iterations) * 100 : 0,
        },
    };
};

const benchLockContention = async ({ iterations, keyPrefix }) => {
    const samples = [];
    let contentionDetected = 0;

    for (let i = 0; i < iterations; i += 1) {
        const key = `${keyPrefix}:contention:${i}`;

        const start = performance.now();
        const [a, b] = await Promise.all([
            acquireDistributedLock(key, { ttlSeconds: 10 }),
            acquireDistributedLock(key, { ttlSeconds: 10 }),
        ]);

        if ((a.acquired && !b.acquired) || (!a.acquired && b.acquired)) {
            contentionDetected += 1;
        }

        if (a.acquired) await releaseDistributedLock(key, a.token);
        if (b.acquired) await releaseDistributedLock(key, b.token);

        samples.push({ ms: performance.now() - start });
    }

    return {
        name: 'lock:contention-same-key',
        stats: summarizeSamples(samples),
        meta: {
            iterations,
            contentionDetected,
            contentionDetectionRatePct: iterations ? (contentionDetected / iterations) * 100 : 0,
        },
    };
};

const benchIdempotencyFirstWriteThenReplay = async ({ iterations, keyPrefix }) => {
    const firstSamples = [];
    const replaySamples = [];

    for (let i = 0; i < iterations; i += 1) {
        const idempotencyCacheKey = buildIdempotencyCacheKey({
            scope: 'bench:safety:first-vs-replay',
            payload: { i },
            requestKey: `${keyPrefix}:request:${i}`,
        });

        const firstStart = performance.now();
        const existing = await getCachedJson(idempotencyCacheKey);
        if (!existing) {
            await setCachedJson(
                idempotencyCacheKey,
                {
                    statusCode: 200,
                    payload: { ok: true, iteration: i },
                },
                120
            );
        }
        firstSamples.push({ ms: performance.now() - firstStart });

        const replayStart = performance.now();
        await getCachedJson(idempotencyCacheKey);
        replaySamples.push({ ms: performance.now() - replayStart });
    }

    const first = summarizeSamples(firstSamples);
    const replay = summarizeSamples(replaySamples);

    return {
        name: 'idempotency:first-vs-replay',
        first,
        replay,
        improvementPct: first.avgMs > 0 ? ((first.avgMs - replay.avgMs) / first.avgMs) * 100 : 0,
        meta: { iterations },
    };
};

const benchControllerLikeGuard = async ({ iterations, keyPrefix }) => {
    const freshSamples = [];
    const replaySamples = [];
    let lockConflicts = 0;

    const simulatedBusinessOp = async (i) => ({ success: true, operationId: `op-${i}` });

    for (let i = 0; i < iterations; i += 1) {
        const opId = `${keyPrefix}:guard:${i}`;
        const idempotencyCacheKey = buildIdempotencyCacheKey({
            scope: 'bench:safety:guarded-op',
            payload: { opId },
            requestKey: opId,
        });

        const freshStart = performance.now();
        const cached = await getCachedJson(idempotencyCacheKey);
        if (!cached) {
            const lockKey = `bench:safety:lock:guarded-op:${opId}`;
            const lock = await acquireDistributedLock(lockKey, { ttlSeconds: 10 });
            if (!lock.acquired) {
                lockConflicts += 1;
            } else {
                try {
                    const payload = await simulatedBusinessOp(i);
                    await setCachedJson(idempotencyCacheKey, { statusCode: 200, payload }, 120);
                } finally {
                    await releaseDistributedLock(lockKey, lock.token);
                }
            }
        }
        freshSamples.push({ ms: performance.now() - freshStart });

        const replayStart = performance.now();
        await getCachedJson(idempotencyCacheKey);
        replaySamples.push({ ms: performance.now() - replayStart });
    }

    const fresh = summarizeSamples(freshSamples);
    const replay = summarizeSamples(replaySamples);

    return {
        name: 'controller-like:lock+idempotency',
        fresh,
        replay,
        improvementPct: fresh.avgMs > 0 ? ((fresh.avgMs - replay.avgMs) / fresh.avgMs) * 100 : 0,
        meta: {
            iterations,
            lockConflicts,
        },
    };
};

const markdownForResults = ({ generatedAt, iterations, results }) => {
    const lines = [
        '# Redis Safety Benchmark (Locks + Idempotency)',
        '',
        `Generated: ${generatedAt}`,
        `Iterations: ${iterations}`,
        '',
        '## Lock Benchmarks',
        '',
        '| Benchmark | Avg (ms) | P95 (ms) | Min (ms) | Max (ms) |',
        '|---|---:|---:|---:|---:|',
    ];

    for (const r of results.filter((x) => x.stats)) {
        lines.push(
            `| ${r.name} | ${r.stats.avgMs.toFixed(3)} | ${r.stats.p95Ms.toFixed(3)} | ${r.stats.minMs.toFixed(3)} | ${r.stats.maxMs.toFixed(3)} |`
        );
    }

    lines.push('', '## Idempotency / Guarded Operation Benchmarks', '');
    lines.push('| Benchmark | Fresh Avg (ms) | Replay Avg (ms) | Improvement % | Fresh P95 (ms) | Replay P95 (ms) |');
    lines.push('|---|---:|---:|---:|---:|---:|');

    for (const r of results.filter((x) => x.fresh || x.first)) {
        const fresh = r.fresh || r.first;
        const replay = r.replay;
        lines.push(
            `| ${r.name} | ${fresh.avgMs.toFixed(3)} | ${replay.avgMs.toFixed(3)} | ${r.improvementPct.toFixed(2)} | ${fresh.p95Ms.toFixed(3)} | ${replay.p95Ms.toFixed(3)} |`
        );
    }

    lines.push('', '## Notes');
    lines.push('- Benchmarks run against real Redis via core/cache helpers used by controllers.');
    lines.push('- Replay phase measures repeated request handling with same idempotency key.');

    return `${lines.join('\n')}\n`;
};

const main = async () => {
    const args = parseArgs(process.argv.slice(2));
    const iterations = Number.parseInt(args.iterations || '200', 10);
    const outDir = args.outDir || './benchmark-results/full-redis-audit';
    const keyPrefix = 'bench:safety';

    await initCache();

    if (!isCacheAvailable()) {
        throw new Error('Redis cache is not available. Start Redis first and rerun benchmark.');
    }

    await invalidateByPrefix(`${keyPrefix}:`);
    await invalidateByPrefix('idem:bench:safety:');

    const results = [];
    results.push(await benchLockAcquireRelease({ iterations, keyPrefix }));
    results.push(await benchLockContention({ iterations, keyPrefix }));
    results.push(await benchIdempotencyFirstWriteThenReplay({ iterations, keyPrefix }));
    results.push(await benchControllerLikeGuard({ iterations, keyPrefix }));

    const generatedAt = new Date().toISOString();
    const timestamp = generatedAt.replace(/[:.]/g, '-');

    await fs.mkdir(outDir, { recursive: true });
    const jsonPath = path.join(outDir, `redis-safety-benchmark-${timestamp}.json`);
    const mdPath = path.join(outDir, `redis-safety-benchmark-${timestamp}.md`);

    const payload = {
        generatedAt,
        iterations,
        redisAvailable: true,
        results,
    };

    await fs.writeFile(jsonPath, JSON.stringify(payload, null, 2));
    await fs.writeFile(mdPath, markdownForResults({ generatedAt, iterations, results }));

    await closeCache();

    // eslint-disable-next-line no-console
    console.log(`Saved JSON report: ${jsonPath}`);
    // eslint-disable-next-line no-console
    console.log(`Saved Markdown report: ${mdPath}`);
};

main().catch(async (err) => {
    try {
        await closeCache();
    } catch (_) {
        // ignore close errors
    }
    // eslint-disable-next-line no-console
    console.error('Redis safety benchmark failed:', err.message);
    process.exit(1);
});
