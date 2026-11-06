// Private numerical implementation and test seams. No guest-facing API.
// Derived from docs/radix-formatter-backend.md; free-format remainder/margin
// method attributed to Burger and Dybvig (1996). No paper/engine code copied.
const DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz";
const WIDTH_HALF = (1n << 16383n) - 1n;
const WIDTH_LIMIT = WIDTH_HALF + WIDTH_HALF + 1n;

export class RadixResources {
    largest = 0n;
    scaleIterations = 0;
    powerIterations = 0;
    digits = 0;
    length = 0;
    candidates = 0;
    // Watching every arithmetic result also watches operands of later products.
    watch(value: bigint): bigint {
        const magnitude = value < 0n ? -value : value;
        if (magnitude > WIDTH_LIMIT) throw new Error("radix integer width invariant");
        if (magnitude > this.largest) this.largest = magnitude;
        return value;
    }
    scale(count: number): void {
        if (count > 1076) throw new Error("radix scale iteration invariant");
        if (count > this.scaleIterations) this.scaleIterations = count;
    }
}

export class RadixInterval {
    constructor(public r: bigint, public d: bigint, public minus: bigint,
        public plus: bigint, public closed: boolean) {}
}

export function intervalFor(value: number, stats: RadixResources): RadixInterval {
    const view = new DataView(new ArrayBuffer(8));
    view.setFloat64(0, value, false);
    const bits = view.getBigUint64(0, false);
    const a = Number((bits >> 52n) & 2047n);
    const t = bits & ((1n << 52n) - 1n);
    const f = a === 0 ? t : t + (1n << 52n);
    const e = (a === 0 ? 1 : a) - 1075;
    const unequal = a > 1 && t === 0n;
    const factor = unequal ? 4n : 2n;
    const unit = e >= 0 ? 1n << BigInt(e) : 1n;
    return new RadixInterval(stats.watch(f * factor * unit),
        stats.watch(e >= 0 ? factor : factor << BigInt(-e)), unit,
        stats.watch(unequal ? unit * 2n : unit), f % 2n === 0n);
}

function power(b: bigint, exponent: number, stats: RadixResources): bigint {
    if (exponent < 0 || exponent > 1131) throw new Error("radix power invariant");
    let result = 1n;
    for (let i = 0; i < exponent; i++) result = stats.watch(result * b);
    if (exponent > stats.powerIterations) stats.powerIterations = exponent;
    return result;
}

function minimumDigits(interval: RadixInterval, b: bigint, stats: RadixResources): number {
    let r = interval.r, d = interval.d, minus = interval.minus, plus = interval.plus;
    let count = 0;
    // Scale the upper endpoint; equality depends on midpoint ownership.
    while (interval.closed ? stats.watch(r + plus) >= d : stats.watch(r + plus) > d) {
        stats.scale(++count);
        d = stats.watch(d * b);
    }
    count = 0;
    while (interval.closed ? stats.watch(stats.watch(r + plus) * b) < d : stats.watch(stats.watch(r + plus) * b) <= d) {
        stats.scale(++count);
        r = stats.watch(r * b);
        minus = stats.watch(minus * b);
        plus = stats.watch(plus * b);
    }
    let prefix = 0n;
    for (let k = 1; k <= 57; k++) {
        r = stats.watch(r * b);
        minus = stats.watch(minus * b);
        plus = stats.watch(plus * b);
        prefix = stats.watch(stats.watch(prefix * b) + r / d);
        r %= d;
        const low = interval.closed ? r <= minus : r < minus;
        const high = interval.closed ? stats.watch(r + plus) >= d : stats.watch(r + plus) > d;
        if (low || high) { stats.digits = k; return k; }
    }
    throw new Error("radix digit termination invariant");
}

export function contains(interval: RadixInterval, numerator: bigint, denominator: bigint,
    stats: RadixResources): boolean {
    const value = stats.watch(numerator * interval.d);
    const low = stats.watch(stats.watch(interval.r - interval.minus) * denominator);
    const high = stats.watch(stats.watch(interval.r + interval.plus) * denominator);
    return interval.closed ? value >= low && value <= high : value > low && value < high;
}

export class RadixCandidate {
    constructor(public s: bigint, public n: number, public c: bigint, public distance: bigint) {}
}

// Shared by the production selector and synthetic exact tie/parity controls.
export function prefer(candidate: RadixCandidate, best: RadixCandidate, stats: RadixResources): boolean {
    const left = stats.watch(candidate.distance * best.c);
    const right = stats.watch(best.distance * candidate.c);
    if (left !== right) return left < right;
    if (candidate.s === best.s && candidate.n === best.n) return false;
    if (candidate.s % 2n === best.s % 2n) throw new Error("radix ambiguous parity invariant");
    return candidate.s % 2n === 0n;
}

export function select(interval: RadixInterval, b: bigint, k: number, stats: RadixResources): RadixCandidate {
    let u = interval.r, v = interval.d, n0 = 0, count = 0;
    while (u >= v) { stats.scale(++count); v = stats.watch(v * b); n0++; }
    count = 0;
    while (stats.watch(u * b) < v) { stats.scale(++count); u = stats.watch(u * b); n0--; }
    if (n0 < -1073 || n0 > 1024) throw new Error("radix magnitude invariant");
    const lo = power(b, k - 1, stats), hi = stats.watch(power(b, k, stats) - 1n);
    let best: RadixCandidate | null = null;
    for (let n = n0 - 1; n <= n0 + 1; n++) {
        const a = n >= k ? power(b, n - k, stats) : 1n;
        const c = n < k ? power(b, k - n, stats) : 1n;
        const center = stats.watch(interval.r * c);
        const floor = center / stats.watch(interval.d * a);
        for (let side = 0; side < 2; side++) {
            stats.candidates++;
            const raw = stats.watch(floor + BigInt(side));
            const s = raw < lo ? lo : raw > hi ? hi : raw;
            const numerator = stats.watch(s * a);
            if (!contains(interval, numerator, c, stats)) continue;
            const delta = stats.watch(stats.watch(numerator * interval.d) - center);
            const candidate = new RadixCandidate(s, n, c, delta < 0n ? -delta : delta);
            if (best === null || prefer(candidate, best, stats)) best = candidate;
        }
    }
    if (best === null || best.s < lo || best.s > hi || best.s % b === 0n)
        throw new Error("radix selection invariant");
    return best;
}

function render(s: bigint, n: number, k: number, radix: number, stats: RadixResources): string {
    const b = BigInt(radix);
    let digits = "";
    for (let i = 0; i < k; i++) {
        digits = DIGITS.charAt(Number(s % b)) + digits;
        s /= b;
    }
    if (s !== 0n || digits.charAt(0) === "0") throw new Error("radix rendering invariant");
    let result: string;
    if (n >= k) result = digits + "0".repeat(n - k);
    else if (n > 0) result = digits.slice(0, n) + "." + digits.slice(n);
    else result = "0." + "0".repeat(-n) + digits;
    if (result.length > 1076) throw new Error("radix output length invariant");
    stats.length = result.length;
    return result;
}

export function formatRadix(value: number, radix: number, stats: RadixResources): string {
    if (!(value > 0 && value < Infinity) || !(radix >= 2 && radix <= 36) ||
        radix !== Math.floor(radix) || radix === 10)
        throw new Error("invalid nondecimal formatter input");
    const interval = intervalFor(value, stats), b = BigInt(radix);
    const k = minimumDigits(interval, b, stats);
    const chosen = select(interval, b, k, stats);
    return render(chosen.s, chosen.n, k, radix, stats);
}
