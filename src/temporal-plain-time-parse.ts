import { isValidISODate } from "./iso-calendar.js";
import type { TimeFields } from "./temporal-time.js";
import {
    TemporalISOScanner,
    temporalISODate,
    temporalISOTime,
    temporalISOAnnotations,
} from "./temporal-iso-parser.js";
import { parseUTCOffset } from "./utc-offset.js";

function ambiguousDate(text: string): boolean {
    const monthDay = new TemporalISOScanner(text);
    const month = monthDay.digits(2);
    monthDay.take("-");
    const day = monthDay.digits(2);
    if (monthDay.index === text.length && isValidISODate({ year: 1972, month, day })) {
        return true;
    }
    const yearMonth = new TemporalISOScanner(text);
    const year = yearMonth.digits(4);
    yearMonth.take("-");
    const yearMonthValue = yearMonth.digits(2);
    return (
        year >= 0 && yearMonth.index === text.length && yearMonthValue >= 1 && yearMonthValue <= 12
    );
}

export function parseTemporalPlainTime(text: string): TimeFields | null {
    const scanner = new TemporalISOScanner(text);
    let disambiguated = scanner.take("T") || scanner.take("t");
    if (!disambiguated) {
        const date = temporalISODate(scanner);
        if (date !== null && (scanner.take("T") || scanner.take("t") || scanner.take(" "))) {
            disambiguated = true;
        } else {
            scanner.index = 0;
        }
    }
    const time = temporalISOTime(scanner);
    if (time === null) {
        return null;
    }
    if (scanner.peek() === "+" || scanner.peek() === "-") {
        const bracket = text.indexOf("[", scanner.index),
            end = bracket < 0 ? text.length : bracket;
        if (parseUTCOffset(text.slice(scanner.index, end)) === null) {
            return null;
        }
        scanner.index = end;
    }
    if (!disambiguated && ambiguousDate(text.slice(0, scanner.index))) {
        return null;
    }
    return temporalISOAnnotations(scanner) ? time : null;
}
