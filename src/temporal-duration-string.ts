import { durationTimeNanoseconds, isValidDuration, type DurationFields } from "./temporal-duration.js";
import { roundTemporalInteger, type TemporalRoundingMode } from "./temporal-rounding.js";
import { balanceDurationTime, largestDurationUnit } from "./temporal-duration-balance.js";

export function roundDurationForString(value: DurationFields, increment: bigint, mode: TemporalRoundingMode): DurationFields | null {
    if (!isValidDuration(value)) return null;
    const rounded = roundTemporalInteger(durationTimeNanoseconds(value), increment, mode);
    const largest = largestDurationUnit(value);
    return balanceDurationTime(rounded, value,
        largest === "milliseconds" || largest === "microseconds" || largest === "nanoseconds" ? "seconds" : largest);
}
