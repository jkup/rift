import { durationTimeNanoseconds, isValidDuration, type DurationFields } from "./temporal-duration.js";
import { roundTemporalInteger, type TemporalRoundingMode } from "./temporal-rounding.js";

export function roundDurationForString(value: DurationFields, increment: bigint, mode: TemporalRoundingMode): DurationFields | null {
    if (!isValidDuration(value)) return null;
    const rounded = roundTemporalInteger(durationTimeNanoseconds(value), increment, mode);
    const dateUnit = value.years !== 0 || value.months !== 0 || value.weeks !== 0 || value.days !== 0;
    const hourUnit = dateUnit || value.hours !== 0;
    const minuteUnit = hourUnit || value.minutes !== 0;
    let rest = rounded;
    const nanoseconds = Number(rest % 1000n); rest /= 1000n;
    const microseconds = Number(rest % 1000n); rest /= 1000n;
    const milliseconds = Number(rest % 1000n); rest /= 1000n;
    const seconds = Number(minuteUnit ? rest % 60n : rest); rest = minuteUnit ? rest / 60n : 0n;
    const minutes = Number(hourUnit ? rest % 60n : rest); rest = hourUnit ? rest / 60n : 0n;
    const hours = Number(dateUnit ? rest % 24n : rest);
    const days = value.days + Number(dateUnit ? rest / 24n : 0n);
    const result = { years: value.years, months: value.months, weeks: value.weeks, days,
        hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
    return isValidDuration(result) ? result : null;
}
