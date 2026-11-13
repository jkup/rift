import { dateTimeZoneOffsetMilliseconds, dateLocalTime, dateLocalFields, dateEpochFromLocalTime } from "../src/date-time-zone.js";
import { DATE_TIME_LIMIT, DATE_MILLISECONDS_PER_DAY, dateTimeClip, dateTimeFields, dateMakeTime, dateMakeDate } from "../src/date-time.js";
import { dateMakeDay } from "../src/date-calendar.js";
import { parseTemporalTimeZone, type TemporalTimeZone } from "../src/temporal-time-zone-parse.js";

function check(value: boolean, message: string): void { if (!value) throw new Error(message); }
function zone(name: string): TemporalTimeZone {
    const value = parseTemporalTimeZone(name);
    if (value === null) throw new Error("test zone: " + name);
    return value;
}
function local(year: number, month: number, day: number, hour = 0, minute = 0, second = 0, millisecond = 0): number {
    return dateMakeDate(dateMakeDay(year, month - 1, day), dateMakeTime(hour, minute, second, millisecond));
}
type Case = { name: string; time: number; expected: number };
const cases: Case[] = [
    { name: "UTC", time: 0, expected: 0 },
    { name: "America/New_York", time: local(2024, 3, 10, 2, 30), expected: 1710055800000 },
    { name: "America/New_York", time: local(2024, 11, 3, 1, 30), expected: 1730611800000 },
    { name: "Australia/Lord_Howe", time: local(2024, 10, 6, 2, 15), expected: 1728143100000 },
    { name: "Australia/Lord_Howe", time: local(2024, 4, 7, 1, 45), expected: 1712414700000 },
    { name: "Pacific/Apia", time: local(2011, 12, 30, 12), expected: 1325282400000 },
    { name: "Asia/Kathmandu", time: local(1986, 1, 1, 0, 10), expected: 504902400000 },
    { name: "Europe/Paris", time: local(1900, 1, 1), expected: -2208989361000 },
    { name: "Europe/London", time: 0, expected: -3600000 },
    { name: "Europe/London", time: local(275760, 9, 13, 1), expected: DATE_TIME_LIMIT },
    { name: "Europe/London", time: local(275760, 9, 13, 1, 0, 0, 1), expected: NaN },
    { name: "America/New_York", time: local(-271821, 4, 19, 19, 3, 58), expected: -DATE_TIME_LIMIT },
    { name: "America/New_York", time: local(-271821, 4, 19, 19, 3, 57, 999), expected: NaN },
    { name: "Europe/Paris", time: local(-271821, 4, 20, 0, 9, 21), expected: -DATE_TIME_LIMIT },
];
for (const item of cases) {
    const result = dateEpochFromLocalTime(item.time, zone(item.name));
    check(Object.is(result, item.expected), item.name + " local conversion " + item.time);
}
const utc = zone("UTC"), newYork = zone("America/New_York"), london = zone("Europe/London"), paris = zone("Europe/Paris");
check(dateTimeZoneOffsetMilliseconds(-2208988800000, paris) === 561000, "historical seconds");
check(-dateTimeZoneOffsetMilliseconds(-2208988800000, paris) / 60000 === -9.35, "fractional offset minutes");
check(dateTimeZoneOffsetMilliseconds(-1, london) === 3600000, "negative epoch offset");
const last = dateLocalFields(DATE_TIME_LIMIT, london), first = dateLocalFields(-DATE_TIME_LIMIT, newYork);
check(last !== null && last.year === 275760 && last.month === 8 && last.day === 13 && last.hour === 1 && last.weekday === 6, "upper local fields");
check(first !== null && first.year === -271821 && first.month === 3 && first.day === 19 && first.hour === 19 && first.minute === 3 && first.second === 58 && first.weekday === 1, "lower local fields");
check(dateLocalTime(DATE_TIME_LIMIT, london) === DATE_TIME_LIMIT + 3600000, "local upper margin");
check(dateTimeFields(DATE_TIME_LIMIT + 3600000) === null && Number.isNaN(dateTimeClip(DATE_TIME_LIMIT + 3600000)), "UTC guards unchanged");
const beforeEpoch = dateLocalFields(-1, utc);
check(beforeEpoch !== null && beforeEpoch.year === 1969 && beforeEpoch.month === 11 && beforeEpoch.day === 31 && beforeEpoch.hour === 23 && beforeEpoch.minute === 59 && beforeEpoch.second === 59 && beforeEpoch.millisecond === 999, "negative millisecond fields");
check(dateLocalTime(1710055800000, newYork) === local(2024, 3, 10, 3, 30), "gap shifts forward");
check(dateEpochFromLocalTime(dateLocalTime(1730615400000, newYork), newYork) === 1730611800000, "overlap selects earlier instant");
for (const time of [NaN, Infinity, -Infinity, 0.5, -0.5, DATE_TIME_LIMIT + 1, -DATE_TIME_LIMIT - 1]) {
    check(Number.isNaN(dateTimeZoneOffsetMilliseconds(time, utc)), "invalid instant offset");
    check(Number.isNaN(dateLocalTime(time, utc)) && dateLocalFields(time, utc) === null, "invalid local fields");
}
for (const time of [NaN, Infinity, -Infinity, 0.5, -0.5, DATE_TIME_LIMIT + DATE_MILLISECONDS_PER_DAY + 1, -DATE_TIME_LIMIT - DATE_MILLISECONDS_PER_DAY - 1])
    check(Number.isNaN(dateEpochFromLocalTime(time, newYork)), "invalid local time");
for (const name of ["+05:30", "-03:30", "+23:59", "-23:59"]) {
    const fixed = zone(name), offset = dateTimeZoneOffsetMilliseconds(0, fixed);
    for (const time of [-DATE_TIME_LIMIT, -1, 0, DATE_TIME_LIMIT]) {
        check(dateLocalTime(time, fixed) === time + offset, "fixed offset fields");
        check(dateEpochFromLocalTime(time + offset, fixed) === time, "fixed offset round trip");
    }
}
check(Object.is(dateEpochFromLocalTime(-0, utc), 0) && Object.is(dateTimeZoneOffsetMilliseconds(-0, utc), 0), "positive zero");
console.log("date local time passed");
