// CL-005 measurement driver. Usage (from the repository root):
//   node typescript/fixtures/assistance/radix-formatter-options/run.mjs
// Writes results.json beside this file and prints a summary. Exit 1 if the oracle and the
// free-format reference ever disagree on required behaviour (interval membership and the
// smallest k), or an oracle self-check fails.
// "node" rows judge the host's Number.prototype.toString(radix) (V8 in Node); they measure
// that formatter, they are never used as expected values.
import { readFileSync, writeFileSync } from 'node:fs';
import { shortest, judge, format, roundingInterval, roundsTo, bitsOf } from './oracle.mjs';
import { freeFormat } from './free-format.mjs';

const here = new URL('.', import.meta.url);
const retained = JSON.parse(readFileSync(new URL('../../../docs/validation/ts-021p/results.json', here), 'utf8'));
const fromBits = (bits) => { const v = new DataView(new ArrayBuffer(8)); v.setBigUint64(0, bits); return v.getFloat64(0); };
const next = (x) => fromBits(bitsOf(x) + 1n);
const previous = (x) => fromBits(bitsOf(x) - 1n);

// --- self-checks on hand-derivable cases (each follows from step 5 by inspection) ---
const expectExact = [[0.5, 2, '0.1'], [255, 16, 'ff'], [255, 2, '11111111'], [35, 36, 'z'], [2 ** 60, 2, '1' + '0'.repeat(60)]];
for (const [x, radix, text] of expectExact) {
    const answer = shortest(x, radix);
    const got = format(answer.recommended.s, answer.recommended.n, answer.k, radix);
    if (got !== text) throw new Error(`oracle self-check ${x} base ${radix}: ${got}`);
}
if (judge(0.5, 2, '0.01').inInterval) throw new Error('oracle accepted a wrong value');
// Step 6 text must be judged as a whole string, not just its leading digits.
const malformed = [[0.5, 2, '0.1.garbage'], [0.5, 2, '0.1.'], [0.5, 2, '0.10'], [1, 2, '1.'], [0.5, 2, '00.1'],
    [0.5, 2, '.1'], [0.5, 2, '0.1.0'], [0.5, 2, '+0.1'], [0.5, 2, ' 0.1'], [0.5, 2, ''], [255, 16, 'FF'], [255, 16, 'ff.0'],
    [255, 16, '0ff'], [256, 16, '100.'], [2 ** 60, 2, '1' + '0'.repeat(60) + '.0']];
for (const [x, radix, text] of malformed) {
    const verdict = judge(x, radix, text);
    if (verdict.wellFormed || verdict.inInterval) throw new Error(`oracle accepted malformed ${JSON.stringify(text)} for ${x} base ${radix}`);
}
// Dropping integer padding leaves a well-formed string for a different value.
for (const [x, radix, text] of [[256, 16, '1'], [2 ** 60, 2, '1']]) {
    if (judge(x, radix, text).inInterval) throw new Error(`oracle accepted unpadded ${text} for ${x} base ${radix}`);
}
// Integer padding zeros are part of the step 6 output and stay accepted.
for (const [x, radix, text] of [[256, 16, '100'], [2 ** 60, 2, '1' + '0'.repeat(60)], [0.5, 2, '0.1'], [0.75, 4, '0.3']]) {
    if (!judge(x, radix, text).recommended) throw new Error(`oracle rejected canonical ${text} for ${x} base ${radix}`);
}
if (!roundsTo(roundingInterval(5e-324), roundingInterval(5e-324).value)) throw new Error('interval self-check');

// --- corpus ---
const cases = [];
const seen = new Set();
// Radix 10 is the existing decimal backend and is out of scope here.
const push = (x, radix, origin) => {
    if (!(Number.isFinite(x) && x > 0) || radix === 10) return;
    const key = `${bitsOf(x)}:${radix}`;
    if (seen.has(key)) return;
    seen.add(key);
    cases.push({ x, radix, origin });
};
for (const row of retained.probes[0].exploratory) push(Number(row.args[0]), Number(row.args[1]), 'ts021p-exploratory');
const fixedRows = retained.rows.filter((row) => row[2] !== '10');
for (const [, input, radix] of fixedRows) push(Math.abs(Number(input)), Number(radix), 'ts021p-fixed');
const specials = [5e-324, 2.2250738585072009e-308, 2.2250738585072014e-308, Number.MAX_VALUE, 1, next(1), previous(1),
    0.1, 0.2, 0.3, 0.5, 1 / 3, 2 / 3, 123.456, 1e-7, 1e-6, 1e20, 1e21, 1e300, 2 ** 53, 2 ** 53 + 2, 2 ** 60, 2 ** 64,
    2 ** 70 + 2 ** 20, Math.PI, Math.E, 4294967295.5, 9007199254740991];
