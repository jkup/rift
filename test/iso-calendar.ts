import {
    epochDayToISODate, isoDateToEpochDay, isoDayOfWeek, isISOLeapYear, isValidISODate,
    epochNanosecondsFromUTC, utcDateTimeFromEpochNanoseconds, MAX_EPOCH_NANOSECONDS,
    type ISODate, type ISODateTime,
} from "../src/iso-calendar.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function sameDate(actual: ISODate | null, expected: ISODate): boolean {
    return actual !== null && actual.year === expected.year && actual.month === expected.month && actual.day === expected.day;
}
const vectors = [
    [1970, 1, 1, 0], [1969, 12, 31, -1], [1972, 3, 1, 790],
    [2000, 1, 1, 10957], [2000, 2, 29, 11016], [1900, 3, 1, -25508],
    [1600, 1, 1, -135140], [0, 1, 1, -719528], [1, 1, 1, -719162], [-1, 1, 1, -719893],
    [-271821, 4, 20, -100000000], [275760, 9, 13, 100000000],
    [-271821, 4, 19, -100000001], [275760, 9, 14, 100000001],
];
for (const row of vectors) {
    const date = { year: row[0], month: row[1], day: row[2] };
    check(isoDateToEpochDay(date) === row[3], "fixed epoch day " + row[3]);
    check(sameDate(epochDayToISODate(row[3]), date), "fixed civil date " + row[3]);
}
for (const year of [-400, 0, 1600, 2000, 2024]) check(isISOLeapYear(year), "leap " + year);
for (const year of [-100, 1, 1700, 1800, 1900, 2100]) check(!isISOLeapYear(year), "common " + year);
check(isoDayOfWeek({ year: 1970, month: 1, day: 1 }) === 4, "epoch Thursday");
check(isoDayOfWeek({ year: 1969, month: 12, day: 28 }) === 7, "negative epoch Sunday");
check(isoDayOfWeek({ year: 2000, month: 1, day: 1 }) === 6, "millennium Saturday");

const commonMonths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
let epoch = -135140;
for (let year = 1600; year < 2000; year++) {
    for (let month = 1; month <= 12; month++) {
        const last = month === 2 && year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : commonMonths[month - 1];
        for (let day = 1; day <= last; day++, epoch++) {
            const date = { year, month, day };
            check(isoDateToEpochDay(date) === epoch && sameDate(epochDayToISODate(epoch), date), "complete Gregorian cycle");
        }
    }
}
check(epoch === 10957, "146097 days per cycle");
for (let day = -100000001; day <= 100000001; day += 9973) {
    const date = epochDayToISODate(day);
    check(date !== null && isoDateToEpochDay(date) === day, "sampled full-range inverse");
}
for (const date of [
    { year: 1900, month: 2, day: 29 }, { year: 2000, month: 2, day: 30 },
    { year: 2000, month: 0, day: 1 }, { year: 2000, month: 13, day: 1 },
    { year: 2000, month: 1, day: 0 }, { year: 2000.5, month: 1, day: 1 },
    { year: Infinity, month: 1, day: 1 }, { year: 2000, month: NaN, day: 1 },
]) check(!isValidISODate(date) && isoDateToEpochDay(date) === null, "invalid date");
for (const day of [NaN, Infinity, -Infinity, 0.5, -100000002, 100000002]) check(epochDayToISODate(day) === null, "invalid epoch day");

const instants = [0n, 1n, -1n, 1000000001n, -1000000001n, -86400000000001n, MAX_EPOCH_NANOSECONDS, -MAX_EPOCH_NANOSECONDS];
for (const value of instants) {
    const time = utcDateTimeFromEpochNanoseconds(value);
    check(time !== null && epochNanosecondsFromUTC(time) === value, "exact nanosecond inverse");
}
const before = utcDateTimeFromEpochNanoseconds(-1n);
check(before !== null && sameDate(before.date, { year: 1969, month: 12, day: 31 }) &&
    before.hour === 23 && before.minute === 59 && before.second === 59 && before.millisecond === 999 &&
    before.microsecond === 999 && before.nanosecond === 999, "floor negative nanoseconds");
const known: ISODateTime = { date: { year: 2001, month: 9, day: 9 }, hour: 1, minute: 46, second: 40,
    millisecond: 123, microsecond: 456, nanosecond: 789 };
check(epochNanosecondsFromUTC(known) === 1000000000123456789n, "known timestamp with exact fraction");
check(utcDateTimeFromEpochNanoseconds(MAX_EPOCH_NANOSECONDS + 1n) === null &&
    utcDateTimeFromEpochNanoseconds(-MAX_EPOCH_NANOSECONDS - 1n) === null, "instant bounds");
const edge: ISODateTime = { date: { year: 275760, month: 9, day: 13 }, hour: 0, minute: 0, second: 0,
    millisecond: 0, microsecond: 0, nanosecond: 1 };
check(epochNanosecondsFromUTC(edge) === null, "upper bound has no positive time");
edge.nanosecond = 0;
check(epochNanosecondsFromUTC(edge) === MAX_EPOCH_NANOSECONDS, "inclusive upper bound");
edge.hour = 24;
check(epochNanosecondsFromUTC(edge) === null, "invalid time fields");
edge.hour = 0; edge.second = 60;
check(epochNanosecondsFromUTC(edge) === null, "leap seconds require parser regulation");
console.log("iso calendar passed");
