import { differenceISODateTime } from "../src/iso-date-time-difference.js";
import { parseTemporalPlainDateTime } from "../src/temporal-plain-date-time-parse.js";
import { isoDateTimeToEpochNanoseconds } from "../src/iso-calendar.js";
import { balanceDurationTime, type DurationUnit } from "../src/temporal-duration-balance.js";
import { addTemporalDateTime } from "../src/temporal-date-time-arithmetic.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function parse(text: string) {
    const result = parseTemporalPlainDateTime(text);
    if (result === null) throw new Error("parse " + text);
    return result;
}
const hour = 3600000000000n;
let result = differenceISODateTime(parse("2024-01-01T23:00"), parse("2024-01-02T01:00"), "days");
check(result !== null && result.date.days === 0 && result.time === 2n * hour, "forward midnight");
result = differenceISODateTime(parse("2024-01-02T01:00"), parse("2024-01-01T23:00"), "days");
check(result !== null && result.date.days === 0 && result.time === -2n * hour, "backward midnight");
result = differenceISODateTime(parse("2024-01-15T12:00"), parse("2024-02-15T11:00"), "months");
check(result !== null && result.date.months === 0 && result.date.days === 30 && result.time === 23n * hour, "borrow before month difference");
result = differenceISODateTime(parse("2024-02-15T11:00"), parse("2024-01-15T12:00"), "months");
check(result !== null && result.date.months === 0 && result.date.days === -30 && result.time === -23n * hour, "negative month borrow");
result = differenceISODateTime(parse("2024-01-15T12:00"), parse("2024-02-15T13:00"), "months");
check(result !== null && result.date.months === 1 && result.date.days === 0 && result.time === hour, "month plus time");
result = differenceISODateTime(parse("2024-01-01"), parse("2024-01-10T01:00"), "weeks");
check(result !== null && result.date.weeks === 1 && result.date.days === 2 && result.time === hour, "week difference");
result = differenceISODateTime(parse("2024-01-01"), parse("2024-01-10T01:00"), "hours");
check(result !== null && result.date.days === 0 && result.time === 217n * hour, "time-only largest unit");
result = differenceISODateTime(parse("1969-12-31T23:59:59.999999999"), parse("1970-01-01"), "days");
check(result !== null && result.date.days === 0 && result.time === 1n, "exact epoch crossing");
const units: DurationUnit[] = ["years", "months", "weeks", "days", "hours", "minutes", "seconds", "milliseconds", "microseconds", "nanoseconds"];
const inputs = ["2024-01-01", "2024-01-15T12:34:56.123456789", "2024-01-31T23:59:59.999999999", "2024-02-01T00:00:00.000000001", "2024-02-15T11:00", "2024-02-29T12:34:56.987654321"];
for (const unit of units) for (const one of inputs) for (const two of inputs) {
    const start = parse(one), end = parse(two), difference = differenceISODateTime(start, end, unit);
    if (difference === null) throw new Error("difference");
    const duration = balanceDurationTime(difference.time, difference.date, unit);
    if (duration === null) throw new Error("duration sign/bounds");
    const rebuilt = addTemporalDateTime(start, duration, false, false);
    check(rebuilt !== null && isoDateTimeToEpochNanoseconds(rebuilt) === isoDateTimeToEpochNanoseconds(end), "reconstruction " + unit + " " + one + " " + two);
}
const minimum = parse("-271821-04-19T00:00:00.000000001"), maximum = parse("+275760-09-13T23:59:59.999999999");
for (const reverse of [false, true]) {
    const start = reverse ? maximum : minimum, end = reverse ? minimum : maximum;
    result = differenceISODateTime(start, end, "nanoseconds");
    const first = isoDateTimeToEpochNanoseconds(start), last = isoDateTimeToEpochNanoseconds(end);
    check(result !== null && first !== null && last !== null && result.date.days === 0 && result.time === last - first, "full exact range");
}
check(differenceISODateTime(parse("-271821-04-19"), minimum, "days") === null, "strict lower bound");
check(differenceISODateTime(maximum, parse("+275760-09-14"), "days") === null, "strict upper bound");
console.log("iso date time difference passed");
