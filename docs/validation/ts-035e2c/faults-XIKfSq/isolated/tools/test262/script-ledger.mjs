import {c} from './fault.mjs';
import {mkdir,lstat,realpath,open,link,unlink,readFile} from './io.mjs';
import {resolve,parse,relative,sep,dirname,isAbsolute} from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { inspectScriptSelection, assertScriptSelectionCurrent } from './context.mjs';

const ledgers = new WeakMap();
const consumed = new WeakSet();
const fail = code => { throw new Error(`script-ledger/${code}`); };
const hash = text => createHash('sha256').update(text).digest('hex');
const revision = '91c70759363c46557b694792bf34a2551a7af5ba';
const registryHash = hash('{"registryVersion":1,"kind":"script-runtime-capabilities","entries":[]}\n');
const statuses = ['pass', 'fail', 'unsupported-feature', 'unsupported-profile',
  'harness-error', 'resource-limit', 'timeout', 'host-fault'];
const requiredClosure = ['@node', '@yaml/package.json', 'package.json', 'package-lock.json',
  'tools/test262/input.mjs', 'tools/test262/script-capabilities.mjs',
  'tools/test262/script-capabilities.json', 'tools/test262/script-plan.mjs',
  'tools/test262/script-ledger.mjs', 'fixtures/assistance/test262-starter-corpus/manifest.json'];
const runtimeReasons = new Set(['asi', 'RegExp', 'return-asi', 'error-objects',
  'strict-script-contract', 'directive-script', 'global-script', 'harness-capabilities']);
const flags = new Set(['onlyStrict', 'noStrict', 'raw', 'module', 'async', 'generated',
  'CanBlockIsTrue', 'CanBlockIsFalse', 'non-deterministic']);
const conflicts = [['onlyStrict', 'noStrict'], ['raw', 'onlyStrict'], ['raw', 'module'],
  ['module', 'noStrict'], ['module', 'onlyStrict'], ['raw', 'async'], ['CanBlockIsTrue', 'CanBlockIsFalse']];
const check = (condition, code) => { if (!condition) fail(code); };
const text = value => typeof value === 'string' && value.length > 0;
const integer = value => Number.isSafeInteger(value) && value >= 0;
const digest = (value, size = 64) => typeof value === 'string' && new RegExp(`^[0-9a-f]{${size}}$`).test(value);

