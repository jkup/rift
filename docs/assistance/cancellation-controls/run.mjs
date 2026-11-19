// CL-006 evidence driver. Run from typescript/ after both builds:
//   node docs/assistance/cancellation-controls/run.mjs [idleRuns] [loadedRuns]
// Writes results.json beside this file. Exit 1 if any expectation below fails.
//  1. reproduce: the retained ts-031c-b T30 failure, made deterministic against the
//     unchanged observe.mjs by aborting before validateLaunch can settle.
//  2. mutants: copies of tools/test262 under build/ with one cancellation fault
//     each; the T30 tests must fail on every mutant and pass on the unmutated copy.
//  3. repeats: the full observation suite, idle and under CPU load.
import { spawn, spawnSync } from 'node:child_process';
import { availableParallelism } from 'node:os';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { blobHash, sha256, transform } from '../../../tools/test262/input.mjs';
import { prepareObservation, launchObservation } from '../../../tools/test262/observe.mjs';

const [idleRuns = 10, loadedRuns = 5] = process.argv.slice(2).map(Number);
const archiveRoot = resolve('build/observations');
await mkdir(archiveRoot, { recursive: true });
const failures = [];
const expect = (ok, what) => { if (!ok) failures.push(what); return ok; };

function options(source) {
  const sourceBytes = Buffer.from(source);
  const v = { id: 'synthetic-node', path: 'test/synthetic.js', lane: 'node', variant: 'non-strict', goal: 'Script',
    blob: blobHash(sourceBytes), sourceSha256: sha256(sourceBytes), transformedSourceSha256: sha256(transform(sourceBytes, 'non-strict')),
    metadata: { negative: null }, harness: [], blockers: [{ status: 'unsupported-profile', reasonCode: 'synthetic-profile' }] };
  return { selection: { revision: 'b'.repeat(40), manifestSha256: 'a'.repeat(64), files: [{ path: v.path, inputError: null, variants: [v] }] },
    variantId: v.id, sourceBytes, mode: 'body-observation', archiveRoot, limits: { steps: Number.MAX_SAFE_INTEGER } };
}

// 1. The original T30 sequence with the abort moved to the stage it reached under load.
const reproduce = [];
for (let i = 0; i < 5; i++) {
  const plan = await prepareObservation(options('while(true){}'));
  const controller = new AbortController();
  const promise = launchObservation(plan, { signal: controller.signal });
  controller.abort();
  const result = await promise;
  const attempt = JSON.parse(await readFile(join(plan.directory, 'attempt.json'), 'utf8'));
  let transport;
  try { transport = JSON.parse(await readFile(join(plan.directory, 'transport.json'), 'utf8')); } catch (e) { transport = e.code; }
  const row = { state: result.state, attemptState: attempt.state, attemptHasRecord: Object.hasOwn(attempt, 'record'),
    files: (await readdir(plan.directory)).sort(), transport };
  expect(row.state === 'unfinished' && row.attemptState === 'unfinished' && !row.attemptHasRecord && row.transport === 'ENOENT',
    `reproduce ${i}: ${JSON.stringify(row)}`);
  reproduce.push(row);
}

