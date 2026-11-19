import type { ISODate } from "./iso-calendar.js";
import { parseTemporalPlainDateTime } from "./temporal-plain-date-time-parse.js";

export function parseTemporalPlainDate(text: string): ISODate | null {
    const result = parseTemporalPlainDateTime(text);
    return result === null ? null : result.date;
}
