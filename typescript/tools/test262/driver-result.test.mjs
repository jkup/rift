import test from 'node:test';
import assert from 'node:assert/strict';
import { synthetic, contextFor, selectionFor } from './fixtures.mjs';
import { validateRecord, assertContext } from './result.mjs';
import { appendAttempt, newLedger, report } from './ledger.mjs';
import { composeObservation, parseDriverResult } from './driver-result.mjs';
import { countOutput } from './observe.mjs';

const baseline = synthetic();
const context = contextFor(baseline);
context.identity.mode = 'parser-observation';
context.identity.variant = 'non-strict';
context.inputs.profileId = 'rift-subset-observation-v1';
context.inputs.limits.outputBytes = 1048576;
const binding = { nonce: 'fresh-nonce', mode: 'parser-observation', unit: 'test/synthetic.js' };
const child = { driverVersion: 1, ...binding, stage: 'test', bodyEvaluated: false, location: null, observation: { kind: 'normal' } };
const bytes = x => Buffer.from(typeof x === 'string' ? x : JSON.stringify(x));
const facts = { process: { exitCode: 0, signal: null, deadlineExpired: false }, outputBytes: 0, outputLimit: 1048576,
  capCount: null, capKilled: false, crashBeforeCap: false, elapsedMs: 10, stdoutSha256: 'a'.repeat(64), stderrSha256: 'b'.repeat(64) };
const compose = (payload = bytes(child), changes = {}) => composeObservation(context, binding, payload, { ...facts, ...changes });
const fault = (payload, code = 'protocol', changes = {}) => assert.deepEqual(compose(payload, changes).observation, { kind: 'host-fault', faultCode: code });

test('T07 mode, body, stage and location must describe a possible driver operation', () => {
  const location = { line: 1, column: 1 };
  const runtime = [
    { kind: 'throw', phase: 'runtime', valueKind: 'number', constructor: { outcome: 'absent', name: null, realmId: null, secondary: null } },
    ...[['steps',100001,100000],['calls',64,64],['evaluation-depth',257,256]]
      .map(([guardCode,count,limit]) => ({ kind: 'resource-limit', guardCode, count, limit })),
    ...['runtime.object-to-number','runtime.object-to-string','runtime.map-species'].map(capabilityCode => ({ kind: 'unsupported-syntax', capabilityCode })),
  ];
  const parsing = [
    { kind: 'unsupported-syntax', capabilityCode: 'lex.character' },
    { kind: 'unsupported-syntax', capabilityCode: 'parse.return-context' },
    { kind: 'resource-limit', guardCode: 'source-units', count: 100001, limit: 100000 },
    { kind: 'resource-limit', guardCode: 'parse-depth', count: 129, limit: 128 },
  ];
  const invalid = [
    { ...child, mode: 'body-observation' },
    { ...child, mode: 'body-observation', bodyEvaluated: true, location },
    { ...child, observation: runtime[0] },
    { ...child, stage: 'driver' },
    { ...child, stage: 'test', observation: { kind: 'host-fault', faultCode: 'read' } },
    { ...child, stage: 'driver', location, observation: { kind: 'host-fault', faultCode: 'read' } },
    { ...child, mode: 'body-observation', stage: 'driver', bodyEvaluated: true, observation: { kind: 'host-fault', faultCode: 'read' } },
  ];
  const valid = [child, { ...child, mode: 'body-observation', bodyEvaluated: true },
    { ...child, stage: 'driver', observation: { kind: 'host-fault', faultCode: 'read' } }];
  for (const observation of runtime) {
    valid.push({ ...child, mode: 'body-observation', bodyEvaluated: true, location, observation });
    for (const mode of ['parser-observation','body-observation']) {
      invalid.push({ ...child, mode, location, observation });
    }
    invalid.push({ ...child, mode: 'body-observation', bodyEvaluated: true, observation });
  }
  for (const observation of parsing) for (const mode of ['parser-observation','body-observation']) {
    valid.push({ ...child, mode, location, observation });
    invalid.push({ ...child, mode, location, bodyEvaluated: true, observation }, { ...child, mode, observation });
  }
  for (const candidate of invalid) {
    const b = { ...binding, mode: candidate.mode };
    assert.throws(() => parseDriverResult(bytes(candidate), b), /protocol/, JSON.stringify(candidate));
    const c = structuredClone(context); c.identity.mode = candidate.mode;
    const result = composeObservation(c, b, bytes(candidate), facts);
    assert.deepEqual(result.observation, { kind: 'host-fault', faultCode: 'protocol' });
    assert.equal(result.evidence.stage, 'driver');
    assert.equal(result.evidence.bodyEvaluated, false); assert.equal(result.evidence.location, null);
  }
  for (const candidate of valid) {
    const b = { ...binding, mode: candidate.mode };
    assert.deepEqual(parseDriverResult(bytes(candidate), b), candidate);
    const c = structuredClone(context); c.identity.mode = candidate.mode;
    assert.deepEqual(composeObservation(c, b, bytes(candidate), facts).observation, candidate.observation);
  }
});

