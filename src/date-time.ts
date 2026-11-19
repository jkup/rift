import { utcDateTimeFromEpochNanoseconds, isoDayOfWeek } from "./temporal/iso-calendar.js";

export const DATE_MILLISECONDS_PER_DAY = 86400000;
export const DATE_TIME_LIMIT = 8640000000000000;

export interface DateFields {
    readonly year: number;
    readonly month: number;
    readonly day: number;
    readonly weekday: number;
    readonly hour: number;
    readonly minute: number;
    readonly second: number;
    readonly millisecond: number;
}

export function dateTimeClip(time: number): number {
    if (!Number.isFinite(time) || Math.abs(time) > DATE_TIME_LIMIT) {
        return NaN;
    }
    const integer = Math.trunc(time);
    return integer === 0 ? 0 : integer;
}

export function dateTimeFields(time: number): DateFields | null {
    if (!Number.isInteger(time) || Math.abs(time) > DATE_TIME_LIMIT) {
        return null;
    }
    const fields = utcDateTimeFromEpochNanoseconds(BigInt(time) * 1000000n);
    if (fields === null) {
        throw new Error("Date time range invariant");
    }
    const weekday = isoDayOfWeek(fields.date);
    if (weekday === null) {
        throw new Error("Date weekday invariant");
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

export function dateMakeTime(
    hour: number,
    minute: number,
    second: number,
    millisecond: number,
): number {
    if (
        !Number.isFinite(hour) ||
        !Number.isFinite(minute) ||
        !Number.isFinite(second) ||
        !Number.isFinite(millisecond)
    ) {
        return NaN;
    }
    return (
        Math.trunc(hour) * 3600000 +
        Math.trunc(minute) * 60000 +
        Math.trunc(second) * 1000 +
        Math.trunc(millisecond)
    );
}

export function dateMakeDate(day: number, time: number): number {
    if (!Number.isFinite(day) || !Number.isFinite(time)) {
        return NaN;
    }
    const value = day * DATE_MILLISECONDS_PER_DAY + time;
    return Number.isFinite(value) ? value : NaN;
}

export function dateMakeFullYear(year: number): number {
    if (!Number.isFinite(year)) {
        return NaN;
    }
    const integer = Math.trunc(year);
    return integer >= 0 && integer <= 99 ? 1900 + integer : integer;
}
