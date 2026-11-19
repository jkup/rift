import { combineISODateTime } from "./iso-date-time.js";
import type { ISODateTime } from "./iso-calendar.js";
import {
    TemporalISOScanner,
    temporalISODate,
    temporalISOTime,
    temporalISOAnnotations,
} from "./temporal-iso-parser.js";
import {
    parseTemporalTimeZoneIdentifier,
    type TemporalTimeZone,
} from "./temporal-time-zone-parse.js";
import { parseUTCOffset } from "./utc-offset.js";

export interface TemporalZonedRecord {
    readonly dateTime: ISODateTime;
    readonly timeZone: TemporalTimeZone;
    readonly startOfDay: boolean;
    readonly offsetBehaviour: "wall" | "exact" | "option";
    readonly offsetNanoseconds: bigint;
    readonly matchMinutes: boolean;
}

export function parseTemporalZonedDateTime(text: string): TemporalZonedRecord | null {
    const scanner = new TemporalISOScanner(text),
        date = temporalISODate(scanner);
    if (date === null) {
        return null;
    }
    let time = { hour: 0, minute: 0, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 };
    const hasTime = scanner.take("T") || scanner.take("t") || scanner.take(" ");
    let matchMinutes = true;
    let offsetBehaviour: "wall" | "exact" | "option" = "wall",
        offsetNanoseconds = 0n;
    if (hasTime) {
        const parsedTime = temporalISOTime(scanner);
        if (parsedTime === null) {
            return null;
        }
        time = parsedTime;
        if (scanner.take("Z") || scanner.take("z")) {
            offsetBehaviour = "exact";
        } else if (scanner.peek() === "+" || scanner.peek() === "-") {
            const end = text.indexOf("[", scanner.index);
            if (end < 0) {
                return null;
            }
            const offsetText = text.slice(scanner.index, end);
            const offset = parseUTCOffset(offsetText);
            matchMinutes = offsetText.length <= (offsetText.charAt(3) === ":" ? 6 : 5);
            if (offset === null) {
                return null;
            }
            offsetBehaviour = "option";
            offsetNanoseconds = offset;
            scanner.index = end;
        }
    }
    if (!temporalISOAnnotations(scanner) || scanner.timeZone === null) {
        return null;
    }
    if (scanner.calendar !== null && scanner.calendar.toLowerCase() !== "iso8601") {
        return null;
    }
    const timeZone = parseTemporalTimeZoneIdentifier(scanner.timeZone);
    return timeZone === null
        ? null
        : {
              dateTime: combineISODateTime(date, time),
              timeZone,
              startOfDay: !hasTime,
              offsetBehaviour,
              offsetNanoseconds,
              matchMinutes,
          };
}
