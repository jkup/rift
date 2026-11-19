import type { ISODateTime } from "./iso-calendar.js";
import { combineISODateTime, isoDateTimeWithinLimits } from "./iso-date-time.js";
import { addTemporalDate } from "./temporal-date-arithmetic.js";
import {
    durationTimeNanoseconds,
    isValidDuration,
    type DurationFields,
} from "./temporal-duration.js";
import { NANOSECONDS_PER_DAY, timeToNanoseconds, timeFromNanoseconds } from "./temporal-time.js";

export function addTemporalDateTime(
    value: ISODateTime,
    duration: DurationFields,
    subtract: boolean,
    reject: boolean,
): ISODateTime | null {
    if (!isoDateTimeWithinLimits(value) || !isValidDuration(duration)) {
        return null;
    }
    const start = timeToNanoseconds(value);
    if (start === null) {
        return null;
    }
    const direction = subtract ? -1 : 1;
    const total = start + BigInt(direction) * durationTimeNanoseconds(duration);
    let days = total / NANOSECONDS_PER_DAY,
        within = total % NANOSECONDS_PER_DAY;
    if (within < 0n) {
        days--;
        within += NANOSECONDS_PER_DAY;
    }
    const time = timeFromNanoseconds(within);
    if (time === null) {
        throw new Error("balanced date-time time invariant");
    }
    const dateDuration: DurationFields = {
        years: direction * duration.years,
        months: direction * duration.months,
        weeks: direction * duration.weeks,
        days: direction * duration.days + Number(days),
        hours: 0,
        minutes: 0,
        seconds: 0,
        milliseconds: 0,
        microseconds: 0,
        nanoseconds: 0,
    };
    const date = addTemporalDate(value.date, dateDuration, false, reject);
    if (date === null) {
        return null;
    }
    const result = combineISODateTime(date, time);
    return isoDateTimeWithinLimits(result) ? result : null;
}