for (let radix = 2; radix <= 36; radix++) {
    if (radix === 10) continue;
    for (const x of specials) push(x, radix, 'boundary');
    for (let j = -1074; j <= 1023; j += 47) { push(2 ** j, radix, 'power-of-two'); push(next(2 ** j), radix, 'power-of-two'); push(previous(2 ** j), radix, 'power-of-two'); }
    for (let j = -60; j <= 60; j += 7) { const p = radix ** j; push(p, radix, 'radix-power'); push(next(p), radix, 'radix-power'); push(previous(p), radix, 'radix-power'); }
}
// Deterministic xorshift64 over raw bit patterns: positive finite doubles of every magnitude.
let state = 0x9e3779b97f4a7c15n;
const mask = (1n << 64n) - 1n;
const random = () => { state ^= (state << 13n) & mask; state ^= state >> 7n; state ^= (state << 17n) & mask; return state; };
for (let i = 0; i < 4000; i++) {
    const bits = random() & 0x7fefffffffffffffn;
    const pick = 2 + Number(random() % 34n);
    push(fromBits(bits), pick >= 10 ? pick + 1 : pick, 'random');
}
// Everyday magnitudes as well: uniform significands with exponents in 2^-30 .. 2^60.
for (let i = 0; i < 2000; i++) {
    const exponent = BigInt(1023 - 30) + random() % 91n;
    const bits = (exponent << 52n) | (random() & ((1n << 52n) - 1n));
    const pick = 2 + Number(random() % 34n);
    push(fromBits(bits), pick >= 10 ? pick + 1 : pick, 'random-everyday');
}

// --- strategy models read from source (models, not the engines themselves) ---
// QuickJS-ng v0.18.0 dtoa.c js_dtoa JS_DTOA_FORMAT_FREE: from P_max digits downward, take the
// round-half-even nearest P-digit value, drop trailing zeros, keep it while it converts back to
// x, stop at the first failure.
function quickjsModel(x, radix) {
    const interval = roundingInterval(x);
    const B = BigInt(radix);
    const pMax = 1 + Math.ceil(53 / Math.log2(radix));
    // Smallest N with x < radix^N, by exact comparison.
    const below = (n) => (n >= 0 ? interval.value.num < B ** BigInt(n) * interval.value.den
        : interval.value.num * B ** BigInt(-n) < interval.value.den);
    let nTop = Math.floor(Math.log(x) / Math.log(radix)) + 1;
    while (!below(nTop)) nTop++;
    while (below(nTop - 1)) nTop--;
    let found = null;
    for (let P = pMax; P >= 1;) {
        let E = nTop;
        let s;
        for (;;) {
            const scaleExp = P - E;
            const num = interval.value.num * (scaleExp >= 0 ? B ** BigInt(scaleExp) : 1n);
            const den = interval.value.den * (scaleExp < 0 ? B ** BigInt(-scaleExp) : 1n);
            const q = num / den, rem = num - q * den;
            s = 2n * rem > den || (2n * rem === den && q % 2n === 1n) ? q + 1n : q;
            if (s < B ** BigInt(P)) break;
            E++;
        }
        while (s % B === 0n) { s /= B; P--; }
        const scaleExp = E - P;
        const v = scaleExp >= 0 ? { num: s * B ** BigInt(scaleExp), den: 1n } : { num: s, den: B ** BigInt(-scaleExp) };
        if (!roundsTo(interval, v)) break;
        found = { s, n: E, k: P };
        P--;
    }
    return found;
}
// SpiderMonkey js_dtobasestr integer branch: every integer digit of floor(x) exactly.
const exactIntegerDigits = (x, radix) => BigInt(x).toString(radix);

const tally = () => ({ cases: 0, wellFormed: 0, inInterval: 0, shortest: 0, recommended: 0 });
const summary = { node: tally(), freeFormat: tally(), quickjsModel: tally(), spiderMonkeyIntegerModel: tally() };
const perRadixNode = {};
const perBandNode = {};
const failures = { node: [], quickjsModel: [], spiderMonkeyIntegerModel: [] };
const maxLength = {};
let maxBits = 0, crossCheckFailures = 0;
const freeFormatNoteTwoDifferences = [];
const count = (bucket, verdict) => { bucket.cases++; for (const key of ['wellFormed', 'inInterval', 'shortest', 'recommended']) if (verdict[key]) bucket[key]++; };

