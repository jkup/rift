import { parseDocument } from 'yaml';
import { terminalRecord, assertContext, inspectEnvelope } from './result.mjs';

export const RESULT_LIMIT = 65536;
const keys = (value, names) => value !== null && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name));
const integer = x => Number.isSafeInteger(x) && x >= 0;
const capabilities = new Set(['lex.indeterminate-comment','lex.leading-zero','lex.numeric-literal',
  'lex.indeterminate-string-newline','lex.string-escape','lex.indeterminate-string-end','lex.operator','lex.character',
  'parse.expected-token','parse.binding-identifier','parse.duplicate-binding','parse.declaration-statement',
  'parse.return-context','parse.line-terminator','parse.throw-expression','parse.loop-context','parse.duplicate-parameter',
  'parse.property-name','parse.assignment-target','parse.delete-identifier','parse.array-spread','parse.object-key',
  'parse.prototype-literal','parse.unexpected','runtime.object-to-number','runtime.object-to-string','runtime.map-species']);
function strictObservation(o) {
  if (!o || typeof o !== 'object') return false;
  const fields = { normal: [], throw: ['phase','valueKind','constructor'], 'unsupported-syntax': ['capabilityCode'],
    'resource-limit': ['guardCode','count','limit'], 'host-fault': ['faultCode'] }[o.kind];
  if (!fields || !keys(o, ['kind', ...fields, ...(Object.hasOwn(o, 'diagnostic') && o.kind !== 'normal' ? ['diagnostic'] : [])]) ||
      (Object.hasOwn(o, 'diagnostic') && (typeof o.diagnostic !== 'string' || !o.diagnostic))) return false;
  if (o.kind === 'throw') return o.phase === 'runtime' && ['undefined','null','boolean','number','string','symbol','object'].includes(o.valueKind) &&
    keys(o.constructor, ['outcome','name','realmId','secondary']) &&
    o.constructor.outcome === (o.valueKind === 'object' ? 'unsupported' : 'absent') &&
    o.constructor.name === null && o.constructor.realmId === null && o.constructor.secondary === null;
  if (o.kind === 'resource-limit') return ['source-units','parse-depth','steps','calls','evaluation-depth'].includes(o.guardCode) &&
    integer(o.count) && integer(o.limit) && (o.guardCode === 'calls' ? o.count >= o.limit : o.count > o.limit);
  if (o.kind === 'unsupported-syntax') return capabilities.has(o.capabilityCode);
  if (o.kind === 'host-fault') return typeof o.faultCode === 'string' && o.faultCode.length > 0;
  return true;
}

export function parseDriverResult(bytes, binding) {
  if (!Buffer.isBuffer(bytes) || bytes.length > RESULT_LIMIT) throw new Error('protocol');
  const json = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  const value = JSON.parse(json);
  const doc = parseDocument(json, { uniqueKeys: true, schema: 'json', strict: true });
  if (doc.errors.length || doc.warnings.length ||
      !keys(value, ['driverVersion','nonce','mode','unit','stage','bodyEvaluated','location','observation']) ||
      value.driverVersion !== 1 || value.nonce !== binding.nonce || value.mode !== binding.mode || value.unit !== binding.unit ||
      !['test','driver'].includes(value.stage) || typeof value.bodyEvaluated !== 'boolean') throw new Error('protocol');
  const o = value.observation;
  if (!strictObservation(o) ||
      (value.location !== null && (!keys(value.location, ['line','column']) || !integer(value.location.line) || value.location.line < 1 || !integer(value.location.column) || value.location.column < 1)) ||
      (value.mode === 'parser-observation' && value.bodyEvaluated) ||
      (o.kind === 'resource-limit' && o.guardCode === 'output') ||
      (o.kind === 'throw' && (o.constructor?.outcome !== (o.valueKind === 'object' ? 'unsupported' : 'absent') ||
        o.constructor.name !== null || o.constructor.realmId !== null || o.constructor.secondary !== null)) ||
      (value.stage === 'driver' && o.kind !== 'host-fault')) throw new Error('protocol');
  return value;
}

// Ordering is recorded by the parent at the events, never inferred from child
// JSON. A kill requested for output is not evidence of an independent crash.
export function composeObservation(context, binding, bytes, facts) {
  const { process, outputBytes, outputLimit, capCount, capKilled, crashBeforeCap, elapsedMs, stdoutSha256, stderrSha256 } = facts;
  let child = null, observation;
  if (process.deadlineExpired) observation = { kind: 'timeout', wallMs: context.inputs.limits.wallMs };
  else if (crashBeforeCap || (!capKilled && (process.signal !== null || process.exitCode !== 0))) observation = { kind: 'host-fault', faultCode: 'crash' };
  else if (capCount !== null) observation = { kind: 'resource-limit', guardCode: 'output', count: capCount, limit: outputLimit };
  else {
    try { child = parseDriverResult(bytes, binding); observation = child.observation; }
    catch { observation = { kind: 'host-fault', faultCode: 'protocol' }; }
  }
  const evidence = { stage: child?.stage ?? 'driver', harnessValidated: false,
    bodyEvaluated: child?.bodyEvaluated ?? false, unit: binding.unit, location: child?.location ?? null,
    process, stdoutSha256, stderrSha256, elapsedMs };
  let value;
  try { value = terminalRecord(context.identity, context.inputs, evidence, observation); }
  catch {
    value = terminalRecord(context.identity, context.inputs, { ...evidence, stage: 'driver', bodyEvaluated: false, location: null },
      { kind: 'host-fault', faultCode: 'protocol' });
  }
  assertContext(value, context);
  // The cap normalization retains the real killed process in the record. All
  // other cases also pass through the accepted full-envelope inspector.
  if (capCount === null && !process.deadlineExpired && !crashBeforeCap && process.exitCode === 0 && process.signal === null) {
    const checked = inspectEnvelope(JSON.stringify(value), context, { process, outputBytes, outputLimit });
    if (!checked.identity) throw new Error('composed envelope rejected: ' + checked.reasonCode);
  }
  return value;
}
