import { ianaZones, type IanaZoneData } from "./iana-timezone-data.js";
import { stringCompare } from "./strings.js";

export type TransitionTableResult =
    | { kind: "offset"; seconds: number }
    | { kind: "recurring"; footer: string };

export function findIanaZoneData(identifier: string): IanaZoneData | null {
    let low = 0,
        high = ianaZones.length;
    while (low < high) {
        const middle = Math.floor((low + high) / 2),
            zone = ianaZones[middle];
        if (stringCompare(zone.identifier, identifier) < 0) {
            low = middle + 1;
        } else {
            high = middle;
        }
    }
    return low < ianaZones.length && ianaZones[low].identifier === identifier
        ? ianaZones[low]
        : null;
}

export function transitionTableOffset(
    zone: IanaZoneData,
    epochSeconds: number,
): TransitionTableResult | null {
    if (!Number.isSafeInteger(epochSeconds) || Math.abs(epochSeconds) > 8640000000000) {
        return null;
    }
    return transitionTableOffsetForLocalTime(zone, epochSeconds);
}

export function transitionTableOffsetForLocalTime(
    zone: IanaZoneData,
    epochSeconds: number,
): TransitionTableResult | null {
    if (!Number.isSafeInteger(epochSeconds) || Math.abs(epochSeconds) > 8640000172800) {
        return null;
    }
    const times = zone.transitions;
    // TZif delegates the last transition and all later instants to its footer.
    if (times.length === 0 || epochSeconds >= times[times.length - 1]) {
        return { kind: "recurring", footer: zone.footer };
    }
    let low = 0,
        high = times.length;
    while (low < high) {
        const middle = Math.floor((low + high) / 2);
        if (times[middle] <= epochSeconds) {
            low = middle + 1;
        } else {
            high = middle;
        }
    }
    return { kind: "offset", seconds: low === 0 ? zone.initialOffset : zone.offsets[low - 1] };
}
