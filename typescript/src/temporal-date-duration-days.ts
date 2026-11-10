import { isoDateToEpochDay, type ISODate } from "./iso-calendar.js";
import { addTemporalDate } from "./temporal-date-arithmetic.js";
import type { DurationFields } from "./temporal-duration.js";

export function temporalDateDurationDays(duration: DurationFields, relativeTo: ISODate): bigint | null {
    if (duration.years === 0 && duration.months === 0 && duration.weeks === 0) return BigInt(duration.days);
    const calendar = { years: duration.years, months: duration.months, weeks: duration.weeks,
        days: 0, hours: 0, minutes: 0, seconds: 0, milliseconds: 0, microseconds: 0, nanoseconds: 0 };
    const end = addTemporalDate(relativeTo, calendar, false, false);
    if (end === null) return null;
    const startDay = isoDateToEpochDay(relativeTo), endDay = isoDateToEpochDay(end);
    if (startDay === null || endDay === null) throw new Error("relative duration date invariant");
    return BigInt(duration.days) + BigInt(endDay - startDay);
}
