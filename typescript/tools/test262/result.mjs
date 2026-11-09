import { parseDocument } from 'yaml';
import { isDeepStrictEqual } from 'node:util';

export const STATUSES = ['pass', 'fail', 'unsupported-feature', 'unsupported-profile',
  'harness-error', 'resource-limit', 'timeout', 'host-fault'];
const RULES = ['numeric-separator', 'assignment-target', 'lexical-declaration-statement', 'return-outside-function',
  'duplicate-strict-parameter', 'duplicate-block-lexical-function'];
const GUARD_LIMIT = { 'source-units': 'sourceUnits', 'parse-depth': 'parseDepth', steps: 'steps',
  calls: 'calls', 'evaluation-depth': 'evaluationDepth', output: 'outputBytes' };
const str = x => typeof x === 'string' && x.length > 0;
const bool = x => typeof x === 'boolean';
const number = x => Number.isFinite(x) && x >= 0;
const integer = x => Number.isSafeInteger(x) && x >= 0;
const nullable = check => x => x === null || check(x);
const one = values => x => values.includes(x);
const hash = size => x => typeof x === 'string' && new RegExp(`^[a-f0-9]{${size}}$`).test(x);
const sha = nullable(hash(64));
const blob = nullable(hash(40));
const text = nullable(str);
const array = check => x => Array.isArray(x) && x.every(check);
function record(value, fields) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === Object.keys(fields).length &&
    Object.entries(fields).every(([key, check]) => Object.hasOwn(value, key) && check(value[key]));
}
const path = x => str(x) && /^(test|harness)\//.test(x) && x.endsWith('.js') &&
  !x.includes('\\') && !x.includes(':') && !x.includes('\0') &&
  x.split('/').every(part => part && part !== '.' && part !== '..');
const negative = x => x === null || record(x, {
  phase: one(['parse', 'resolution', 'runtime']), type: str,
});
const blocker = x => record(x, {
  status: one(['unsupported-feature', 'unsupported-profile']), reasonCode: str,
});
const identity = x => record(x, {
  schemaVersion: one([1]), runId: str,
  mode: one(['conformance', 'parser-observation', 'body-observation']),
  corpusRevision: blob, manifestSha256: sha, path: nullable(path), blob,
  sourceSha256: sha, variant: one(['strict', 'non-strict', 'raw', 'module']),
  goal: one(['Script', 'Module']), lane: one(['node', 'native']),
  engineCommit: blob, engineBuildSha256: sha, adapterSha256: sha, policySha256: sha,
  dirtySourceSha256: sha,
});
const inputs = x => record(x, {
  harness: array(unit => record(unit, { path, blob, sha256: sha })),
  transformedSourceSha256: sha, profileId: text, capabilityLedgerSha256: sha,
  host: text, platform: text, toolchain: text,
  limits: limits => record(limits, Object.fromEntries(['sourceUnits', 'parseDepth', 'steps',
    'calls', 'evaluationDepth', 'wallMs', 'outputBytes'].map(k => [k, nullable(integer)]))),
});
export const processValid = x => record(x, {
  exitCode: nullable(x => Number.isSafeInteger(x)), signal: text, deadlineExpired: bool,
}) && !(x.exitCode !== null && x.signal !== null);
const evidence = x => record(x, {
  stage: one(['input', 'preflight', 'harness', 'test', 'driver']), harnessValidated: bool,
  bodyEvaluated: bool, unit: nullable(path),
  location: x => x === null || record(x, { line: x => integer(x) && x > 0, column: x => integer(x) && x > 0 }),
  process: processValid, stdoutSha256: sha, stderrSha256: sha, elapsedMs: nullable(number),
});
const constructor = x => record(x, {
  outcome: one(['available', 'absent', 'abrupt', 'unsupported']), name: text,
  realmId: text, secondary: text,
}) && (x.outcome === 'available' ? str(x.name) && str(x.realmId) && x.secondary === null :
  x.name === null && (x.outcome === 'abrupt' ? str(x.secondary) : x.secondary === null));

