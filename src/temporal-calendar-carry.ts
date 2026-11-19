import { isoDateToEpochDay, type ISODateTime } from "./iso-calendar.js";
import type { ISODateTimeDifference } from "./iso-date-time-difference.js";
import { addTemporalDate } from "./temporal-date-arithmetic.js";
import { dateDuration } from "./temporal-calendar-round.js";
import type { DurationFields } from "./temporal-duration.js";
import type { DurationUnit } from "./temporal-duration-balance.js";
import { NANOSECONDS_PER_DAY, timeToNanoseconds } from "./temporal-time.js";

export function carryCalendarDifference(
    origin: ISODateTime,
    difference: ISODateTimeDifference,
    nudged: bigint,
    largest: DurationUnit,
    startUnit: "month" | "day",
    sign: number,
): ISODateTimeDifference | null {
    const units: ("week" | "month" | "year")[] = [];
    if (startUnit === "day") {
        if (largest === "weeks") {
            units.push("week");
        } else if (largest === "months" || largest === "years") {
            units.push("month");
        }
    }
    if (largest === "years") {
        units.push("year");
    }
    const time = timeToNanoseconds(origin);
    if (time === null) {
        return null;
    }
    let result = difference;
    for (const unit of units) {
        const date = result.date;
        const candidate: DurationFields =
            unit === "year"
                ? dateDuration(date.years + sign, 0, 0)
                : unit === "month"
                  ? dateDuration(date.years, date.months + sign, 0)
                  : dateDuration(date.years, date.months, date.weeks + sign);
        const end = addTemporalDate(origin.date, candidate, false, false);
        if (end === null) {
            return null;
        }
        const day = isoDateToEpochDay(end);
        if (day === null) {
            throw new Error("calendar carry epoch invariant");
        }
        const epoch = BigInt(day) * NANOSECONDS_PER_DAY + time;
        if (BigInt(sign) * (nudged - epoch) < 0n) {
            return result;
        }
        result = { date: candidate, time: 0n };
    }
    return result;
}
