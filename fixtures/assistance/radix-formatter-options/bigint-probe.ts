// Portability probe, not a formatter: does the free-format digit loop (free-format.mjs) written
// with native bigint compile under scriptc --tier static-only, with fully static coverage, and
// match the exact oracle in both lanes? Inputs arrive as process arguments after compilation.
// Prints "<s in radix> <n>" for finite x > 0; the driver checks it against oracle.mjs.

const TWO_52: bigint = 1n << 52n;

function bitsOf(x: number): bigint {
    const view = new DataView(new ArrayBuffer(8));
    view.setFloat64(0, x);
    return view.getBigUint64(0);
}

function power(base: bigint, exponent: number): bigint {
    let result = 1n;
    for (let i = 0; i < exponent; i++) result *= base;
    return result;
}

function freeFormat(x: number, radix: number): string {
    const bits = bitsOf(x);
    const biased = Number((bits >> 52n) & 0x7ffn);
    const fraction = bits & (TWO_52 - 1n);
    const f = biased === 0 ? fraction : fraction | TWO_52;
    const e = (biased === 0 ? 1 : biased) - 1075;
    const inclusive = (f & 1n) === 0n;
    const B = BigInt(radix);
    const unequal = f === TWO_52 && biased > 1;
    let r: bigint, s: bigint, mPlus: bigint, mMinus: bigint;
    if (e >= 0) {
        const be = 1n << BigInt(e);
        if (!unequal) { r = f * be * 2n; s = 2n; mPlus = be; mMinus = be; }
        else { r = f * be * 4n; s = 4n; mPlus = be * 2n; mMinus = be; }
    } else if (!unequal) {
        r = f * 2n; s = 1n << BigInt(1 - e); mPlus = 1n; mMinus = 1n;
    } else {
        r = f * 4n; s = 1n << BigInt(2 - e); mPlus = 2n; mMinus = 1n;
    }
    let k = Math.ceil(Math.log(x) / Math.log(radix) - 1e-10);
    if (k >= 0) s *= power(B, k);
    else { const scale = power(B, -k); r *= scale; mPlus *= scale; mMinus *= scale; }
    while (inclusive ? r + mPlus >= s : r + mPlus > s) { s *= B; k++; }
    while (!(inclusive ? (r + mPlus) * B >= s : (r + mPlus) * B > s)) { r *= B; mPlus *= B; mMinus *= B; k--; }

    const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
    let significand = 0n;
    let digits = '';
    for (;;) {
        r *= B; mPlus *= B; mMinus *= B;
        let d = r / s;
        r = r % s;
        const low = inclusive ? r <= mMinus : r < mMinus;
        const high = inclusive ? r + mPlus >= s : r + mPlus > s;
        if (low || high) {
            if (!low) d += 1n;
            else if (high && 2n * r > s) d += 1n;
            else if (high && 2n * r === s && (significand * B + d) % 2n !== 0n) d += 1n;
        }
        significand = significand * B + d;
        digits += chars[Number(d)];
        if (low || high) break;
    }
    return digits + ' ' + k;
}

const x: number = parseFloat(process.argv[2]);
const radix: number = parseFloat(process.argv[3]);
console.log(freeFormat(x, radix));
