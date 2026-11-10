import { isoDateTimeToEpochNanoseconds, type ISODate } from "./iso-calendar.js";
import { combineISODateTime } from "./iso-date-time.js";
import { addTemporalDate } from "./temporal-date-arithmetic.js";
import { differenceISODateTime } from "./iso-date-time-difference.js";
import { calendarWindow } from "./temporal-calendar-round.js";
import { durationTimeNanoseconds, isValidDuration, type DurationFields } from "./temporal-duration.js";
import { durationUnit } from "./temporal-duration-balance.js";
import { NANOSECONDS_PER_DAY, temporalUnitNanoseconds, timeFromNanoseconds } from "./temporal-time.js";
import { temporalRatioToNumber } from "./temporal-ratio-number.js";

export function totalRelativeDuration(duration: DurationFields, relativeTo: ISODate, unit: string): number | null {
    if (!isValidDuration(duration)) return null;
    const total = durationTimeNanoseconds(duration) + BigInt(duration.days) * NANOSECONDS_PER_DAY;
    let days = total / NANOSECONDS_PER_DAY, within = total % NANOSECONDS_PER_DAY;
    if (within < 0n) { days--; within += NANOSECONDS_PER_DAY; }
    const dateDuration = { years: duration.years, months: duration.months, weeks: duration.weeks, days: Number(days),
        hours: 0, minutes: 0, seconds: 0, milliseconds: 0, microseconds: 0, nanoseconds: 0 };
    const date = addTemporalDate(relativeTo, dateDuration, false, false);
    if (date === null) return null;
    const time = timeFromNanoseconds(within), midnight = timeFromNanoseconds(0n);
    if (time === null || midnight === null) throw new Error("relative total time invariant");
    const origin = combineISODateTime(relativeTo, midnight), destination = combineISODateTime(date, time);
    if (date.year === relativeTo.year && date.month === relativeTo.month && date.day === relativeTo.day && within === 0n) return 0;
    const difference = differenceISODateTime(origin, destination, durationUnit(unit));
    if (difference === null) return null;
    if (unit !== "year" && unit !== "month" && unit !== "week") {
        const divisor = unit === "day" ? NANOSECONDS_PER_DAY : temporalUnitNanoseconds(unit);
        if (divisor === null) throw new Error("relative total unit invariant");
        return temporalRatioToNumber(difference.time + BigInt(difference.date.days) * NANOSECONDS_PER_DAY, divisor);
    }
    const target = isoDateTimeToEpochNanoseconds(destination), start = isoDateTimeToEpochNanoseconds(origin);
    if (target === null || start === null) throw new Error("relative total epoch invariant");
    const sign = target < start ? -1 : 1;
    let window = calendarWindow(relativeTo, difference.date, unit, 1, sign, false);
    if (window === null) return null;
    if (BigInt(sign) * (target - BigInt(window.startDay) * NANOSECONDS_PER_DAY) < 0n ||
        BigInt(sign) * (target - BigInt(window.endDay) * NANOSECONDS_PER_DAY) > 0n) {
        window = calendarWindow(relativeTo, difference.date, unit, 1, sign, true);
        if (window === null) return null;
    }
    const distance = BigInt(sign) * (target - BigInt(window.startDay) * NANOSECONDS_PER_DAY);
    const span = BigInt(sign * (window.endDay - window.startDay)) * NANOSECONDS_PER_DAY;
    if (span <= 0n || distance < 0n || distance > span) throw new Error("relative total window invariant");
    return temporalRatioToNumber(BigInt(window.inner) * span + BigInt(sign) * distance, span);
}
