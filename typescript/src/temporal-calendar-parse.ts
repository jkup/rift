import { isValidISODate } from "./iso-calendar.js";
import { TemporalISOScanner, temporalISODate, temporalISOTime, temporalISOAnnotations, validAnnotationValue } from "./temporal-iso-parser.js";
import { parseTemporalPlainTime } from "./temporal-plain-time-parse.js";
import { parseUTCOffset } from "./utc-offset.js";

function calendarAnnotation(scanner: TemporalISOScanner, partialDate: boolean): string | null {
    if (!temporalISOAnnotations(scanner)) return null;
    const calendar = scanner.calendar ?? "iso8601";
    if (partialDate && calendar.toLowerCase() !== "iso8601") return null;
    return calendar;
}

function dateTimeCalendar(text: string): string | null {
    const scanner = new TemporalISOScanner(text);
    if (temporalISODate(scanner) === null) return null;
    if (scanner.take("T") || scanner.take("t") || scanner.take(" ")) {
        if (temporalISOTime(scanner) === null) return null;
        if (!scanner.take("Z") && !scanner.take("z") && (scanner.peek() === "+" || scanner.peek() === "-")) {
            const bracket = text.indexOf("[", scanner.index), end = bracket < 0 ? text.length : bracket;
            if (parseUTCOffset(text.slice(scanner.index, end)) === null) return null;
            scanner.index = end;
        }
    }
    return calendarAnnotation(scanner, false);
}

function yearMonthCalendar(text: string): string | null {
    const scanner = new TemporalISOScanner(text), sign = scanner.peek();
    const signed = sign === "+" || sign === "-";
    if (signed) scanner.index++;
    const year = scanner.digits(signed ? 6 : 4);
    if (year < 0 || (sign === "-" && year === 0)) return null;
    scanner.take("-");
    const month = scanner.digits(2);
    return month >= 1 && month <= 12 ? calendarAnnotation(scanner, true) : null;
}

function monthDayCalendar(text: string): string | null {
    const scanner = new TemporalISOScanner(text);
    if (text.startsWith("--")) scanner.index = 2;
    const month = scanner.digits(2);
    scanner.take("-");
    const day = scanner.digits(2);
    return isValidISODate({ year: 1972, month, day }) ? calendarAnnotation(scanner, true) : null;
}

export function parseTemporalCalendarString(text: string): string | null {
    const dateTime = dateTimeCalendar(text);
    if (dateTime !== null) return dateTime;
    if (parseTemporalPlainTime(text) !== null) {
        const scanner = new TemporalISOScanner(text), bracket = text.indexOf("[");
        scanner.index = bracket < 0 ? text.length : bracket;
        return calendarAnnotation(scanner, false);
    }
    const monthDay = monthDayCalendar(text);
    if (monthDay !== null) return monthDay;
    const yearMonth = yearMonthCalendar(text);
    if (yearMonth !== null) return yearMonth;
    return validAnnotationValue(text) ? text : null;
}
