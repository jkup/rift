import { readFile, lstat, realpath } from 'node:fs/promises';
import { resolve, parse, relative, sep } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { inspectScriptSelection, assertScriptSelectionCurrent, prepareScriptSelection } from 'file:///C:/Users/jonku/code/rift/typescript/build/ts035e3d-implementation-MFU5dA/tools/test262/script-plan.mjs';
import { sha256, verifyBytes, transform } from 'file:///C:/Users/jonku/code/rift/typescript/build/ts035e3d-implementation-MFU5dA/tools/test262/input.mjs';

// Input identity only. This module neither knows nor certifies an execution build.
const selections = new WeakMap();
const keys = ['sourceUnits', 'parseDepth', 'steps', 'calls', 'evaluationDepth', 'wallMs', 'outputBytes'];
const fail = code => { throw Error('script-execution-inputs/' + code); };
function freeze(value) {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
function data(value, fields) {
  if (value === null || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) fail('arguments');
  const own = Reflect.ownKeys(value);
  if (own.length !== fields.length || own.some(key => !fields.includes(key))) fail('arguments');
  const copy = {};
  for (const key of fields) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!Object.hasOwn(descriptor, 'value')) fail('arguments');
    copy[key] = descriptor.value;
  }
  return copy;
}
function options(value) {
  const copy = data(value, ['root', 'limits']);
  copy.limits = data(copy.limits, keys);
  if (typeof copy.root !== 'string' || !copy.root.length) fail('options');
  for (const key of keys) if (!Number.isSafeInteger(copy.limits[key]) || copy.limits[key] < 0 || Object.is(copy.limits[key], -0)) fail('limits');
  if (copy.limits.sourceUnits !== 100000 || copy.limits.parseDepth !== 128 || copy.limits.evaluationDepth !== 256) fail('fixed-limit');
  if (copy.limits.wallMs > 2147483647) fail('wall-limit');
  copy.root = resolve(copy.root);
  return copy;
}
async function exact(path, directory = false) {
  const absolute = resolve(path);
  let current = parse(absolute).root;
  for (const part of relative(current, absolute).split(sep).filter(Boolean)) {
    current = resolve(current, part);
    if ((await lstat(current)).isSymbolicLink()) throw Error('alias');
  }
  if (await realpath(absolute) !== absolute) throw Error('alias');
  const info = await lstat(absolute);
  if (directory ? !info.isDirectory() : !info.isFile() || info.nlink !== 1) throw Error('file');
  return absolute;
}
async function stage(code, operation) {
  try { return await operation(); } catch { fail(code); }
}
function stablePolicy(selection) {
  const { runId, ...stable } = selection;
  return stable;
}
async function current(saved) {
  await stage('policy-current', () => assertScriptSelectionCurrent(saved.policyToken));
  await stage('root', () => exact(saved.options.root, true));
  const fresh = await stage('input-current', () => prepareScriptSelection({root:saved.options.root,
    revision:saved.anchor.revision, lane:saved.anchor.lane, paths:saved.anchor.files.map(file => file.path)}));
  if (!isDeepStrictEqual(stablePolicy(inspectScriptSelection(fresh)), stablePolicy(saved.anchor))) fail('input-drift');
}
async function capture(saved) {
  const files = [];
  for (const file of saved.anchor.files) {
    // A partial input failure retains the full original policy denominator. It
    // must never become an empty successful harness or an inferred variant pair.
    if (file.inputError !== null || file.slots === null) {
      files.push({ordinal:file.ordinal, path:file.path, state:'input-error', slots:null});
      continue;
    }
    const slots = [];
    for (const slot of file.slots) {
      const units = [];
      const occurrences = [...slot.harness.map(h => ({path:h.path, blob:h.blob, sha256:h.sha256, role:'harness'})),
        {path:slot.path, blob:slot.blob, sha256:slot.sourceSha256, role:'test'}];
      for (const occurrence of occurrences) {
        const bytes = await stage('source', async () => readFile(await exact(resolve(saved.options.root, occurrence.path))));
        const original = await stage('source', () => verifyBytes(bytes, occurrence.blob));
        if (original.sha256 !== occurrence.sha256) fail('source-drift');
        const transformed = occurrence.role === 'test' ? transform(bytes, slot.variant) : Buffer.from(bytes);
        const text = new TextDecoder('utf-8', {fatal:true, ignoreBOM:true}).decode(transformed);
        const transformedSha256 = sha256(transformed);
        if (occurrence.role === 'test' && transformedSha256 !== slot.transformedSourceSha256) fail('source-drift');
        units.push({id:'u'+units.length, ordinal:units.length, role:occurrence.role, path:occurrence.path,
          blob:original.blob, sourceSha256:original.sha256, transformedSha256,
          byteLength:bytes.length, transformedByteLength:transformed.length, sourceUnits:text.length,
          originalBase64:bytes.toString('base64'), transformedBase64:transformed.toString('base64'), transformedText:text});
      }
      slots.push({slotId:slot.id, variant:slot.variant, goal:slot.goal, units});
    }
    files.push({ordinal:file.ordinal, path:file.path, state:'captured', slots});
  }
  for(const f of files)for(const s of f.slots??[])for(const value of s.units)delete value.blob;
  return files;
}
export async function prepareScriptExecutionInputs(policyToken, requestedOptions) {
  if (arguments.length !== 2) fail('arguments');
  const copied = options(requestedOptions);
  let anchor;
  try { anchor = inspectScriptSelection(policyToken); } catch { fail('token'); }
  const saved = {policyToken, options:copied, anchor};
  await current(saved);
  const files = await capture(saved);
  await current(saved);
  const second = await capture(saved);
  if (!isDeepStrictEqual(files, second)) fail('source-drift');
  // Stable input data deliberately excludes E2's runId. The complete original
  // E2 object and its digest are retained separately and are never reconstructed.
  const stable = {inputVersion:1, kind:'script-execution-input-data', policy:stablePolicy(anchor), limits:copied.limits, files};
  const snapshot = freeze({selectionVersion:1, kind:'script-execution-input-selection',
    policyAnchor:anchor, policyAnchorSha256:sha256(JSON.stringify(anchor)), stable, stableSha256:sha256(JSON.stringify(stable)),
    executionBinding:null, admission:'blocked'});
  const token = Object.freeze({});
  selections.set(token, {...saved, snapshot});
  return token;
}
export function inspectScriptExecutionInputs(token) {
  if (arguments.length !== 1) fail('arguments');
  if (!selections.has(token)) fail('token');
  return freeze(structuredClone(selections.get(token).snapshot));
}
export async function assertScriptExecutionInputsCurrent(token) {
  if (arguments.length !== 1) fail('arguments');
  if (!selections.has(token)) fail('token');
  const saved = selections.get(token);
  await current(saved);
  if (!isDeepStrictEqual(await capture(saved), saved.snapshot.stable.files)) fail('source-drift');
  await current(saved);
}

export {capture as testOnlyCapture};
