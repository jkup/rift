import { parseDateString } from "../src/date-string-parse.js";
import { formatDateISO, formatDateString } from "../src/date-format.js";
function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
for (const value of [
    -8640000000000000, -62198755200000, -62167219200000, -1000, 0, 1000, 951782400000,
    253402300800000, 8640000000000000,
]) {
    const iso = formatDateISO(value);
    check(iso !== null && parseDateString(iso) === value, "ISO round trip");
    check(parseDateString(formatDateString(value, "utc")) === value, "UTC round trip");
    check(parseDateString(formatDateString(value, "display")) === value, "display round trip");
}
check(
    parseDateString("1970") === 0 && parseDateString("1970-01-01T01:00+01:00") === 0,
    "ISO forms retained",
);
check(
    parseDateString(formatDateString(-1, "utc")) === -1000,
    "display rounds down to whole second",
);
for (const text of [
    "Invalid Date",
    "Thu, 01 Jan -0000 00:00:00 GMT",
    "Thu, 01 Jan 1970 24:01:00 GMT",
    "Thu, 32 Jan 1970 00:00:00 GMT",
    "Bad, 01 Jan 1970 00:00:00 GMT",
    "Thu, 01 Bad 1970 00:00:00 GMT",
    "Thu, 01 Jan 1970 00:00:00 PST",
    "Thu, 01 Jan 1970 00:00:00 GMT junk",
    "Thu Jan 01 1970 00:00:00 GMT+0100 (Coordinated Universal Time)",
    "Thu  Jan 01 1970 00:00:00 GMT+0000 (Coordinated Universal Time)",
    "Thu, 1 Jan 1970 00:00:00 GMT",
    "Thu, 01 Jan 197 00:00:00 GMT",
    "Thu, 01 Jan 19x0 00:00:00 GMT",
    "x".repeat(1000),
]) {
    check(Number.isNaN(parseDateString(text)), "unrecognized date string");
}
console.log("date string parse passed");
