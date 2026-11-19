import { namedTemporalTimeZone, type TemporalTimeZone } from "./temporal-time-zone-operations.js";
export type { TemporalTimeZone } from "./temporal-time-zone-operations.js";
import {
    TemporalISOScanner,
    temporalISODate,
    temporalISOTime,
    temporalISOYearMonth,
    temporalISOMonthDay,
    temporalISOAnnotations,
} from "./temporal-iso-parser.js";
import { parseUTCOffset, formatUTCOffsetMinutes } from "../time-zone/utc-offset.js";
import { parseTemporalPlainTime } from "./temporal-plain-time-parse.js";

export function parseTemporalTimeZoneIdentifier(text: string): TemporalTimeZone | null {
    if (text.length === 3 && text.toLowerCase() === "utc") {
        return namedTemporalTimeZone("UTC");
    }
    const offset = parseUTCOffset(text, false);
    if (offset === null) {
        return namedTemporalTimeZone(text);
    }
    const formatted = formatUTCOffsetMinutes(Number(offset / 60000000000n));
    if (formatted === null) {
        throw new Error("timezone offset invariant");
    }
    return { kind: "offset", identifier: formatted, offsetNanoseconds: offset };
}

function annotatedZone(
    scanner: TemporalISOScanner,
    hasTime: boolean,
    shortDate = false,
): TemporalTimeZone | null {
    let offset: string | null = null,
        utc = false;
    if (hasTime) {
        if (scanner.take("Z") || scanner.take("z")) {
            utc = true;
        } else if (scanner.peek() === "+" || scanner.peek() === "-") {
            const bracket = scanner.text.indexOf("[", scanner.index);
            const end = bracket < 0 ? scanner.text.length : bracket;
            offset = scanner.text.slice(scanner.index, end);
            if (parseUTCOffset(offset) === null) {
                return null;
            }
            scanner.index = end;
        }
    }
    if (!temporalISOAnnotations(scanner)) {
        return null;
    }
    if (shortDate && scanner.calendar !== null && scanner.calendar.toLowerCase() !== "iso8601") {
        return null;
    }
    if (scanner.timeZone !== null) {
        return parseTemporalTimeZoneIdentifier(scanner.timeZone);
    }
    if (utc) {
        return parseTemporalTimeZoneIdentifier("UTC");
    }
    return offset === null ? null : parseTemporalTimeZoneIdentifier(offset);
}

export function parseTemporalTimeZone(text: string): TemporalTimeZone | null {
    const direct = parseTemporalTimeZoneIdentifier(text);
    if (direct !== null) {
        return direct;
    }
    const date = new TemporalISOScanner(text);
    if (temporalISODate(date) !== null) {
        const hasTime = date.take("T") || date.take("t") || date.take(" ");
        if (!hasTime || temporalISOTime(date) !== null) {
            const result = annotatedZone(date, hasTime);
            if (result !== null) {
                return result;
            }
        }
    }
    const time = new TemporalISOScanner(text);
    if (parseTemporalPlainTime(text) !== null) {
        if (!time.take("T")) {
            time.take("t");
        }
        if (temporalISOTime(time) !== null) {
            const result = annotatedZone(time, true);
            if (result !== null) {
                return result;
            }
        }
    }
    const monthDay = new TemporalISOScanner(text);
    if (temporalISOMonthDay(monthDay) !== null) {
        const result = annotatedZone(monthDay, false, true);
        if (result !== null) {
            return result;
        }
    }
    const yearMonth = new TemporalISOScanner(text);
    return temporalISOYearMonth(yearMonth) === null ? null : annotatedZone(yearMonth, false, true);
}
