import { isoDateToEpochDay, type ISODate } from "./iso-calendar.js";
import { isoDateWithinLimits } from "./iso-calendar-fields.js";
import { addTemporalDate } from "./temporal-date-arithmetic.js";
import type { DurationFields } from "./temporal-duration.js";

export type DateDifferenceUnit = "year" | "month" | "week" | "day";

function surpasses(start: ISODate, end: ISODate, years: number, months: number, sign: number): boolean {
    const offset = start.month - 1 + months;
    const year = start.year + years + Math.floor(offset / 12), month = ((offset % 12) + 12) % 12 + 1;
    if (year !== end.year) return sign * (year - end.year) > 0;
    if (month !== end.month) return sign * (month - end.month) > 0;
    return sign * (start.day - end.day) > 0;
}

export function differenceISODate(start: ISODate, end: ISODate, largest: DateDifferenceUnit): DurationFields | null {
    if (!isoDateWithinLimits(start) || !isoDateWithinLimits(end)) return null;
    const first = isoDateToEpochDay(start), last = isoDateToEpochDay(end);
    if (first === null || last === null) throw new Error("date difference range invariant");
    const sign = last < first ? -1 : 1;
    let years = 0, months = 0;
    if (largest === "year") {
        years = end.year - start.year;
        if (surpasses(start, end, years, 0, sign)) years -= sign;
    }
    if (largest === "year" || largest === "month") {
        months = (end.year - start.year - years) * 12 + end.month - start.month;
        if (surpasses(start, end, years, months, sign)) months -= sign;
    }
    const calendar = { years, months, weeks: 0, days: 0, hours: 0, minutes: 0, seconds: 0, milliseconds: 0, microseconds: 0, nanoseconds: 0 };
    const intermediate = addTemporalDate(start, calendar, false, false);
    if (intermediate === null) throw new Error("calendar difference intermediate invariant");
    const epoch = isoDateToEpochDay(intermediate);
    if (epoch === null) throw new Error("calendar difference epoch invariant");
    const remaining = last - epoch;
    const weeks = largest === "week" ? Math.trunc(remaining / 7) : 0;
    return { years, months, weeks: weeks === 0 ? 0 : weeks, days: remaining - weeks * 7,
        hours: 0, minutes: 0, seconds: 0, milliseconds: 0, microseconds: 0, nanoseconds: 0 };
}
