import { readFile, readdir, lstat, realpath } from 'node:fs/promises';
import { dirname, resolve, relative, parse, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { planCorpus, sha256 } from './input.mjs';
import { readScriptCapabilities, reconstructScriptDebts } from './script-capabilities.mjs';

const selections = new WeakMap();
const base = fileURLToPath(new URL('../../', import.meta.url));
const fail = code => { throw new Error(`script-plan/${code}`); };
const fields = ['flags', 'features', 'includes', 'locale', 'negative'];

function freeze(value) {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function request(options) {
  const keys = ['root', 'revision', 'lane', 'paths'];
  if (options === null || typeof options !== 'object' ||
      Object.getPrototypeOf(options) !== Object.prototype) fail('arguments');
  const own = Reflect.ownKeys(options);
  if (own.length !== keys.length || own.some(key => !keys.includes(key))) fail('arguments');
  const copy = {};
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(options, key);
    if (!Object.hasOwn(descriptor, 'value')) fail('arguments');
    copy[key] = descriptor.value;
  }
  if (typeof copy.root !== 'string' || !copy.root.length ||
      typeof copy.revision !== 'string' || !copy.revision.length ||
      !['node', 'native'].includes(copy.lane)) fail('options');
  const paths = copy.paths;
  if (!Array.isArray(paths) || Object.getPrototypeOf(paths) !== Array.prototype) fail('options');
  const length = Object.getOwnPropertyDescriptor(paths, 'length').value;
  const indices = Reflect.ownKeys(paths);
  if (!length || indices.length !== length + 1 || indices[length] !== 'length') fail('options');
  copy.paths = [];
  const seen = new Set();
  for (let i = 0; i < length; i++) {
    if (indices[i] !== String(i)) fail('options');
    const item = Object.getOwnPropertyDescriptor(paths, String(i));
    if (!Object.hasOwn(item, 'value') || typeof item.value !== 'string' ||
        !item.value.length || seen.has(item.value)) fail('options');
    seen.add(item.value);
    copy.paths.push(item.value);
  }
  return copy;
}

// Check every ancestor, not just the leaf: a regular file under an aliased
// directory is still an alias. Hard-linked files are aliases too.
async function exactPath(path, directory = false) {
  const absolute = resolve(path);
  let current = parse(absolute).root;
  for (const part of relative(current, absolute).split(sep).filter(Boolean)) {
    current = resolve(current, part);
    if ((await lstat(current)).isSymbolicLink()) throw new Error('alias');
  }
  if (await realpath(absolute) !== absolute) throw new Error('alias');
  const info = await lstat(absolute);
  if (directory ? !info.isDirectory() : !info.isFile() || info.nlink !== 1) throw new Error('file');
  return absolute;
}

async function closure() {
  const files = [];
  const labels = new Set();
  async function add(path, label) {
    if (labels.has(label)) throw new Error('duplicate');
    labels.add(label);
    files.push({ path: label, sha256: sha256(await readFile(await exactPath(path))) });
  }
  for (const path of ['tools/test262/input.mjs', 'tools/test262/script-capabilities.mjs',
    'tools/test262/script-capabilities.json', 'tools/test262/script-plan.mjs',
    'tools/test262/script-ledger.mjs',
    'fixtures/assistance/test262-starter-corpus/manifest.json', 'package.json', 'package-lock.json']) {
    await add(resolve(base, path), path);
  }
  await add(process.execPath, '@node');
  const require = createRequire(import.meta.url);
  const resolvedYaml = require.resolve('yaml/package.json');
  // Node resolves package symlinks before returning their paths. Validate the
  // lookup spelling as well, or a junction could disappear from our audit.
  let yaml;
  for (const directory of require.resolve.paths('yaml')) {
    const candidate = resolve(directory, 'yaml/package.json');
    try { await lstat(candidate); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    if (await exactPath(candidate) !== resolvedYaml) throw new Error('package alias');
    yaml = dirname(candidate);
    break;
  }
  if (!yaml) throw new Error('package missing');
  async function walk(directory) {
    await exactPath(directory, true);
    for (const name of await readdir(directory)) {
      const path = resolve(directory, name);
      const info = await lstat(path);
      if (info.isSymbolicLink()) throw new Error('alias');
      if (info.isDirectory()) await walk(path);
      else {
        await add(path, '@yaml/' + relative(yaml, path).split(sep).join('/'));
      }
    }
  }
  await walk(yaml);
  files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  return { id: 'rift-script-blocked-v3', closureSha256: sha256(JSON.stringify(files)),
    files, host: process.version, platform: process.platform + '/' + process.arch };
}

async function stage(code, operation) {
  try { return await operation(); } catch { fail(code); }
}

export async function prepareScriptSelection(options) {
  if (arguments.length !== 1) fail('arguments');
  const copied = request(options);
  const authority = await stage('authority', readScriptCapabilities);
  const policy = await stage('closure', closure);
  const planned = await stage('selection', () => planCorpus(copied));
  const files = await stage('debts', () => {
    let ordinal = 0;
    return planned.files.map((file, fileOrdinal) => ({
      ordinal: fileOrdinal, path: file.path, manifestId: file.id,
      inputError: structuredClone(file.inputError),
      slots: file.variants === null ? null : file.variants.map(variant => {
        const metadata = Object.fromEntries(fields.map(key => [key, structuredClone(variant.metadata[key])]));
        return { id: variant.id, ordinal: ordinal++, fileOrdinal, path: file.path,
          manifestId: file.id, lane: variant.lane, variant: variant.variant, goal: variant.goal,
          blob: variant.blob, sourceSha256: variant.sourceSha256, byteLength: variant.byteLength,
          transformedSourceSha256: variant.transformedSourceSha256, metadata,
          harness: structuredClone(variant.harness), harnessState: file.inputError ? 'input-failed' : 'verified',
          debts: reconstructScriptDebts(metadata, variant.variant, file.id), admission: 'blocked' };
      }),
    }));
  });
  const secondAuthority = await stage('authority', readScriptCapabilities);
  if (!isDeepStrictEqual(authority, secondAuthority)) fail('drift');
  const secondPolicy = await stage('closure', closure);
  if (!isDeepStrictEqual(policy, secondPolicy)) fail('drift');
  const selection = freeze({ selectionVersion: 2, kind: 'script-blocked-selection', runId: randomUUID(),
    revision: planned.revision, manifestSha256: planned.manifestSha256, lane: planned.lane, cache: false,
    authority: { registryVersion: authority.registryVersion,
      registrySha256: sha256(JSON.stringify(authority) + '\n'), entries: structuredClone(authority.entries) },
    policy, execution: null, files, excludedFixtures: [] });
  const token = Object.freeze({});
  selections.set(token, selection);
  return token;
}

export function inspectScriptSelection(token) {
  if (arguments.length !== 1) fail('arguments');
  if (!selections.has(token)) fail('token');
  return freeze(structuredClone(selections.get(token)));
}
