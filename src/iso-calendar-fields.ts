import { isValidISODate, isISOLeapYear, isoDateToEpochDay, isoDayOfWeek, isoDaysInMonth, type ISODate } from "./iso-calendar.js";

export function isoDateWithinLimits(date: ISODate): boolean {
    const day = isoDateToEpochDay(date);
    return day !== null && day >= -100000001 && day <= 100000000;
}

export function isoDayOfYear(date: ISODate): number | null {
    if (!isValidISODate(date)) return null;
    let ordinal = date.day;
    for (let month = 1; month < date.month; month++) ordinal += isoDaysInMonth(date.year, month);
    return ordinal;
}

export function isoWeekOfYear(date: ISODate): { year: number; week: number } | null {
    const ordinal = isoDayOfYear(date), weekday = isoDayOfWeek(date);
    if (ordinal === null || weekday === null) return null;
    const week = Math.floor((ordinal + 10 - weekday) / 7);
    if (week < 1) {
        const januaryFirst = ((weekday - ordinal) % 7 + 7) % 7 + 1;
        return { year: date.year - 1, week: januaryFirst === 5 || (januaryFirst === 6 && isISOLeapYear(date.year - 1)) ? 53 : 52 };
    }
    const daysInYear = isISOLeapYear(date.year) ? 366 : 365;
    if (week === 53 && daysInYear - ordinal < 4 - weekday) return { year: date.year + 1, week: 1 };
    return { year: date.year, week };
}
