import { parseTemporalPlainDateTime } from "../src/temporal-plain-date-time-parse.js";
import { parseTemporalPlainDate } from "../src/temporal-plain-date-parse.js";
import { formatISODateTime } from "../src/temporal-time-format.js";
import { isoDateTimeWithinLimits } from "../src/iso-date-time.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
const inputs = [
    "2024-02-29",
    "20240229",
    "2024-02-29T12",
    "20240229t1234",
    "2024-02-29 12:34:56",
    "2024-02-29T12:34:56.123456789",
    "20240229T123456,000000001",
    "2024-02-29T12:34:60.5",
    "2024-02-29T12:34+23:59:59.999999999",
    "2024-02-29T12:34-0130",
    "2024-02-29T12:34[!Not/A_Zone][u-ca=ISO8601]",
    "2024-02-29[+01:30][u-ca=iso8601]",
    "2024-02-29T12:34[u-ca=iso8601][u-ca=gregory]",
    "2024-02-29[foo=bar]",
    "-000001-01-01T00:00:00",
    "+0100000101T0000",
    "+000000-01-01",
    "0000-02-29",
];
const expected = [
    "2024-02-29T00:00:00",
    "2024-02-29T00:00:00",
    "2024-02-29T12:00:00",
    "2024-02-29T12:34:00",
    "2024-02-29T12:34:56",
    "2024-02-29T12:34:56.123456789",
    "2024-02-29T12:34:56.000000001",
    "2024-02-29T12:34:59.5",
    "2024-02-29T12:34:00",
    "2024-02-29T12:34:00",
    "2024-02-29T12:34:00",
    "2024-02-29T00:00:00",
    "2024-02-29T12:34:00",
    "2024-02-29T00:00:00",
    "-000001-01-01T00:00:00",
    "+010000-01-01T00:00:00",
    "0000-01-01T00:00:00",
    "0000-02-29T00:00:00",
];
for (let i = 0; i < inputs.length; i++) {
    const parsed = parseTemporalPlainDateTime(inputs[i]);
    check(parsed !== null && formatISODateTime(parsed, "auto") === expected[i], inputs[i]);
    const date = parseTemporalPlainDate(inputs[i]);
    check(
        parsed !== null &&
            date !== null &&
            date.year === parsed.date.year &&
            date.month === parsed.date.month &&
            date.day === parsed.date.day,
        "shared date " + inputs[i],
    );
}
for (const text of [
    "",
    "2024",
    "2024-02",
    "02-29",
    "T12:34",
    "2023-02-29",
    "2024-02-30",
    "2024-00-01",
    "2024-01-00",
    "-000000-01-01",
    "−000001-01-01",
    "2024-0229",
    "202402-29",
    "2024-02-29T",
    "2024-02-29Z",
    "2024-02-29T12:34Z",
    "2024-02-29T12:34z",
    "2024-02-29T24:00",
    "2024-02-29T12:60",
    "2024-02-29T12:34:61",
    "2024-02-29T12:3456",
    "2024-02-29T1234:56",
    "2024-02-29T12.5",
    "2024-02-29T12:34.5",
    "2024-02-29T12:34:56.",
    "2024-02-29T12:34:56.1234567890",
    "2024-02-29T12:34+24:00",
    "2024-02-29T12:34+01:60",
    "2024-02-29T12:34+01:00:60",
    "2024-02-29+01:00",
    "2024-02-29[u-ca=gregory]",
    "2024-02-29[u-ca=gregory][u-ca=iso8601]",
    "2024-02-29[!foo=bar]",
    "2024-02-29[u-ca=iso8601][!u-ca=iso8601]",
    "2024-02-29[!u-ca=iso8601][u-ca=iso8601]",
    "2024-02-29[foo=bar][UTC]",
    "2024-02-29[UTC][UTC]",
    "2024-02-29[]",
    "2024-02-29 ",
    " 2024-02-29",
    "2024-02-29\u0000",
]) {
    check(
        parseTemporalPlainDateTime(text) === null && parseTemporalPlainDate(text) === null,
        "invalid " + text,
    );
}
for (const text of ["-271821-04-19T00:00:00.000000001", "+275760-09-13T23:59:59.999999999"]) {
    const value = parseTemporalPlainDateTime(text);
    check(value !== null && isoDateTimeWithinLimits(value), "valid endpoint " + text);
}
for (const text of ["-271821-04-19", "+275760-09-14", "+999999-12-31", "-999999-01-01"]) {
    const value = parseTemporalPlainDateTime(text);
    check(value !== null && !isoDateTimeWithinLimits(value), "range deferred " + text);
}
console.log("temporal plain date time parse passed");
