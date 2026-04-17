import fs from 'node:fs/promises';
import path from 'node:path';

const backendRoot = process.cwd();
const routesDir = path.join(backendRoot, 'routes');
const testsDir = path.join(backendRoot, '__test__');
const docsDir = path.join(backendRoot, 'docs');

const httpMethods = new Set(['get', 'post', 'put', 'patch', 'delete']);

const normalizePath = (p) => {
  if (!p) return '/';
  let out = p.trim();
  out = out.replace(/\$\{[^}]+\}/g, ':param');
  out = out.replace(/\/+/g, '/');
  if (!out.startsWith('/')) out = `/${out}`;
  if (out.length > 1 && out.endsWith('/')) out = out.slice(0, -1);
  return out;
};

const splitSegments = (p) => normalizePath(p).split('/').filter(Boolean);

const isDynamicLike = (segment) => {
  if (!segment) return false;
  if (segment.startsWith(':')) return true;
  if (segment === ':param') return true;
  if (/^[a-f0-9]{24}$/i.test(segment)) return true;
  if (/^\d+$/.test(segment)) return true;
  return false;
};

const pathMatches = (routePath, testedPath) => {
  const a = splitSegments(routePath);
  const b = splitSegments(testedPath);
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i += 1) {
    const routeSeg = a[i];
    const testSeg = b[i];
    if (routeSeg === testSeg) continue;
    if (isDynamicLike(routeSeg) || isDynamicLike(testSeg)) continue;
    return false;
  }

  return true;
};

const readText = async (filePath) => fs.readFile(filePath, 'utf8');

const stripComments = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|\s)\/\/.*$/gm, '$1');

const getMountedPrefixes = async () => {
  const indexPath = path.join(routesDir, 'index.js');
  const content = await readText(indexPath);
  const importRegex = /import\s+(\w+)\s+from\s+['"`]\.\/(\w+Routes\.js)['"`]/g;
  const importToFile = new Map();

  let i;
  while ((i = importRegex.exec(content)) !== null) {
    importToFile.set(i[1], i[2]);
  }

  const mountRegex = /router\.use\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\w+)\s*\)/g;
  const out = new Map();
  let m;
  while ((m = mountRegex.exec(content)) !== null) {
    const importVar = m[2];
    const routeFileName = importToFile.get(importVar);
    if (!routeFileName) continue;
    out.set(routeFileName, normalizePath(m[1]));
  }
  return out;
};

const getRouteFiles = async () => {
  const entries = await fs.readdir(routesDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('Routes.js') && e.name !== 'index.js')
    .map((e) => path.join(routesDir, e.name));
};

const extractRoutesFromFile = async (filePath, mountsByFile) => {
  const content = stripComments(await readText(filePath));
  const routerVarMatch = content.match(/const\s+(\w+)\s*=\s*Router\(\s*\)/);
  if (!routerVarMatch) return [];

  const routerVar = routerVarMatch[1];
  const prefix = mountsByFile.get(path.basename(filePath)) ?? '/';
  const methodRegex = new RegExp(routerVar + "\\.(get|post|put|patch|delete)\\(\\s*([\"'])([^\"']+)\\2", 'g');

  const routes = [];
  let m;
  while ((m = methodRegex.exec(content)) !== null) {
    const method = m[1].toUpperCase();
    const localPath = normalizePath(m[3]);
    const fullPath = normalizePath(`${prefix}/${localPath}`);

    routes.push({
      method,
      path: fullPath,
      sourceFile: path.relative(backendRoot, filePath),
    });
  }

  return routes;
};

const walk = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return full;
  }));
  return files.flat();
};

const getTestFiles = async () => {
  const files = await walk(testsDir);
  return files.filter((f) => f.endsWith('.test.js'));
};

