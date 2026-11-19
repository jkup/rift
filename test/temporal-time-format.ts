import { roundTemporalInteger, roundTemporalInstant, type TemporalRoundingMode } from "../src/temporal-rounding.js";
import { formatUTCInstant, formatISOYear } from "../src/temporal-time-format.js";
import { MAX_EPOCH_NANOSECONDS, NANOSECONDS_PER_DAY } from "../src/iso-calendar.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
const inputs = [15n, -15n, 25n, -25n, 14n, -14n, 16n, -16n];
const modes: TemporalRoundingMode[] = ["ceil", "floor", "expand", "trunc", "halfCeil", "halfFloor", "halfExpand", "halfTrunc", "halfEven"];
const signed = [
    [20n, -10n, 30n, -20n, 20n, -10n, 20n, -10n],
    [10n, -20n, 20n, -30n, 10n, -20n, 10n, -20n],
    [20n, -20n, 30n, -30n, 20n, -20n, 20n, -20n],
    [10n, -10n, 20n, -20n, 10n, -10n, 10n, -10n],
    [20n, -10n, 30n, -20n, 10n, -10n, 20n, -20n],
    [10n, -20n, 20n, -30n, 10n, -10n, 20n, -20n],
    [20n, -20n, 30n, -30n, 10n, -10n, 20n, -20n],
    [10n, -10n, 20n, -20n, 10n, -10n, 20n, -20n],
    [20n, -20n, 20n, -20n, 10n, -10n, 20n, -20n],
];
const instant = [
    [20n, -10n, 30n, -20n, 20n, -10n, 20n, -10n],
    [10n, -20n, 20n, -30n, 10n, -20n, 10n, -20n],
    [20n, -10n, 30n, -20n, 20n, -10n, 20n, -10n],
    [10n, -20n, 20n, -30n, 10n, -20n, 10n, -20n],
    [20n, -10n, 30n, -20n, 10n, -10n, 20n, -20n],
    [10n, -20n, 20n, -30n, 10n, -10n, 20n, -20n],
    [20n, -10n, 30n, -20n, 10n, -10n, 20n, -20n],
    [10n, -20n, 20n, -30n, 10n, -10n, 20n, -20n],
    [20n, -20n, 20n, -20n, 10n, -10n, 20n, -20n],
];
for (let mode = 0; mode < modes.length; mode++) {
    let i = 0;
    for (const input of inputs) {
        check(roundTemporalInteger(input, 10n, modes[mode]) === signed[mode][i], "signed " + modes[mode] + " " + input);
        check(roundTemporalInstant(input, 10n, modes[mode]) === instant[mode][i], "instant " + modes[mode] + " " + input);
        i++;
    }
    for (const value of [0n, 10n, -10n, MAX_EPOCH_NANOSECONDS, -MAX_EPOCH_NANOSECONDS]) {
        check(roundTemporalInteger(value, 10n, modes[mode]) === value && roundTemporalInstant(value, 10n, modes[mode]) === value, "exact multiples");
    }
}
check(roundTemporalInteger(90071992547409935n, 10n, "halfEven") === 90071992547409940n, "large exact tie");
check(roundTemporalInstant(-90071992547409935n, 10n, "halfEven") === -90071992547409940n, "negative large exact tie");
check(roundTemporalInteger(7n, 3n, "halfExpand") === 6n && roundTemporalInteger(8n, 3n, "halfExpand") === 9n, "odd increment has no integer tie");
check(roundTemporalInstant(-1n, 1000000n, "trunc") === -1000000n && roundTemporalInteger(-1n, 1000000n, "trunc") === 0n, "timeline rounding differs from duration truncation");

check(formatUTCInstant(0n) === "1970-01-01T00:00:00Z", "epoch auto precision");
check(formatUTCInstant(1n) === "1970-01-01T00:00:00.000000001Z", "one nanosecond");
check(formatUTCInstant(-1n) === "1969-12-31T23:59:59.999999999Z", "negative nanosecond");
check(formatUTCInstant(123400000n) === "1970-01-01T00:00:00.1234Z", "trim fractional trailing zeros");
check(formatUTCInstant(0n, 9) === "1970-01-01T00:00:00.000000000Z", "fixed zeros");
check(formatUTCInstant(123456789n, 0) === "1970-01-01T00:00:00Z", "zero digits");
for (let digits = 1; digits <= 9; digits++) check(formatUTCInstant(123456789n, digits) === "1970-01-01T00:00:00." + "123456789".slice(0, digits) + "Z", "fixed precision");
check(formatUTCInstant(-1n, "minute") === "1969-12-31T23:59Z", "minute precision");
check(formatUTCInstant(1000000000123456789n) === "2001-09-09T01:46:40.123456789Z", "known exact timestamp");
check(formatUTCInstant(MAX_EPOCH_NANOSECONDS) === "+275760-09-13T00:00:00Z", "maximum instant");
check(formatUTCInstant(-MAX_EPOCH_NANOSECONDS) === "-271821-04-20T00:00:00Z", "minimum instant");
check(formatUTCInstant(-719528n * NANOSECONDS_PER_DAY) === "0000-01-01T00:00:00Z", "year zero");
check(formatUTCInstant(-719893n * NANOSECONDS_PER_DAY) === "-000001-01-01T00:00:00Z", "expanded negative year");
check(formatISOYear(9999) === "9999" && formatISOYear(10000) === "+010000", "expanded positive year");
check(formatUTCInstant(MAX_EPOCH_NANOSECONDS + 1n) === null, "invalid instant");
for (const digits of [-1, 10, NaN, Infinity, 0.5]) check(formatUTCInstant(0n, digits) === null, "invalid precision");
console.log("temporal time format passed");