function observation(x) {
  if (!x || typeof x !== 'object') return false;
  const variants = {
    normal: {},
    throw: { phase: one(['runtime']), valueKind: one(['undefined', 'null', 'boolean', 'number', 'string', 'symbol', 'object']), constructor },
    'syntax-error': { phase: one(['parse']), constructorName: one(['SyntaxError']), ruleCode: one(RULES) },
    'unsupported-syntax': { capabilityCode: str },
    'resource-limit': { guardCode: one(Object.keys(GUARD_LIMIT)), limit: integer, count: integer },
    timeout: { wallMs: number },
    'host-fault': { faultCode: str },
    'not-run': { reasonCode: str },
  };
  if (!Object.hasOwn(variants, x.kind)) return false;
  const fields = { kind: one([x.kind]), ...variants[x.kind] };
  if (x.kind !== 'normal' && Object.hasOwn(x, 'diagnostic')) fields.diagnostic = str;
  if (!record(x, fields)) return false;
  if (x.kind === 'throw' && x.valueKind !== 'object' && x.constructor.outcome !== 'absent') return false;
  // calls is the active depth inspected BEFORE entry/increment. The other
  // counters measure the source size or attempted work AFTER increment.
  return x.kind !== 'resource-limit' || (x.guardCode === 'calls' ? x.count >= x.limit : x.count > x.limit);
}
const classification = x => record(x, {
  status: one(STATUSES), reasonCode: str, blockers: array(blocker), expectedNegative: negative,
  observedPhase: nullable(one(['parse', 'resolution', 'runtime'])), observedConstructorName: text,
});

function validateCore(value, expectedNegative, blockers) {
  const fields = { identity, inputs, evidence, observation };
  if (Object.hasOwn(value ?? {}, 'classification')) fields.classification = classification;
  if (!record(value, fields) || !negative(expectedNegative) || !array(blocker)(blockers)) throw new Error('protocol');
  const { identity: i, inputs: n, evidence: e, observation: o } = value;
  if ((value.classification && i.mode !== 'conformance') ||
      (i.variant === 'module') !== (i.goal === 'Module') ||
      (i.variant === 'raw' && n.harness.length) ||
      (e.bodyEvaluated && e.stage !== 'test') ||
      (i.mode === 'conformance' && e.stage === 'test' && !e.harnessValidated && i.variant !== 'raw') ||
      (i.mode !== 'conformance' && (n.harness.length !== 0 || e.harnessValidated)) ||
      (o.kind === 'not-run' && (e.bodyEvaluated || !['input','preflight'].includes(e.stage))) ||
      (o.kind === 'normal' && !['test','harness'].includes(e.stage)) ||
      (o.kind === 'syntax-error' && (e.bodyEvaluated || !['test','harness'].includes(e.stage) || !e.unit || !e.location)) ||
      (o.kind === 'throw' && !['test','harness'].includes(e.stage)) ||
      (i.mode === 'parser-observation' && e.bodyEvaluated) ||
      (o.kind === 'resource-limit' && n.limits[GUARD_LIMIT[o.guardCode]] !== null && n.limits[GUARD_LIMIT[o.guardCode]] !== o.limit) ||
      (expectedNegative?.phase === 'resolution' && i.goal !== 'Module') ||
      (expectedNegative?.phase === 'parse' && e.bodyEvaluated)) throw new Error('protocol');
}

export function validateRecord(value) {
  if (value?.identity?.mode === 'conformance') {
    if (!classification(value.classification)) throw new Error('protocol');
    classify(value, value.classification.expectedNegative, value.classification.blockers);
  } else validateCore(value, null, []);
  return value;
}

function complete(value) {
  // No pass/fail with unavailable provenance. dirtySourceSha256 is intentionally
  // nullable for clean builds; error observations may retain other null fields.
  return Object.entries(value.identity).every(([key, v]) => key === 'dirtySourceSha256' || v !== null) &&
    Object.values(value.inputs).every(v => v !== null) &&
    value.inputs.harness.every(unit => Object.values(unit).every(v => v !== null)) &&
    Object.values(value.inputs.limits).every(v => v !== null) &&
    value.evidence.unit === value.identity.path &&
    value.evidence.stdoutSha256 !== null && value.evidence.stderrSha256 !== null &&
    value.evidence.elapsedMs !== null;
}

// Pure classification of structured observations. It never derives a type from
// console output, a Diagnostic.name or the file containing a throwing function.
export function classify(value, expectedNegative = null, blockers = []) {
  validateCore(value, expectedNegative, blockers);
  if (value.identity.mode !== 'conformance') throw new Error('protocol');
  const computed = classifyValidated(value, expectedNegative, blockers);
  if (value.classification && !isDeepStrictEqual(value.classification, computed)) throw new Error('protocol');
  return computed;
}

