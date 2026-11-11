import type { IanaZoneData } from "./iana-timezone-data.js";
import { findIanaTimeZoneIdentifier } from "./time-zone-identifier.js";
import { ianaOffsetSeconds } from "./time-zone-offset.js";
import { ianaTimeZoneTransition } from "./time-zone-adjacent.js";
import { possibleIanaInstants, resolveIanaLocalTime, startOfIanaDay } from "./time-zone-local.js";
import { isoDateToEpochDay, isoDateTimeFromEpochNanoseconds, isValidEpochNanoseconds, NANOSECONDS_PER_DAY, type ISODate, type ISODateTime } from "./iso-calendar.js";

export type TemporalTimeZone =
    | { readonly kind: "offset"; readonly identifier: string; readonly offsetNanoseconds: bigint }
    | { readonly kind: "named"; readonly identifier: string; readonly primaryIdentifier: string; readonly data: IanaZoneData };
export type TemporalDisambiguation = "compatible" | "earlier" | "later" | "reject";

export function namedTemporalTimeZone(identifier: string): TemporalTimeZone | null {
    const record = findIanaTimeZoneIdentifier(identifier);
    return record === null ? null : { kind: "named", identifier: record.identifier, primaryIdentifier: record.primary, data: record.data };
}

export function timeZoneOffsetNanoseconds(zone: TemporalTimeZone, epoch: bigint): bigint | null {
    if (!isValidEpochNanoseconds(epoch)) return null;
    if (zone.kind === "offset") return zone.offsetNanoseconds;
    let seconds = epoch / 1000000000n;
    if (epoch < 0n && epoch % 1000000000n !== 0n) seconds--;
    const offset = ianaOffsetSeconds(zone.data, Number(seconds));
    return offset === null ? null : BigInt(offset) * 1000000000n;
}

export function timeZoneLocalDateTime(zone: TemporalTimeZone, epoch: bigint): ISODateTime | null {
    const offset = timeZoneOffsetNanoseconds(zone, epoch);
    return offset === null ? null : isoDateTimeFromEpochNanoseconds(epoch + offset);
}

export function timeZonePossibleInstants(zone: TemporalTimeZone, local: bigint): bigint[] | null {
    if (zone.kind === "named") return possibleIanaInstants(zone.data, local);
    const epoch = local - zone.offsetNanoseconds;
    return isValidEpochNanoseconds(epoch) ? [epoch] : null;
}

export function timeZoneEpochNanoseconds(zone: TemporalTimeZone, local: bigint, disambiguation: TemporalDisambiguation = "compatible"): bigint | null {
    // scriptc widens indexed provider results despite their declared return type.
    if (zone.kind === "named") return resolveIanaLocalTime(zone.data, local, disambiguation) as bigint | null;
    const epoch = local - zone.offsetNanoseconds;
    return isValidEpochNanoseconds(epoch) ? epoch : null;
}

export function timeZoneStartOfDay(zone: TemporalTimeZone, date: ISODate): bigint | null {
    const day = isoDateToEpochDay(date);
    if (day === null) return null;
    const midnight = BigInt(day) * NANOSECONDS_PER_DAY;
    return zone.kind === "named" ? (startOfIanaDay(zone.data, midnight) as bigint | null) : timeZoneEpochNanoseconds(zone, midnight);
}

export function timeZoneTransition(zone: TemporalTimeZone, epoch: bigint, direction: "next" | "previous"): bigint | null {
    return zone.kind === "named" ? ianaTimeZoneTransition(zone.data, epoch, direction) : null;
}

export function timeZoneEquals(left: TemporalTimeZone, right: TemporalTimeZone): boolean {
    if (left.kind === "named") return right.kind === "named" && left.primaryIdentifier === right.primaryIdentifier;
    return right.kind === "offset" && left.offsetNanoseconds === right.offsetNanoseconds;
}
