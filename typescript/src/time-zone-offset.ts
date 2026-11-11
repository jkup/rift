import type { IanaZoneData } from "./iana-timezone-data.js";
import { transitionTableOffset } from "./time-zone-transitions.js";
import { recurrenceOffsetSeconds } from "./time-zone-recurrence.js";

export function ianaOffsetSeconds(zone: IanaZoneData, epochSeconds: number): number | null {
    const result = transitionTableOffset(zone, epochSeconds);
    if (result === null) return null;
    return result.kind === "offset" ? result.seconds : recurrenceOffsetSeconds(zone.recurrence, epochSeconds);
}
