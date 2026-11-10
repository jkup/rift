import { isoDateTimeToEpochNanoseconds, MAX_EPOCH_NANOSECONDS, type ISODate, type ISODateTime } from "./iso-calendar.js";
import { NANOSECONDS_PER_DAY, type TimeFields } from "./temporal-time.js";

export function combineISODateTime(date: ISODate, time: TimeFields): ISODateTime {
    return { date, hour: time.hour, minute: time.minute, second: time.second,
        millisecond: time.millisecond, microsecond: time.microsecond, nanosecond: time.nanosecond };
}

export function isoDateTimeWithinLimits(value: ISODateTime): boolean {
    const nanoseconds = isoDateTimeToEpochNanoseconds(value);
    const limit = MAX_EPOCH_NANOSECONDS + NANOSECONDS_PER_DAY;
    return nanoseconds !== null && nanoseconds > -limit && nanoseconds < limit;
}
