import { parseDateISO, parseDateISOFields } from "./date-iso-parse.js";
import { dateTimeClip } from "./date-time.js";
import { namedTemporalTimeZone, type TemporalTimeZone } from "./temporal-time-zone-operations.js";
import { MAX_IANA_IDENTIFIER_LENGTH } from "./iana-timezone-identifiers.js";
import { parseUTCOffset, formatUTCOffset } from "./utc-offset.js";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parsedParts(
    weekday: string,
    month: string,
    day: string,
    year: string,
    time: string,
): number {
    if (weekdays.indexOf(weekday) < 0 || day.length !== 2 || time.length !== 8) {
        return NaN;
    }
    const monthIndex = months.indexOf(month);
    if (monthIndex < 0) {
        return NaN;
    }
    const negative = year.charAt(0) === "-",
        digits = negative ? year.slice(1) : year;
    if (digits.length < 4 || digits.length > 6) {
        return NaN;
    }
    for (let index = 0; index < digits.length; index++) {
        const code = digits.charCodeAt(index);
        if (code < 48 || code > 57) {
            return NaN;
        }
    }
    const isoYear = negative
        ? "-" + digits.padStart(6, "0")
        : digits.length === 4
          ? digits
          : "+" + digits.padStart(6, "0");
    const fields = parseDateISOFields(
        isoYear + "-" + String(monthIndex + 1).padStart(2, "0") + "-" + day + "T" + time + "Z",
    );
    return fields === null ? NaN : fields.time;
}

function displayOffset(text: string): number | null {
    if (text.length < 5) {
        return null;
    }
    const printed = parseUTCOffset(text.slice(0, 5), false);
    if (printed === null) {
        return null;
    }
    if (text.length === 5) {
        return Number(printed / 1000000n);
    }
    if (!text.startsWith(" (", 5) || !text.endsWith(")")) {
        return null;
    }
    const name = text.slice(7, -1);
    if (name === "Coordinated Universal Time") {
        return printed === 0n ? 0 : null;
    }
    if (name.startsWith("UTC") && (name.length === 9 || name.length === 12)) {
        const exact = parseUTCOffset(name.slice(3));
        if (
            exact === null ||
            formatUTCOffset(exact) !== name.slice(3) ||
            name.charAt(3) !== text.charAt(0) ||
            exact / 60000000000n !== printed / 60000000000n
        ) {
            return null;
        }
        return Number(exact / 1000000n);
    }
    return namedTemporalTimeZone(name) === null ? null : Number(printed / 1000000n);
}

export function parseDateString(text: string, zone: TemporalTimeZone | null = null): number {
    const iso = parseDateISO(text, zone);
    if (!Number.isNaN(iso)) {
        return iso;
    }
    if (text.length > MAX_IANA_IDENTIFIER_LENGTH + 64) {
        return NaN;
    }
    const suffix = text.indexOf(" GMT");
    if (suffix >= 0 && text.charAt(suffix + 4) !== "") {
        const parts = text.slice(0, suffix).split(" "),
            offset = displayOffset(text.slice(suffix + 4));
        if (parts.length !== 5) {
            return NaN;
        }
        return offset === null
            ? NaN
            : dateTimeClip(
                  parsedParts(
                      parts[0] ?? "",
                      parts[1] ?? "",
                      parts[2] ?? "",
                      parts[3] ?? "",
                      parts[4] ?? "",
                  ) - offset,
              );
    }
    const parts = text.split(" "),
        weekday = parts[0] ?? "";
    if (parts.length !== 6 || parts[5] !== "GMT" || !weekday.endsWith(",")) {
        return NaN;
    }
    return dateTimeClip(
        parsedParts(
            weekday.slice(0, -1),
            parts[2] ?? "",
            parts[1] ?? "",
            parts[3] ?? "",
            parts[4] ?? "",
        ),
    );
}
