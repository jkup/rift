import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import YAML from 'yaml';
import {observeScripts} from './native-observe.mjs';

const root = '/var/tmp/rift-test262-baseline-91c7075';
const harnessCache = new Map();
function harness(name) {
  if (!/^[A-Za-z0-9_.-]+\.js$/.test(name)) throw new Error('invalid harness filename');
  if (!harnessCache.has(name)) harnessCache.set(name, readFileSync(join(root, 'harness', name), 'utf8'));
  return harnessCache.get(name);
}

export function classify(observation, negative) {
  const {result, operation} = observation;
  if (operation.stage !== 'test') return 'harness-error';
  if (result.kind.startsWith('unsupported-') || result.kind === 'resource-limit') return result.kind;
  if (!negative) return result.kind === 'normal' && operation.phase === 'body' ? 'passed' : 'failed';
  if (negative.phase === 'parse' || negative.phase === 'early') {
    return result.kind === 'syntax-error' && operation.phase === 'parse' && result.constructorName === negative.type ? 'passed' : 'failed';
  }
  if (negative.phase !== 'runtime') return 'unsupported-negative-phase';
  return result.kind === 'throw' && operation.phase !== 'parse' && result.constructor.outcome === 'available'
    && result.constructor.name === negative.type ? 'passed' : 'failed';
}

export function runSource(code, metadata) {
  const flags = metadata.flags ?? [];
  const includes = metadata.includes ?? [];
  if (!Array.isArray(flags) || !Array.isArray(includes)) throw new Error('invalid metadata lists');
  if (flags.includes('module')) return {status: 'unsupported-module', variants: []};
  if (flags.includes('async')) return {status: 'unsupported-async', variants: []};
  const negative = metadata.negative ?? null;
  if (negative && (typeof negative.type !== 'string' || typeof negative.phase !== 'string')) throw new Error('invalid negative metadata');
  const parseOnly = negative?.phase === 'parse' || negative?.phase === 'early';
  const modes = flags.includes('raw') || flags.includes('noStrict') ? [false] : flags.includes('onlyStrict') ? [true] : [false, true];
  const variants = [];
  for (const strict of modes) {
    const names = flags.includes('raw') || parseOnly ? [] : ['sta.js', 'assert.js', ...includes];
    const units = names.map((name, index) => ({id: 'u' + index, role: 'harness', text: harness(name)}));
    units.push({id: 'u' + units.length, role: 'test', text: (strict ? '"use strict";\n' : '') + code});
    const observation = observeScripts({nonce: 'baseline', requestSha256: '0'.repeat(64), action: parseOnly ? 'parse-only' : 'execute', preflightId: null, steps: 1000000, calls: 10000, units});
    variants.push({mode: strict ? 'strict' : 'non-strict', status: classify(observation, negative), observation});
  }
  return {status: variants.every(v => v.status === 'passed') ? 'passed' : variants.find(v => v.status !== 'passed').status, variants};
}

export function runFile(path) {
  const bytes = readFileSync(join(root, path));
  const code = bytes.toString('utf8');
  const match = code.match(/\/\*---([\s\S]*?)---\*\//);
  if (!match) throw new Error('missing Test262 metadata');
  const metadata = YAML.parse(match[1]);
  return {path, sha256: createHash('sha256').update(bytes).digest('hex'), ...runSource(code, metadata)};
}
