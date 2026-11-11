import type {IanaZoneData} from "./iana-timezone-data.js";
import {ianaOffsetSecondsForLocalTime} from "./time-zone-offset.js";
import {ianaTimeZoneTransition} from "./time-zone-adjacent.js";
const maximum = 8640000000000000000000n, day = 86400000000000n;

function candidateOffset(zone: IanaZoneData, instant: bigint): number {
    let seconds = instant / 1000000000n;
    if (instant < 0n && instant % 1000000000n !== 0n) seconds--;
    const result = ianaOffsetSecondsForLocalTime(zone, Number(seconds));
    if (result === null) throw new Error("candidate offset invariant");
    return result;
}

// A null result is a range failure; an empty list is a clock gap.
export function possibleIanaInstants(zone: IanaZoneData, local: bigint): bigint[] | null {
    if (local < -maximum - day || local > maximum + day) return null;
    const result: bigint[] = [];
    for (const offset of zone.possibleOffsets) {
        const candidate = local - BigInt(offset) * 1000000000n;
        if (candidateOffset(zone, candidate) !== offset) continue;
        if (candidate < -maximum || candidate > maximum) return null;
        result.push(candidate);
    }
    return result;
}

function containingGap(zone: IanaZoneData, local: bigint): {instant: bigint; change: bigint} | null {
    let start = local - day;
    if (start < -maximum) start = -maximum;
    if (start > maximum) return null;
    const end = local + day;
    let transition = ianaTimeZoneTransition(zone, start, "next");
    while (transition !== null && transition <= end) {
        const before = BigInt(candidateOffset(zone, transition - 1n)) * 1000000000n;
        const after = BigInt(candidateOffset(zone, transition)) * 1000000000n;
        if (after > before && local >= transition + before && local < transition + after)
            return {instant: transition, change: after - before};
        transition = ianaTimeZoneTransition(zone, transition, "next");
    }
    return null;
}

export function resolveIanaLocalTime(zone: IanaZoneData, local: bigint, mode: "compatible" | "earlier" | "later" | "reject"): bigint | null {
    const candidates = possibleIanaInstants(zone, local);
    if (candidates === null) return null;
    if (candidates.length === 1) return candidates[0];
    if (mode === "reject") return null;
    if (candidates.length > 1) return mode === "later" ? candidates[candidates.length - 1] : candidates[0];
    const gap = containingGap(zone, local);
    if (gap === null) return null;
    const shifted = possibleIanaInstants(zone, local + (mode === "earlier" ? -gap.change : gap.change));
    if (shifted === null || shifted.length === 0) return null;
    return mode === "earlier" ? shifted[0] : shifted[shifted.length - 1];
}

export function startOfIanaDay(zone: IanaZoneData, midnight: bigint): bigint | null {
    const candidates = possibleIanaInstants(zone, midnight);
    if (candidates === null) return null;
    if (candidates.length > 0) return candidates[0];
    const gap = containingGap(zone, midnight);
    return gap === null ? null : gap.instant;
}