// 2. Mutants. Each replacement must match exactly once in the copied observe.mjs.
const mutations = [
  { name: 'control', from: null },
  { name: 'cancel-does-not-kill', from: 'const cancel = () => { cancelled = true; child.kill(); };', to: 'const cancel = () => { cancelled = true; };' },
  { name: 'no-prelaunch-abort-check', from: "if (signal?.aborted) return { state: 'unfinished', directory };", to: '' },
  { name: 'cancel-completes-record', from: "if (cancelled) return { state: 'unfinished', directory };", to: '' },
  { name: 'cancel-skips-transport', from: "await persist(join(directory, 'transport.json'), { ...facts, spawnError, cancelled });\n  if (cancelled) return { state: 'unfinished', directory };",
    to: "if (cancelled) return { state: 'unfinished', directory };\n  await persist(join(directory, 'transport.json'), { ...facts, spawnError, cancelled });" },
];
const mutantDir = name => resolve(`build/cl-006-mutant-${name}`);
for (const m of mutations) await rm(mutantDir(m.name), { recursive: true, force: true });
const mutants = [];
for (const m of mutations) {
  // build/cl-006-mutant-<name>/ is two levels below typescript/, like tools/test262/, so observe.mjs
  // resolves the same root and builds.
  const dir = mutantDir(m.name);
  await cp(resolve('tools/test262'), dir, { recursive: true, filter: src => !src.endsWith('.test.mjs') });
  if (m.from !== null) {
    const file = join(dir, 'observe.mjs'), text = (await readFile(file, 'utf8')).replaceAll('\r\n', '\n');
    if (text.split(m.from).length !== 2) throw new Error(`mutation ${m.name} does not match exactly once`);
    await writeFile(file, text.replace(m.from, m.to));
  }
  const r = spawnSync(process.execPath, ['--test-name-pattern=T30', join(dir, 'observation.integration.mjs')], { encoding: 'utf8', timeout: 180000 });
  const lines = r.stdout.split(/\r?\n/);
  const row = { name: m.name, status: r.status, signal: r.signal,
    passed: lines.filter(l => l.startsWith('✔')).map(l => l.replace(/ \([\d.]+ms\)$/, '').slice(2)),
    failed: lines.filter(l => l.startsWith('✖') && !l.startsWith('✖ failing')).map(l => l.replace(/ \([\d.]+ms\)$/, '').slice(2)) };
  row.failed = [...new Set(row.failed)];
  // First assertion or error lines of the failing tests, for the evidence record.
  row.detail = [...new Set(lines.filter(l => /^\s+(\[?\w*Error|AssertionError|code:|actual:|expected:)/.test(l)).map(l => l.trim()))].slice(0, 12);
  if (m.from === null) expect(r.status === 0 && row.passed.length === 7 && row.failed.length === 0, `control: ${JSON.stringify(row)}`);
  else expect(r.status !== 0 && row.failed.length > 0, `mutant ${m.name} not detected: ${JSON.stringify(row)}`);
  mutants.push(row);
}
for (const m of mutations) await rm(mutantDir(m.name), { recursive: true, force: true });

// 3. Repeats of the whole suite. Loaded runs keep every core busy with a spin loop.
function suite() {
  const r = spawnSync(process.execPath, ['tools/test262/observation.integration.mjs'], { encoding: 'utf8', timeout: 300000 });
  const count = key => Number((r.stdout.match(new RegExp(`ℹ ${key} (\\d+)`)) ?? [])[1]);
  return { status: r.status, tests: count('tests'), pass: count('pass'), fail: count('fail'),
    t30: r.stdout.split(/\r?\n/).filter(l => /^[✔✖] .*T30/.test(l)).map(l => l.replace(/ \([\d.]+ms\)$/, '')) };
}
const repeats = { idle: [], loaded: [], burners: availableParallelism() };
for (let i = 0; i < idleRuns; i++) repeats.idle.push(suite());
const burners = Array.from({ length: repeats.burners }, () => spawn(process.execPath, ['-e', 'for(;;){}'], { stdio: 'ignore' }));
try { for (let i = 0; i < loadedRuns; i++) repeats.loaded.push(suite()); }
finally { for (const b of burners) b.kill(); }
for (const [kind, runs] of Object.entries({ idle: repeats.idle, loaded: repeats.loaded })) runs.forEach((run, i) =>
  expect(run.status === 0 && run.tests === 22 && run.pass === 22 && run.fail === 0, `${kind} run ${i}: ${JSON.stringify(run)}`));

const results = { node: process.version, platform: `${process.platform}/${process.arch}`, reproduce, mutants, repeats, failures };
await writeFile(new URL('results.json', import.meta.url), JSON.stringify(results, null, 1) + '\n');
console.log(JSON.stringify({ reproduce: reproduce.map(r => r.transport), mutants: mutants.map(m => `${m.name}: status ${m.status}, failed ${m.failed.length}`),
  idle: repeats.idle.map(r => `${r.pass}/${r.tests}`), loaded: repeats.loaded.map(r => `${r.pass}/${r.tests}`), burners: repeats.burners, failures }, null, 1));
process.exitCode = failures.length === 0 ? 0 : 1;
