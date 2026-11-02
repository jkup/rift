import test from 'node:test';
import assert from 'node:assert/strict';
import { synthetic, thrown, syntax, neg } from './fixtures.mjs';
import { classify, validateRecord, parseEnvelope, inspectEnvelope } from './result.mjs';

function expect(options, status, reasonCode) {
  const record = synthetic(options);
  assert.equal(record.classification.status, status);
  assert.equal(record.classification.reasonCode, reasonCode);
  assert.equal(record.evidence.bodyEvaluated, options.body ??
    ((options.observation?.kind ?? 'normal') === 'normal' && (options.stage ?? 'test') === 'test' && options.negative?.phase !== 'parse'));
  assert.equal(record.identity.runId, 'synthetic-only');
  assert.deepEqual(parseEnvelope(JSON.stringify(record)), record);
  return record;
}
test('O01 positive normal ignores diagnostic-looking stdout hash', () => expect({}, 'pass', 'normal'));
test('O02 five primitive/plain throws fail positives', () => {
  for (const kind of ['number','undefined','null','string','object']) {
    expect({ observation: thrown(null, kind) }, 'fail', 'uncaught-throw');
  }
});
test('O03 O15 O16 O17 negative constructor names, including runtime SyntaxError', () => {
  for (const name of ['ReferenceError','RangeError','SyntaxError','TypeError']) {
    const r = expect({ observation: thrown(name), negative: neg('runtime', name) }, 'pass', 'negative-match');
    assert.equal(r.classification.observedPhase, 'runtime');
    assert.equal(r.classification.observedConstructorName, name);
  }
});
test('O04 diagnostic string cannot supply constructor evidence', () => {
  expect({ observation: { ...thrown(null, 'string'), diagnostic: 'ReferenceError: TDZ' },
    negative: neg('runtime', 'ReferenceError') }, 'fail', 'type-mismatch');
  expect({ stage: 'preflight', observation: { kind: 'not-run', reasonCode: 'error-objects' },
    blockers: [{ status: 'unsupported-feature', reasonCode: 'error-objects' }] }, 'unsupported-feature', 'error-objects');
});
test('O05 wrong phase never matches', () => expect({ observation: syntax, negative: neg('runtime','SyntaxError') }, 'fail','phase-mismatch'));
test('O06 O08 normal negative fails without evaluating parse-negative body', () => {
  expect({ negative: neg('parse','SyntaxError') }, 'fail','expected-parse-error');
  expect({ negative: neg('runtime','TypeError') }, 'fail','expected-throw');
  assert.throws(() => synthetic({ negative: neg('parse','SyntaxError'), body: true }), /protocol/);
});
test('O07 wrong runtime type', () => expect({ observation: thrown('RangeError'), negative: neg('runtime','TypeError') }, 'fail','type-mismatch'));
test('O09 audited parse negative requires valid rule, unit and location', () => {
  expect({ observation: syntax, negative: neg('parse','SyntaxError') }, 'pass','negative-match');
  for (const ruleCode of ['', 'generic-expect', null]) {
    assert.throws(() => synthetic({ observation: { ...syntax, ruleCode }, negative: neg('parse','SyntaxError') }), /protocol/);
  }
  const missing = synthetic({ observation: syntax });
  missing.evidence.location = null;
  assert.throws(() => validateRecord(missing), /protocol/);
});
test('O10 O11 O21 unsupported source is not repaired or matched', () => {
  for (const capabilityCode of ['async','indeterminate-syntax','unsupported-token']) {
    expect({ observation: { kind: 'unsupported-syntax', capabilityCode }, negative: neg('parse','SyntaxError') }, 'unsupported-feature', capabilityCode);
  }
});
test('O12 O13 O14 guard provenance wins over matching error names', () => {
  for (const [guardCode, count, limit, phase, type] of [
    ['source-units',100001,100000,'parse','SyntaxError'], ['parse-depth',129,128,'parse','SyntaxError'],
    ['steps',100001,100000,'runtime','RangeError']]) {
    expect({ observation: { kind: 'resource-limit', guardCode, count, limit }, negative: neg(phase,type) }, 'resource-limit',guardCode);
  }
});
test('O18 O19 constructor extraction abrupt/host fault retained', () => {
  const r = expect({ observation: thrown(null, 'object','abrupt'), negative: neg('runtime','TypeError') }, 'fail','constructor-inspection-abrupt');
  assert.equal(r.observation.constructor.secondary, 'guest-sentinel');
  expect({ observation: { kind: 'host-fault', faultCode: 'constructor-inspection' }, negative: neg('runtime','TypeError') }, 'host-fault','constructor-inspection');
});
test('O20 harness-defined function throwing in test remains test failure', () => {
  expect({ observation: { ...thrown('Test262Error'), diagnostic: 'at harness/assert.js' }, body: true }, 'fail','uncaught-throw');
});
test('H02 H03 H20 synthetic harness outcomes cannot satisfy negatives', () => {
  expect({ stage: 'harness', observation: syntax, negative: neg('parse','SyntaxError') }, 'harness-error','harness');
  expect({ stage: 'harness', observation: thrown('TypeError'), negative: neg('runtime','TypeError') }, 'harness-error','harness');
  const r = expect({ stage: 'harness', observation: { kind: 'resource-limit', guardCode: 'steps', limit: 10, count: 11 } }, 'resource-limit','steps');
  assert.equal(r.evidence.harnessValidated, false);
});

