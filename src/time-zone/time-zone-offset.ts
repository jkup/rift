import type { IanaZoneData } from "./iana-timezone-data.js";
import { transitionTableOffsetForLocalTime } from "./time-zone-transitions.js";
import { recurrenceOffsetSecondsForLocalTime } from "./time-zone-recurrence.js";

export function ianaOffsetSeconds(zone: IanaZoneData, epochSeconds: number): number | null {
    if (!Number.isSafeInteger(epochSeconds) || Math.abs(epochSeconds) > 8640000000000) {
        return null;
    }
    return ianaOffsetSecondsForLocalTime(zone, epochSeconds);
}

// Local-time candidates can lie outside the instant range. Evaluate their
// offsets before rejecting matching out-of-range instants as range errors.
export function ianaOffsetSecondsForLocalTime(
    zone: IanaZoneData,
    epochSeconds: number,
): number | null {
    const result = transitionTableOffsetForLocalTime(zone, epochSeconds);
    if (result === null) {
        return null;
    }
    return result.kind === "offset"
        ? result.seconds
        : recurrenceOffsetSecondsForLocalTime(zone.recurrence, epochSeconds);
}
