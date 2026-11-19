import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { frozenManifest, variants } from '../../../tools/test262/input.mjs';
import { reconstructScriptDebts } from '../../../tools/test262/script-capabilities.mjs';
const dir = 'docs/validation/ts-035e1/';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = path => JSON.parse(readFileSync(path));
const preserved = json('docs/validation/ts-035e-p/preservation.json');
function preserve() {
  for (const row of preserved) assert.equal(hash(readFileSync(row.path)), row.sha256, row.path);
  assert.equal(preserved.length, 5227);
}
preserve();
const suites = [
  ['E1', ['--test', 'tools/test262/script-capabilities.test.mjs']],
  ['host73', ['--test', ...readdirSync('tools/test262').filter(f => f.endsWith('.test.mjs') && !f.startsWith('script-')).map(f => 'tools/test262/' + f)]],
  ['script-decoders', ['--test', 'tools/test262/script-result.test.mjs', 'tools/test262/script-driver-result.test.mjs']],
  ['observations22', ['tools/test262/observation.integration.mjs']],
  ['runner20', ['--test', 'tools/probe-verdict.test.mjs']],
  ['typecheck', ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json']],
];
const results = [];
for (const [name, args] of suites) {
  const result = spawnSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 32e6, timeout: 300000 });
  writeFileSync(dir + name + '.txt', result.stdout + result.stderr);
  results.push({ name, args, status: result.status, signal: result.signal, error: result.error?.message ?? null });
  writeFileSync(dir + 'suite-results.json', JSON.stringify(results, null, 2) + '\n');
  console.log(name + ': ' + result.status);
  assert.equal(result.status, 0, result.stderr); assert.equal(result.signal, null);
}
preserve();
const { manifest } = await frozenManifest();
const fields = ['flags','features','includes','locale','negative'];
const corpus = manifest.entries.flatMap(e => {
  const metadata = Object.fromEntries(fields.map(k => [k, structuredClone(e[k] ?? (k === 'negative' ? null : []))]));
  return variants(metadata).map(variant => ({ id: e.id, variant, debts: reconstructScriptDebts(metadata, variant, e.id) }));
});
assert.equal(corpus.length, 60);
assert.equal(corpus.filter(r => r.debts[0].status === 'unsupported-feature').length, 19);
assert.equal(corpus.filter(r => r.debts[0].status === 'unsupported-profile').length, 41);
for (const lane of ['node','native']) {
  const records = json('docs/validation/ts-035d8/guest-' + lane + '-results.json');
  assert.equal(records.length, 212); assert(records.every(r => r.verdict === 'PASS'));
}
assert.equal(json('docs/validation/ts-035d8/native-build-results.json').length, 71);
writeFileSync(dir + 'corpus-debts.json', JSON.stringify(corpus, null, 2) + '\n');
writeFileSync(dir + 'preservation-results.json', JSON.stringify({ preserved: 5227, retainedRecordsPerLane: 212, retainedNativeGates: 71, files:33, blocked:60, feature:19, profile:41, freshNativeBuild:false }, null, 2) + '\n');
