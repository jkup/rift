import { parseTemporalPlainDate } from "../src/temporal/temporal-plain-date-parse.js";
import { formatISODate } from "../src/temporal/temporal-time-format.js";
import { epochDayToISODate } from "../src/temporal/iso-calendar.js";
function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
for (const text of [
    "2024-02-29",
    "20240229",
    "+002024-02-29",
    "+0020240229",
    "2024-02-29T23:59:60.123456789",
    "20240229t235959,123",
    "2024-02-29 12",
    "2024-02-29T12+23:59:59.999999999",
    "2024-02-29T12-23:59",
    "2024-02-29[Unknown/Zone]",
    "2024-02-29[!Unknown/Zone]",
    "2024-02-29[+23:59]",
    "2024-02-29[u-ca=iso8601]",
    "2024-02-29[!u-ca=ISO8601]",
    "2024-02-29[UTC][u-ca=iso8601][x-foo=BAR]",
    "2024-02-29[u-ca=iso8601][u-ca=unknown]",
]) {
    const date = parseTemporalPlainDate(text);
    check(date !== null && date.year === 2024 && date.month === 2 && date.day === 29, text);
}
for (const text of [
    "",
    "2024",
    "2024-02",
    "2023-02-29",
    "1900-02-29",
    "2024-13-01",
    "2024-01-32",
    "-000000-01-01",
    "+2024-01-01",
    "2024-0229",
    "202402-29",
    "2024-02-29 ",
    "2024-02-29Z",
    "2024-02-29T12Z",
    "2024-02-29T12z",
    "2024-02-29+01:00",
    "2024-02-29T24:00",
    "2024-02-29T12:60",
    "2024-02-29T12:00:61",
    "2024-02-29T12:00:00.1234567890",
    "2024-02-29T12+24",
    "2024-02-29[+01:00:00]",
    "2024-02-29[UTC][UTC]",
    "2024-02-29[u-ca=gregory]",
    "2024-02-29[u-ca=unknown][u-ca=iso8601]",
    "2024-02-29[!u-ca=iso8601][u-ca=iso8601]",
    "2024-02-29[u-ca=iso8601][!u-ca=iso8601]",
    "2024-02-29[!x-test=value]",
    "2024-02-29[u-ca=iso8601][UTC]",
    "2024-02-29[u-ca=iso8601",
]) {
    check(parseTemporalPlainDate(text) === null, text);
}
for (const text of [
    "0000-01-01",
    "-000001-01-01",
    "-271821-04-19",
    "+275760-09-13",
    "-999999-01-01",
    "+999999-12-31",
]) {
    const date = parseTemporalPlainDate(text);
    check(date !== null && formatISODate(date) === text, "expanded " + text);
}
for (let day = -730; day <= 730; day++) {
    const date = epochDayToISODate(day);
    if (date === null) {
        throw new Error("date");
    }
    const parsed = parseTemporalPlainDate(formatISODate(date));
    check(
        parsed !== null &&
            parsed.year === date.year &&
            parsed.month === date.month &&
            parsed.day === date.day,
        "round trip",
    );
}
console.log("temporal plain date parse passed");
