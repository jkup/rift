import {
    DATE_TIME_LIMIT,
    DATE_MILLISECONDS_PER_DAY,
    dateTimeClip,
    type DateFields,
} from "./date-time.js";
import { isoDateTimeFromEpochNanoseconds, isoDayOfWeek } from "./temporal/iso-calendar.js";
import {
    timeZoneOffsetNanoseconds,
    timeZoneEpochNanoseconds,
    type TemporalTimeZone,
} from "./temporal/temporal-time-zone-operations.js";

export function dateTimeZoneOffsetMilliseconds(time: number, zone: TemporalTimeZone): number {
    if (!Number.isInteger(time) || Math.abs(time) > DATE_TIME_LIMIT) {
        return NaN;
    }
    const offset = timeZoneOffsetNanoseconds(zone, BigInt(time) * 1000000n);
    return offset === null ? NaN : Number(offset / 1000000n);
}

export function dateLocalTime(time: number, zone: TemporalTimeZone): number {
    return time + dateTimeZoneOffsetMilliseconds(time, zone);
}

export function dateLocalFields(time: number, zone: TemporalTimeZone): DateFields | null {
    const local = dateLocalTime(time, zone);
    if (!Number.isFinite(local)) {
        return null;
    }
    const fields = isoDateTimeFromEpochNanoseconds(BigInt(local) * 1000000n);
    if (fields === null) {
        throw new Error("Date local field range invariant");
    }
    const weekday = isoDayOfWeek(fields.date);
    if (weekday === null) {
        throw new Error("Date local weekday invariant");
    }
    return {
        year: fields.date.year,
        month: fields.date.month - 1,
        day: fields.date.day,
        weekday: weekday % 7,
        hour: fields.hour,
        minute: fields.minute,
        second: fields.second,
        millisecond: fields.millisecond,
    };
}

export function dateEpochFromLocalTime(local: number, zone: TemporalTimeZone): number {
    // A valid boundary instant can have local fields outside the clipped range.
    if (!Number.isInteger(local) || Math.abs(local) > DATE_TIME_LIMIT + DATE_MILLISECONDS_PER_DAY) {
        return NaN;
    }
    if (zone.kind === "offset") {
        return dateTimeClip(local - Number(zone.offsetNanoseconds / 1000000n));
    }
    const epoch = timeZoneEpochNanoseconds(zone, BigInt(local) * 1000000n, "compatible");
    return epoch === null ? NaN : dateTimeClip(Number(epoch / 1000000n));
}
