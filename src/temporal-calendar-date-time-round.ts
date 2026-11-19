import { isoDateTimeToEpochNanoseconds, type ISODateTime } from "./iso-calendar.js";
import { isoDateTimeWithinLimits } from "./iso-date-time.js";
import {
    calendarWindow,
    roundCalendarWindow,
    type CalendarWindow,
} from "./temporal-calendar-round.js";
import { durationSign, type DurationFields } from "./temporal-duration.js";
import type { ISODateTimeDifference } from "./iso-date-time-difference.js";
import { NANOSECONDS_PER_DAY, timeToNanoseconds } from "./temporal-time.js";
import type { TemporalRoundingMode } from "./temporal-rounding.js";

export interface CalendarDateTimeRoundResult {
    readonly date: DurationFields;
    readonly epochNanoseconds: bigint;
    readonly expanded: boolean;
}

interface DateTimeWindow {
    readonly calendar: CalendarWindow;
    readonly start: bigint;
    readonly end: bigint;
}

function dateTimeWindow(
    origin: ISODateTime,
    duration: DurationFields,
    unit: "year" | "month" | "week",
    increment: number,
    sign: number,
    shifted: boolean,
): DateTimeWindow | null {
    const calendar = calendarWindow(origin.date, duration, unit, increment, sign, shifted),
        time = timeToNanoseconds(origin);
    if (calendar === null || time === null) {
        return null;
    }
    const start = BigInt(calendar.startDay) * NANOSECONDS_PER_DAY + time,
        end = BigInt(calendar.endDay) * NANOSECONDS_PER_DAY + time;
    return { calendar, start, end };
}

export function roundCalendarDateTimeDifference(
    origin: ISODateTime,
    destination: ISODateTime,
    difference: ISODateTimeDifference,
    unit: "year" | "month" | "week",
    increment: number,
    mode: TemporalRoundingMode,
): CalendarDateTimeRoundResult | null {
    if (
        !isoDateTimeWithinLimits(origin) ||
        !isoDateTimeWithinLimits(destination) ||
        !Number.isInteger(increment) ||
        increment < 1 ||
        increment > 1000000000
    ) {
        return null;
    }
    const target = isoDateTimeToEpochNanoseconds(destination);
    if (target === null) {
        throw new Error("date-time calendar target invariant");
    }
    const dateSign = durationSign(difference.date),
        sign = dateSign === 0 ? (difference.time < 0n ? -1 : 1) : dateSign;
    let shifted = false,
        window = dateTimeWindow(origin, difference.date, unit, increment, sign, false);
    if (window === null) {
        return null;
    }
    if (BigInt(sign) * (target - window.start) < 0n || BigInt(sign) * (target - window.end) > 0n) {
        shifted = true;
        window = dateTimeWindow(origin, difference.date, unit, increment, sign, true);
        if (window === null) {
            return null;
        }
    }
    const distance = BigInt(sign) * (target - window.start),
        span = BigInt(sign) * (window.end - window.start);
    const outer = roundCalendarWindow(window.calendar, distance, span, increment, sign, mode);
    return {
        date: outer ? window.calendar.end : window.calendar.start,
        epochNanoseconds: outer ? window.end : window.start,
        expanded: shifted || outer,
    };
}
