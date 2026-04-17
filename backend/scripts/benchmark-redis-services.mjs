#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { performance } from 'perf_hooks';
import { connectDB } from '../core/db.js';
import { closeCache, initCache, invalidateByPrefix } from '../core/cache.js';
import adminService from '../services/adminService.js';
import geocodingService from '../services/geocodingService.js';
import pricingService from '../services/pricingService.js';
import { getTollCost } from '../services/tollService.js';

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

const summarize = (samples) => {
    const durations = samples.map((s) => s.ms);
    const avg = durations.reduce((sum, ms) => sum + ms, 0) / (durations.length || 1);
    return {
        count: samples.length,
        minMs: Math.min(...durations),
        maxMs: Math.max(...durations),
        avgMs: avg,
        p95Ms: percentile(durations, 95),
    };
};

const benchCase = async ({ name, prefix, coldRuns, warmRuns, invoke }) => {
    const coldSamples = [];
    const warmSamples = [];

    for (let i = 0; i < coldRuns; i += 1) {
        if (prefix) {
            await invalidateByPrefix(prefix);
        }

        const start = performance.now();
        await invoke();
        coldSamples.push({ ms: performance.now() - start });
    }

    await invoke(); // warm prime

    for (let i = 0; i < warmRuns; i += 1) {
        const start = performance.now();
        await invoke();
        warmSamples.push({ ms: performance.now() - start });
    }

    const cold = summarize(coldSamples);
    const warm = summarize(warmSamples);
    const improvementPct = cold.avgMs > 0 ? ((cold.avgMs - warm.avgMs) / cold.avgMs) * 100 : 0;

    return {
        name,
        cachePrefix: prefix,
        cold,
        warm,
        improvementPct,
    };
};

const table = (results) => {
    const header = '| Service Benchmark | Cold Avg (ms) | Warm Avg (ms) | Improvement % | Cold P95 (ms) | Warm P95 (ms) |';
    const sep = '|---|---:|---:|---:|---:|---:|';
    const rows = results.map((r) =>
        `| ${r.name} | ${r.cold.avgMs.toFixed(2)} | ${r.warm.avgMs.toFixed(2)} | ${r.improvementPct.toFixed(2)} | ${r.cold.p95Ms.toFixed(2)} | ${r.warm.p95Ms.toFixed(2)} |`
    );
    return [header, sep, ...rows].join('\n');
};

const main = async () => {
    const args = parseArgs(process.argv.slice(2));
    const coldRuns = Number.parseInt(args.coldRuns || '5', 10);
    const warmRuns = Number.parseInt(args.warmRuns || '15', 10);
    const outDir = args.outDir || './benchmark-results/full-redis-audit';

    const cases = [
        {
            name: 'svc:admin-dashboard getDashboardStats',
            prefix: 'svc:admin-dashboard:',
            invoke: async () => adminService.getDashboardStats(),
        },
        {
            name: 'svc:geocode geocodeAddress',
            prefix: 'svc:geocode:',
            invoke: async () => geocodingService.geocodeAddress('Connaught Place, New Delhi, India'),
        },
        {
            name: 'svc:distance calculateDistance',
            prefix: 'svc:distance:',
            invoke: async () => geocodingService.calculateDistance({ lat: 28.6139, lng: 77.2090 }, { lat: 19.076, lng: 72.8777 }),
        },
        {
            name: 'svc:toll getTollCost',
            prefix: 'svc:toll:',
            invoke: async () => getTollCost({ lat: 28.6139, lng: 77.209 }, { lat: 28.4595, lng: 77.0266 }),
        },
        {
            name: 'svc:pricing calculatePrice',
            prefix: 'svc:pricing:',
            invoke: async () => pricingService.calculatePrice({
                distance: 145.5,
                vehicle_type: 'truck-medium',
                weight: 5200,
                volume: 22,
                goods_type: 'machinery',
                cargo_value: 250000,
                insurance_tier: 'standard',
                originCoords: { lat: 28.6139, lng: 77.209 },
                destCoords: { lat: 28.4595, lng: 77.0266 },
            }),
        },
    ];

    const results = [];
    const failures = [];

    try {
        await initCache();
        await connectDB();

        for (const c of cases) {
            try {
                // eslint-disable-next-line no-console
                console.log(`Running ${c.name}...`);
                const result = await benchCase({
                    name: c.name,
                    prefix: c.prefix,
                    coldRuns,
                    warmRuns,
                    invoke: c.invoke,
                });
                results.push(result);
            } catch (err) {
                failures.push({ name: c.name, error: err.message });
            }
        }
    } finally {
        await closeCache();
    }

    await fs.mkdir(outDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonPath = path.join(outDir, `service-cache-benchmark-${timestamp}.json`);
    const mdPath = path.join(outDir, `service-cache-benchmark-${timestamp}.md`);

    const payload = {
        generatedAt: new Date().toISOString(),
        coldRuns,
        warmRuns,
        results,
        failures,
    };

    await fs.writeFile(jsonPath, JSON.stringify(payload, null, 2));

    const lines = [
        '# Redis Service-Level Cache Benchmark',
        '',
        `Generated: ${new Date().toISOString()}`,
        `Cold runs: ${coldRuns}`,
        `Warm runs: ${warmRuns}`,
        '',
    ];

    if (results.length) {
        lines.push(table(results), '');
    }

    if (failures.length) {
        lines.push('## Failures');
        for (const f of failures) {
            lines.push(`- ${f.name}: ${f.error}`);
        }
        lines.push('');
    }

    await fs.writeFile(mdPath, lines.join('\n'));

    // eslint-disable-next-line no-console
    console.log(`Saved JSON report: ${jsonPath}`);
    // eslint-disable-next-line no-console
    console.log(`Saved Markdown report: ${mdPath}`);
};

main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Service benchmark failed:', err);
    process.exit(1);
});
