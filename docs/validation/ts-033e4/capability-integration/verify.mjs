import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { probeVerdict, completed } from '../../../../tools/probe-verdict.mjs';
import { blockers } from '../../../../tools/test262/input.mjs';

// This checkpoint owns its allowlist. Never change or reuse the old base522413d
// proposal verifier to imply that its historical ownership covers a new task.
const repo = fileURLToPath(new URL('../../../../../', import.meta.url));
const base = '7d3f369', prefix = 'typescript/docs/validation/ts-033e4/capability-integration/';
const contract = 'typescript/docs/script-execution-capability-boundary.md';
const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trimEnd();
const read = p => readFileSync(join(repo, p));
const json = p => JSON.parse(read(p));
const sha256 = data => createHash('sha256').update(data).digest('hex');
const blobHash = data => createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');
const normalize = text => text.replaceAll('\r\n', '\n');
const allowed = p => p.startsWith(prefix) || p === contract || p === 'typescript/TASKS.md' || p === 'typescript/COORDINATION.md';
const changed = git('diff', '--name-only', base).split('\n').filter(Boolean);
const untracked = git('ls-files', '--others', '--exclude-standard').split('\n').filter(Boolean);
for (const p of [...changed, ...untracked]) assert.ok(allowed(p), `outside checkpoint ownership: ${p}`);
const heading = '### TS-033E4-C — Accepted capability contract and combined boundary feasibility';
const crossReference = 'E4-C checkpoint: production remains blocked pending independent review of docs/script-execution-capability-boundary.md and the combined evidence in docs/validation/ts-033e4/capability-integration/. This supersedes only the accepted mapped host-interface requirements; no production activation or successor is authorized.\n\n';
const tasks = normalize(read('typescript/TASKS.md').toString());
assert.equal(tasks.split(heading)[0].replace(crossReference, ''), normalize(git('show', base + ':typescript/TASKS.md')).split(heading)[0], 'unowned task entry changed');
assert.equal(tasks.split(heading).length, 2);
assert.ok(!tasks.split(heading)[1].includes('\n### '), 'new task outside scope');

const protectedHashes = [];
for (const entry of git('ls-tree', '-r', base).split('\n')) {
    const [metadata, path] = entry.split('\t');
    if (path === 'typescript/TASKS.md' || path === 'typescript/COORDINATION.md') continue;
    const expected = metadata.split(' ')[2], data = read(path);
    // Checkout may use CRLF. Accept Git's LF-normalized representation or exact
    // binary bytes; record exact working-file SHA256 for reviewer replay.
    assert.ok(blobHash(data) === expected || blobHash(Buffer.from(normalize(data.toString()))) === expected, `protected content: ${path}`);
    protectedHashes.push({ path, gitBlob: expected, sha256: sha256(data) });
}
const matrixPrefix = 'typescript/docs/validation/ts-033e4/';
for (const file of ['execution-matrix.md', 'setup-matrix.md', 'accessor-matrix.md', 'activation-matrix.md', 'restricted-traces.json'])
    assert.deepEqual(read(matrixPrefix + file), read('typescript/docs/validation/ts-033e4-p/' + file));
assert.equal(read(matrixPrefix + 'execution-matrix.md').toString().split(/\r?\n/).filter(s => /^\| [PGLTFCRU]\d\d \|/.test(s)).length, 55);
assert.equal(read(matrixPrefix + 'activation-matrix.md').toString().split(/\r?\n/).filter(s => /^\| A\d\d \|/.test(s)).length, 18);
assert.equal(json(matrixPrefix + 'restricted-traces.json').rows.length, 13);
assert.match(read(matrixPrefix + 'accessor-matrix.md').toString(), /\| R36 \|/);
for (const [file, count] of [['guest-node-results.json', 212], ['guest-native-results.json', 212], ['native-build-results.json', 48]])
    assert.equal(json('typescript/docs/validation/ts-033er-b/' + file).length, count);
const manifest = json('typescript/fixtures/assistance/test262-starter-corpus/manifest.json');
const variants = manifest.entries.flatMap(e => e.variants.map(variant => ({ id: e.id, variant,
    blockers: blockers({ flags: e.flags, features: e.features, negative: e.negative ?? null, locale: [] }, variant, e.id) })));
assert.equal(variants.length, 60); assert.ok(variants.every(v => v.blockers.length));

const evidence = process.argv[2] ?? 'run-4.json';
assert.match(evidence, /^run-\d+\.json$/);
const final = json(prefix + evidence);
assert.ok(completed(final.typecheck));
assert.match(final.coverage.stdout, /statements analyzed\s+2479\b/);
for (const [input, property, amount] of [['seed', 'alpha', 7], ['other', 'beta', 11]]) {
    assert.equal(probeVerdict({ ...final[input], build: final.build, coverage: final.coverage }), 'PASS');
    const expected = `PASS ${property} captured owner two sessions normal guest identity effects=${amount}\nPASS cleanup host identity call-depth limits retained unit A=6/10/78 B=1/1/8 leaf=5 guest=1 host=2\nPASS profile-first exact errors tuple neighbors replay direct denial production closed\nPASS guest code-root unwind snapshot isolation final A=6/11/86 productionRaw=0\n`;
    for (const lane of ['node', 'native']) { assert.equal(final[input][lane].stdout, expected); assert.equal(final[input][lane].stderr, ''); }
}
assert.match(read(prefix + 'initial-runner-path-failure.txt').toString(), /ERR_MODULE_NOT_FOUND/);
assert.equal(json(prefix + 'run-1.json').typecheck.status, 2);
assert.match(json(prefix + 'run-1.json').typecheck.stdout, /TS2322/);
assert.equal(json(prefix + 'run-2.json').build.status, 1);
assert.match(json(prefix + 'run-2.json').build.stderr, /unable to find zig installation directory/);
const checks = json(prefix + 'checks.json');
for (const check of checks) assert.ok(completed(check), check.name);
const ownedHashes = {};
for (const name of readdirSync(new URL('.', import.meta.url)).filter(n => n !== 'verification.json').sort())
    ownedHashes[name] = sha256(read(prefix + name));
writeFileSync(new URL('verification.json', import.meta.url), JSON.stringify({ base: git('rev-parse', base),
    kind: 'combined model feasibility and preservation; not production activation or full inherited suite replay',
    protectedFiles: protectedHashes.length, sourceTestFiles: protectedHashes.filter(r => /^typescript\/(src|test)\//.test(r.path)).length,
    protectedHashes, ownedHashes, contractHash: sha256(read(contract)), inherited: { rows: 55, activation: 18, traces: 13, recordsPerLane: 212, gates: 48 },
    variants, combined: { evidence, staticStatements: 2479, dynamicStatements: 0, runtimeInputs: ['seed', 'other'], lanes: ['node', 'native'] },
}, null, 2) + '\n');
console.log(`PASS ${protectedHashes.length} protected files; 55/A18/13 traces; retained212/212/48; 60 blocked; combined2479static/two inputs; failures retained`);
