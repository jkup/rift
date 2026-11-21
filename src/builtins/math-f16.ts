// ECMA-262 Math.f16round: round binary64 directly to binary16, ties to even.
// Going through Math.fround would introduce double rounding near half-way values.
export function roundToFloat16(value: number): number {
    if (value === 0 || value !== value) {
        return value;
    }
    const magnitude = Math.abs(value);
    if (magnitude >= 65520) {
        return value < 0 ? -Infinity : Infinity;
    }
    // Subnormals have spacing 2^-24. Normal spacing doubles at each power
    // of two, starting above 2^-14. This loop has at most 29 iterations.
    let spacing = 0.000000059604644775390625;
    let boundary = 0.0001220703125;
    while (magnitude >= boundary) {
        spacing *= 2;
        boundary *= 2;
    }
    // Scaling by a power of two is exact here; do not add 0.5 before floor,
    // which could round a value immediately below a midpoint up to the tie.
    const scaled = magnitude / spacing;
    let rounded = Math.floor(scaled);
    const fraction = scaled - rounded;
    if (fraction > 0.5 || (fraction === 0.5 && rounded % 2 !== 0)) {
        rounded++;
    }
    const result = rounded * spacing;
    return value < 0 ? -result : result;
}