test('T04 T05 T06 T07 T08 T16 T20 T29 strict child framing, identity and closed schema', () => {
  for (const payload of [null, bytes('{'), bytes('{}{}'), bytes(JSON.stringify(child) + 'null'),
    bytes(JSON.stringify(child).replace('"driverVersion":1', '"driverVersion":1,"driverVersion":1')),
    bytes(JSON.stringify(child).replace('"driverVersion":1', '"driverVersion":1,"driver\\u0056ersion":1')),
    Buffer.alloc(65537, 32), Buffer.from([0xff]), bytes('\ufeff' + JSON.stringify(child)), bytes({ ...child, mode: 'conformance' }),
    bytes({ ...child, nonce: 'stale' }), bytes({ ...child, unit: 'test/other.js' }), bytes({ ...child, driverVersion: 2 })]) fault(payload);
  for (const field of ['identity','inputs','process','hash','classification','expectedNegative','extra']) fault(bytes({ ...child, [field]: {} }));
  for (const field of Object.keys(child)) { const bad = { ...child }; delete bad[field]; fault(bytes(bad)); }
  for (const observation of [{ kind: 'timeout', wallMs: 1 }, { kind: 'syntax-error', phase: 'parse', constructorName: 'SyntaxError', ruleCode: 'assignment-target' },
    { kind: 'resource-limit', guardCode: 'output', count: 2, limit: 1 }, { kind: 'normal', extra: 1 },
    { kind: 'throw', phase: 'runtime', valueKind: 'object', constructor: { outcome: 'available', name: 'Error', realmId: '1', secondary: null } }]) {
    fault(bytes({ ...child, observation }));
  }
  assert.deepEqual(parseDriverResult(bytes(child), binding), child);
});
test('T09 T10 T11 T12 T13 T14 T15 exact transport precedence and counts', () => {
  fault(bytes(child), 'crash', { process: { exitCode: 70, signal: null, deadlineExpired: false } });
  fault(null, 'crash', { process: { exitCode: null, signal: 'SIGKILL', deadlineExpired: false } });
  assert.deepEqual(compose(bytes(child), { process: { exitCode: 0, signal: null, deadlineExpired: true } }).observation, { kind: 'timeout', wallMs: 1000 });
  assert.deepEqual(compose(bytes(child), { outputBytes: 1048576 }).observation, { kind: 'normal' });
  const capped = { outputBytes: 1048600, capCount: 1048600, capKilled: true,
    process: { exitCode: null, signal: 'SIGTERM', deadlineExpired: false } };
  const r = compose(bytes(child), capped);
  assert.deepEqual(r.observation, { kind: 'resource-limit', guardCode: 'output', count: 1048600, limit: 1048576 });
  assert.deepEqual(r.evidence.process, capped.process);
  assert.deepEqual(compose(bytes(child), { ...capped, process: { ...capped.process, deadlineExpired: true } }).observation,
    { kind: 'timeout', wallMs: 1000 });
  fault(bytes(child), 'crash', { ...capped, crashBeforeCap: true });
});
test('T12 T13 combined pipe byte chunks preserve exactly 1048600 at first crossing', () => {
  const actual = { outputBytes: 0, outputLimit: 1048576, capCount: null };
  assert.equal(countOutput(actual, Buffer.alloc(1048570)), false);
  // Two astral scalars would be four UTF-16 units but eight UTF-8 bytes.
  assert.equal(countOutput(actual, Buffer.from('abc123')), false);
  assert.equal(actual.outputBytes, 1048576); assert.equal(actual.capCount, null);
  assert.equal(countOutput(actual, Buffer.from('😀'.repeat(6))), true);
  assert.equal(actual.outputBytes, 1048600); assert.equal(actual.capCount, 1048600);
  assert.equal(countOutput(actual, Buffer.from('later')), false);
  assert.equal(actual.outputBytes, 1048605); assert.equal(actual.capCount, 1048600);
});
test('T21 all parent Identity and Inputs fields remain context-bound', () => {
  const good = compose();
  for (const section of ['identity','inputs']) for (const key of Object.keys(good[section])) {
    const changed = structuredClone(good);
    changed[section][key] = key === 'harness' ? [{ path: 'harness/a.js', blob: 'a'.repeat(40), sha256: 'a'.repeat(64) }] :
      key === 'limits' ? { ...changed.inputs.limits, steps: 1 } : null;
    if (good[section][key] === null) changed[section][key] = 'a'.repeat(64);
    assert.throws(() => assertContext(changed, context), undefined, `${section}.${key}`);
  }
  for (const key of Object.keys(good.inputs.limits)) {
    const changed = structuredClone(good); changed.inputs.limits[key]++;
    assert.throws(() => assertContext(changed, context), /context/);
  }
});
test('T24 T25 T26 T27 observation invariant and conformance ledger remain separate', () => {
  const r = compose();
  assert.equal(r.evidence.harnessValidated, false);
  assert.equal(Object.hasOwn(r, 'classification'), false);
  assert.deepEqual(validateRecord(r), r);
  for (const mutate of [r => { r.evidence.harnessValidated = true; },
    r => { r.inputs.harness = [{ path: 'harness/a.js', blob: 'a'.repeat(40), sha256: 'a'.repeat(64) }]; }]) {
    const bad = structuredClone(r); mutate(bad); assert.throws(() => validateRecord(bad), /protocol/);
  }
  const conformance = structuredClone(baseline); conformance.evidence.harnessValidated = false;
  assert.throws(() => validateRecord(conformance), /protocol/);
  const ledger = newLedger(selectionFor([baseline]));
  const before = structuredClone(ledger);
  assert.throws(() => appendAttempt(ledger, 'synthetic-0', r), /identity/);
  assert.deepEqual(ledger, before);
  assert.equal(report(ledger).counts.pass, 0);
  const injected = structuredClone(ledger); injected.attempts.push({ id: 'synthetic-0', record: r });
  assert.throws(() => report(injected));
});
