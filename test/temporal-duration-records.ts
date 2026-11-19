import {
    isValidDuration,
    durationSign,
    type DurationFields,
} from "../src/temporal/temporal-duration.js";
function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function field(index: number, value: number): DurationFields {
    return {
        years: index === 0 ? value : 0,
        months: index === 1 ? value : 0,
        weeks: index === 2 ? value : 0,
        days: index === 3 ? value : 0,
        hours: index === 4 ? value : 0,
        minutes: index === 5 ? value : 0,
        seconds: index === 6 ? value : 0,
        milliseconds: index === 7 ? value : 0,
        microseconds: index === 8 ? value : 0,
        nanoseconds: index === 9 ? value : 0,
    };
}
function secondsAndNanos(seconds: number, nanoseconds: number): DurationFields {
    return {
        years: 0,
        months: 0,
        weeks: 0,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds,
        milliseconds: 0,
        microseconds: 0,
        nanoseconds,
    };
}
check(
    isValidDuration(field(0, 0)) && Object.is(durationSign(field(0, -0)), 0),
    "blank and positive zero sign",
);
for (let i = 0; i < 10; i++) {
    for (const value of [1, -1, 123, -123]) {
        check(
            isValidDuration(field(i, value)) &&
                durationSign(field(i, value)) === (value < 0 ? -1 : 1),
            "signed field " + i,
        );
    }
    for (const value of [0.5, -0.5, NaN, Infinity, -Infinity, 1e300, -1e300]) {
        check(!isValidDuration(field(i, value)), "invalid field " + i);
    }
}
for (let i = 0; i < 3; i++) {
    for (const sign of [1, -1]) {
        check(isValidDuration(field(i, sign * 4294967295)), "calendar unit below bound");
        check(!isValidDuration(field(i, sign * 4294967296)), "calendar unit at bound");
    }
}
check(
    !isValidDuration({
        years: 1,
        months: -1,
        weeks: 0,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        milliseconds: 0,
        microseconds: 0,
        nanoseconds: 0,
    }),
    "mixed calendar signs",
);
check(
    !isValidDuration({
        years: 0,
        months: 0,
        weeks: 0,
        days: 1,
        hours: -24,
        minutes: 0,
        seconds: 0,
        milliseconds: 0,
        microseconds: 0,
        nanoseconds: 0,
    }),
    "cancelling fields still invalid",
);
check(
    !isValidDuration(secondsAndNanos(1, -1)) && !isValidDuration(secondsAndNanos(-1, 1)),
    "mixed subsecond signs",
);
for (const sign of [1, -1]) {
    check(
        isValidDuration(secondsAndNanos(sign * 9007199254740991, sign * 999999999)),
        "one nanosecond below bound",
    );
    check(
        !isValidDuration(secondsAndNanos(sign * 9007199254740991, sign * 1000000000)),
        "exact bound from separate fields",
    );
    check(
        !isValidDuration(secondsAndNanos(sign * 9007199254740991, sign * 1000000001)),
        "one nanosecond past bound",
    );
    check(isValidDuration(field(6, sign * 9007199254740991)), "seconds below bound");
    check(!isValidDuration(field(6, sign * 9007199254740992)), "seconds at bound");
    check(
        isValidDuration(field(7, sign * (9007199254740992000 - 1024))),
        "unsafe milliseconds below bound",
    );
    check(!isValidDuration(field(7, sign * 9007199254740992000)), "milliseconds at bound");
    check(
        isValidDuration(field(8, sign * (9007199254740992000000 - 1048576))),
        "unsafe microseconds below bound",
    );
    check(!isValidDuration(field(8, sign * 9007199254740992000000)), "microseconds at bound");
    check(
        isValidDuration(field(9, sign * (9007199254740992000000000 - 1073741824))),
        "unsafe nanoseconds below bound",
    );
    check(!isValidDuration(field(9, sign * 9007199254740992000000000)), "nanoseconds at bound");
}
const limit = 9007199254740992000000000n;
const units: bigint[] = [86400000000000n, 3600000000000n, 60000000000n];
let index = 3;
for (const unit of units) {
    const last = Number((limit - 1n) / unit);
    check(
        isValidDuration(field(index, last)) && !isValidDuration(field(index, last + 1)),
        "whole-unit threshold " + index,
    );
    index++;
}
check(
    isValidDuration({
        years: 4294967295,
        months: 4294967295,
        weeks: 4294967295,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 9007199254740991,
        milliseconds: 999,
        microseconds: 999,
        nanoseconds: 999,
    }),
    "calendar fields do not enter time bound",
);
console.log("temporal duration records passed");
