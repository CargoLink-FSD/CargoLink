#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

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

const stats = (samples) => {
  const total = samples.length;
  const successful = samples.filter((s) => s.ok).length;
  const durations = samples.map((s) => s.ms);
  const avg = durations.reduce((sum, ms) => sum + ms, 0) / (durations.length || 1);
  return {
    count: total,
    successRate: total ? (successful / total) * 100 : 0,
    minMs: Math.min(...durations),
    maxMs: Math.max(...durations),
    avgMs: avg,
    p95Ms: percentile(durations, 95),
  };
};

const withQuery = (url, params) => {
  const parsed = new URL(url);
  Object.entries(params).forEach(([key, value]) => {
    parsed.searchParams.set(key, String(value));
  });
  return parsed.toString();
};

const runPhase = async ({ endpoint, baseUrl, token, runs, warmup, phase }) => {
  const method = (endpoint.method || 'GET').toUpperCase();
  const samples = [];

  for (let i = 0; i < warmup + runs; i += 1) {
    const shouldCapture = i >= warmup;
    let targetUrl = `${baseUrl}${endpoint.path}`;

    if (phase === 'cold') {
      targetUrl = withQuery(targetUrl, { __cacheBypass: 1 });
    }

    const headers = {
      'Content-Type': 'application/json',
    };

    if (endpoint.auth && token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const start = performance.now();
    const response = await fetch(targetUrl, {
      method,
      headers,
      body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
    });
    const end = performance.now();

    if (shouldCapture) {
      samples.push({
        ms: end - start,
        status: response.status,
        ok: response.ok,
      });
    }
  }

  return stats(samples);
};

const toMarkdownTable = (results) => {
  const header = '| Endpoint | Cold Avg (ms) | Warm Avg (ms) | Improvement % | Cold P95 (ms) | Warm P95 (ms) |';
  const separator = '|---|---:|---:|---:|---:|---:|';
  const rows = results.map((r) => {
    const improvement = r.cold.avgMs > 0
      ? ((r.cold.avgMs - r.warm.avgMs) / r.cold.avgMs) * 100
      : 0;
    return `| ${r.name} | ${r.cold.avgMs.toFixed(2)} | ${r.warm.avgMs.toFixed(2)} | ${improvement.toFixed(2)} | ${r.cold.p95Ms.toFixed(2)} | ${r.warm.p95Ms.toFixed(2)} |`;
  });
  return [header, separator, ...rows].join('\n');
};

const defaultEndpoints = [
  { name: 'Admin Dashboard Stats', method: 'GET', path: '/api/admin/dashboard/stats', auth: true },
  { name: 'Admin Orders (Page 1)', method: 'GET', path: '/api/admin/orders?page=1&limit=20', auth: true },
  { name: 'Manager Tickets List', method: 'GET', path: '/api/tickets/manager/all?page=1&limit=10', auth: true },
  { name: 'My Orders', method: 'GET', path: '/api/orders/my-orders?page=1&limit=10', auth: true },
];

const main = async () => {
  const args = parseArgs(process.argv.slice(2));

  const baseUrl = args.baseUrl || process.env.BENCH_BASE_URL || 'http://localhost:3000';
  const token = args.token || process.env.BENCH_TOKEN || '';
  const runs = Number.parseInt(args.runs || process.env.BENCH_RUNS || '30', 10);
  const warmup = Number.parseInt(args.warmup || process.env.BENCH_WARMUP || '5', 10);
  const outDir = args.outDir || process.env.BENCH_OUT_DIR || './benchmark-results';

  let endpoints = defaultEndpoints;
  if (args.config) {
    const resolved = path.resolve(args.config);
    const raw = await fs.readFile(resolved, 'utf8');
    endpoints = JSON.parse(raw);
  }

  const results = [];
  for (const endpoint of endpoints) {
    if (endpoint.auth && !token) {
      console.warn(`Skipping ${endpoint.name || endpoint.path} (auth required, missing token)`);
      continue;
    }

    console.log(`Running benchmark for ${endpoint.name || endpoint.path} ...`);
    const cold = await runPhase({ endpoint, baseUrl, token, runs, warmup, phase: 'cold' });
    const warm = await runPhase({ endpoint, baseUrl, token, runs, warmup, phase: 'warm' });
    results.push({ name: endpoint.name || endpoint.path, path: endpoint.path, cold, warm });
  }

  await fs.mkdir(outDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(outDir, `cache-benchmark-${timestamp}.json`);
  const markdownPath = path.join(outDir, `cache-benchmark-${timestamp}.md`);

  await fs.writeFile(jsonPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    baseUrl,
    runs,
    warmup,
    results,
  }, null, 2));

  const markdown = [
    '# Redis Cache Benchmark',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Base URL: ${baseUrl}`,
    `Runs per phase: ${runs} (warmup ${warmup})`,
    '',
    toMarkdownTable(results),
    '',
    '## Notes',
    '- Cold phase uses cache bypass query param so requests skip Redis entirely.',
    '- Warm phase sends repeated identical requests to measure cache effect.',
    '- For fair comparison, benchmark with same dataset and environment.',
  ].join('\n');

  await fs.writeFile(markdownPath, markdown);

  console.log('\nBenchmark summary:\n');
  console.log(toMarkdownTable(results));
  console.log(`\nSaved JSON report: ${jsonPath}`);
  console.log(`Saved Markdown report: ${markdownPath}`);
};

main().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