const extractTestedEndpointsFromFile = async (filePath) => {
  const content = await readText(filePath);
  const requestRegex = /\.(get|post|put|patch|delete)\(\s*(["'`])([\s\S]*?)\2\s*\)/g;
  const describeRegex = /describe\(\s*(["'`])\s*(GET|POST|PUT|PATCH|DELETE)\s+([^"'`]+?)\s*\1\s*,/g;
  const arrayRegex = /const\s+(\w+)\s*=\s*\[([\s\S]*?)\];/g;
  const loopRegex = /for\s*\(\s*const\s+(\w+)\s+of\s+(\w+)\s*\)\s*\{([\s\S]*?)\}/g;
  const endpoints = [];
  let m;

  while ((m = requestRegex.exec(content)) !== null) {
    const method = m[1].toUpperCase();
    if (!httpMethods.has(m[1])) continue;

    const rawPath = m[3].trim();
    if (!rawPath.startsWith('/api/')) continue;

    endpoints.push({
      method,
      path: normalizePath(rawPath),
      testFile: path.relative(backendRoot, filePath),
    });
  }

  while ((m = describeRegex.exec(content)) !== null) {
    const method = m[2].toUpperCase();
    const rawPath = m[3].trim();
    if (!rawPath.startsWith('/api/')) continue;
    endpoints.push({
      method,
      path: normalizePath(rawPath),
      testFile: path.relative(backendRoot, filePath),
    });
  }

  const arrayMap = new Map();
  while ((m = arrayRegex.exec(content)) !== null) {
    const varName = m[1];
    const body = m[2];
    const paths = [];
    const strRegex = /(["'`])(\/api\/[^"'`]+)\1/g;
    let s;
    while ((s = strRegex.exec(body)) !== null) {
      paths.push(normalizePath(s[2]));
    }
    if (paths.length) arrayMap.set(varName, paths);
  }

  while ((m = loopRegex.exec(content)) !== null) {
    const itemVar = m[1];
    const arrayVar = m[2];
    const block = m[3];
    const paths = arrayMap.get(arrayVar);
    if (!paths?.length) continue;

    const methodUse = new RegExp(`\\.(get|post|put|patch|delete)\\(\\s*${itemVar}\\s*\\)`, 'g');
    let mm;
    while ((mm = methodUse.exec(block)) !== null) {
      const method = mm[1].toUpperCase();
      for (const p of paths) {
        endpoints.push({
          method,
          path: p,
          testFile: path.relative(backendRoot, filePath),
        });
      }
    }
  }

  return endpoints;
};

const run = async () => {
  const mountsByFile = await getMountedPrefixes();
  const routeFiles = await getRouteFiles();
  const routeLists = await Promise.all(routeFiles.map((f) => extractRoutesFromFile(f, mountsByFile)));
  const discoveredRoutes = routeLists.flat();

  const uniqueRouteMap = new Map();
  for (const route of discoveredRoutes) {
    uniqueRouteMap.set(`${route.method} ${route.path}`, route);
  }
  const allRoutes = [...uniqueRouteMap.values()].sort((a, b) => `${a.method} ${a.path}`.localeCompare(`${b.method} ${b.path}`));

  const testFiles = await getTestFiles();
  const testedLists = await Promise.all(testFiles.map(extractTestedEndpointsFromFile));
  const testedEndpoints = testedLists.flat();

  const coverageRows = allRoutes.map((route) => {
    const matchedTests = testedEndpoints.filter((endpoint) => endpoint.method === route.method && pathMatches(route.path, endpoint.path));
    const tested = matchedTests.length > 0;
    return {
      ...route,
      tested,
      matchedBy: [...new Set(matchedTests.map((m) => m.testFile))],
    };
  });

  const coveredCount = coverageRows.filter((r) => r.tested).length;
  const totalCount = coverageRows.length;
  const coveragePct = totalCount === 0 ? 100 : Number(((coveredCount / totalCount) * 100).toFixed(2));

  await fs.mkdir(docsDir, { recursive: true });

  const jsonOutputPath = path.join(docsDir, 'route-coverage-report.json');
  await fs.writeFile(
    jsonOutputPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        summary: {
          totalRoutes: totalCount,
          coveredRoutes: coveredCount,
          uncoveredRoutes: totalCount - coveredCount,
          coveragePercent: coveragePct,
        },
        routes: coverageRows,
      },
      null,
      2,
    ),
    'utf8',
  );

  const coveredSection = coverageRows
    .filter((r) => r.tested)
    .map((r) => `- [x] ${r.method} ${r.path} ← ${r.matchedBy.join(', ')}`)
    .join('\n');

  const uncoveredSection = coverageRows
    .filter((r) => !r.tested)
    .map((r) => `- [ ] ${r.method} ${r.path} (${r.sourceFile})`)
    .join('\n');

  const mdOutputPath = path.join(docsDir, 'route-coverage-report.md');
  await fs.writeFile(
    mdOutputPath,
    `# Route Coverage Report\n\n` +
      `Generated: ${new Date().toISOString()}\n\n` +
      `## Summary\n\n` +
      `- Total routes: ${totalCount}\n` +
      `- Covered routes: ${coveredCount}\n` +
      `- Uncovered routes: ${totalCount - coveredCount}\n` +
      `- Coverage: ${coveragePct}%\n\n` +
      `## Covered Routes\n\n` +
      `${coveredSection || '- None'}\n\n` +
      `## Uncovered Routes\n\n` +
      `${uncoveredSection || '- None'}\n`,
    'utf8',
  );

  // eslint-disable-next-line no-console
  console.log(`Route coverage report generated:\n- ${path.relative(backendRoot, jsonOutputPath)}\n- ${path.relative(backendRoot, mdOutputPath)}`);
};

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to generate route coverage report:', error);
  process.exit(1);
});
