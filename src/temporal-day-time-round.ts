import type { ISODateTimeDifference } from "./iso-date-time-difference.js";
import { dateDuration } from "./temporal-calendar-round.js";
import type { DurationUnit } from "./temporal-duration-balance.js";
import { NANOSECONDS_PER_DAY, temporalUnitNanoseconds } from "./temporal-time.js";
import { roundTemporalInteger, type TemporalRoundingMode } from "./temporal-rounding.js";

export interface DayTimeRoundResult {
    readonly duration: ISODateTimeDifference;
    readonly epochNanoseconds: bigint;
    readonly expanded: boolean;
}

export function roundDayTimeDifference(
    difference: ISODateTimeDifference,
    destination: bigint,
    largest: DurationUnit,
    smallest: DurationUnit,
    increment: number,
    mode: TemporalRoundingMode,
): DayTimeRoundResult | null {
    const length = smallest === "days" ? NANOSECONDS_PER_DAY : temporalUnitNanoseconds(smallest);
    if (
        length === null ||
        !Number.isInteger(increment) ||
        increment < 1 ||
        increment > 1000000000
    ) {
        return null;
    }
    const total = difference.time + BigInt(difference.date.days) * NANOSECONDS_PER_DAY;
    const rounded = roundTemporalInteger(total, BigInt(increment) * length, mode);
    const wholeDays = total / NANOSECONDS_PER_DAY,
        roundedDays = rounded / NANOSECONDS_PER_DAY;
    const delta = roundedDays - wholeDays;
    let deltaSign: -1 | 0 | 1;
    if (delta < 0n) {
        deltaSign = -1;
    } else if (delta > 0n) {
        deltaSign = 1;
    } else {
        deltaSign = 0;
    }
    let sign: -1 | 0 | 1;
    if (total < 0n) {
        sign = -1;
    } else if (total > 0n) {
        sign = 1;
    } else {
        sign = 0;
    }
    const dateUnit =
        largest === "years" || largest === "months" || largest === "weeks" || largest === "days";
    const days = dateUnit ? roundedDays : 0n;
    const date = dateDuration(
        difference.date.years,
        difference.date.months,
        difference.date.weeks,
        Number(days),
    );
    return {
        duration: { date, time: rounded - days * NANOSECONDS_PER_DAY },
        epochNanoseconds: destination + rounded - total,
        expanded: deltaSign === sign,
    };
}
