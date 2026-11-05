import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { readScriptCapabilities, reconstructScriptDebts } from './script-capabilities.mjs';

const evidence = new URL('../../docs/validation/ts-035e1/', import.meta.url);
const literals = JSON.parse(await readFile(new URL('../ts-035e-p/e1-literals.json', evidence)));
const normal = () => ({ flags: [], features: [], includes: [], locale: [], negative: null });
const exactError = message => error => error.constructor === Error && error.message === message &&
  Reflect.ownKeys(error).every(key => ['stack', 'message'].includes(key));
const rejects = (fn, code) => assert.throws(fn, exactError('script-capabilities/' + code));

for (const row of literals.cases) test(row.id, () => {
  const args = structuredClone(row.input.args), before = structuredClone(args);
  if (row.expected.error) assert.throws(() => reconstructScriptDebts(...args), exactError(row.expected.error));
  else {
    const result = reconstructScriptDebts(...args);
    assert.deepEqual(result, row.expected.debts);
    assert(Object.isFrozen(result) && result.every(Object.isFrozen));
    assert.equal(result.filter(debt => debt.id === 'runtime:coverage').length, 1);
  }
  assert.deepEqual(args, before);
});

test('ordinary data, descriptor rejection, error precedence, detachment', () => {
  let calls = 0;
  const getter = { get() { calls++; throw Error('getter ran'); }, configurable: true };
  for (const field of Object.keys(normal())) {
    const meta = normal(); Object.defineProperty(meta, field, getter);
    rejects(() => reconstructScriptDebts(meta, 'strict', null), 'metadata');
  }
  for (const field of ['flags', 'features', 'includes', 'locale']) {
    for (const key of ['keys', 'every', Symbol.iterator, '0']) {
      const array = ['value']; Object.defineProperty(array, key, getter);
      rejects(() => reconstructScriptDebts({ ...normal(), [field]: array }, 'strict', null), 'metadata');
    }
    for (const array of [new Array(1), Object.assign([], { extra: true }), Object.assign([], { [Symbol()]: true }), Object.setPrototypeOf([], null)]) {
      rejects(() => reconstructScriptDebts({ ...normal(), [field]: array }, 'strict', null), 'metadata');
    }
  }
  for (const key of ['phase', 'type']) {
    const negative = { phase: 'runtime', type: 'Error' }; Object.defineProperty(negative, key, getter);
    rejects(() => reconstructScriptDebts({ ...normal(), negative }, 'strict', null), 'metadata');
  }
  assert.equal(calls, 0);
  for (const meta of [Object.assign(Object.create(null), normal()), { ...normal(), [Symbol()]: true }, Object.assign(new class {}(), normal())]) {
    rejects(() => reconstructScriptDebts(meta, 'strict', null), 'metadata');
  }
  rejects(() => reconstructScriptDebts({}, 'unknown'), 'arguments');
  rejects(() => reconstructScriptDebts({}, 'unknown', undefined), 'metadata');
  rejects(() => reconstructScriptDebts(normal(), 'unknown', undefined), 'variant');
  rejects(() => reconstructScriptDebts(normal(), 'strict', undefined), 'manifest-id');
  const meta = normal(), before = structuredClone(meta);
  const first = reconstructScriptDebts(meta, 'strict', null), second = reconstructScriptDebts(meta, 'strict', null);
  assert.deepEqual(meta, before); assert(!Object.isFrozen(meta) && !Object.isFrozen(meta.flags));
  assert.notEqual(first, second); first.forEach((debt, i) => assert.notEqual(debt, second[i]));
  assert.throws(() => first.push({}), TypeError); assert.throws(() => first[0].authority = 'never', TypeError);
  meta.features.push('future'); assert.deepEqual(first, second);
  const frozen = normal(); Object.values(frozen).filter(Array.isArray).forEach(Object.freeze); Object.freeze(frozen);
  assert.doesNotThrow(() => reconstructScriptDebts(frozen, 'strict', null));
});

test('actual fixed reader has fresh frozen results and rejects explicit undefined', async () => {
  const first = await readScriptCapabilities(), second = await readScriptCapabilities();
  assert.deepEqual(first, literals.registry[0].expected.value);
  assert.notEqual(first, second); assert.notEqual(first.entries, second.entries);
  assert(Object.isFrozen(first) && Object.isFrozen(first.entries));
  assert.throws(() => first.entries.push({}), TypeError);
  await assert.rejects(readScriptCapabilities(undefined), exactError('script-capabilities/arguments'));
});

