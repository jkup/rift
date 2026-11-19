import {
    isValidTime,
    timeToNanoseconds,
    timeFromNanoseconds,
    NANOSECONDS_PER_DAY,
    type TimeFields,
} from "../src/temporal-time.js";
import { utcDateTimeFromEpochNanoseconds, epochNanosecondsFromUTC } from "../src/iso-calendar.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
const zero: TimeFields = {
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
    microsecond: 0,
    nanosecond: 0,
};
check(timeToNanoseconds(zero) === 0n, "midnight");
const end = {
    hour: 23,
    minute: 59,
    second: 59,
    millisecond: 999,
    microsecond: 999,
    nanosecond: 999,
};
check(timeToNanoseconds(end) === 86399999999999n, "last nanosecond");
check(
    timeToNanoseconds({
        hour: 1,
        minute: 2,
        second: 3,
        millisecond: 4,
        microsecond: 5,
        nanosecond: 6,
    }) === 3723004005006n,
    "independent field weights",
);
for (let minute = 0; minute < 1440; minute++) {
    const expected = BigInt(minute) * 60000000000n + 59123456789n;
    const time = timeFromNanoseconds(expected);
    if (time === null) {
        throw new Error("within-day conversion");
    }
    check(
        time.hour === Math.floor(minute / 60) &&
            time.minute === minute % 60 &&
            time.second === 59 &&
            time.millisecond === 123 &&
            time.microsecond === 456 &&
            time.nanosecond === 789,
        "fields at minute " + minute,
    );
    check(timeToNanoseconds(time) === expected, "round trip at minute " + minute);
}
for (const ns of [
    0n,
    1n,
    999n,
    1000n,
    999999n,
    1000000n,
    999999999n,
    1000000000n,
    NANOSECONDS_PER_DAY - 1n,
]) {
    const time = timeFromNanoseconds(ns);
    if (time === null) {
        throw new Error("fraction conversion");
    }
    check(timeToNanoseconds(time) === ns, "fraction round trip");
}
for (const ns of [
    -1n,
    NANOSECONDS_PER_DAY,
    NANOSECONDS_PER_DAY + 1n,
    100000000000000000000000000000n,
]) {
    check(timeFromNanoseconds(ns) === null, "outside day");
}
const names: (keyof TimeFields)[] = [
    "hour",
    "minute",
    "second",
    "millisecond",
    "microsecond",
    "nanosecond",
];
for (let i = 0; i < names.length; i++) {
    const name = names[i],
        limit = i === 0 ? 24 : i < 3 ? 60 : 1000;
    for (const value of [-1, limit, NaN, Infinity, 0.5]) {
        const time = {
            hour: i === 0 ? value : 0,
            minute: i === 1 ? value : 0,
            second: i === 2 ? value : 0,
            millisecond: i === 3 ? value : 0,
            microsecond: i === 4 ? value : 0,
            nanosecond: i === 5 ? value : 0,
        };
        check(!isValidTime(time) && timeToNanoseconds(time) === null, "invalid " + name);
    }
}
const midnight = timeFromNanoseconds(0n);
check(
    midnight !== null && 1 / midnight.hour === Infinity && 1 / midnight.nanosecond === Infinity,
    "positive zeros",
);
for (const ns of [
    -8640000000000000000000n,
    -86400000000001n,
    -86400000000000n,
    -1n,
    0n,
    1n,
    8640000000000000000000n,
]) {
    const time = utcDateTimeFromEpochNanoseconds(ns);
    if (time === null) {
        throw new Error("UTC range");
    }
    check(epochNanosecondsFromUTC(time) === ns, "UTC extraction preserves day and fraction");
}
console.log("temporal time passed");
