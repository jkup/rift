// Frozen CL-005 corpus generator, extracted without changing generation logic.
// Source: d532a14 run.mjs; host-only evidence tooling, never guest execution.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {bitsOf} from '../../../fixtures/assistance/radix-formatter-options/oracle.mjs';
const retained=JSON.parse(readFileSync(new URL('../ts-021p/results.json',import.meta.url),'utf8'));
const fromBits = (bits) => { const v = new DataView(new ArrayBuffer(8)); v.setBigUint64(0, bits); return v.getFloat64(0); };
const next = (x) => fromBits(bitsOf(x) + 1n);
const previous = (x) => fromBits(bitsOf(x) - 1n);

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

const bytes=cases.map(c=>bitsOf(c.x).toString(16).padStart(16,'0')+' '+c.radix+' '+c.origin+'\n').join('');
const path=new URL('corpus.txt',import.meta.url);
if(process.argv.includes('--freeze')) writeFileSync(path,bytes);
else if(readFileSync(path,'utf8')!==bytes) throw new Error('corpus bytes differ');
console.log(JSON.stringify({cases:cases.length,sha256:createHash('sha256').update(bytes).digest('hex'),node:process.version,origins:cases.reduce((a,c)=>(a[c.origin]=(a[c.origin]??0)+1,a),{})},null,2));
