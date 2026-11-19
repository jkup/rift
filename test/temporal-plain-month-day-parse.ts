import { parseTemporalPlainMonthDay } from "../src/temporal-plain-month-day-parse.js";

function expect(text: string, month: number, day: number, year = 1972): void {
    const result = parseTemporalPlainMonthDay(text);
    if (result === null || result.year !== year || result.month !== month || result.day !== day) {
        throw new Error("parse " + text);
    }
}
for (const text of [
    "02-29",
    "0229",
    "--02-29",
    "--0229",
    "02-29[u-ca=iso8601]",
    "--0229[!u-ca=ISO8601]",
    "02-29[UTC]",
    "02-29[+01:30]",
    "02-29[foo=bar]",
    "02-29[u-ca=iso8601][u-ca=gregory]",
]) {
    expect(text, 2, 29);
}
for (const text of [
    "2024-02-29",
    "20240229",
    "2024-02-29T12:34",
    "2024-02-29t123456.123456789+0130",
    "2024-02-29 12:34:60-01:00[Europe/London][u-ca=iso8601]",
]) {
    expect(text, 2, 29, 2024);
}
expect("-000001-01-01", 1, 1, -1);
expect("+0100001231", 12, 31, 10000);
expect("0000-02-29", 2, 29, 0);
expect("-271821-04-01", 4, 1, -271821);
expect("+275760-09-30", 9, 30, 275760);
expect("+999999-12-31", 12, 31, 999999);
for (const text of [
    "",
    "02",
    "2-29",
    "02-9",
    "00-01",
    "13-01",
    "02-30",
    "04-31",
    "--02",
    "-02-29",
    "---02-29",
    "--2024-02-29",
    "02-29-",
    "2024-0229",
    "202402-29",
    "2023-02-29",
    "02-29T12:00",
    "2024-02-29T24:00",
    "2024-02-29T12:00Z",
    "2024-02-29T12:00z",
    "02-29Z",
    "02-29+01:00",
    "-000000-02-29",
    "02-29[u-ca=gregory]",
    "2024-02-29[u-ca=gregory]",
    "02-29[!foo=bar]",
    "02-29[!u-ca=iso8601][u-ca=iso8601]",
    "02-29[u-ca=iso8601][!u-ca=iso8601]",
    "02-29[UTC][UTC]",
    "02-29[+24:00]",
    "02-29[UTC]x",
    " 02-29",
    "02-29 ",
    "02-29\u0000",
]) {
    if (parseTemporalPlainMonthDay(text) !== null) {
        throw new Error("accepted " + text);
    }
}
console.log("temporal plain month day parse passed");
