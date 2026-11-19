import { isoDateTimeToEpochNanoseconds, type ISODateTime } from "./iso-calendar.js";
import { differenceISODateTime, type ISODateTimeDifference } from "./iso-date-time-difference.js";
import { roundCalendarDateTimeDifference } from "./temporal-calendar-date-time-round.js";
import { roundDayTimeDifference } from "./temporal-day-time-round.js";
import { carryCalendarDifference } from "./temporal-calendar-carry.js";
import type { DurationUnit } from "./temporal-duration-balance.js";
import type { TemporalRoundingMode } from "./temporal-rounding.js";

export function roundDateTimeDifference(
    origin: ISODateTime,
    destination: ISODateTime,
    largest: DurationUnit,
    smallest: DurationUnit,
    increment: number,
    mode: TemporalRoundingMode,
): ISODateTimeDifference | null {
    const difference = differenceISODateTime(origin, destination, largest);
    if (
        difference === null ||
        !Number.isInteger(increment) ||
        increment < 1 ||
        increment > 1000000000
    ) {
        return null;
    }
    const first = isoDateTimeToEpochNanoseconds(origin),
        last = isoDateTimeToEpochNanoseconds(destination);
    if (first === null || last === null) {
        throw new Error("relative date-time range invariant");
    }
    if (first === last || (smallest === "nanoseconds" && increment === 1)) {
        return difference;
    }
    let duration: ISODateTimeDifference, nudged: bigint, expanded: boolean;
    if (smallest === "years" || smallest === "months" || smallest === "weeks") {
        const unit = smallest === "years" ? "year" : smallest === "months" ? "month" : "week";
        const rounded = roundCalendarDateTimeDifference(
            origin,
            destination,
            difference,
            unit,
            increment,
            mode,
        );
        if (rounded === null) {
            return null;
        }
        duration = { date: rounded.date, time: 0n };
        nudged = rounded.epochNanoseconds;
        expanded = rounded.expanded;
    } else {
        const rounded = roundDayTimeDifference(
            difference,
            last,
            largest,
            smallest,
            increment,
            mode,
        );
        if (rounded === null) {
            return null;
        }
        duration = rounded.duration;
        nudged = rounded.epochNanoseconds;
        expanded = rounded.expanded;
    }
    if (!expanded || smallest === "years" || smallest === "weeks") {
        return duration;
    }
    return carryCalendarDifference(
        origin,
        duration,
        nudged,
        largest,
        smallest === "months" ? "month" : "day",
        last < first ? -1 : 1,
    );
}
