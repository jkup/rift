import type { IanaZoneData } from "./iana-timezone-data.js";
import { ianaOffsetSeconds } from "./time-zone-offset.js";
import { recurrenceTransitionCandidates } from "./time-zone-recurrence.js";
import { isValidEpochNanoseconds } from "./iso-calendar.js";

function changesOffset(zone: IanaZoneData, seconds: number): boolean {
    if (Math.abs(seconds) > 8640000000000) return false;
    const before = ianaOffsetSeconds(zone, seconds - 1), after = ianaOffsetSeconds(zone, seconds);
    return before !== null && after !== null && before !== after;
}

export function ianaTimeZoneTransition(zone: IanaZoneData, epochNanoseconds: bigint, direction: "next" | "previous"): bigint | null {
    if (!isValidEpochNanoseconds(epochNanoseconds)) return null;
    const next = direction === "next", times = zone.transitions;
    let low = 0, high = times.length;
    while (low < high) {
        const middle = Math.floor((low + high) / 2), instant = BigInt(times[middle]) * 1000000000n;
        if (next ? instant <= epochNanoseconds : instant < epochNanoseconds) low = middle + 1;
        else high = middle;
    }
    let result: bigint | null = null;
    for (let index = next ? low : low - 1; index >= 0 && index < times.length; index += next ? 1 : -1) {
        if (changesOffset(zone, times[index])) { result = BigInt(times[index]) * 1000000000n; break; }
    }
    let seconds = epochNanoseconds / 1000000000n;
    if (epochNanoseconds < 0n && epochNanoseconds % 1000000000n !== 0n) seconds--;
    // A query before the footer interval must still find its first future change.
    const anchor = times.length === 0 ? Number(seconds) : Math.max(Number(seconds), times[times.length - 1]);
    for (const candidate of recurrenceTransitionCandidates(zone.recurrence, anchor)) {
        if (times.length > 0 && candidate < times[times.length - 1]) continue;
        const instant = BigInt(candidate) * 1000000000n;
        if (next ? instant <= epochNanoseconds : instant >= epochNanoseconds) continue;
        if (!changesOffset(zone, candidate)) continue;
        if (result === null || (next ? instant < result : instant > result)) result = instant;
    }
    return result;
}
