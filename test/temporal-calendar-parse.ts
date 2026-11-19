import { parseTemporalCalendarString } from "../src/temporal/temporal-calendar-parse.js";

function expect(text: string, expected: string | null): void {
    const result = parseTemporalCalendarString(text);
    if (result !== expected) {
        throw new Error(text + ": " + String(result) + " != " + String(expected));
    }
}
for (const text of [
    "iso8601",
    "ISO8601",
    "gregory",
    "islamic-civil",
    "unknown123",
    "2024-02-30",
    "2024-02-29Z",
    "12345",
]) {
    expect(text, text);
}
for (const text of [
    "2024-02-29",
    "20240229",
    "+999999-12-31",
    "-9999990101",
    "2024-02-29T12",
    "20240229t123456.123456789Z",
    "2024-02-29 12:34:60z",
    "2024-02-29T12:34:56+23:59:59.123456789",
    "2024-02-29[Unknown/Zone]",
    "12:34",
    "T123456",
    "t12",
    "12:34+01:00[Unknown/Zone]",
    "2024-02",
    "202402",
    "+99999912",
    "-999999-01",
    "--02-29",
    "--0229",
    "02-29",
    "0229",
    "2024-02[!u-ca=ISO8601]",
    "--02-29[u-ca=iso8601]",
    "2024-02-29[x-test=opaque]",
]) {
    expect(text, text.includes("ISO8601") ? "ISO8601" : "iso8601");
}
for (const text of ["2024-02-29", "2024-02-29T12:34Z", "12:34", "T12"]) {
    expect(text + "[u-ca=gregory]", "gregory");
}
expect("2024-02-29[u-ca=gregory][u-ca=iso8601]", "gregory");
expect("2024-02-29[u-ca=iso8601][u-ca=gregory]", "iso8601");
for (const text of [
    "",
    " iso8601",
    "iso8601 ",
    "-iso8601",
    "iso8601-",
    "iso--8601",
    "iso_8601",
    "2024-02-30[u-ca=iso8601]",
    "-000000-01-01[u-ca=iso8601]",
    "2024-02-29Z[u-ca=iso8601]",
    "2024-02-29+01:00",
    "2024-02-29T24:00",
    "2024-02-29T12:60Z",
    "12:34Z",
    "2024-02-29T12:34+24:00",
    "2024-02-29T12:34:56.1234567890",
    "2024-02[u-ca=gregory]",
    "--02-29[u-ca=gregory]",
    "--02-30",
    "--13-01",
    "2024-02-29[!unknown=value]",
    "2024-02-29[u-ca=iso8601][!u-ca=iso8601]",
    "2024-02-29[!u-ca=iso8601][u-ca=iso8601]",
    "2024-02-29[u-ca=iso8601][UTC]",
    "2024-02-29[+01:00:01]",
    "2024-02-29[u-ca=]",
    "2024-02-29[u-ca=iso8601",
]) {
    expect(text, null);
}
console.log("temporal calendar parse passed");
