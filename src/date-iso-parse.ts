import { dateEpochFromLocalTime } from "./date-time-zone.js";
import type { TemporalTimeZone } from "./temporal-time-zone-operations.js";
import { dateMakeDay } from "./date-calendar.js";
import { dateMakeDate, dateMakeTime, dateTimeClip } from "./date-time.js";

function digits(text: string, start: number, count: number): number {
    if (start + count > text.length) return -1;
    let value = 0;
    for (let index = start; index < start + count; index++) {
        const code = text.charCodeAt(index);
        if (code < 48 || code > 57) return -1;
        value = value * 10 + code - 48;
    }
    return value;
}

export interface ParsedDateISO { readonly time: number; readonly offsetMilliseconds: number | null }

export function parseDateISOFields(text: string): ParsedDateISO | null {
    const sign = text.charAt(0), expanded = sign === "+" || sign === "-";
    let index = expanded ? 1 : 0;
    let year = digits(text, index, expanded ? 6 : 4);
    index += expanded ? 6 : 4;
    if (year < 0 || (sign === "-" && year === 0)) return null;
    if (sign === "-") year = -year;
    let month = 1, day = 1, hour = 0, minute = 0, second = 0, millisecond = 0;
    let offset: number | null = 0;
    if (text.charAt(index) === "-") {
        month = digits(text, index + 1, 2); index += 3;
        if (month < 1 || month > 12) return null;
        if (text.charAt(index) === "-") {
            day = digits(text, index + 1, 2); index += 3;
            if (day < 1 || day > 31) return null;
        }
    }
    if (text.charAt(index) === "T") {
        offset = null;
        hour = digits(text, index + 1, 2); index += 3;
        if (hour < 0 || hour > 24 || text.charAt(index++) !== ":") return null;
        minute = digits(text, index, 2); index += 2;
        if (minute < 0 || minute > 59) return null;
        if (text.charAt(index) === ":") {
            second = digits(text, index + 1, 2); index += 3;
            if (second < 0 || second > 59) return null;
            if (text.charAt(index) === ".") {
                millisecond = digits(text, index + 1, 3); index += 4;
                if (millisecond < 0) return null;
            }
        }
        if (hour === 24 && (minute !== 0 || second !== 0 || millisecond !== 0)) return null;
        const offsetSign = text.charAt(index);
        if (offsetSign === "Z") { offset = 0; index++; }
        else if (offsetSign === "+" || offsetSign === "-") {
            const offsetHour = digits(text, index + 1, 2); index += 3;
            if (offsetHour < 0 || offsetHour > 23 || text.charAt(index++) !== ":") return null;
            const offsetMinute = digits(text, index, 2); index += 2;
            if (offsetMinute < 0 || offsetMinute > 59) return null;
            offset = (offsetHour * 60 + offsetMinute) * 60000 * (offsetSign === "-" ? -1 : 1);
        }
    }
    if (index !== text.length) return null;
    return { time: dateMakeDate(dateMakeDay(year, month - 1, day), dateMakeTime(hour, minute, second, millisecond)), offsetMilliseconds: offset };
}

export function parseDateISO(text: string, zone: TemporalTimeZone | null = null): number {
    const fields = parseDateISOFields(text);
    if (fields === null) return NaN;
    if (fields.offsetMilliseconds === null && zone !== null) return dateEpochFromLocalTime(fields.time, zone);
    return dateTimeClip(fields.time - (fields.offsetMilliseconds ?? 0));
}