// Check descriptors before reading values, including array elements. These
// validators only see private snapshots; no caller object supplies authority.
function object(value, keys, code) {
  check(value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype, code);
  const own = Reflect.ownKeys(value);
  check(own.length === keys.length && own.every(key => keys.includes(key)), code);
  for (const key of keys) check(Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value'), code);
}
function array(value, code) {
  check(Array.isArray(value) && Object.getPrototypeOf(value) === Array.prototype, code);
  const length = Object.getOwnPropertyDescriptor(value, 'length').value;
  const keys = Reflect.ownKeys(value);
  check(integer(length) && keys.length === length + 1 && keys[length] === 'length', code);
  for (let i = 0; i < length; i++) {
    check(keys[i] === String(i) && Object.hasOwn(Object.getOwnPropertyDescriptor(value, String(i)), 'value'), code);
  }
}
function path(value, prefix = '') {
  return text(value) && value.startsWith(prefix) && !/[\\:\0]/.test(value) &&
    value.split('/').every(part => part && part !== '.' && part !== '..');
}
function metadata(value) {
  const code = 'selection';
  object(value, ['flags', 'features', 'includes', 'locale', 'negative'], code);
  for (const key of ['flags', 'features', 'includes', 'locale']) {
    array(value[key], code); check(value[key].every(text), code);
  }
  check(value.flags.every(flag => flags.has(flag)) &&
    !conflicts.some(pair => pair.every(flag => value.flags.includes(flag))), code);
  check(value.includes.every(name => path('harness/' + name, 'harness/') && name.endsWith('.js')), code);
  if (value.negative !== null) {
    object(value.negative, ['phase', 'type'], code);
    check(['parse', 'runtime', 'resolution'].includes(value.negative.phase) &&
      text(value.negative.type) && value.negative.type.trim().length > 0 &&
      (value.negative.phase !== 'resolution' || value.flags.includes('module')), code);
  }
}
function validateSelection(selection) {
  const code = 'selection', s = selection;
  object(s, ['selectionVersion', 'kind', 'runId', 'revision', 'manifestSha256', 'lane', 'cache',
    'authority', 'policy', 'execution', 'files', 'excludedFixtures'], code);
  check(s.selectionVersion === 2 && s.kind === 'script-blocked-selection' &&
    typeof s.runId === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(s.runId) &&
    text(s.revision) && digest(s.manifestSha256) && ['node', 'native'].includes(s.lane) &&
    s.cache === false && s.execution === null, code);
  object(s.authority, ['registryVersion', 'registrySha256', 'entries'], code);
  array(s.authority.entries, code);
  check(s.authority.registryVersion === 1 && s.authority.registrySha256 === registryHash && s.authority.entries.length === 0, code);
  object(s.policy, ['id', 'closureSha256', 'files', 'host', 'platform'], code);
  array(s.policy.files, code);
  check(s.policy.id === 'rift-script-blocked-v4' && s.policy.files.length === 242 && digest(s.policy.closureSha256) &&
    text(s.policy.host) && text(s.policy.platform), code);
  let previous = '';
  for (const entry of s.policy.files) {
    object(entry, ['path', 'sha256'], code);
    check(path(entry.path) && entry.path > previous && digest(entry.sha256) &&
      (requiredClosure.includes(entry.path) || entry.path.startsWith('@yaml/')), code);
    previous = entry.path;
  }
  check(requiredClosure.every(label => s.policy.files.some(entry => entry.path === label)) &&
    hash(JSON.stringify(s.policy.files)) === s.policy.closureSha256, code);
  array(s.excludedFixtures, code); check(s.excludedFixtures.length === 0, code);
  array(s.files, code); check(s.files.length > 0, code);
  const paths = new Set(), ids = new Set(), slots = new Map();
  let ordinal = 0;
  for (let fileOrdinal = 0; fileOrdinal < s.files.length; fileOrdinal++) {
    const file = s.files[fileOrdinal];
    object(file, ['ordinal', 'path', 'manifestId', 'inputError', 'slots'], code);
    check(file.ordinal === fileOrdinal && path(file.path, 'test/') && file.path.endsWith('.js') &&
      !file.path.endsWith('_FIXTURE.js') && text(file.manifestId) && !paths.has(file.path) && !ids.has(file.manifestId), code);
    paths.add(file.path); ids.add(file.manifestId);
    if (file.inputError !== null) {
      object(file.inputError, ['status', 'stage', 'reasonCode'], code);
      check(file.inputError.status === 'harness-error' && file.inputError.stage === 'input' && text(file.inputError.reasonCode), code);
    }
    if (file.slots === null) { check(file.inputError !== null, code); continue; }
    array(file.slots, code); check(s.revision === revision && file.slots.length > 0, code);
    let expectedVariants, first;
    for (let index = 0; index < file.slots.length; index++) {
      const slot = file.slots[index];
      object(slot, ['id', 'ordinal', 'fileOrdinal', 'path', 'manifestId', 'lane', 'variant', 'goal',
        'blob', 'sourceSha256', 'byteLength', 'transformedSourceSha256', 'metadata', 'harness',
        'harnessState', 'debts', 'admission'], code);
      metadata(slot.metadata);
      const f = slot.metadata.flags;
      const variants = f.includes('module') ? ['module'] : f.includes('raw') ? ['raw'] :
        f.includes('onlyStrict') ? ['strict'] : f.includes('noStrict') ? ['non-strict'] : ['non-strict', 'strict'];
      expectedVariants ??= variants; first ??= slot;
      check(isDeepStrictEqual(variants, expectedVariants) && slot.variant === variants[index] &&
        slot.id === `${revision}:${file.path}:${slot.variant}:${s.lane}` && !slots.has(slot.id) &&
        integer(ordinal) && slot.ordinal === ordinal++ && slot.fileOrdinal === fileOrdinal &&
        slot.path === file.path && slot.manifestId === file.manifestId && slot.lane === s.lane &&
        slot.goal === (slot.variant === 'module' ? 'Module' : 'Script') && digest(slot.blob, 40) &&
        digest(slot.sourceSha256) && integer(slot.byteLength) && digest(slot.transformedSourceSha256) &&
        (slot.variant === 'strict' || slot.transformedSourceSha256 === slot.sourceSha256) &&
        slot.blob === first.blob && slot.sourceSha256 === first.sourceSha256 && slot.byteLength === first.byteLength &&
        isDeepStrictEqual(slot.metadata, first.metadata) && slot.admission === 'blocked', code);
      array(slot.harness, code);
      const harness = file.inputError || f.includes('raw') ? [] : ['harness/assert.js', 'harness/sta.js',
        ...(f.includes('async') ? ['harness/doneprintHandle.js'] : []), ...slot.metadata.includes.map(name => 'harness/' + name)];
      check(slot.harnessState === (file.inputError ? 'input-failed' : 'verified') && slot.harness.length === harness.length, code);
      for (let i = 0; i < slot.harness.length; i++) {
        const entry = slot.harness[i]; object(entry, ['path', 'blob', 'sha256'], code);
        check(entry.path === harness[i] && digest(entry.blob, 40) && digest(entry.sha256), code);
      }
      check(isDeepStrictEqual(slot.harness, first.harness), code);
      array(slot.debts, code); check(slot.debts.length > 1, code);
      for (let i = 0; i < slot.debts.length; i++) {
        const debt = slot.debts[i]; object(debt, ['id', 'status', 'reasonCode', 'authority'], code);
        check(text(debt.reasonCode) && ['unsupported-feature', 'unsupported-profile'].includes(debt.status), code);
        if (i === slot.debts.length - 1) {
          check(debt.id === 'runtime:coverage' && debt.status === 'unsupported-feature' &&
            debt.reasonCode === 'runtime-capabilities' && debt.authority === 'runtime', code);
        } else {
          check(debt.id === `legacy:${i}:${debt.reasonCode}` && debt.reasonCode !== 'runtime-capabilities' &&
            debt.authority === (runtimeReasons.has(debt.reasonCode) ? 'runtime' : 'never'), code);
        }
      }
      if (slot.variant === 'module') check(slot.debts[0].reasonCode === 'module' && slot.debts[0].status === 'unsupported-feature', code);
      slots.set(slot.id, {file, slot});
    }
    check(file.slots.length === expectedVariants.length, code);
  }
  return slots;
}
function terminal({file, slot}) {
  const debt = file.inputError ?? slot.debts[0];
  return {kind: 'policy', stage: file.inputError ? 'input' : 'preflight', status: debt.status,
    reasonCode: debt.reasonCode, executed: false, testBodyEvaluated: false};
}
function validateHistory(value, slots) {
  const code = 'history';
  object(value, ['ledgerVersion', 'kind', 'selection', 'attempts'], code);
  check(value.ledgerVersion === 2 && value.kind === 'script-policy-ledger', code);
  array(value.attempts, code);
  const counts = new Map();
  for (let i = 0; i < value.attempts.length; i++) {
    const attempt = value.attempts[i];
    object(attempt, ['sequence', 'slotId', 'attempt', 'retryReason', 'terminal'], code);
    check(typeof attempt.slotId === 'string' && slots.has(attempt.slotId), code);
    const number = (counts.get(attempt.slotId) ?? 0) + 1;
    check(integer(i + 1) && integer(number) && attempt.sequence === i + 1 && attempt.attempt === number &&
      (number === 1 ? attempt.retryReason === null : text(attempt.retryReason) && attempt.retryReason.trim().length > 0), code);
    object(attempt.terminal, ['kind', 'stage', 'status', 'reasonCode', 'executed', 'testBodyEvaluated'], code);
    check(isDeepStrictEqual(attempt.terminal, terminal(slots.get(attempt.slotId))), code);
    counts.set(attempt.slotId, number);
  }
  return counts;
}
function freeze(value) {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
function get(token) {
  if (!ledgers.has(token)) fail('token');
  owner(token);
  const value = ledgers.get(token);
  check(value !== null && typeof value === 'object', 'history');
  const descriptor = Object.getOwnPropertyDescriptor(value, 'selection');
  check(descriptor !== undefined && Object.hasOwn(descriptor, 'value'), 'history');
  const slots = validateSelection(descriptor.value);
  const counts = validateHistory(value, slots);
  return {value, slots, counts};
}
export function newScriptLedger(selectionToken) {
  if (arguments.length !== 1) fail('arguments');
  let selection;
  try { selection = inspectScriptSelection(selectionToken); } catch { fail('token'); }
  if (consumed.has(selectionToken)) fail('already-used-selection');
  const slots = validateSelection(selection);
  const value = {ledgerVersion: 2, kind: 'script-policy-ledger', selection, attempts: []};
  validateHistory(value, slots);
  freeze(value);
  const token = Object.freeze({});
  ledgers.set(token, value);
  ownership.set(token, {selectionToken, revoked:false, store:null});
  consumed.add(selectionToken);
  return token;
}
export function appendScriptPolicy(token, slotId, retryReason = null) {
  if (![2, 3].includes(arguments.length) || !text(slotId) ||
    (retryReason !== null && typeof retryReason !== 'string')) fail('arguments');
  const {value, slots, counts} = get(token);
  if (!slots.has(slotId)) fail('slot');
  const prior = counts.get(slotId) ?? 0;
  if (prior ? !text(retryReason) || !retryReason.trim() : retryReason !== null) fail('retry-policy');
  const sequence = value.attempts.length + 1, attempt = prior + 1;
  check(integer(sequence) && sequence > 0 && integer(attempt) && attempt > 0, 'history');
  const next = {...value, attempts: [...value.attempts,
    {sequence, slotId, attempt, retryReason, terminal: terminal(slots.get(slotId))}]};
  // Validate the complete candidate before the sole state replacement.
  validateHistory(next, validateSelection(next.selection));
  freeze(next);
  ledgers.set(token, next);
}
export function inspectScriptLedger(token) {
  if (arguments.length !== 1) fail('arguments');
  return freeze(structuredClone(get(token).value));
}
export function reportScriptLedger(token) {
  if (arguments.length !== 1) fail('arguments');
  return reportValue(get(token).value);
}
function reportValue(value) {
  const {selection, attempts} = value;
  const first = new Map();
  for (const attempt of attempts) if (!first.has(attempt.slotId)) first.set(attempt.slotId, attempt.terminal);
  const counts = Object.fromEntries(statuses.map(status => [status, 0]));
  let plannedVariants = 0, completed = 0, unplannedInputErrors = 0;
  const files = selection.files.map(file => {
    let statuses = null;
    if (file.slots === null) unplannedInputErrors++;
    else statuses = file.slots.map(slot => {
      plannedVariants++;
      const result = first.get(slot.id);
      if (result) { completed++; counts[result.status]++; }
      return {slotId: slot.id, variant: slot.variant, status: result?.status ?? null};
    });
    return {path: file.path, manifestId: file.manifestId, statuses, inputError: file.inputError, passed: false};
  });
  const complete = unplannedInputErrors === 0 && completed === plannedVariants;
  return freeze(structuredClone({lane: selection.lane, selectedFiles: files.length, plannedVariants,
    executedVariants: 0, testBodyEvaluatedVariants: 0, unplannedInputErrors, completed,
    missing: plannedVariants - completed, attempts: attempts.length, counts, passedFiles: 0, files,
    excludedFixtures: [], complete, passOverPlanned: complete ? {numerator: 0, denominator: plannedVariants} : null,
    conditionalPass: null, exitCode: complete ? 1 : 2}));
}

// PROPOSAL ONLY. Appended to the co-located ledger module; not an active API.
const stores = new WeakMap(), checkpoints = new WeakMap(), ownership = new WeakMap();
const storeFail = code => { throw new Error(`script-ledger-store/${code}`); };
const opaque = () => Object.freeze({});
function owner(token) {
  const own = ownership.get(token);
  if (own && (own.revoked || own.store?.busy || own.store?.pending)) fail('owner');
}
function store(token) {
  if (!stores.has(token)) storeFail('token');
  const state = stores.get(token);
  if (state.busy || state.pending) storeFail('owner');
  return state;
}
async function context(state) {
  try { await assertScriptSelectionCurrent(ownership.get(state.owner).selectionToken); }
  catch { storeFail('context'); }
}
async function exactDirectory(directory) {
  let current = parse(directory).root;
  for (const part of relative(current, directory).split(sep).filter(Boolean)) {
    current = resolve(current, part);
    const info = await lstat(current);
    if (info.isSymbolicLink() || !info.isDirectory()) storeFail('path');
  }
  if (await realpath(directory) !== directory) storeFail('path');
}
async function pathStage(fn) { try { return await fn(); } catch { storeFail('path'); } }
function capture(state) {
  const value = ledgers.get(state.owner);
  try { validateHistory(value, validateSelection(value.selection)); }
  catch { storeFail('snapshot'); }
  return {value, report: reportValue(value)};
}
function makePending(state, value, report) {
  const generation = state.anchor ? state.anchor.generation + 1 : 0;
  if (!Number.isSafeInteger(generation)) storeFail('snapshot');
  const snapshot = {checkpointVersion:1, kind:'script-policy-checkpoint', generation,
    previousSha256: state.anchor?.sha256 ?? null, ledger:value, report};
  const bytes = Buffer.from(JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
  return {generation, previousSha256:snapshot.previousSha256, value, bytes, sha256:hash(bytes),
    destination:resolve(state.directory, `checkpoint-${generation}.json`),
    temporary:resolve(state.directory, `.pending-${randomUUID()}.tmp`),
    cleanup:null};
}
function acknowledge(state, pending) {
  if(c.ack){c.ack=false;storeFail('indeterminate');}
  const token = opaque();
  const anchor = {...pending, token};
  checkpoints.set(token, {state, anchor, used:false});
  state.anchor = anchor;
  state.pending = null;
  return token;
}
async function readAnchor(state, anchor) {
  await pathStage(() => exactDirectory(state.directory));
  let bytes;
  try {
    const info = await lstat(anchor.destination);
    if (!info.isFile() || info.isSymbolicLink() || ![1,2].includes(info.nlink)) storeFail('bytes');
    if (info.nlink === 2) {
      if (!anchor.cleanup) storeFail('bytes');
      const temp = await lstat(anchor.temporary);
      if (temp.isSymbolicLink() || temp.dev !== info.dev || temp.ino !== info.ino) storeFail('bytes');
    }
    bytes = await readFile(anchor.destination);
    if (!bytes.equals(anchor.bytes)) storeFail('bytes');
  } catch { storeFail('bytes'); }
  return bytes;
}
export async function createScriptLedgerStore(directory, token) {
  if (arguments.length !== 2 || typeof directory !== 'string' || !directory.length) storeFail('arguments');
  if (!ledgers.has(token)) storeFail('token');
  const own = ownership.get(token);
  if (own.revoked || own.store) storeFail('owner');
  if (!isAbsolute(directory) || resolve(directory) !== directory) storeFail('path');
  // Reserve synchronously, before the first await. Failure releases the ledger.
  const state = {directory, owner:token, busy:true, pending:null, anchor:null, diagnostics:[]};
  own.store = state;
  try {
    capture(state);
    await pathStage(() => exactDirectory(dirname(directory)));
    await context(state);
    try { await mkdir(directory); } catch { storeFail('io'); }
    await pathStage(() => exactDirectory(directory));
    const result = opaque(); stores.set(result, state); return result;
  } catch (error) { own.store = null; throw error; }
  finally { state.busy = false; }
}
export async function checkpointScriptLedger(token) {
  if (arguments.length !== 1) storeFail('arguments');
  const state = store(token);
  state.busy = true;
  let pending, handle, opened = false, dispatched = false, ioStage = 'open';
  try {
    const {value, report} = capture(state);
    await pathStage(() => exactDirectory(state.directory));
    await context(state);
    if (state.anchor) await readAnchor(state, state.anchor);
    if (state.anchor?.value === value) return state.anchor.token;
    pending = makePending(state, value, report);
    try {
      handle = await open(pending.temporary, 'wx'); opened = true;
      ioStage = 'write'; await handle.writeFile(pending.bytes);
      ioStage = 'sync'; await handle.sync();
      ioStage = 'close'; await handle.close(); handle = null;
      dispatched = true;
      ioStage = 'link';
      await link(pending.temporary, pending.destination);
    } catch (error) {
      state.diagnostics.push({stage:ioStage,code:error.code ?? null});
      // A rejected local link is treated as indeterminate too: never infer
      // non-publication from an adapter/acknowledgment error after dispatch.
      if (dispatched) {
        state.pending = pending;
        pending.cleanup = 'retained';
        storeFail('indeterminate');
      }
      storeFail('io');
    }
    state.pending = pending;
    pending.cleanup = 'retained';
    try { await unlink(pending.temporary); pending.cleanup = null; }
    catch (error) { state.diagnostics.push({stage:'unlink',code:error.code ?? null}); storeFail('indeterminate'); }
    return acknowledge(state, pending);
  } finally {
    if (!dispatched && !state.pending && opened) {
      try { if (handle) await handle.close(); }
      catch (error) { state.diagnostics.push({stage:'cleanup-close',code:error.code ?? null}); }
      try { await unlink(pending.temporary); }
      catch (error) { state.diagnostics.push({stage:'cleanup-unlink',code:error.code ?? null,path:pending.temporary}); }
    }
    state.busy = false;
  }
}
export async function resolveScriptLedgerCheckpoint(token) {
  if (arguments.length !== 1) storeFail('arguments');
  if (!stores.has(token)) storeFail('token');
  const state = stores.get(token);
  if (state.busy || !state.pending) storeFail('owner');
  state.busy = true;
  try {
    await pathStage(() => exactDirectory(state.directory));
    await context(state);
    let absent = false;
    try { await lstat(state.pending.destination); }
    catch (error) { if (error.code === 'ENOENT') absent = true; else storeFail('bytes'); }
    if (!absent) await readAnchor(state, state.pending);
    if (state.pending.cleanup) {
      try { await unlink(state.pending.temporary); state.pending.cleanup = null; }
      catch (error) {
        if (error.code === 'ENOENT') state.pending.cleanup = null;
        else {
          state.diagnostics.push({stage:'resolve-cleanup-unlink',code:error.code ?? null});
          storeFail('indeterminate');
        }
      }
    }
    if (absent) { state.pending = null; return null; }
    return acknowledge(state, state.pending);
  } finally { state.busy = false; }
}
export async function reopenScriptLedger(token) {
  if (arguments.length !== 1) storeFail('arguments');
  if (!checkpoints.has(token)) storeFail('token');
  const entry = checkpoints.get(token), {state, anchor} = entry;
  if (entry.used || state.busy || state.pending || state.anchor !== anchor ||
      ledgers.get(state.owner) !== anchor.value) storeFail('owner');
  state.busy = true;
  try {
    await pathStage(() => exactDirectory(state.directory));
    await context(state);
    await readAnchor(state, anchor);
    const {value, report} = capture(state);
    const expected = {checkpointVersion:1,kind:'script-policy-checkpoint',generation:anchor.generation,
      previousSha256:anchor.previousSha256,ledger:value,report};
    if (!Buffer.from(JSON.stringify(expected,null,2)+'\n').equals(anchor.bytes)) storeFail('snapshot');
    const next = opaque(), previous = ownership.get(state.owner);
    ledgers.set(next, value);
    ownership.set(next, {selectionToken:previous.selectionToken,revoked:false,store:state});
    previous.revoked = true; entry.used = true; state.owner = next;
    // New ownership epoch, same committed bytes/generation; old token stays spent.
    acknowledge(state, anchor);
    return next;
  } finally { state.busy = false; }
}

export function privateControl(token, action) {
 const state=stores.get(token); if(action==='counter')state.anchor.generation=Number.MAX_SAFE_INTEGER;
 if(action==='history') {const v=structuredClone(ledgers.get(state.owner));v.attempts.push({});ledgers.set(state.owner,v);}
 if(action==='report')state.anchor.bytes=Buffer.from(state.anchor.bytes.toString().replace('"exitCode": 2','"exitCode": 1'));
}
