import type { ISODate } from "./iso-calendar.js";
import {
    TemporalISOScanner,
    temporalISOMonthDay,
    temporalISOAnnotations,
} from "./temporal-iso-parser.js";
import { parseTemporalPlainDateTime } from "./temporal-plain-date-time-parse.js";

export function parseTemporalPlainMonthDay(text: string): ISODate | null {
    const scanner = new TemporalISOScanner(text);
    const monthDay = temporalISOMonthDay(scanner);
    if (monthDay !== null && temporalISOAnnotations(scanner)) {
        const calendar = scanner.calendar;
        if (calendar === null || (calendar.length === 7 && calendar.toLowerCase() === "iso8601")) {
            return monthDay;
        }
    }
    const full = parseTemporalPlainDateTime(text);
    return full === null ? null : full.date;
}
