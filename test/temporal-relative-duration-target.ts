import { relativeDurationTarget } from "../src/temporal-relative-duration-target.js";
import type { DurationFields } from "../src/temporal-duration.js";
function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
const zero: DurationFields = {
    years: 0,
    months: 0,
    weeks: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    milliseconds: 0,
    microseconds: 0,
    nanoseconds: 0,
};
const january = { year: 2020, month: 1, day: 31 };
const negative = relativeDurationTarget({ ...zero, nanoseconds: -1 }, january);
check(
    negative !== null &&
        negative.destination.date.day === 30 &&
        negative.destination.hour === 23 &&
        negative.destination.minute === 59 &&
        negative.destination.nanosecond === 999,
    "negative midnight carry",
);
const leap = relativeDurationTarget({ ...zero, months: 1, hours: 25 }, january);
check(
    leap !== null &&
        leap.destination.date.month === 3 &&
        leap.destination.date.day === 1 &&
        leap.destination.hour === 1,
    "calendar then time days",
);
const minimum = { year: -271821, month: 4, day: 19 },
    maximum = { year: 275760, month: 9, day: 13 };
const atMinimum = relativeDurationTarget(zero, minimum);
check(
    atMinimum !== null &&
        atMinimum.origin.date.day === 19 &&
        atMinimum.origin.hour === 0 &&
        atMinimum.destination.hour === 0,
    "minimum midnight retained for equality shortcut",
);
check(
    relativeDurationTarget({ ...zero, nanoseconds: -1 }, minimum) === null,
    "target before minimum date",
);
const atMaximum = relativeDurationTarget({ ...zero, hours: 23 }, maximum);
check(atMaximum !== null && atMaximum.destination.hour === 23, "maximum date with time");
check(
    relativeDurationTarget({ ...zero, hours: 24 }, maximum) === null,
    "target after maximum date",
);
check(
    relativeDurationTarget({ ...zero, months: 1, days: -1 }, january) === null,
    "mixed sign invalid",
);
console.log("temporal relative duration target passed");
