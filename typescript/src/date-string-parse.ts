import { parseDateISO } from "./date-iso-parse.js";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const displaySuffix = " GMT+0000 (Coordinated Universal Time)";

function parsedParts(weekday: string, month: string, day: string, year: string, time: string): number {
    if (weekdays.indexOf(weekday) < 0 || day.length !== 2 || time.length !== 8) return NaN;
    const monthIndex = months.indexOf(month);
    if (monthIndex < 0) return NaN;
    const negative = year.charAt(0) === "-", digits = negative ? year.slice(1) : year;
    if (digits.length < 4 || digits.length > 6) return NaN;
    for (let index = 0; index < digits.length; index++) {
        const code = digits.charCodeAt(index);
        if (code < 48 || code > 57) return NaN;
    }
    const isoYear = negative ? "-" + digits.padStart(6, "0") : digits.length === 4 ? digits : "+" + digits.padStart(6, "0");
    return parseDateISO(isoYear + "-" + String(monthIndex + 1).padStart(2, "0") + "-" + day + "T" + time + "Z");
}

export function parseDateString(text: string): number {
    const iso = parseDateISO(text);
    if (!Number.isNaN(iso)) return iso;
    if (text.length > 80) return NaN;
    if (text.endsWith(displaySuffix)) {
        const parts = text.slice(0, -displaySuffix.length).split(" ");
        if (parts.length !== 5) return NaN;
        return parsedParts(parts[0] ?? "", parts[1] ?? "", parts[2] ?? "", parts[3] ?? "", parts[4] ?? "");
    }
    const parts = text.split(" "), weekday = parts[0] ?? "";
    if (parts.length !== 6 || parts[5] !== "GMT" || !weekday.endsWith(",")) return NaN;
    return parsedParts(weekday.slice(0, -1), parts[2] ?? "", parts[1] ?? "", parts[3] ?? "", parts[4] ?? "");
}
