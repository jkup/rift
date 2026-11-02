// Research transcription of the free-format algorithm of Burger & Dybvig, "Printing
// Floating-Point Numbers Quickly and Accurately", PLDI 1996, doi:10.1145/231379.231397
// (itself refining Steele & White's FPP², PLDI 1990, doi:10.1145/93542.93559), for any output
// radix, with exact BigInt state. Bounds are inclusive for an even significand (round half to
// even reader). The final-digit choice follows ECMA-262 2025 Note 2: closest, then even s.
// Not production code; it exists to cross-check oracle.mjs by a different method.
import { bitsOf } from './oracle.mjs';

const TWO_52 = 1n << 52n;

export function freeFormat(x, radix) {
    const bits = bitsOf(x);
    const biased = Number((bits >> 52n) & 0x7ffn);
    const f = biased === 0 ? bits & (TWO_52 - 1n) : (bits & (TWO_52 - 1n)) | TWO_52;
    const e = (biased === 0 ? 1 : biased) - 1075;
    const inclusive = (f & 1n) === 0n;
    const B = BigInt(radix);
    // v = r/s; the rounding interval is (r - mMinus, r + mPlus) / s.
    // The gap below x is half the gap above when f = 2^52 and x is not the smallest normal.
    const unequal = f === TWO_52 && biased > 1;
    let r, s, mPlus, mMinus;
    if (e >= 0) {
        const be = 1n << BigInt(e);
        if (!unequal) { r = f * be * 2n; s = 2n; mPlus = be; mMinus = be; }
        else { r = f * be * 4n; s = 4n; mPlus = be * 2n; mMinus = be; }
    } else if (!unequal) {
        r = f * 2n; s = 1n << BigInt(1 - e); mPlus = 1n; mMinus = 1n;
    } else {
        r = f * 4n; s = 1n << BigInt(2 - e); mPlus = 2n; mMinus = 1n;
    }
    // Scale so that the high end of the interval lies in [B^(k-1), B^k).
    let k = Math.ceil(Math.log(x) / Math.log(radix) - 1e-10);
    if (k >= 0) s *= B ** BigInt(k);
    else { const scale = B ** BigInt(-k); r *= scale; mPlus *= scale; mMinus *= scale; }
    const highReached = () => (inclusive ? r + mPlus >= s : r + mPlus > s);
    while (highReached()) { s *= B; k++; }
    while (!(inclusive ? (r + mPlus) * B >= s : (r + mPlus) * B > s)) { r *= B; mPlus *= B; mMinus *= B; k--; }

    const digits = [];
    let maxBits = 0;
    for (;;) {
        r *= B; mPlus *= B; mMinus *= B;
        const d = r / s;
        r %= s;
        maxBits = Math.max(maxBits, s.toString(2).length, (r + mPlus).toString(2).length);
        const low = inclusive ? r <= mMinus : r < mMinus;
        const high = inclusive ? r + mPlus >= s : r + mPlus > s;
        if (!low && !high) { digits.push(d); continue; }
        if (low && !high) digits.push(d);
        else if (!low && high) digits.push(d + 1n);
        else if (2n * r < s) digits.push(d);
        else if (2n * r > s) digits.push(d + 1n);
        else {
            // Exact tie: keep the candidate whose whole significand s is even.
            const significand = digits.reduce((acc, digit) => acc * B + digit, 0n) * B + d;
            digits.push(significand % 2n === 0n ? d : d + 1n);
        }
        break;
    }
    if (digits[digits.length - 1] >= B) throw new Error('digit overflow');
    const significand = digits.reduce((acc, digit) => acc * B + digit, 0n);
    return { s: significand, n: k, k: digits.length, maxBits };
}
