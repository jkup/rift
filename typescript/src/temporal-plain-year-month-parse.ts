import type { ISODate } from "./iso-calendar.js";
import { TemporalISOScanner, temporalISOYearMonth, temporalISOAnnotations } from "./temporal-iso-parser.js";
import { parseTemporalPlainDateTime } from "./temporal-plain-date-time-parse.js";

export function parseTemporalPlainYearMonth(text: string): ISODate | null {
    const scanner = new TemporalISOScanner(text);
    const yearMonth = temporalISOYearMonth(scanner);
    if (yearMonth !== null && temporalISOAnnotations(scanner)) {
        const calendar = scanner.calendar;
        if (calendar === null || (calendar.length === 7 && calendar.toLowerCase() === "iso8601")) return yearMonth;
    }
    const full = parseTemporalPlainDateTime(text);
    return full === null ? null : full.date;
}
