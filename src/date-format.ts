import { dateTimeFields, type DateFields } from "./date-time.js";
import { dateLocalFields, dateTimeZoneOffsetMilliseconds } from "./date-time-zone.js";
import type { TemporalTimeZone } from "./temporal/temporal-time-zone-operations.js";
import { formatUTCOffset } from "./time-zone/utc-offset.js";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const utcZone = "GMT+0000 (Coordinated Universal Time)";

function padded(value: number, width: number): string {
    return String(value).padStart(width, "0");
}
function displayYear(year: number): string {
    return (year < 0 ? "-" : "") + padded(Math.abs(year), 4);
}
function timePart(fields: DateFields): string {
    return padded(fields.hour, 2) + ":" + padded(fields.minute, 2) + ":" + padded(fields.second, 2);
}
function datePart(fields: DateFields): string {
    return (
        weekdays[fields.weekday] +
        " " +
        months[fields.month] +
        " " +
        padded(fields.day, 2) +
        " " +
        displayYear(fields.year)
    );
}

export function formatDateISO(time: number): string | null {
    const fields = dateTimeFields(time);
    if (fields === null) {
        return null;
    }
    const year =
        fields.year >= 0 && fields.year <= 9999
            ? padded(fields.year, 4)
            : (fields.year < 0 ? "-" : "+") + padded(Math.abs(fields.year), 6);
    return (
        year +
        "-" +
        padded(fields.month + 1, 2) +
        "-" +
        padded(fields.day, 2) +
        "T" +
        timePart(fields) +
        "." +
        padded(fields.millisecond, 3) +
        "Z"
    );
}

function timeZoneString(time: number, zone: TemporalTimeZone | null): string {
    if (zone === null || (zone.kind === "named" && zone.primaryIdentifier === "UTC")) {
        return utcZone;
    }
    const offset = dateTimeZoneOffsetMilliseconds(time, zone),
        absolute = Math.abs(offset);
    const prefix =
        "GMT" +
        (offset < 0 ? "-" : "+") +
        padded(Math.floor(absolute / 3600000), 2) +
        padded(Math.floor(absolute / 60000) % 60, 2);
    let name = zone.kind === "named" ? zone.primaryIdentifier : "UTC" + zone.identifier;
    if (offset % 60000 !== 0) {
        const exact = formatUTCOffset(BigInt(offset) * 1000000n);
        if (exact === null) {
            throw new Error("Date display offset invariant");
        }
        name = "UTC" + exact;
    } else if (offset === 0 && zone.kind === "offset") {
        name = "Coordinated Universal Time";
    }
    return prefix + " (" + name + ")";
}

export function formatDateString(
    time: number,
    style: "date" | "time" | "utc" | "display",
    zone: TemporalTimeZone | null = null,
): string {
    const fields =
        zone === null || style === "utc" ? dateTimeFields(time) : dateLocalFields(time, zone);
    if (fields === null) {
        return "Invalid Date";
    }
    if (style === "date") {
        return datePart(fields);
    }
    if (style === "time") {
        return timePart(fields) + " " + timeZoneString(time, zone);
    }
    if (style === "utc") {
        return (
            weekdays[fields.weekday] +
            ", " +
            padded(fields.day, 2) +
            " " +
            months[fields.month] +
            " " +
            displayYear(fields.year) +
            " " +
            timePart(fields) +
            " GMT"
        );
    }
    return datePart(fields) + " " + timePart(fields) + " " + timeZoneString(time, zone);
}
