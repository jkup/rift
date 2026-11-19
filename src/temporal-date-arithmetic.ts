import {
    isoDaysInMonth,
    isoDateToEpochDay,
    epochDayToISODate,
    type ISODate,
} from "./iso-calendar.js";
import { isoDateWithinLimits } from "./iso-calendar-fields.js";
import {
    durationTimeNanoseconds,
    isValidDuration,
    type DurationFields,
} from "./temporal-duration.js";
import { NANOSECONDS_PER_DAY } from "./temporal-time.js";

export function addTemporalDate(
    date: ISODate,
    duration: DurationFields,
    subtract: boolean,
    reject: boolean,
): ISODate | null {
    if (!isoDateWithinLimits(date) || !isValidDuration(duration)) {
        return null;
    }
    const direction = subtract ? -1 : 1;
    const months = date.month - 1 + direction * duration.months;
    const year = date.year + direction * duration.years + Math.floor(months / 12);
    const month = (((months % 12) + 12) % 12) + 1;
    const day = Math.min(date.day, isoDaysInMonth(year, month));
    if (reject && day !== date.day) {
        return null;
    }
    const intermediate = isoDateToEpochDay({ year, month, day });
    // Common-sign duration fields cannot bring an out-of-range intermediate back into range.
    if (intermediate === null) {
        return null;
    }
    const wholeDays =
        BigInt(duration.days) +
        7n * BigInt(duration.weeks) +
        durationTimeNanoseconds(duration) / NANOSECONDS_PER_DAY;
    const result = epochDayToISODate(intermediate + direction * Number(wholeDays));
    return result !== null && isoDateWithinLimits(result) ? result : null;
}
