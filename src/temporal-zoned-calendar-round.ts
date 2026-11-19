import {
    timeZoneLocalDateTime,
    timeZoneEpochNanoseconds,
} from "./temporal-time-zone-operations.js";
import { isoDateToEpochDay, isValidEpochNanoseconds, type ISODateTime } from "./iso-calendar.js";
import {
    calendarWindow,
    dateDuration,
    roundCalendarWindow,
    type CalendarWindow,
} from "./temporal-calendar-round.js";
import { addTemporalDate } from "./temporal-date-arithmetic.js";
import { durationSign, type DurationFields } from "./temporal-duration.js";
import { timeToNanoseconds, NANOSECONDS_PER_DAY } from "./temporal-time.js";
import type { ISODateTimeDifference } from "./iso-date-time-difference.js";
import type { TemporalTimeZone } from "./temporal-time-zone-parse.js";
import type { TemporalRoundingMode } from "./temporal-rounding.js";

export interface ZonedDurationNudge {
    readonly duration: ISODateTimeDifference;
    readonly epochNanoseconds: bigint;
    readonly expanded: boolean;
}

export interface ZonedCalendarWindow {
    readonly calendar: CalendarWindow;
    readonly start: bigint;
    readonly end: bigint;
}

export function zonedCalendarWindow(
    first: bigint,
    origin: ISODateTime,
    zone: TemporalTimeZone,
    duration: DurationFields,
    unit: "year" | "month" | "week" | "day",
    increment: number,
    sign: number,
    shifted: boolean,
): ZonedCalendarWindow | null {
    let calendar: CalendarWindow | null;
    if (unit === "day") {
        const inner = Math.trunc(duration.days / increment) * increment,
            outer = inner + sign * increment;
        const start = dateDuration(duration.years, duration.months, duration.weeks, inner),
            end = dateDuration(duration.years, duration.months, duration.weeks, outer);
        const startDate = addTemporalDate(origin.date, start, false, false),
            endDate = addTemporalDate(origin.date, end, false, false);
        if (startDate === null || endDate === null) {
            return null;
        }
        const startDay = isoDateToEpochDay(startDate),
            endDay = isoDateToEpochDay(endDate);
        if (startDay === null || endDay === null) {
            throw new Error("zoned day window invariant");
        }
        calendar = { inner, outer, start, end, startDay, endDay };
    } else {
        calendar = calendarWindow(origin.date, duration, unit, increment, sign, shifted);
    }
    const time = timeToNanoseconds(origin);
    if (calendar === null || time === null) {
        return null;
    }
    const unchanged =
        calendar.start.years === 0 &&
        calendar.start.months === 0 &&
        calendar.start.weeks === 0 &&
        calendar.start.days === 0;
    const start = unchanged
        ? first
        : timeZoneEpochNanoseconds(zone, BigInt(calendar.startDay) * NANOSECONDS_PER_DAY + time);
    const end = timeZoneEpochNanoseconds(
        zone,
        BigInt(calendar.endDay) * NANOSECONDS_PER_DAY + time,
    );
    return start !== null && end !== null ? { calendar, start, end } : null;
}

export function roundZonedCalendarDifference(
    first: bigint,
    last: bigint,
    zone: TemporalTimeZone,
    difference: ISODateTimeDifference,
    unit: "year" | "month" | "week" | "day",
    increment: number,
    mode: TemporalRoundingMode,
): ZonedDurationNudge | null {
    if (
        !isValidEpochNanoseconds(first) ||
        !isValidEpochNanoseconds(last) ||
        !Number.isInteger(increment) ||
        increment < 1 ||
        increment > 1000000000
    ) {
        return null;
    }
    const origin = timeZoneLocalDateTime(zone, first);
    if (origin === null) {
        return null;
    }
    const dateSign = durationSign(difference.date),
        sign = dateSign === 0 ? (difference.time < 0n ? -1 : 1) : dateSign;
    let shifted = false,
        window = zonedCalendarWindow(
            first,
            origin,
            zone,
            difference.date,
            unit,
            increment,
            sign,
            false,
        );
    if (window === null) {
        return null;
    }
    if (BigInt(sign) * (last - window.start) < 0n || BigInt(sign) * (last - window.end) > 0n) {
        shifted = true;
        window = zonedCalendarWindow(
            first,
            origin,
            zone,
            difference.date,
            unit,
            increment,
            sign,
            true,
        );
        if (window === null) {
            return null;
        }
    }
    const distance = BigInt(sign) * (last - window.start),
        span = BigInt(sign) * (window.end - window.start);
    const outer = roundCalendarWindow(window.calendar, distance, span, increment, sign, mode);
    return {
        duration: { date: outer ? window.calendar.end : window.calendar.start, time: 0n },
        epochNanoseconds: outer ? window.end : window.start,
        expanded: shifted || outer,
    };
}
