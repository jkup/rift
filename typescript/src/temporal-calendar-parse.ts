import { TemporalISOScanner, temporalISOMonthDay, temporalISOYearMonth, temporalISODate, temporalISOTime, temporalISOAnnotations, validAnnotationValue } from "./temporal-iso-parser.js";
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
    const scanner = new TemporalISOScanner(text);
    return temporalISOYearMonth(scanner) === null ? null : calendarAnnotation(scanner, true);
}

function monthDayCalendar(text: string): string | null {
    const scanner = new TemporalISOScanner(text);
    return temporalISOMonthDay(scanner) === null ? null : calendarAnnotation(scanner, true);
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
