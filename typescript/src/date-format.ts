import { dateTimeFields, type DateFields } from "./date-time.js";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const utcZone = "GMT+0000 (Coordinated Universal Time)";

function padded(value: number, width: number): string { return String(value).padStart(width, "0"); }
function displayYear(year: number): string { return (year < 0 ? "-" : "") + padded(Math.abs(year), 4); }
function timePart(fields: DateFields): string { return padded(fields.hour, 2) + ":" + padded(fields.minute, 2) + ":" + padded(fields.second, 2); }
function datePart(fields: DateFields): string { return weekdays[fields.weekday] + " " + months[fields.month] + " " + padded(fields.day, 2) + " " + displayYear(fields.year); }

export function formatDateISO(time: number): string | null {
    const fields = dateTimeFields(time);
    if (fields === null) return null;
    const year = fields.year >= 0 && fields.year <= 9999 ? padded(fields.year, 4) :
        (fields.year < 0 ? "-" : "+") + padded(Math.abs(fields.year), 6);
    return year + "-" + padded(fields.month + 1, 2) + "-" + padded(fields.day, 2) + "T" + timePart(fields) + "." + padded(fields.millisecond, 3) + "Z";
}

export function formatDateString(time: number, style: "date" | "time" | "utc" | "display"): string {
    const fields = dateTimeFields(time);
    if (fields === null) return "Invalid Date";
    if (style === "date") return datePart(fields);
    if (style === "time") return timePart(fields) + " " + utcZone;
    if (style === "utc") return weekdays[fields.weekday] + ", " + padded(fields.day, 2) + " " + months[fields.month] + " " + displayYear(fields.year) + " " + timePart(fields) + " GMT";
    return datePart(fields) + " " + timePart(fields) + " " + utcZone;
}
