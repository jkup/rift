import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { frozenManifest, variants, blockers } from './input.mjs';

const fields = ['flags', 'features', 'includes', 'locale', 'negative'];
const arrayFields = fields.slice(0, 4);
const allowedFlags = new Set(['onlyStrict', 'noStrict', 'raw', 'module', 'async',
  'generated', 'CanBlockIsTrue', 'CanBlockIsFalse', 'non-deterministic']);
const conflicts = [['onlyStrict', 'noStrict'], ['raw', 'onlyStrict'], ['raw', 'module'],
  ['module', 'noStrict'], ['module', 'onlyStrict'], ['raw', 'async'],
  ['CanBlockIsTrue', 'CanBlockIsFalse']];
const runtimeReasons = new Set(['asi', 'RegExp', 'return-asi', 'error-objects',
  'strict-script-contract', 'directive-script', 'global-script', 'harness-capabilities']);
const canonical = Buffer.from('{"registryVersion":1,"kind":"script-runtime-capabilities","entries":[]}\n');
const fail = code => { throw new Error(`script-capabilities/${code}`); };

function freeze(value) {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

// Only the pinned manifest supplies IDs. No caller can replace this authority.
let knownIds;
try {
  const { manifest } = await frozenManifest();
  knownIds = freeze(Object.fromEntries(manifest.entries.map(entry => [entry.id,
    Object.fromEntries(fields.map(field => [field,
      structuredClone(entry[field] ?? (field === 'negative' ? null : []))]))])));
} catch { fail('manifest'); }

export async function readScriptCapabilities() {
  if (arguments.length !== 0) fail('arguments');
  let bytes;
  try { bytes = await readFile(new URL('./script-capabilities.json', import.meta.url)); }
  catch { fail('read'); }
  if (!bytes.equals(canonical)) fail('registry-bytes');
  return freeze({ registryVersion: 1, kind: 'script-runtime-capabilities', entries: [] });
}

function dataObject(value, keys) {
  if (value === null || typeof value !== 'object' ||
      Object.getPrototypeOf(value) !== Object.prototype) return false;
  const own = Reflect.ownKeys(value);
  if (own.length !== keys.length || own.some(key => !keys.includes(key))) return false;
  return keys.every(key => Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value'));
}

function stringArray(value) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return false;
  const length = Object.getOwnPropertyDescriptor(value, 'length').value;
  const keys = Reflect.ownKeys(value);
  if (keys.length !== length + 1 || keys[length] !== 'length') return false;
  // Never invoke a caller's iterator, array method, or indexed getter.
  for (let i = 0; i < length; i++) {
    if (keys[i] !== String(i)) return false;
    const item = Object.getOwnPropertyDescriptor(value, String(i));
    if (!Object.hasOwn(item, 'value') || typeof item.value !== 'string' || item.value.length === 0) return false;
  }
  return true;
}

function validMetadata(meta) {
  if (!dataObject(meta, fields) || !arrayFields.every(field => stringArray(meta[field]))) return false;
  if (meta.flags.some(flag => !allowedFlags.has(flag)) ||
      conflicts.some(pair => pair.every(flag => meta.flags.includes(flag)))) return false;
  for (const include of meta.includes) {
    const path = 'harness/' + include;
    if (!path.endsWith('.js') || /[\\:\0]/.test(path) ||
        path.split('/').some(part => !part || part === '.' || part === '..')) return false;
  }
  const negative = meta.negative;
  return negative === null || (dataObject(negative, ['phase', 'type']) &&
    ['parse', 'runtime', 'resolution'].includes(negative.phase) &&
    typeof negative.type === 'string' && negative.type.trim().length > 0 &&
    (negative.phase !== 'resolution' || meta.flags.includes('module')));
}

function mapDebts(legacy) {
  return freeze([...legacy.map((debt, ordinal) => ({
    id: `legacy:${ordinal}:${debt.reasonCode}`, status: debt.status,
    reasonCode: debt.reasonCode, authority: runtimeReasons.has(debt.reasonCode) ? 'runtime' : 'never',
  })), { id: 'runtime:coverage', status: 'unsupported-feature',
    reasonCode: 'runtime-capabilities', authority: 'runtime' }]);
}

export function reconstructScriptDebts(metadata, variant, manifestId) {
  if (arguments.length !== 3) fail('arguments');
  if (!validMetadata(metadata)) fail('metadata');
  if (typeof variant !== 'string' || !variants(metadata).includes(variant)) fail('variant');
  if (manifestId !== null) {
    if (typeof manifestId !== 'string' || !Object.hasOwn(knownIds, manifestId)) fail('manifest-id');
    if (!isDeepStrictEqual(metadata, knownIds[manifestId])) fail('manifest-metadata');
  }
  return mapDebts(blockers(metadata, variant, manifestId));
}
