import { relativeDurationTarget } from "./temporal-relative-duration-target.js";
import { isoDateTimeToEpochNanoseconds, type ISODate } from "./iso-calendar.js";
import { differenceISODateTime } from "./iso-date-time-difference.js";
import { calendarWindow } from "./temporal-calendar-round.js";
import type { DurationFields } from "./temporal-duration.js";
import { durationUnit } from "./temporal-duration-balance.js";
import { NANOSECONDS_PER_DAY, temporalUnitNanoseconds } from "./temporal-time.js";
import { temporalRatioToNumber } from "./temporal-ratio-number.js";

export function totalRelativeDuration(
    duration: DurationFields,
    relativeTo: ISODate,
    unit: string,
): number | null {
    const targetRecord = relativeDurationTarget(duration, relativeTo);
    if (targetRecord === null) {
        return null;
    }
    const { origin, destination } = targetRecord;
    const targetEpoch = isoDateTimeToEpochNanoseconds(destination),
        originEpoch = isoDateTimeToEpochNanoseconds(origin);
    if (targetEpoch === null || originEpoch === null) {
        throw new Error("relative total target invariant");
    }
    if (targetEpoch === originEpoch) {
        return 0;
    }
    const difference = differenceISODateTime(origin, destination, durationUnit(unit));
    if (difference === null) {
        return null;
    }
    if (unit !== "year" && unit !== "month" && unit !== "week") {
        const divisor = unit === "day" ? NANOSECONDS_PER_DAY : temporalUnitNanoseconds(unit);
        if (divisor === null) {
            throw new Error("relative total unit invariant");
        }
        return temporalRatioToNumber(
            difference.time + BigInt(difference.date.days) * NANOSECONDS_PER_DAY,
            divisor,
        );
    }
    const target = targetEpoch,
        start = originEpoch;
    const sign = target < start ? -1 : 1;
    let window = calendarWindow(relativeTo, difference.date, unit, 1, sign, false);
    if (window === null) {
        return null;
    }
    if (
        BigInt(sign) * (target - BigInt(window.startDay) * NANOSECONDS_PER_DAY) < 0n ||
        BigInt(sign) * (target - BigInt(window.endDay) * NANOSECONDS_PER_DAY) > 0n
    ) {
        window = calendarWindow(relativeTo, difference.date, unit, 1, sign, true);
        if (window === null) {
            return null;
        }
    }
    const distance = BigInt(sign) * (target - BigInt(window.startDay) * NANOSECONDS_PER_DAY);
    const span = BigInt(sign * (window.endDay - window.startDay)) * NANOSECONDS_PER_DAY;
    if (span <= 0n || distance < 0n || distance > span) {
        throw new Error("relative total window invariant");
    }
    return temporalRatioToNumber(BigInt(window.inner) * span + BigInt(sign) * distance, span);
}
