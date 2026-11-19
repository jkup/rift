import {
    isoDateTimeToEpochNanoseconds,
    isoDateTimeFromEpochNanoseconds,
    MAX_EPOCH_NANOSECONDS,
    type ISODate,
    type ISODateTime,
} from "./iso-calendar.js";
import { roundTemporalInteger, type TemporalRoundingMode } from "./temporal-rounding.js";
import { NANOSECONDS_PER_DAY, timeToNanoseconds, type TimeFields } from "./temporal-time.js";

export function combineISODateTime(date: ISODate, time: TimeFields): ISODateTime {
    return {
        date,
        hour: time.hour,
        minute: time.minute,
        second: time.second,
        millisecond: time.millisecond,
        microsecond: time.microsecond,
        nanosecond: time.nanosecond,
    };
}

export function isoDateTimeWithinLimits(value: ISODateTime): boolean {
    const nanoseconds = isoDateTimeToEpochNanoseconds(value);
    const limit = MAX_EPOCH_NANOSECONDS + NANOSECONDS_PER_DAY;
    return nanoseconds !== null && nanoseconds > -limit && nanoseconds < limit;
}

export function roundISODateTime(
    value: ISODateTime,
    quantum: bigint,
    mode: TemporalRoundingMode,
): ISODateTime | null {
    const epoch = isoDateTimeToEpochNanoseconds(value),
        time = timeToNanoseconds(value);
    if (epoch === null || time === null) {
        return null;
    }
    // Rounding is relative to midnight, including for dates before the epoch.
    const rounded = epoch - time + roundTemporalInteger(time, quantum, mode);
    const result = isoDateTimeFromEpochNanoseconds(rounded);
    return result !== null && isoDateTimeWithinLimits(result) ? result : null;
}
