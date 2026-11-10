import type { ISODate } from "./iso-calendar.js";
import { TemporalISOScanner, temporalISODate, temporalISOTime, temporalISOAnnotations } from "./temporal-iso-parser.js";
import { parseUTCOffset } from "./utc-offset.js";

export function parseTemporalPlainDate(text: string): ISODate | null {
    const scanner = new TemporalISOScanner(text);
    const date = temporalISODate(scanner);
    if (date === null) return null;
    if (scanner.take("T") || scanner.take("t") || scanner.take(" ")) {
        if (temporalISOTime(scanner) === null) return null;
        if (scanner.peek() === "+" || scanner.peek() === "-") {
            const bracket = text.indexOf("[", scanner.index), end = bracket < 0 ? text.length : bracket;
            if (parseUTCOffset(text.slice(scanner.index, end)) === null) return null;
            scanner.index = end;
        }
    }
    if (!temporalISOAnnotations(scanner)) return null;
    const calendar = scanner.calendar;
    return calendar === null || (calendar.length === 7 && calendar.toLowerCase() === "iso8601") ? date : null;
}
