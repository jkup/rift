import { utcDateTimeFromEpochNanoseconds } from "./iso-calendar.js";

export type TemporalTimePrecision = "auto" | "minute" | number;

export function formatISOYear(year: number): string {
    if (year >= 0 && year <= 9999) return String(year).padStart(4, "0");
    return (year < 0 ? "-" : "+") + String(Math.abs(year)).padStart(6, "0");
}

export function formatUTCInstant(value: bigint, precision: TemporalTimePrecision = "auto"): string | null {
    if (typeof precision === "number" && (!Number.isInteger(precision) || precision < 0 || precision > 9)) return null;
    const time = utcDateTimeFromEpochNanoseconds(value);
    if (time === null) return null;
    const date = time.date;
    let result = formatISOYear(date.year) + "-" + String(date.month).padStart(2, "0") + "-" + String(date.day).padStart(2, "0") +
        "T" + String(time.hour).padStart(2, "0") + ":" + String(time.minute).padStart(2, "0");
    if (precision === "minute") return result + "Z";
    result += ":" + String(time.second).padStart(2, "0");
    let fraction = String(time.millisecond * 1000000 + time.microsecond * 1000 + time.nanosecond).padStart(9, "0");
    if (precision === "auto") {
        while (fraction.endsWith("0")) fraction = fraction.slice(0, -1);
    } else fraction = fraction.slice(0, precision);
    if (fraction.length !== 0) result += "." + fraction;
    return result + "Z";
}
