import { formatUTCOffsetMinutes } from "./utc-offset.js";
import type { TimeFields } from "./temporal-time.js";
import {
    isoDateTimeFromEpochNanoseconds,
    isValidEpochNanoseconds,
    utcDateTimeFromEpochNanoseconds,
    type ISODateTime,
    type ISODate,
} from "./iso-calendar.js";

export type TemporalTimePrecision = "auto" | "minute" | number;

export function formatISOYear(year: number): string {
    if (year >= 0 && year <= 9999) {
        return String(year).padStart(4, "0");
    }
    return (year < 0 ? "-" : "+") + String(Math.abs(year)).padStart(6, "0");
}

export function formatUTCInstant(
    value: bigint,
    precision: TemporalTimePrecision = "auto",
): string | null {
    const time = utcDateTimeFromEpochNanoseconds(value);
    if (time === null) {
        return null;
    }
    const formatted = formatISODateTime(time, precision);
    return formatted === null ? null : formatted + "Z";
}

export function formatOffsetInstant(
    value: bigint,
    minutes: number,
    precision: TemporalTimePrecision = "auto",
): string | null {
    if (!isValidEpochNanoseconds(value)) {
        return null;
    }
    const offset = formatUTCOffsetMinutes(minutes);
    if (offset === null) {
        return null;
    }
    const time = isoDateTimeFromEpochNanoseconds(value + BigInt(minutes) * 60000000000n);
    if (time === null) {
        throw new Error("offset date-time range invariant");
    }
    const formatted = formatISODateTime(time, precision);
    return formatted === null ? null : formatted + offset;
}

export function formatISODateTime(
    time: ISODateTime,
    precision: TemporalTimePrecision,
): string | null {
    const formatted = formatTemporalTime(time, precision);
    return formatted === null ? null : formatISODate(time.date) + "T" + formatted;
}

export function formatISODate(date: ISODate): string {
    return (
        formatISOYear(date.year) +
        "-" +
        String(date.month).padStart(2, "0") +
        "-" +
        String(date.day).padStart(2, "0")
    );
}

export function formatTemporalTime(
    time: TimeFields,
    precision: TemporalTimePrecision = "auto",
): string | null {
    if (
        typeof precision === "number" &&
        (!Number.isInteger(precision) || precision < 0 || precision > 9)
    ) {
        return null;
    }
    let result = String(time.hour).padStart(2, "0") + ":" + String(time.minute).padStart(2, "0");
    if (precision === "minute") {
        return result;
    }
    result += ":" + String(time.second).padStart(2, "0");
    return (
        result +
        formatTemporalFraction(
            time.millisecond * 1000000 + time.microsecond * 1000 + time.nanosecond,
            precision,
        )
    );
}

export function formatTemporalFraction(nanoseconds: number, precision: "auto" | number): string {
    let fraction = String(nanoseconds).padStart(9, "0");
    if (precision === "auto") {
        while (fraction.endsWith("0")) {
            fraction = fraction.slice(0, -1);
        }
    } else {
        fraction = fraction.slice(0, precision);
    }
    return fraction.length === 0 ? "" : "." + fraction;
}

export function formatISOCalendarAnnotation(calendarName: string): string {
    if (calendarName === "always") {
        return "[u-ca=iso8601]";
    } else if (calendarName === "critical") {
        return "[!u-ca=iso8601]";
    } else {
        return "";
    }
}
