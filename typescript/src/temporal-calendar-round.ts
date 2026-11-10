import { isoDateToEpochDay, type ISODate } from "./iso-calendar.js";
import { addTemporalDate } from "./temporal-date-arithmetic.js";
import { durationSign, type DurationFields } from "./temporal-duration.js";
import { roundTemporalInteger, type TemporalRoundingMode } from "./temporal-rounding.js";

export interface CalendarRoundResult {
    readonly duration: DurationFields;
    readonly epochDay: number;
    readonly expanded: boolean;
}

export function dateDuration(years: number, months: number, weeks: number, days = 0): DurationFields {
    return { years: years === 0 ? 0 : years, months: months === 0 ? 0 : months, weeks: weeks === 0 ? 0 : weeks, days: days === 0 ? 0 : days,
        hours: 0, minutes: 0, seconds: 0, milliseconds: 0, microseconds: 0, nanoseconds: 0 };
}

interface CalendarWindow {
    readonly inner: number;
    readonly outer: number;
    readonly start: DurationFields;
    readonly end: DurationFields;
    readonly startDay: number;
    readonly endDay: number;
}

function calendarWindow(origin: ISODate, duration: DurationFields, unit: "year" | "month" | "week", increment: number, sign: number, shifted: boolean): CalendarWindow | null {
    let count: number;
    if (unit === "year") count = duration.years;
    else if (unit === "month") count = duration.months;
    else count = duration.weeks + Math.trunc(duration.days / 7);
    const inner = Math.trunc(count / increment) * increment + (shifted ? increment * sign : 0);
    const outer = inner + increment * sign;
    const start = unit === "year" ? dateDuration(inner, 0, 0) : unit === "month" ? dateDuration(duration.years, inner, 0) : dateDuration(duration.years, duration.months, inner);
    const end = unit === "year" ? dateDuration(outer, 0, 0) : unit === "month" ? dateDuration(duration.years, outer, 0) : dateDuration(duration.years, duration.months, outer);
    const startDate = addTemporalDate(origin, start, false, false), endDate = addTemporalDate(origin, end, false, false);
    if (startDate === null || endDate === null) return null;
    const startDay = isoDateToEpochDay(startDate), endDay = isoDateToEpochDay(endDate);
    if (startDay === null || endDay === null) throw new Error("calendar rounding range invariant");
    return { inner, outer, start, end, startDay, endDay };
}

export function roundCalendarDateDifference(origin: ISODate, destination: ISODate, duration: DurationFields, unit: "year" | "month" | "week", increment: number, mode: TemporalRoundingMode): CalendarRoundResult | null {
    const target = isoDateToEpochDay(destination);
    if (target === null || !Number.isInteger(increment) || increment < 1 || increment > 1000000000) return null;
    const sign = durationSign(duration) < 0 ? -1 : 1;
    let shifted = false;
    let window = calendarWindow(origin, duration, unit, increment, sign, false);
    if (window === null) return null;
    if (sign * (target - window.startDay) < 0 || sign * (target - window.endDay) > 0) {
        shifted = true;
        window = calendarWindow(origin, duration, unit, increment, sign, true);
        if (window === null) return null;
    }
    const distance = BigInt(sign * (target - window.startDay)), span = BigInt(sign * (window.endDay - window.startDay));
    if (span <= 0n || distance < 0n || distance > span) throw new Error("calendar rounding window invariant");
    const quantum = BigInt(increment) * span;
    const numerator = BigInt(window.inner) * span + BigInt(sign * increment) * distance;
    const rounded = roundTemporalInteger(numerator, quantum, mode) / span;
    const outer = rounded === BigInt(window.outer);
    if (!outer && rounded !== BigInt(window.inner)) throw new Error("calendar rounding endpoint invariant");
    return { duration: outer ? window.end : window.start, epochDay: outer ? window.endDay : window.startDay, expanded: shifted || outer };
}
