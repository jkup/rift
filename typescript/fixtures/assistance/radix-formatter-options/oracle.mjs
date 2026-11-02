// Exact oracle for ECMA-262 2025 Number::toString(x, radix), steps 5-6, for finite x > 0.
// It searches the step 5 definition directly (smallest k, then every s and n that round to x)
// with BigInt rationals. It never generates digits and never calls a host formatter.
// Research only: not a production formatter and not part of the interpreter.

export const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';
const TWO_52 = 1n << 52n;

// A rational is { num, den } with BigInt parts and den > 0.
const rational = (num, den = 1n) => ({ num, den });
const compare = (a, b) => {
    const difference = a.num * b.den - b.num * a.den;
    return difference < 0n ? -1 : difference > 0n ? 1 : 0;
};
const add = (a, b) => rational(a.num * b.den + b.num * a.den, a.den * b.den);
const half = (a) => rational(a.num, a.den * 2n);
const power = (radix, exponent) =>
    exponent >= 0 ? rational(BigInt(radix) ** BigInt(exponent)) : rational(1n, BigInt(radix) ** BigInt(-exponent));

export function bitsOf(x) {
    const view = new DataView(new ArrayBuffer(8));
    view.setFloat64(0, x);
    return view.getBigUint64(0);
}

// Value of a binary64 bit pattern. The all-ones exponent with zero fraction yields 2^1024,
// which ECMA-262's "Number value for" treats as the even neighbour above Number.MAX_VALUE.
export function valueOfBits(bits) {
    const biased = Number((bits >> 52n) & 0x7ffn);
    const fraction = bits & (TWO_52 - 1n);
    const significand = biased === 0 ? fraction : fraction | TWO_52;
    const exponent = (biased === 0 ? 1 : biased) - 1075;
    return exponent >= 0 ? rational(significand << BigInt(exponent)) : rational(significand, 1n << BigInt(-exponent));
}

// The set of mathematical values v with 𝔽(v) = x: the open interval between the midpoints to
// the neighbouring doubles, closed when x has an even significand (round half to even).
export function roundingInterval(x) {
    const bits = bitsOf(x);
    const value = valueOfBits(bits);
    const below = bits === 1n ? rational(0n) : valueOfBits(bits - 1n);
    return {
        value,
        low: half(add(below, value)),
        high: half(add(value, valueOfBits(bits + 1n))),
        closed: (bits & 1n) === 0n,
    };
}

export function roundsTo(interval, v) {
    const low = compare(v, interval.low);
    const high = compare(v, interval.high);
    return (low > 0 || (low === 0 && interval.closed)) && (high < 0 || (high === 0 && interval.closed));
}

// Smallest integer s with s * scale inside the interval, and the largest one.
function scaledBounds(interval, scale) {
    const lowNum = interval.low.num * scale.den, lowDen = interval.low.den * scale.num;
    const highNum = interval.high.num * scale.den, highDen = interval.high.den * scale.num;
    let first = lowNum / lowDen;
    if (first * lowDen !== lowNum || !interval.closed) first += 1n;
    let last = highNum / highDen;
    if (last * highDen === highNum && !interval.closed) last -= 1n;
    return [first, last];
}

// Smallest integer N with x < radix^N.
function magnitude(value, radix, estimate) {
    let n = estimate;
    while (compare(value, power(radix, n)) >= 0) n++;
    while (compare(value, power(radix, n - 1)) < 0) n--;
    return n;
}

