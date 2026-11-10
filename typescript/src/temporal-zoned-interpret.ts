import { isoDateTimeToEpochNanoseconds, isoDateToEpochDay, isValidEpochNanoseconds } from "./iso-calendar.js";
import type { TemporalZonedRecord } from "./temporal-zoned-parse.js";

export type TemporalOffsetOption = "reject" | "prefer" | "ignore" | "use";

export function interpretTemporalZonedDateTime(record: TemporalZonedRecord, offsetOption: TemporalOffsetOption): bigint | null {
    const local = isoDateTimeToEpochNanoseconds(record.dateTime);
    if (local === null) return null;
    let offset = record.timeZone.offsetNanoseconds;
    if (record.offsetBehaviour === "exact") offset = 0n;
    else if (record.offsetBehaviour === "option") {
        if (offsetOption === "prefer" || offsetOption === "reject") {
            const day = isoDateToEpochDay(record.dateTime.date);
            if (day === null || Math.abs(day) > 100000000) return null;
        }
        if (offsetOption === "use") offset = record.offsetNanoseconds;
        else if (offsetOption === "reject" && record.offsetNanoseconds !== offset) return null;
    }
    const epoch = local - offset;
    return isValidEpochNanoseconds(epoch) ? epoch : null;
}
