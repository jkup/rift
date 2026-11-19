import {
    isoDateTimeToEpochNanoseconds,
    isoDateToEpochDay,
    isValidEpochNanoseconds,
} from "./iso-calendar.js";
import type { TemporalZonedRecord } from "./temporal-zoned-parse.js";
import {
    timeZoneEpochNanoseconds,
    timeZonePossibleInstants,
    timeZoneStartOfDay,
    type TemporalDisambiguation,
} from "./temporal-time-zone-operations.js";
import { roundTemporalInteger } from "./temporal-rounding.js";

export type TemporalOffsetOption = "reject" | "prefer" | "ignore" | "use";

export function interpretTemporalZonedDateTime(
    record: TemporalZonedRecord,
    offsetOption: TemporalOffsetOption,
    disambiguation: TemporalDisambiguation = "compatible",
): bigint | null {
    if (record.startOfDay) {
        return timeZoneStartOfDay(record.timeZone, record.dateTime.date);
    }
    const local = isoDateTimeToEpochNanoseconds(record.dateTime);
    if (local === null) {
        return null;
    }
    if (
        record.offsetBehaviour === "wall" ||
        (record.offsetBehaviour === "option" && offsetOption === "ignore")
    ) {
        return timeZoneEpochNanoseconds(record.timeZone, local, disambiguation);
    }
    if (record.offsetBehaviour === "exact" || offsetOption === "use") {
        const epoch = local - record.offsetNanoseconds;
        return isValidEpochNanoseconds(epoch) ? epoch : null;
    }
    const day = isoDateToEpochDay(record.dateTime.date);
    if (day === null || Math.abs(day) > 100000000) {
        return null;
    }
    const candidates = timeZonePossibleInstants(record.timeZone, local);
    if (candidates === null) {
        return null;
    }
    for (const candidate of candidates) {
        const offset = local - candidate;
        if (
            offset === record.offsetNanoseconds ||
            (record.matchMinutes &&
                roundTemporalInteger(offset, 60000000000n, "halfExpand") ===
                    record.offsetNanoseconds)
        ) {
            return candidate;
        }
    }
    return offsetOption === "reject"
        ? null
        : timeZoneEpochNanoseconds(record.timeZone, local, disambiguation);
}