// All (s, n) at the smallest k satisfying step 5, plus the Note 2 recommended choice.
export function shortest(x, radix) {
    if (!(Number.isFinite(x) && x > 0) || radix < 2 || radix > 36) throw new RangeError('finite x > 0, radix 2..36');
    const interval = roundingInterval(x);
    const big = BigInt(radix);
    const top = magnitude(interval.value, radix, Math.floor(Math.log(x) / Math.log(radix)) + 1);
    for (let k = 1; k <= 1100; k++) {
        const smallestS = big ** BigInt(k - 1), limitS = big ** BigInt(k);
        const candidates = [];
        for (const n of [top - 1, top, top + 1]) {
            const [first, last] = scaledBounds(interval, power(radix, n - k));
            const lo = first > smallestS ? first : smallestS;
            const hi = last < limitS - 1n ? last : limitS - 1n;
            for (let s = lo; s <= hi; s++) candidates.push({ s, n });
        }
        if (candidates.length === 0) continue;
        // Note 2: closest to x, then the even s. Distances compared exactly.
        const distance = ({ s, n }) => {
            const v = power(radix, n - k);
            const diff = rational(s * v.num * interval.value.den - interval.value.num * v.den, v.den * interval.value.den);
            return rational(diff.num < 0n ? -diff.num : diff.num, diff.den);
        };
        let best = candidates[0];
        for (const candidate of candidates.slice(1)) {
            const order = compare(distance(candidate), distance(best));
            if (order < 0 || (order === 0 && candidate.s % 2n === 0n)) best = candidate;
        }
        return { k, candidates, recommended: best };
    }
    throw new Error('no representation found');
}

// Step 6 positional output (radix 10 outside -5..21 uses exponential notation, step 7+).
export function format(s, n, k, radix) {
    const digits = s.toString(radix);
    if (digits.length !== k) throw new Error('digit count mismatch');
    if (radix === 10 && !(n >= -5 && n <= 21)) {
        const exponent = (n - 1 < 0 ? '-' : '+') + Math.abs(n - 1);
        return k === 1 ? digits + 'e' + exponent : digits[0] + '.' + digits.slice(1) + 'e' + exponent;
    }
    if (n >= k) return digits + '0'.repeat(n - k);
    if (n > 0) return digits.slice(0, n) + '.' + digits.slice(n);
    return '0.' + '0'.repeat(-n) + digits;
}

// Parse a positional radix string (no sign) back to (s, n, k) with trailing zeros removed.
// The whole text must be digits of this radix with at most one interior '.'; anything else is
// null. It accepts noncanonical spellings such as '0.10'; judge rejects those separately.
export function parsePositional(text, radix) {
    const digit = `[${DIGITS.slice(0, radix)}]`;
    if (!new RegExp(`^${digit}+(\\.${digit}+)?$`).test(text)) return null;
    const [whole, fraction = ''] = text.split('.');
    let digits = (whole + fraction).replace(/^0+/, '');
    let n = whole === '0' ? -(fraction.length - fraction.replace(/^0+/, '').length) : whole.length;
    let s = 0n;
    for (const ch of digits) {
        const d = DIGITS.indexOf(ch);
        if (d < 0 || d >= radix) return null;
        s = s * BigInt(radix) + BigInt(d);
    }
    const stripped = digits.replace(/0+$/, '');
    if (stripped.length === 0) return null;
    s = s / BigInt(radix) ** BigInt(digits.length - stripped.length);
    return { s, n, k: stripped.length };
}

// Classify any produced string for finite x > 0 against step 5 and Note 2. A string counts only
// when it is exactly the step 6 rendering of its own (s, n, k): no stray or trailing '.', no
// leading zeros or fraction trailing zeros, but integer padding zeros (n > k) are required.
export function judge(x, radix, text, answer = shortest(x, radix)) {
    const parsed = parsePositional(text, radix);
    if (!parsed || text !== format(parsed.s, parsed.n, parsed.k, radix)) {
        return { wellFormed: false, inInterval: false, shortest: false, recommended: false, k: null, minimalK: answer.k };
    }
    const v = power(radix, parsed.n - parsed.k);
    const inInterval = roundsTo(roundingInterval(x), rational(parsed.s * v.num, v.den));
    const isShortest = inInterval && parsed.k === answer.k;
    const recommended = isShortest && parsed.s === answer.recommended.s && parsed.n === answer.recommended.n;
    return { wellFormed: true, inInterval, shortest: isShortest, recommended, k: parsed.k, minimalK: answer.k };
}
