import { parseTemporalPlainYearMonth } from "../src/temporal/temporal-plain-year-month-parse.js";

function expect(text: string, year: number, month: number, day = 1): void {
    const result = parseTemporalPlainYearMonth(text);
    if (result === null || result.year !== year || result.month !== month || result.day !== day) {
        throw new Error("parse " + text);
    }
}
for (const text of [
    "2024-02",
    "202402",
    "2024-02[u-ca=iso8601]",
    "202402[!u-ca=ISO8601]",
    "2024-02[UTC]",
    "2024-02[+01:30]",
    "2024-02[foo=bar]",
    "2024-02[u-ca=iso8601][u-ca=gregory]",
]) {
    expect(text, 2024, 2);
}
for (const text of [
    "2024-02-29",
    "20240229",
    "2024-02-29T12:34",
    "2024-02-29t123456.123456789+0130",
    "2024-02-29 12:34:60-01:00[Europe/London][u-ca=iso8601]",
]) {
    expect(text, 2024, 2, 29);
}
expect("-000001-01", -1, 1);
expect("+01000012", 10000, 12);
expect("0000-01", 0, 1);
expect("-271821-04-01", -271821, 4);
expect("+275760-09-30", 275760, 9, 30);
expect("+999999-12", 999999, 12);
for (const text of [
    "",
    "2024",
    "24-02",
    "2024-2",
    "2024-00",
    "2024-13",
    "2024-02-",
    "2024-0229",
    "202402-29",
    "2023-02-29",
    "2024-02-30",
    "2024-02T12:00",
    "2024-02-29T24:00",
    "2024-02-29T12:00Z",
    "2024-02-29T12:00z",
    "2024-02Z",
    "2024-02+01:00",
    "-000000-01",
    "+0000-01",
    "2024-02[u-ca=gregory]",
    "2024-02-29[u-ca=gregory]",
    "2024-02[!foo=bar]",
    "2024-02[!u-ca=iso8601][u-ca=iso8601]",
    "2024-02[u-ca=iso8601][!u-ca=iso8601]",
    "2024-02[UTC][UTC]",
    "2024-02[+24:00]",
    "2024-02[UTC]x",
    " 2024-02",
    "2024-02 ",
    "2024-02\u0000",
]) {
    if (parseTemporalPlainYearMonth(text) !== null) {
        throw new Error("accepted " + text);
    }
}
console.log("temporal plain year month parse passed");
