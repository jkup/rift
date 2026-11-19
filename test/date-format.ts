import { formatDateISO, formatDateString } from "../src/date-format.js";
import { parseDateISO } from "../src/date-iso-parse.js";
function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
check(formatDateISO(0) === "1970-01-01T00:00:00.000Z", "ISO epoch");
check(formatDateISO(-1) === "1969-12-31T23:59:59.999Z", "ISO negative millisecond");
check(formatDateString(0, "date") === "Thu Jan 01 1970", "date display");
check(
    formatDateString(0, "time") === "00:00:00 GMT+0000 (Coordinated Universal Time)",
    "time display",
);
check(
    formatDateString(0, "display") ===
        "Thu Jan 01 1970 00:00:00 GMT+0000 (Coordinated Universal Time)",
    "full display",
);
check(formatDateString(0, "utc") === "Thu, 01 Jan 1970 00:00:00 GMT", "UTC display");
check(formatDateString(-1, "utc") === "Wed, 31 Dec 1969 23:59:59 GMT", "UTC omits milliseconds");
check(formatDateISO(-62167219200000) === "0000-01-01T00:00:00.000Z", "ISO year zero");
check(formatDateISO(-62198755200000) === "-000001-01-01T00:00:00.000Z", "negative ISO year");
check(formatDateString(-62198755200000, "date") === "Fri Jan 01 -0001", "negative display year");
check(
    formatDateISO(253402300800000) === "+010000-01-01T00:00:00.000Z",
    "expanded positive ISO year",
);
check(
    formatDateString(253402300800000, "utc") === "Sat, 01 Jan 10000 00:00:00 GMT",
    "expanded display year",
);
check(formatDateISO(-8640000000000000) === "-271821-04-20T00:00:00.000Z", "minimum ISO");
check(formatDateISO(8640000000000000) === "+275760-09-13T00:00:00.000Z", "maximum ISO");
for (const invalid of [NaN, Infinity, -Infinity, 0.5, 8640000000000001]) {
    check(formatDateISO(invalid) === null, "invalid ISO");
    check(
        formatDateString(invalid, "date") === "Invalid Date" &&
            formatDateString(invalid, "time") === "Invalid Date" &&
            formatDateString(invalid, "utc") === "Invalid Date" &&
            formatDateString(invalid, "display") === "Invalid Date",
        "invalid display",
    );
}
for (const value of [
    -8640000000000000, -62198755200000, -62167219200000, -1, 0, 1, 951782400123, 253402300800000,
    8640000000000000,
]) {
    const text = formatDateISO(value);
    check(text !== null && parseDateISO(text) === value, "ISO parse roundtrip");
}
console.log("date format passed");
