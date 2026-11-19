import {
    isoDateTimeToEpochNanoseconds,
    isoDateToEpochDay,
    epochDayToISODate,
    isValidEpochNanoseconds,
} from "./iso-calendar.js";
import { combineISODateTime } from "./iso-date-time.js";
import { differenceISODate, type DateDifferenceUnit } from "./iso-calendar-difference.js";
import { dateDuration } from "./temporal-calendar-round.js";
import { timeToNanoseconds } from "./temporal-time.js";
import {
    timeZoneLocalDateTime,
    timeZoneEpochNanoseconds,
    type TemporalTimeZone,
} from "./temporal-time-zone-operations.js";
import type { ISODateTimeDifference } from "./iso-date-time-difference.js";

export function differenceTemporalZonedDateTime(
    first: bigint,
    last: bigint,
    zone: TemporalTimeZone,
    largest: DateDifferenceUnit,
): ISODateTimeDifference | null {
    if (!isValidEpochNanoseconds(first) || !isValidEpochNanoseconds(last)) {
        return null;
    }
    if (first === last) {
        return { date: dateDuration(0, 0, 0), time: 0n };
    }
    const start = timeZoneLocalDateTime(zone, first),
        end = timeZoneLocalDateTime(zone, last);
    if (start === null || end === null) {
        return null;
    }
    const firstDay = isoDateToEpochDay(start.date),
        lastDay = isoDateToEpochDay(end.date);
    const startTime = timeToNanoseconds(start),
        endTime = timeToNanoseconds(end);
    if (firstDay === null || lastDay === null || startTime === null || endTime === null) {
        throw new Error("zoned difference local invariant");
    }
    if (firstDay === lastDay) {
        return { date: dateDuration(0, 0, 0), time: last - first };
    }
    const sign = last < first ? 1 : -1,
        maximumCorrection = sign === -1 ? 2 : 1;
    const timeDifference = endTime - startTime,
        timeSign = timeDifference < 0n ? -1 : timeDifference > 0n ? 1 : 0;
    for (
        let correction = timeSign === sign ? 1 : 0;
        correction <= maximumCorrection;
        correction++
    ) {
        const date = epochDayToISODate(lastDay + correction * sign);
        if (date === null) {
            return null;
        }
        const local = isoDateTimeToEpochNanoseconds(combineISODateTime(date, start));
        if (local === null) {
            throw new Error("zoned difference intermediate invariant");
        }
        const intermediate = timeZoneEpochNanoseconds(zone, local);
        if (intermediate === null) {
            return null;
        }
        const time = last - intermediate,
            remainderSign = time < 0n ? -1 : time > 0n ? 1 : 0;
        if (remainderSign === sign) {
            continue;
        }
        const duration = differenceISODate(start.date, date, largest);
        return duration === null ? null : { date: duration, time };
    }
    throw new Error("zoned difference day correction invariant");
}
