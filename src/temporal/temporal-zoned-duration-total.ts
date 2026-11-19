import { timeZoneLocalDateTime } from "./temporal-time-zone-operations.js";
import { addTemporalZonedDateTime } from "./temporal-zoned-arithmetic.js";
import { differenceTemporalZonedDateTime } from "./temporal-zoned-difference.js";
import { zonedCalendarWindow } from "./temporal-zoned-calendar-round.js";
import { temporalRatioToNumber } from "./temporal-ratio-number.js";
import { temporalUnitNanoseconds } from "./temporal-time.js";
import type { DurationFields } from "./temporal-duration.js";
import type { TemporalTimeZone } from "./temporal-time-zone-parse.js";

export function totalZonedRelativeDuration(
    duration: DurationFields,
    first: bigint,
    zone: TemporalTimeZone,
    unit: string,
): number | null {
    const last = addTemporalZonedDateTime(first, zone, duration, false, false);
    if (last === null) {
        return null;
    }
    if (unit !== "year" && unit !== "month" && unit !== "week" && unit !== "day") {
        const divisor = temporalUnitNanoseconds(unit);
        return divisor === null ? null : temporalRatioToNumber(last - first, divisor);
    }
    const origin = timeZoneLocalDateTime(zone, first);
    const difference = differenceTemporalZonedDateTime(first, last, zone, unit);
    if (origin === null || difference === null) {
        return null;
    }
    const sign = last < first ? -1 : 1;
    let window = zonedCalendarWindow(first, origin, zone, difference.date, unit, 1, sign, false);
    if (window === null) {
        return null;
    }
    if (BigInt(sign) * (last - window.start) < 0n || BigInt(sign) * (last - window.end) > 0n) {
        window = zonedCalendarWindow(first, origin, zone, difference.date, unit, 1, sign, true);
        if (window === null) {
            return null;
        }
    }
    const distance = BigInt(sign) * (last - window.start),
        span = BigInt(sign) * (window.end - window.start);
    if (span <= 0n || distance < 0n || distance > span) {
        throw new Error("zoned total window invariant");
    }
    return temporalRatioToNumber(
        BigInt(window.calendar.inner) * span + BigInt(sign) * distance,
        span,
    );
}
