import { isoDateToEpochDay, type ISODate } from "./iso-calendar.js";
import { differenceISODate, type DateDifferenceUnit } from "./iso-calendar-difference.js";
import { combineISODateTime } from "./iso-date-time.js";
import { carryCalendarDifference } from "./temporal-calendar-carry.js";
import { durationUnit } from "./temporal-duration-balance.js";
import { NANOSECONDS_PER_DAY } from "./temporal-time.js";
import { dateDuration, roundCalendarDateDifference } from "./temporal-calendar-round.js";
import { roundTemporalInteger, type TemporalRoundingMode } from "./temporal-rounding.js";
import type { DurationFields } from "./temporal-duration.js";

export function roundDateDifference(origin: ISODate, destination: ISODate, largest: DateDifferenceUnit, smallest: DateDifferenceUnit, increment: number, mode: TemporalRoundingMode): DurationFields | null {
    const difference = differenceISODate(origin, destination, largest);
    if (difference === null || !Number.isInteger(increment) || increment < 1 || increment > 1000000000) return null;
    let duration: DurationFields = difference;
    const first = isoDateToEpochDay(origin), last = isoDateToEpochDay(destination);
    if (first === null || last === null) throw new Error("date rounding range invariant");
    if (first === last || (smallest === "day" && increment === 1)) return duration;
    const sign = last < first ? -1 : 1;
    let expanded: boolean, nudged: number;
    if (smallest === "day") {
        const days = Number(roundTemporalInteger(BigInt(duration.days), BigInt(increment), mode));
        const delta = days - duration.days;
        expanded = Math.sign(delta) === Math.sign(duration.days);
        nudged = last + delta;
        duration = dateDuration(duration.years, duration.months, duration.weeks, days);
    } else {
        const result = roundCalendarDateDifference(origin, destination, duration, smallest, increment, mode);
        if (result === null) return null;
        duration = result.duration;
        expanded = result.expanded;
        nudged = result.epochDay;
    }
    if (!expanded || smallest === "year" || smallest === "week") return duration;
    const midnight = combineISODateTime(origin, { hour: 0, minute: 0, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 });
    const carried = carryCalendarDifference(midnight, { date: duration, time: 0n }, BigInt(nudged) * NANOSECONDS_PER_DAY,
        durationUnit(largest), smallest === "month" ? "month" : "day", sign);
    return carried === null ? null : carried.date;
}
