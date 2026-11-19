import { roundDateTimeDifference } from "../src/temporal-relative-date-time-round.js";
import { parseTemporalPlainDateTime } from "../src/temporal-plain-date-time-parse.js";
import { balanceDurationTime, type DurationUnit } from "../src/temporal-duration-balance.js";
import { formatTemporalDuration } from "../src/temporal-duration-format.js";
import type { TemporalRoundingMode } from "../src/temporal-rounding.js";

function parse(text: string) {
    const value = parseTemporalPlainDateTime(text);
    if (value === null) {
        throw new Error("parse " + text);
    }
    return value;
}
function expect(
    start: string,
    end: string,
    largest: DurationUnit,
    smallest: DurationUnit,
    increment: number,
    mode: TemporalRoundingMode,
    expected: string | null,
): void {
    const result = roundDateTimeDifference(
        parse(start),
        parse(end),
        largest,
        smallest,
        increment,
        mode,
    );
    let actual: string | null = null;
    if (result !== null) {
        const duration = balanceDurationTime(result.time, result.date, largest);
        if (duration === null) {
            throw new Error("invalid balanced duration");
        }
        actual = formatTemporalDuration(duration);
    }
    if (actual !== expected) {
        throw new Error(
            start +
                " / " +
                end +
                " " +
                largest +
                "/" +
                smallest +
                "/" +
                mode +
                ": " +
                actual +
                " expected " +
                expected,
        );
    }
}
expect("2023-01-31T12:00", "2023-02-28T12:00", "months", "nanoseconds", 1, "ceil", "P28D");
expect("2023-01-31T12:00", "2023-02-28T12:00", "months", "days", 1, "ceil", "P28D");
expect("2023-01-31T12:00", "2023-02-28T12:00", "months", "days", 10, "ceil", "P1M");
expect("2023-01-31T12:00", "2023-02-28T12:00", "months", "days", 10, "trunc", "P20D");
expect("2023-02-28T12:00", "2023-01-31T12:00", "months", "days", 10, "floor", "-P30D");
expect("2024-01-01T12:00", "2024-02-01T11:59:59.9995", "months", "seconds", 1, "halfExpand", "P1M");
expect(
    "2024-01-01T12:00",
    "2024-01-31T23:59:59.9995",
    "months",
    "seconds",
    1,
    "halfExpand",
    "P30DT12H",
);
expect("2023-01-01T12:00", "2023-12-31T12:00", "years", "months", 1, "ceil", "P1Y");
expect("2024-01-01T12:00", "2023-01-02T12:00", "years", "months", 1, "floor", "-P1Y");
expect("2024-01-01T12:00", "2024-01-07T12:00", "weeks", "days", 10, "ceil", "P1W");
expect("2024-01-01T12:00", "2024-01-11T12:00", "months", "weeks", 1, "ceil", "P2W");
expect(
    "2024-01-01T12:00",
    "2024-01-17T00:00:00.000000001",
    "months",
    "months",
    1,
    "halfEven",
    "P1M",
);
expect(
    "2024-01-01T12:00",
    "2024-01-16T23:59:59.999999999",
    "months",
    "months",
    1,
    "halfEven",
    "PT0S",
);
expect(
    "1969-12-31T23:59:59.999999999",
    "1970-01-01",
    "days",
    "nanoseconds",
    1,
    "trunc",
    "PT0.000000001S",
);
expect("2024-01-01", "2024-01-03T01:00", "hours", "minutes", 15, "trunc", "PT49H");
const modes: TemporalRoundingMode[] = [
    "ceil",
    "floor",
    "expand",
    "trunc",
    "halfCeil",
    "halfFloor",
    "halfExpand",
    "halfTrunc",
    "halfEven",
];
const positive = [2, 1, 2, 1, 2, 1, 2, 1, 2],
    negative = [1, 2, 2, 1, 1, 2, 2, 1, 2];
for (let i = 0; i < modes.length; i++) {
    expect(
        "2024-01-01",
        "2024-01-01T01:30",
        "hours",
        "hours",
        1,
        modes[i],
        "PT" + positive[i] + "H",
    );
    expect(
        "2024-01-01T01:30",
        "2024-01-01",
        "hours",
        "hours",
        1,
        modes[i],
        "-PT" + negative[i] + "H",
    );
}
expect("-271821-05-19", "-271821-04-19T00:00:00.000000001", "months", "months", 1, "floor", "-P1M");
expect(
    "+275760-09-13T23:59:59",
    "+275760-09-13T23:59:59.999999999",
    "seconds",
    "seconds",
    1,
    "ceil",
    "PT1S",
);
expect(
    "-271821-04-19T00:00:00.000000001",
    "-271821-04-19T00:00:00.000000002",
    "months",
    "nanoseconds",
    1,
    "trunc",
    "PT0.000000001S",
);
expect("+275760-09-12", "+275760-09-13", "months", "months", 1, "trunc", null);
expect(
    "+275760-09-13T23:59:59.999999999",
    "+275760-09-13T23:59:59.999999999",
    "years",
    "years",
    1000000000,
    "ceil",
    "PT0S",
);
expect("2024-01-01", "2024-01-02", "days", "days", 1000000000, "ceil", "P1000000000D");
expect("2024-01-01", "2024-01-02", "days", "days", 0, "trunc", null);
console.log("temporal relative date time round passed");