function classifyValidated(value, expectedNegative, blockers) {
  const { evidence: e, observation: o } = value;
  const result = (status, reasonCode) => ({ status, reasonCode, blockers, expectedNegative,
    observedPhase: o.kind === 'throw' || o.kind === 'syntax-error' ? o.phase : null,
    observedConstructorName: o.kind === 'throw' ? o.constructor.name : o.kind === 'syntax-error' ? 'SyntaxError' : null });
  if (e.process.deadlineExpired || o.kind === 'timeout') return result('timeout', 'deadline');
  if (e.process.signal !== null || (e.process.exitCode !== null && e.process.exitCode !== 0)) return result('host-fault', 'crash');
  if (o.kind === 'host-fault') return result('host-fault', o.faultCode);
  if (o.kind === 'resource-limit') return result('resource-limit', o.guardCode);
  if (o.kind === 'unsupported-syntax') return result('unsupported-feature', o.capabilityCode);
  if (o.kind === 'not-run') {
    if (blockers.length && o.reasonCode !== blockers[0].reasonCode) return result('host-fault', 'protocol');
    return blockers.length ? result(blockers[0].status, blockers[0].reasonCode) : result('harness-error', o.reasonCode);
  }
  if (e.process.exitCode === null) return result('host-fault', 'protocol');
  if (e.stage === 'harness') return result('harness-error', 'harness');
  if (blockers.length || e.stage !== 'test' || !complete(value)) return result('host-fault', 'protocol');
  if (o.kind === 'normal' && !e.bodyEvaluated && expectedNegative?.phase !== 'parse') return result('host-fault', 'body-not-evaluated');
  if (!expectedNegative) return o.kind === 'normal' ? result('pass', 'normal') : result('fail', o.kind === 'throw' ? 'uncaught-throw' : 'unexpected-parse-error');
  if (o.kind === 'normal') return result('fail', expectedNegative.phase === 'parse' ? 'expected-parse-error' : 'expected-throw');
  if (o.phase !== expectedNegative.phase) return result('fail', 'phase-mismatch');
  if (o.kind === 'throw' && o.constructor.outcome === 'abrupt') return result('fail', 'constructor-inspection-abrupt');
  if (o.kind === 'throw' && o.constructor.outcome === 'unsupported') return result('unsupported-feature', 'constructor-inspection');
  const name = o.kind === 'throw' ? o.constructor.name : o.constructorName;
  return name === expectedNegative.type ? result('pass', 'negative-match') : result('fail', 'type-mismatch');
}

// This context must be prepared by the parent from verified metadata and its
// configured execution policy, BEFORE reading an envelope. It is never inferred
// from a received classification or a received Inputs record.
export function validateContext(context) {
  if (!record(context, { identity, inputs, expectedNegative: negative, blockers: array(blocker) })) throw new Error('context');
  if (context.expectedNegative?.phase === 'resolution' && context.identity.goal !== 'Module') throw new Error('context');
  return context;
}

export function assertContext(value, context) {
  validateContext(context);
  validateRecord(value);
  if (!isDeepStrictEqual(value.identity, context.identity) || !isDeepStrictEqual(value.inputs, context.inputs) ||
      (value.identity.mode === 'conformance' &&
       (!isDeepStrictEqual(value.classification.expectedNegative, context.expectedNegative) ||
        !isDeepStrictEqual(value.classification.blockers, context.blockers)))) throw new Error('context');
  return value;
}

export function parseEnvelope(json) {
  // JSON.parse enforces JSON syntax; YAML's JSON-compatible parser supplies the
  // duplicate-key check JSON.parse lacks, including escaped equivalent keys.
  const value = JSON.parse(json);
  const doc = parseDocument(json, { uniqueKeys: true, schema: 'json', strict: true });
  if (doc.errors.length || doc.warnings.length) throw new Error('protocol');
  return validateRecord(value);
}

// Parent-supplied transport facts are separate from the untrusted envelope.
// There is no subprocess implementation in this slice. stdout is never an input.
export function inspectEnvelope(json, expectedContext, transport) {
  if (!record(transport, { process: processValid, outputBytes: integer, outputLimit: integer })) throw new Error('transport');
  const fault = (status, reasonCode) => ({ status, reasonCode });
  if (transport.process.deadlineExpired) return fault('timeout', 'deadline');
  if (transport.process.signal !== null || (transport.process.exitCode !== null && transport.process.exitCode !== 0)) return fault('host-fault', 'crash');
  if (transport.outputBytes > transport.outputLimit) return fault('resource-limit', 'output');
  try {
    const value = assertContext(parseEnvelope(json), expectedContext);
    if (!isDeepStrictEqual(value.evidence.process, transport.process) || transport.process.exitCode === null) throw new Error('protocol');
    return value;
  } catch { return fault('host-fault', 'protocol'); }
}

export function terminalRecord(identityValue, inputsValue, evidenceValue, observationValue, expectedNegative = null, blockers = []) {
  const value = { identity: identityValue, inputs: inputsValue, evidence: evidenceValue, observation: observationValue };
  if (identityValue.mode === 'conformance') value.classification = classify(value, expectedNegative, blockers);
  return validateRecord(value);
}
