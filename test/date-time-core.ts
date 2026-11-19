import {
    dateTimeClip,
    dateTimeFields,
    dateMakeTime,
    dateMakeDate,
    dateMakeFullYear,
} from "../src/date-time.js";
function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
for (const value of [NaN, Infinity, -Infinity, 8640000000000001, -8640000000000001]) {
    check(Number.isNaN(dateTimeClip(value)), "invalid clip");
}
for (const value of [0, -0, 0.9, -0.9]) {
    check(1 / dateTimeClip(value) === Infinity, "clip positive zero");
}
check(dateTimeClip(1.9) === 1 && dateTimeClip(-1.9) === -1, "clip truncation");
for (const value of [-8640000000000000, 8640000000000000]) {
    check(dateTimeClip(value) === value, "inclusive endpoints");
}
const epoch = dateTimeFields(0),
    negative = dateTimeFields(-1),
    leap = dateTimeFields(951782400123);
check(
    epoch !== null &&
        epoch.year === 1970 &&
        epoch.month === 0 &&
        epoch.day === 1 &&
        epoch.weekday === 4 &&
        epoch.hour === 0,
    "epoch fields",
);
check(
    negative !== null &&
        negative.year === 1969 &&
        negative.month === 11 &&
        negative.day === 31 &&
        negative.weekday === 3 &&
        negative.hour === 23 &&
        negative.minute === 59 &&
        negative.second === 59 &&
        negative.millisecond === 999,
    "negative millisecond fields",
);
check(
    leap !== null &&
        leap.year === 2000 &&
        leap.month === 1 &&
        leap.day === 29 &&
        leap.millisecond === 123,
    "leap day fields",
);
const minimum = dateTimeFields(-8640000000000000),
    maximum = dateTimeFields(8640000000000000);
check(
    minimum !== null &&
        minimum.year === -271821 &&
        minimum.month === 3 &&
        minimum.day === 20 &&
        minimum.hour === 0,
    "minimum Date endpoint",
);
check(
    maximum !== null &&
        maximum.year === 275760 &&
        maximum.month === 8 &&
        maximum.day === 13 &&
        maximum.hour === 0,
    "maximum Date endpoint",
);
for (const value of [NaN, Infinity, -Infinity, 0.5, 8640000000000001]) {
    check(dateTimeFields(value) === null, "invalid fields");
}
check(dateMakeTime(1.9, 2.9, 3.9, 4.9) === 3723004, "truncate time fields independently");
check(dateMakeTime(-1.9, -2.9, -3.9, -4.9) === -3723004, "negative time truncation");
check(dateMakeTime(25, 0, 0, 0) === 90000000, "unbalanced time retained");
check(
    Number.isNaN(dateMakeTime(Infinity, 0, 0, 0)) && Number.isNaN(dateMakeTime(0, NaN, 0, 0)),
    "invalid time",
);
check(dateMakeDate(-1, 86399999) === -1, "day/time composition");
check(
    Number.isNaN(dateMakeDate(Infinity, 0)) && Number.isNaN(dateMakeDate(1e308, 0)),
    "nonfinite date composition",
);
check(
    dateMakeFullYear(0) === 1900 &&
        dateMakeFullYear(-0.9) === 1900 &&
        dateMakeFullYear(99.9) === 1999 &&
        dateMakeFullYear(100) === 100 &&
        dateMakeFullYear(-1.9) === -1,
    "full year mapping",
);
check(
    Number.isNaN(dateMakeFullYear(NaN)) && Number.isNaN(dateMakeFullYear(Infinity)),
    "invalid full year",
);
check(
    dateMakeTime(10000000000, -600000000000, 0, 1) === 1,
    "floating-point cancellation precedes milliseconds",
);
check(Number.isNaN(dateMakeTime(1e308, -1e308, 0, 0)), "intermediate overflow is preserved");
console.log("date time core passed");
