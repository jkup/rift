// Pre-implementation information-flow witness, not a codec acceptance test.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const text = '1;';
const unit = {
  id: 'u0', ordinal: 0, role: 'test', path: 'test/synthetic.js',
  blob: 'b'.repeat(40), sourceSha256: sha256(text),
  transformedSha256: sha256(text), byteLength: 2, sourceUnits: 2,
};
const request = {
  requestVersion: 2, nonce: 'binding-review', mode: 'conformance', units: [unit],
  realms: [{ id: 'test', profile: 'script' }],
  limits: { sourceUnits: 100000, parseDepth: 128, steps: 100000, calls: 64,
    evaluationDepth: 256, wallMs: 1000, outputBytes: 1024 },
  preflightId: null, action: 'execute',
};
const binding = {
  nonce: request.nonce, requestSha256: sha256(JSON.stringify(request)),
  mode: request.mode, units: request.units, realms: request.realms,
  preflightId: request.preflightId, action: request.action, limits: request.limits,
  sources: [{ unitId: 'u0', transformedText: text }],
};
const child = {
  driverVersion: 2, nonce: binding.nonce, requestSha256: binding.requestSha256,
  mode: 'conformance',
  operation: { stage: 'test', phase: 'body', unitId: 'u0', realmId: 'test' },
  source: null, testBodyEvaluated: true, harnessValidated: false,
  preflightId: null, completedUnits: [], inspection: null, result: { kind: 'normal' },
};
// Identity.variant exists only in the parent's context. Raw and non-strict
// transformations can have identical source bytes. Neither variant is in the
// fixed request hash or the arguments to parseScriptDriverResult.
const scenarios = ['raw', 'non-strict'].map(variant => ({
  variant, bytes: Buffer.from(JSON.stringify(child)), binding: structuredClone(binding),
  meetsVariantPreflightRule: variant === 'raw',
}));
assert.deepEqual(scenarios[0].bytes, scenarios[1].bytes);
assert.deepEqual(scenarios[0].binding, scenarios[1].binding);
assert.notEqual(scenarios[0].meetsVariantPreflightRule, scenarios[1].meetsVariantPreflightRule);
assert.equal(binding.requestSha256, sha256(JSON.stringify(request)));
assert.equal(binding.units[0].transformedSha256, sha256(binding.sources[0].transformedText));
console.log('PASS: identical child bytes and exact binding; opposite raw/non-raw preflight requirements');