for (const { x, radix, origin } of cases) {
    const answer = shortest(x, radix);
    const expected = format(answer.recommended.s, answer.recommended.n, answer.k, radix);
    maxLength[radix] = Math.max(maxLength[radix] ?? 0, expected.length);

    const ff = freeFormat(x, radix);
    maxBits = Math.max(maxBits, ff.maxBits);
    const ffVerdict = judge(x, radix, format(ff.s, ff.n, ff.k, radix), answer);
    count(summary.freeFormat, ffVerdict);
    // Required behaviour must agree exactly; the Note 2 choice is recorded, not enforced.
    if (!ffVerdict.shortest) { crossCheckFailures++; console.error('free-format/oracle disagreement', x, radix, ff, answer.recommended); }
    else if (!ffVerdict.recommended) freeFormatNoteTwoDifferences.push({ x, radix, freeFormat: format(ff.s, ff.n, ff.k, radix), recommended: expected });

    const nodeText = x.toString(radix);
    const nodeVerdict = judge(x, radix, nodeText, answer);
    count(summary.node, nodeVerdict);
    const bucket = (perRadixNode[radix] ??= tally());
    count(bucket, nodeVerdict);
    const powerOfTwoRadix = (radix & (radix - 1)) === 0;
    const band = x < 2 ** -30 ? 'below 2^-30' : x < 2 ** 53 ? '2^-30 to 2^53' : '2^53 and above';
    count((perBandNode[`${powerOfTwoRadix ? 'power-of-two radix' : 'other radix'}, ${band}`] ??= tally()), nodeVerdict);
    if (!nodeVerdict.shortest && failures.node.length < 150) failures.node.push({ x, radix, origin, node: nodeText, k: nodeVerdict.k, minimalK: answer.k, inInterval: nodeVerdict.inInterval, recommended: expected });

    const qm = quickjsModel(x, radix);
    const qmVerdict = qm ? judge(x, radix, format(qm.s, qm.n, qm.k, radix), answer) : { inInterval: false, shortest: false, recommended: false };
    count(summary.quickjsModel, qmVerdict);
    if (!qmVerdict.shortest && failures.quickjsModel.length < 100) failures.quickjsModel.push({ x, radix, origin, k: qm?.k, minimalK: answer.k, recommended: expected });

    if (x >= 2 ** 53 && Number.isInteger(x)) {
        const smVerdict = judge(x, radix, exactIntegerDigits(x, radix), answer);
        count(summary.spiderMonkeyIntegerModel, smVerdict);
        if (!smVerdict.shortest && failures.spiderMonkeyIntegerModel.length < 100) failures.spiderMonkeyIntegerModel.push({ x, radix, origin, k: smVerdict.k, minimalK: answer.k });
    }
}

const retainedSeven = retained.probes[0].exploratory.map((row) => {
    const x = Number(row.args[0]), radix = Number(row.args[1]);
    const answer = shortest(x, radix);
    return { input: row.args[0], radix, hostOutput: row.node.stdout.trim(), native: row.native.stdout.trim(),
        verdict: judge(x, radix, row.node.stdout.trim(), answer),
        stepFiveCandidates: answer.candidates.map((c) => format(c.s, c.n, answer.k, radix)),
        recommended: format(answer.recommended.s, answer.recommended.n, answer.k, radix) };
});
const fixedCheck = fixedRows.filter(([, input]) => Number.isFinite(Number(input)) && Number(input) !== 0).map(([id, input, radix, expected]) => {
    const x = Math.abs(Number(input)), text = expected.replace(/^-/, '');
    const verdict = judge(x, Number(radix), text);
    return { id, input, radix, expected, ...verdict };
});

const results = {
    node: process.version, v8: process.versions.v8, cases: cases.length,
    origins: cases.reduce((acc, c) => ((acc[c.origin] = (acc[c.origin] ?? 0) + 1), acc), {}),
    summary, perBandNode, perRadixNode, maxStringLength: maxLength, freeFormatMaxBits: maxBits, crossCheckFailures, freeFormatNoteTwoDifferences,
    retainedExploratory: retainedSeven, fixedExpectedCheck: fixedCheck, failures,
};
writeFileSync(new URL('results.json', here), JSON.stringify(results, null, 1) + '\n');
console.log(JSON.stringify({ node: results.node, v8: results.v8, cases: results.cases, origins: results.origins, summary, perBandNode, freeFormatMaxBits: maxBits, crossCheckFailures,
    fixedExpected: `${fixedCheck.filter((r) => r.recommended).length}/${fixedCheck.length} recommended, ${fixedCheck.filter((r) => r.shortest).length} shortest` }, null, 1));
process.exitCode = crossCheckFailures === 0 ? 0 : 1;