const transport = (process = { exitCode: 0, signal: null, deadlineExpired: false }, outputBytes = 0) => ({ process, outputBytes, outputLimit: 1024 });
test('T01 deadline wins even over normal envelope', () => {
  const r = synthetic();
  assert.deepEqual(inspectEnvelope(JSON.stringify(r), r.identity, transport({ exitCode: null, signal: null, deadlineExpired: true })), { status: 'timeout', reasonCode: 'deadline' });
});
test('T02 T03 abnormal termination overrides absent or normal envelope', () => {
  const r = synthetic();
  for (const json of ['undefined',JSON.stringify(r)]) {
    for (const process of [{ exitCode: 127, signal: null, deadlineExpired: false }, { exitCode: null, signal: 'SIGSEGV', deadlineExpired: false }]) {
      assert.deepEqual(inspectEnvelope(json,r.identity,transport(process)), { status:'host-fault',reasonCode:'crash' });
    }
  }
});
test('T04 T05 console text is not an envelope; actual throw remains failure', () => {
  const r = synthetic({ observation: thrown() });
  assert.deepEqual(inspectEnvelope('', r.identity, transport()), { status: 'host-fault', reasonCode: 'protocol' });
  assert.deepEqual(inspectEnvelope('{"status":"pass"}', r.identity, transport()), { status: 'host-fault', reasonCode: 'protocol' });
  assert.equal(inspectEnvelope(JSON.stringify(r), r.identity, transport()).classification.reasonCode, 'uncaught-throw');
});
test('T06 invalid envelopes, duplicate/escaped keys and wrong identity', () => {
  const r = synthetic();
  const json = JSON.stringify(r);
  const wrongSchema = structuredClone(r); wrongSchema.identity.schemaVersion = 2;
  const wrongVariant = structuredClone(r); wrongVariant.identity.variant = 'non-strict';
  for (const invalid of [json.slice(0,-3), json.replace('"schemaVersion":1', '"schemaVersion":1,"schemaVersion":1'),
    json.replace('"schemaVersion":1', '"schemaVersion":1,"schema\\u0056ersion":1'), JSON.stringify(wrongSchema), JSON.stringify(wrongVariant), `${json}\n${json}`]) {
    assert.deepEqual(inspectEnvelope(invalid,r.identity,transport()), { status:'host-fault',reasonCode:'protocol' });
  }
});
test('T07 output cap overrides normal result', () => {
  const r = synthetic();
  assert.deepEqual(inspectEnvelope(JSON.stringify(r),r.identity,transport(undefined,1025)), { status:'resource-limit',reasonCode:'output' });
});
test('T08 host diagnostic SyntaxError remains a host fault', () => {
  expect({ observation: { kind:'host-fault',faultCode:'internal',diagnostic:'SyntaxError' }, negative:neg('parse','SyntaxError') }, 'host-fault','internal');
});
test('T18 observation records omit classification altogether', () => {
  for (const mode of ['parser-observation','body-observation']) {
    const r = synthetic({ mode });
    assert.equal(Object.hasOwn(r,'classification'),false);
    assert.deepEqual(parseEnvelope(JSON.stringify(r)),r);
    r.classification = synthetic().classification;
    assert.throws(() => validateRecord(r),/protocol/);
  }
});
test('Closed records reject missing/extra fields at every nesting level', () => {
  for (const route of [[], ['identity'],['inputs'],['inputs','limits'],['evidence'],['evidence','process'],['evidence','location'],['observation'],['classification']]) {
    for (const operation of ['add','delete']) {
      const r = synthetic();
      const target = route.reduce((x,k) => x[k],r);
      if (operation === 'add') target.unknown = true;
      else delete target[Object.keys(target)[0]];
      assert.throws(() => validateRecord(r),/protocol/);
    }
  }
});
test('Contradictory evidence, forgery, null provenance and constructor names fail closed', () => {
  for (const mutate of [
    r => { r.identity.variant = 'module'; }, r => { r.evidence.process.signal = 'SIGSEGV'; },
    r => { r.evidence.stage = 'harness'; r.evidence.bodyEvaluated = true; },
    r => { r.evidence.harnessValidated = false; }, r => { r.classification.status = 'fail'; },
    r => { r.identity.sourceSha256 = 'invalid'; }, r => { r.identity.path = 'test/../outside.js'; },
    r => { r.observation.constructorName = 'TypeError'; },
  ]) { const r = synthetic(); mutate(r); assert.throws(() => validateRecord(r),/protocol/); }
  const r = synthetic(); r.identity.sourceSha256 = null;
  assert.equal(classify(r).status,'host-fault');
  assert.throws(() => validateRecord(r),/protocol/);
  assert.throws(() => synthetic({ observation: thrown('TypeError','string') }),/protocol/);
  assert.throws(() => synthetic({ observation: { ...thrown(), name:'TypeError' } }),/protocol/);
});
test('Unexecuted positive body cannot pass; nested observation fields remain closed', () => {
  expect({body:false},'host-fault','body-not-evaluated');
  for(const observation of [thrown('TypeError'),syntax,{kind:'resource-limit',guardCode:'steps',count:11,limit:10},
    {kind:'timeout',wallMs:1000},{kind:'unsupported-syntax',capabilityCode:'async'},{kind:'host-fault',faultCode:'internal'}]) {
    assert.throws(()=>synthetic({observation:{...observation,unknown:true}}),/protocol/);
  }
  const r=synthetic({observation:thrown('TypeError')});
  r.observation.constructor.callable='forged';
  assert.throws(()=>validateRecord(r),/protocol/);
});