// Copy the actual module and unchanged input dependency into new evidence only.
// Fresh child imports exercise IO and module initialization without public hooks.
test('isolated actual reader bytes, IO failures, fresh imports and private mapping witness', async () => {
  const root = new URL('isolated/', evidence);
  const moduleDir = new URL('tools/test262/', root);
  await mkdir(moduleDir, { recursive: true });
  await mkdir(new URL('fixtures/assistance/test262-starter-corpus/', root), { recursive: true });
  for (const name of ['script-capabilities.mjs', 'input.mjs']) await copyFile(new URL(name, import.meta.url), new URL(name, moduleDir));
  const manifestSource = new URL('../../fixtures/assistance/test262-starter-corpus/manifest.json', import.meta.url);
  const manifestTarget = new URL('fixtures/assistance/test262-starter-corpus/manifest.json', root);
  await copyFile(manifestSource, manifestTarget);
  const runner = new URL('runner.mjs', moduleDir);
  await writeFile(runner, `import { readScriptCapabilities as read } from './script-capabilities.mjs';
import { readFile, writeFile } from 'node:fs/promises';
const c = JSON.parse(await readFile(new URL('case.json', import.meta.url)));
try { console.log(JSON.stringify({value: await read(...c.args)})); }
catch(e) { console.log(JSON.stringify({error:e.message, native:e.constructor===Error, keys:Reflect.ownKeys(e).sort()})); }
`);
  for (const row of literals.registry) {
    await writeFile(new URL('case.json', moduleDir), JSON.stringify(row));
    await writeFile(new URL('script-capabilities.json', moduleDir), Buffer.from(row.bytesBase64, 'base64'));
    // A test-only loader supplies EACCES/ENOENT at the actual fs boundary.
    await writeFile(new URL('fault-loader.mjs', moduleDir), `import { registerHooks } from 'node:module';
registerHooks({resolve(s,c,n){if(s==='node:fs/promises' && c.parentURL?.endsWith('/script-capabilities.mjs')) return {url:'data:text/javascript,'+encodeURIComponent('export async function readFile(){ throw Object.assign(new Error("IO"), {code:${JSON.stringify(row.ioError)}}); }'),shortCircuit:true};return n(s,c);}});`);
    const result = spawnSync(process.execPath, [...(row.ioError ? ['--import', new URL('fault-loader.mjs', moduleDir).href] : []), fileURLToPath(runner)], { encoding: 'utf8', env: { ...process.env, SCRIPT_CAPABILITIES_PATH: 'nonexistent', SCRIPT_CAPABILITIES_REGISTRY: '{"entries":[{}]}' } });
    assert.equal(result.status, 0, result.stderr);
    const actual = JSON.parse(result.stdout);
    if (row.expected.error) { assert.equal(actual.error, row.expected.error, row.id); assert.equal(actual.native, true); assert.deepEqual(actual.keys, ['message', 'stack']); }
    else assert.deepEqual(actual, row.expected);
  }
  // Missing real file + arguments: argument error must precede IO; repeated calls read again.
  await writeFile(runner, `import assert from 'node:assert/strict';
import {readScriptCapabilities as read} from './script-capabilities.mjs';
import {unlink,writeFile} from 'node:fs/promises';
const path=new URL('script-capabilities.json',import.meta.url);
await unlink(path);
await assert.rejects(read(undefined), {message:'script-capabilities/arguments'});
await assert.rejects(read(), {message:'script-capabilities/read'});
await writeFile(path, ${JSON.stringify('{"registryVersion":1,"kind":"script-runtime-capabilities","entries":[]}\n'.replace('\\n','\n'))});
await read(); await writeFile(path,'{}');
await assert.rejects(read(), {message:'script-capabilities/registry-bytes'});
`);
  const uncached = spawnSync(process.execPath, [fileURLToPath(runner)], { encoding: 'utf8' });
  assert.equal(uncached.status, 0, uncached.stderr);
  for (const bytes of ['{}', 'not json']) {
    await writeFile(manifestTarget, bytes);
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', `try { await import(${JSON.stringify(new URL('script-capabilities.mjs', moduleDir).href)}); process.exitCode=1; } catch(e) { if(e.constructor!==Error || e.message!=='script-capabilities/manifest' || Reflect.ownKeys(e).some(k=>!['message','stack'].includes(k))) throw e; }`], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
  await copyFile(manifestSource, manifestTarget);
  // Expose the unmodified private mapper only in a separate evidence copy.
  const source = await readFile(new URL('script-capabilities.mjs', import.meta.url), 'utf8');
  await writeFile(new URL('mapping-witness.mjs', moduleDir), source + '\nexport { mapDebts };\n');
  const { mapDebts } = await import(new URL('mapping-witness.mjs', moduleDir));
  assert.deepEqual(mapDebts([{status:'unsupported-feature',reasonCode:'future-debt'},{status:'unsupported-feature',reasonCode:'future-debt'}]), [
    {id:'legacy:0:future-debt',status:'unsupported-feature',reasonCode:'future-debt',authority:'never'},
    {id:'legacy:1:future-debt',status:'unsupported-feature',reasonCode:'future-debt',authority:'never'},
    {id:'runtime:coverage',status:'unsupported-feature',reasonCode:'runtime-capabilities',authority:'runtime'},
  ]);
});
