import {
    timeZoneLocalDateTime,
    timeZoneEpochNanoseconds,
} from "./temporal-time-zone-operations.js";
import { isoDateTimeToEpochNanoseconds, isValidEpochNanoseconds } from "./iso-calendar.js";
import { combineISODateTime, isoDateTimeWithinLimits } from "./iso-date-time.js";
import { addTemporalDate } from "./temporal-date-arithmetic.js";
import {
    durationTimeNanoseconds,
    isValidDuration,
    type DurationFields,
} from "./temporal-duration.js";
import type { TemporalTimeZone } from "./temporal-time-zone-parse.js";

export function addTemporalZonedDateTime(
    epoch: bigint,
    zone: TemporalTimeZone,
    duration: DurationFields,
    subtract: boolean,
    reject: boolean,
): bigint | null {
    if (!isValidEpochNanoseconds(epoch) || !isValidDuration(duration)) {
        return null;
    }
    let intermediate = epoch;
    if (
        duration.years !== 0 ||
        duration.months !== 0 ||
        duration.weeks !== 0 ||
        duration.days !== 0
    ) {
        const local = timeZoneLocalDateTime(zone, epoch);
        if (local === null) {
            return null;
        }
        const date = addTemporalDate(
            local.date,
            {
                years: duration.years,
                months: duration.months,
                weeks: duration.weeks,
                days: duration.days,
                hours: 0,
                minutes: 0,
                seconds: 0,
                milliseconds: 0,
                microseconds: 0,
                nanoseconds: 0,
            },
            subtract,
            reject,
        );
        if (date === null) {
            return null;
        }
        const dateTime = combineISODateTime(date, local);
        if (!isoDateTimeWithinLimits(dateTime)) {
            return null;
        }
        const shifted = isoDateTimeToEpochNanoseconds(dateTime);
        if (shifted === null) {
            throw new Error("zoned arithmetic local invariant");
        }
        const resolved = timeZoneEpochNanoseconds(zone, shifted);
        if (resolved === null) {
            return null;
        }
        intermediate = resolved;
    }
    const time = durationTimeNanoseconds(duration);
    const result = intermediate + (subtract ? -time : time);
    return isValidEpochNanoseconds(result) ? result : null;
}
