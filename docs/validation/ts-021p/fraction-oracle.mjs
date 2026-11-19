// Independent exact-rational round-trip check for finite positive fractions.
// No host radix formatter or floating-point accumulation participates in the oracle.
import { readFileSync, writeFileSync } from 'node:fs';
function binary(bits) {
    const exponent = Number((bits >> 52n) & 2047n);
    const mantissa = (bits & ((1n << 52n) - 1n)) + (exponent === 0 ? 0n : 1n << 52n);
    const power = exponent === 0 ? -1074 : exponent - 1075;
    return power >= 0 ? [mantissa << BigInt(power), 1n] : [mantissa, 1n << BigInt(-power)];
}
function midpoint(a, b) { return [a[0] * b[1] + b[0] * a[1], 2n * a[1] * b[1]]; }
function compare(a, b) {
    const difference = a[0] * b[1] - b[0] * a[1];
    return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}
function verify(input, base, output) {
    const data = new DataView(new ArrayBuffer(8));
    data.setFloat64(0, Number(input));
    const bits = data.getBigUint64(0);
    const x = binary(bits);
    const lower = midpoint(binary(bits - 1n), x);
    const upper = midpoint(x, binary(bits + 1n));
    const parts = output.trim().split('.');
    const digits = parts.join('');
    let numerator = 0n;
    for (const digit of digits) {
        const value = '0123456789abcdefghijklmnopqrstuvwxyz'.indexOf(digit);
        if (value < 0 || value >= base) return { roundTrip: false, reason: 'digit outside radix' };
        numerator = numerator * BigInt(base) + BigInt(value);
    }
    const denominator = BigInt(base) ** BigInt(parts[1]?.length ?? 0);
    const low = compare([numerator, denominator], lower);
    const high = compare([numerator, denominator], upper);
    const even = (bits & 1n) === 0n;
    return { roundTrip: (low > 0 || (low === 0 && even)) && (high < 0 || (high === 0 && even)),
        lowerComparison: low, upperComparison: high, evenSignificand: even };
}
if (!verify('0.5', 2, '0.1').roundTrip || verify('0.5', 2, '0.01').roundTrip
    || !verify('0.3', 16, '0.4ccccccccccccc').roundTrip) throw new Error('oracle self-check');
const results = JSON.parse(readFileSync(new URL('results.json', import.meta.url)));
if (results.probes[0].cases.some(row => row.gate !== 'PASS' || !row.oracle)) throw new Error('probe prerequisites failed');
if (results.probes[0].exploratory.some(row => !row.native || row.native.status !== 0 || row.node.status !== 0
    || row.native.error || row.node.error || row.native.signal || row.node.signal)) throw new Error('execution failed');
const checked = results.probes[0].exploratory.map(row => ({ args: row.args,
    node: verify(row.args[0], Number(row.args[1]), row.node.stdout),
    native: verify(row.args[0], Number(row.args[1]), row.native.stdout) }));
writeFileSync(new URL('fraction-results.json', import.meta.url), JSON.stringify(checked, null, 2) + '\n');
console.log(JSON.stringify(checked, null, 2));
process.exitCode = checked.every(row => row.node.roundTrip && row.native.roundTrip) ? 0 : 1;
