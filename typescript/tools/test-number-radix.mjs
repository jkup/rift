import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { shortest, judge, roundingInterval } from '../fixtures/assistance/radix-formatter-options/oracle.mjs';
import { probeVerdict } from './probe-verdict.mjs';
import { scriptcPath } from './scriptc-path.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const evidence = new URL(process.env.RIFT_RADIX_EVIDENCE ?? '../build/number-radix/', import.meta.url);
mkdirSync(evidence, { recursive: true });
if (process.argv.includes('--build')) {
    const invoke = (command, args) => {
        const r = spawnSync(command, args, { cwd: root, encoding: 'utf8', timeout: 600000 });
        return { command, args, status: r.status, signal: r.signal, error: r.error?.message ?? null,
            stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
    };
    const compiler = scriptcPath(root);
    const node = invoke(process.execPath, [root + 'node_modules/typescript/bin/tsc', '-p', 'tsconfig.json']);
    const version = invoke(compiler, ['--version']);
    const build = invoke(compiler, ['build', 'test/number-radix.ts', '--tier', 'static-only', '-o', root + 'build/native/number-radix.exe']);
    const coverage = invoke(compiler, ['coverage', 'test/number-radix.ts']);
    const success = { status: 0, signal: null, error: null, stdout: '' };
    const verdict = probeVerdict({ build, coverage, node: success, native: success });
    writeFileSync(new URL('backend-build-results.json', evidence), JSON.stringify({ version, node, build, coverage, verdict }, null, 2));
    assert.equal(node.status, 0); assert.equal(node.error, null); assert.equal(verdict, 'PASS');
}
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const frozen = readFileSync(new URL('../docs/validation/ts-032p/corpus.txt', import.meta.url));
assert.equal(hash(frozen), '9102f9fe83fc37b2b883a55e29c9ec173e4c0d54118eaf96113a166702dc1c6d');
const frozenRows = frozen.toString().trimEnd().split('\n');
assert.equal(frozenRows.length, 13350);
const vectors = JSON.parse(readFileSync(new URL('../docs/validation/ts-032p/vectors.json', import.meta.url)));
const view = new DataView(new ArrayBuffer(8));
const fromBits = bits => { view.setBigUint64(0, BigInt('0x' + bits)); return view.getFloat64(0); };
const supplements = [];
// Enumerate power-of-two boundaries, then select exponent transition groups
// for every radix, plus low subnormals and MAX_VALUE. Duplicates stay counted.
const boundaries = [1n, 2n, 3n, 0xfffffffffffffn, 0x7fefffffffffffffn];
for (let exponent = 1n; exponent <= 2046n; exponent++) {
    const center = exponent << 52n;
    boundaries.push(center - 1n, center, center + 1n);
}
// A bounded supplement uses selected exponent extremes and transitions;
// every radix receives the identical boundary set, without altering frozen rows.
const selected = boundaries.filter(bits => {
    const e = bits >> 52n;
    return e <= 3n || e >= 2044n || (e >= 1021n && e <= 1025n) || e === 1075n;
});
for (let radix = 2; radix <= 36; radix++) if (radix !== 10)
    for (const bits of selected) supplements.push(bits.toString(16).padStart(16, '0') + ' ' + radix);
const rows = [...frozenRows, ...supplements, ...vectors.map(v => v.bits + ' ' + v.radix)];
writeFileSync(new URL('runtime-input.txt', evidence), rows.join('\n') + '\n');
const answers = rows.map(row => { const [bits, radix] = row.split(' '); return shortest(fromBits(bits), +radix); });
function run(lane, argument) {
    const command = lane === 'node' ? process.execPath : root + 'build/native/number-radix.exe';
    const args = lane === 'node' ? [root + 'build/node/test/number-radix.js', argument] : [argument];
    const start = performance.now();
    const r = spawnSync(command, args, { cwd: root, encoding: 'utf8', timeout: 600000, maxBuffer: 64 * 1024 * 1024 });
    const record = { command, args, status: r.status, signal: r.signal, error: r.error?.message ?? null,
        elapsedMs: performance.now() - start, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
    writeFileSync(new URL(lane + (argument === 'controls' ? '-controls' : '-corpus') + '.json', evidence), JSON.stringify(record, null, 2));
    assert.equal(record.error, null); assert.equal(r.signal, null); assert.equal(r.status, 0, r.stderr);
    return record;
}
const summary = { node: process.version, frozenPairs: frozenRows.length, frozenHash: hash(frozen),
    supplementPairs: supplements.length, literalVectors: vectors.length, totalPerLane: rows.length, lanes: {} };
const outputTexts = [];
for (const lane of ['node', 'native']) {
    const controls = run(lane, 'controls');
    assert.ok(controls.stdout.trimEnd().endsWith('controls PASS'));
    for (const line of controls.stdout.trimEnd().split(/\r?\n/).slice(0, -1)) {
        const [, bits, rs, ds, ms, ps, closed] = line.split(' ');
        const r = BigInt(rs), d = BigInt(ds), m = BigInt(ms), p = BigInt(ps);
        const expected = roundingInterval(fromBits(bits));
        assert.equal(closed, String(expected.closed));
        assert.equal(r * expected.value.den, expected.value.num * d);
        assert.equal((r - m) * expected.low.den, expected.low.num * d);
        assert.equal((r + p) * expected.high.den, expected.high.num * d);
    }
    const result = run(lane, fileURLToPath(new URL('runtime-input.txt', evidence)));
    const lines = result.stdout.trimEnd().split(/\r?\n/);
    assert.equal(lines.length, rows.length, 'missing/duplicate output');
    const texts = [], times = [], verdicts = [];
    const maxima = { k: 0, scale: 0, power: 0, width: 0, length: 0, candidates: 0 };
    for (let i = 0; i < rows.length; i++) {
        const [index, bits, radix, text, k, scale, power, width, length, candidates, elapsed] = lines[i].split(' ');
        assert.equal(+index, i); assert.equal(bits + ' ' + radix, rows[i].split(' ').slice(0, 2).join(' '));
        const verdict = judge(fromBits(bits), +radix, text, answers[i]);
        verdicts.push(verdict);
        assert.ok(verdict.wellFormed && verdict.inInterval && verdict.shortest && verdict.recommended, `${lane} ${i}: ${JSON.stringify(verdict)}`);
        assert.equal(+k, verdict.k); assert.equal(+length, text.length);
        assert.ok(+k <= 57 && +scale <= 1076 && +power <= 1131 && +width <= 16384 && +length <= 1076);
        assert.equal(+candidates, 6);
        for (const [key, val] of Object.entries({ k, scale, power, width, length, candidates })) maxima[key] = Math.max(maxima[key], +val);
        texts.push(text); times.push(+elapsed);
    }
    for (let i = 0; i < vectors.length; i++) assert.equal(texts[frozenRows.length + supplements.length + i], vectors[i].expected);
    times.sort((a, b) => a - b);
    const resourceFields = result.stderr.trim().split(' ');
    assert.equal(resourceFields[0], 'resources'); assert.equal(resourceFields.length, 9);
    const warmBatches = resourceFields.slice(4).map(Number).sort((a, b) => a - b);
    assert.equal(+resourceFields[3], texts.reduce((sum, text) => sum + text.length, 0) * 5);
    summary.lanes[lane] = { canonical: lines.length, interval: lines.length, minimumK: lines.length,
        note2: lines.length, skips: 0, crashes: 0, timeouts: 0, maxima, elapsedMs: result.elapsedMs,
        callMedianMs: times[Math.floor(times.length / 2)], callMaxMs: times.at(-1),
        warmBatchMedianMs: warmBatches[2], warmBatchMaxMs: warmBatches.at(-1),
        warmBatchCalls: rows.length, warmBatchRepetitions: 5,
        reportedRssBefore: +resourceFields[1], reportedRssAfter: +resourceFields[2],
        outputHash: hash(texts.join('\n')), artifactHash: hash(readFileSync(root + (lane === 'native' ? 'build/native/number-radix.exe' : 'build/node/test/number-radix.js'))) };
    writeFileSync(new URL(lane + '-verdicts.json', evidence), JSON.stringify(verdicts));
    outputTexts.push(texts);
}
assert.deepEqual(outputTexts[0], outputTexts[1]);
// Retain malformed-whole-string controls without altering the exact oracle.
const malformed = ['0.1.garbage', '0.1.', '0.10', '1.', '00.1', '.1', '0.1.0', '+0.1', ' 0.1', '',
    'FF', 'ff.0', '0ff', '100.', '100.0', '0.1\n', '-1'];
for (const text of malformed) assert.equal(judge(0.0625, 16, text).wellFormed, false, text);
assert.equal(judge(256, 16, '1').inInterval, false);
assert.equal(judge(256, 16, '100').recommended, true);
summary.malformedControls = malformed.length;
writeFileSync(new URL('summary.json', evidence), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
