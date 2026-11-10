import type { ISODate, ISODateTime } from "./iso-calendar.js";
import { combineISODateTime } from "./iso-date-time.js";
import { addTemporalDate } from "./temporal-date-arithmetic.js";
import { durationTimeNanoseconds, isValidDuration, type DurationFields } from "./temporal-duration.js";
import { NANOSECONDS_PER_DAY, timeFromNanoseconds } from "./temporal-time.js";

export function relativeDurationTarget(duration: DurationFields, relativeTo: ISODate): { origin: ISODateTime; destination: ISODateTime } | null {
    if (!isValidDuration(duration)) return null;
    const total = durationTimeNanoseconds(duration) + BigInt(duration.days) * NANOSECONDS_PER_DAY;
    let days = total / NANOSECONDS_PER_DAY, within = total % NANOSECONDS_PER_DAY;
    if (within < 0n) { days--; within += NANOSECONDS_PER_DAY; }
    const dateDuration = { years: duration.years, months: duration.months, weeks: duration.weeks, days: Number(days),
        hours: 0, minutes: 0, seconds: 0, milliseconds: 0, microseconds: 0, nanoseconds: 0 };
    const date = addTemporalDate(relativeTo, dateDuration, false, false);
    if (date === null) return null;
    const time = timeFromNanoseconds(within), midnight = timeFromNanoseconds(0n);
    if (time === null || midnight === null) throw new Error("relative duration time invariant");
    return { origin: combineISODateTime(relativeTo, midnight), destination: combineISODateTime(date, time) };
}
