import { isValidEpochNanoseconds } from "./iso-calendar.js";
import { differenceTemporalZonedDateTime } from "./temporal-zoned-difference.js";
import { roundZonedCalendarDifference, type ZonedDurationNudge } from "./temporal-zoned-calendar-round.js";
import { roundZonedTimeDifference } from "./temporal-zoned-time-round.js";
import { carryZonedCalendarDifference } from "./temporal-zoned-calendar-carry.js";
import { dateDuration } from "./temporal-calendar-round.js";
import { temporalUnitNanoseconds } from "./temporal-time.js";
import { roundTemporalInteger, type TemporalRoundingMode } from "./temporal-rounding.js";
import type { DurationUnit } from "./temporal-duration-balance.js";
import type { ISODateTimeDifference } from "./iso-date-time-difference.js";
import type { TemporalTimeZone } from "./temporal-time-zone-parse.js";

export function roundZonedDateTimeDifference(first: bigint, last: bigint, zone: TemporalTimeZone, largest: DurationUnit, smallest: DurationUnit, increment: number, mode: TemporalRoundingMode): ISODateTimeDifference | null {
    if (!isValidEpochNanoseconds(first) || !isValidEpochNanoseconds(last) || !Number.isInteger(increment) || increment < 1 || increment > 1000000000) return null;
    const length = temporalUnitNanoseconds(smallest);
    if (largest !== "years" && largest !== "months" && largest !== "weeks" && largest !== "days") {
        return length === null ? null : { date: dateDuration(0, 0, 0), time: roundTemporalInteger(last - first, BigInt(increment) * length, mode) };
    }
    const largestDate = largest === "years" ? "year" : largest === "months" ? "month" : largest === "weeks" ? "week" : "day";
    const difference = differenceTemporalZonedDateTime(first, last, zone, largestDate);
    if (difference === null || first === last || (smallest === "nanoseconds" && increment === 1)) return difference;
    let rounded: ZonedDurationNudge | null;
    if (smallest === "years" || smallest === "months" || smallest === "weeks" || smallest === "days") {
        const unit = smallest === "years" ? "year" : smallest === "months" ? "month" : smallest === "weeks" ? "week" : "day";
        rounded = roundZonedCalendarDifference(first, last, zone, difference, unit, increment, mode);
    } else {
        rounded = length === null ? null : roundZonedTimeDifference(first, zone, difference, BigInt(increment) * length, mode);
    }
    if (rounded === null) return null;
    if (!rounded.expanded || smallest === "years" || smallest === "weeks") return rounded.duration;
    return carryZonedCalendarDifference(first, zone, rounded.duration, rounded.epochNanoseconds, largest, smallest === "months" ? "month" : "day", last < first ? -1 : 1);
}
