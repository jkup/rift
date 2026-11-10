import { isoDateToEpochDay, type ISODate } from "./iso-calendar.js";
import { differenceISODate, type DateDifferenceUnit } from "./iso-calendar-difference.js";
import { addTemporalDate } from "./temporal-date-arithmetic.js";
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
    const units: ("week" | "month" | "year")[] = [];
    if (smallest === "day") {
        if (largest === "week") units.push("week");
        else if (largest === "month" || largest === "year") units.push("month");
    }
    if (largest === "year") units.push("year");
    for (const unit of units) {
        const candidate: DurationFields = unit === "year" ? dateDuration(duration.years + sign, 0, 0) :
            unit === "month" ? dateDuration(duration.years, duration.months + sign, 0) :
                dateDuration(duration.years, duration.months, duration.weeks + sign);
        const end = addTemporalDate(origin, candidate, false, false);
        if (end === null) return null;
        const day = isoDateToEpochDay(end);
        if (day === null) throw new Error("date carry epoch invariant");
        if (sign * (nudged - day) < 0) return duration;
        duration = candidate;
    }
    return duration;
}
