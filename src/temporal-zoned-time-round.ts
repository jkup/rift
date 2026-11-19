import { timeZoneLocalDateTime, timeZoneEpochNanoseconds } from "./temporal-time-zone-operations.js";
import { isoDateToEpochDay, isValidEpochNanoseconds } from "./iso-calendar.js";
import { addTemporalDate } from "./temporal-date-arithmetic.js";
import { dateDuration } from "./temporal-calendar-round.js";
import { durationSign } from "./temporal-duration.js";
import { NANOSECONDS_PER_DAY, timeToNanoseconds } from "./temporal-time.js";
import { roundTemporalInteger, type TemporalRoundingMode } from "./temporal-rounding.js";
import type { ISODateTimeDifference } from "./iso-date-time-difference.js";
import type { TemporalTimeZone } from "./temporal-time-zone-parse.js";
import type { ZonedDurationNudge } from "./temporal-zoned-calendar-round.js";

export function roundZonedTimeDifference(first: bigint, zone: TemporalTimeZone, difference: ISODateTimeDifference, incrementNanoseconds: bigint, mode: TemporalRoundingMode): ZonedDurationNudge | null {
    if (!isValidEpochNanoseconds(first) || incrementNanoseconds <= 0n) return null;
    const origin = timeZoneLocalDateTime(zone, first);
    if (origin === null) return null;
    const dateSign = durationSign(difference.date), sign = dateSign === 0 ? (difference.time < 0n ? -1 : 1) : dateSign;
    const startDate = addTemporalDate(origin.date, difference.date, false, false);
    const time = timeToNanoseconds(origin);
    if (startDate === null || time === null) return null;
    const startDay = isoDateToEpochDay(startDate);
    if (startDay === null) throw new Error("zoned time rounding date invariant");
    const start = timeZoneEpochNanoseconds(zone, BigInt(startDay) * NANOSECONDS_PER_DAY + time);
    const end = timeZoneEpochNanoseconds(zone, BigInt(startDay + sign) * NANOSECONDS_PER_DAY + time);
    if (start === null || end === null) return null;
    const daySpan = end - start;
    if (BigInt(sign) * daySpan <= 0n) throw new Error("zoned rounding day span invariant");
    let rounded = roundTemporalInteger(difference.time, incrementNanoseconds, mode);
    const beyond = rounded - daySpan, expanded = BigInt(sign) * beyond >= 0n;
    if (expanded) rounded = roundTemporalInteger(beyond, incrementNanoseconds, mode);
    const date = difference.date;
    return {
        duration: { date: dateDuration(date.years, date.months, date.weeks, date.days + (expanded ? sign : 0)), time: rounded },
        epochNanoseconds: (expanded ? end : start) + rounded,
        expanded,
    };
}
