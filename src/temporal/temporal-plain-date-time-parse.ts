import { combineISODateTime } from "./iso-date-time.js";
import type { ISODateTime } from "./iso-calendar.js";
import {
    TemporalISOScanner,
    temporalISODate,
    temporalISOTime,
    temporalISOAnnotations,
} from "./temporal-iso-parser.js";
import { parseUTCOffset } from "../time-zone/utc-offset.js";

export function parseTemporalPlainDateTime(text: string): ISODateTime | null {
    return parseTemporalDateTimeRecord(text)?.value ?? null;
}

export function parseTemporalDateTimeRecord(
    text: string,
): { value: ISODateTime; timeZone: string | null } | null {
    const scanner = new TemporalISOScanner(text);
    const date = temporalISODate(scanner);
    if (date === null) {
        return null;
    }
    let time = { hour: 0, minute: 0, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 };
    if (scanner.take("T") || scanner.take("t") || scanner.take(" ")) {
        const parsed = temporalISOTime(scanner);
        if (parsed === null) {
            return null;
        }
        time = parsed;
        if (scanner.peek() === "+" || scanner.peek() === "-") {
            const bracket = text.indexOf("[", scanner.index),
                end = bracket < 0 ? text.length : bracket;
            if (parseUTCOffset(text.slice(scanner.index, end)) === null) {
                return null;
            }
            scanner.index = end;
        }
    }
    if (!temporalISOAnnotations(scanner)) {
        return null;
    }
    const calendar = scanner.calendar;
    return calendar === null || (calendar.length === 7 && calendar.toLowerCase() === "iso8601")
        ? { value: combineISODateTime(date, time), timeZone: scanner.timeZone }
        : null;
}
