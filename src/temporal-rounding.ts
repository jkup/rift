export type TemporalRoundingMode =
    | "ceil"
    | "floor"
    | "expand"
    | "trunc"
    | "halfCeil"
    | "halfFloor"
    | "halfExpand"
    | "halfTrunc"
    | "halfEven";

export function roundTemporalInstant(
    value: bigint,
    increment: bigint,
    mode: TemporalRoundingMode,
): bigint {
    if (increment <= 0n) {
        throw new Error("positive rounding increment required");
    }
    let quotient = value / increment,
        remainder = value % increment;
    if (remainder < 0n) {
        quotient--;
        remainder += increment;
    }
    const lower = quotient * increment;
    if (remainder === 0n) {
        return lower;
    }
    const upper = lower + increment;
    if (mode === "ceil" || mode === "expand") {
        return upper;
    }
    if (mode === "floor" || mode === "trunc") {
        return lower;
    }
    const twice = remainder * 2n;
    if (twice < increment) {
        return lower;
    }
    if (twice > increment) {
        return upper;
    }
    if (mode === "halfCeil" || mode === "halfExpand") {
        return upper;
    }
    if (mode === "halfFloor" || mode === "halfTrunc") {
        return lower;
    }
    return quotient % 2n === 0n ? lower : upper;
}

export function roundTemporalInteger(
    value: bigint,
    increment: bigint,
    mode: TemporalRoundingMode,
): bigint {
    if (value >= 0n) {
        return roundTemporalInstant(value, increment, mode);
    }
    return -roundTemporalInstant(-value, increment, negateTemporalRoundingMode(mode));
}

export function negateTemporalRoundingMode(mode: TemporalRoundingMode): TemporalRoundingMode {
    if (mode === "ceil") {
        return "floor";
    } else if (mode === "floor") {
        return "ceil";
    } else if (mode === "halfCeil") {
        return "halfFloor";
    } else if (mode === "halfFloor") {
        return "halfCeil";
    } else {
        return mode;
    }
}
