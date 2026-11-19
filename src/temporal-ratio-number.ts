const limit = 9007199254740992000000000n;

export function temporalRatioToNumber(numerator: bigint, denominator: bigint): number {
    const negative = numerator < 0n, magnitude = negative ? -numerator : numerator;
    if (denominator <= 0n || denominator > limit || magnitude > limit) throw new Error("Temporal ratio range invariant");
    if (magnitude === 0n) return 0;
    let exponent = 0, scaled = denominator;
    if (magnitude >= scaled) {
        while (magnitude >= scaled * 2n) { scaled *= 2n; exponent++; }
    } else {
        let shifted = magnitude;
        while (shifted < denominator) { shifted *= 2n; exponent--; }
    }
    const shift = 52 - exponent;
    const dividend = shift >= 0 ? magnitude << BigInt(shift) : magnitude;
    const divisor = shift >= 0 ? denominator : denominator << BigInt(-shift);
    let significand = dividend / divisor;
    const remainder = dividend % divisor;
    if (2n * remainder > divisor || (2n * remainder === divisor && significand % 2n !== 0n)) significand++;
    const value = Number(significand) * 2 ** (exponent - 52);
    return negative ? -value : value;
}
