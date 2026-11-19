import {
    NANOSECONDS_PER_DAY,
    isValidTime,
    timeFromNanoseconds,
    timeToNanoseconds,
} from "./temporal-time.js";
export { NANOSECONDS_PER_DAY } from "./temporal-time.js";

export type ISODate = { year: number; month: number; day: number };
export type ISODateTime = {
    date: ISODate;
    hour: number;
    minute: number;
    second: number;
    millisecond: number;
    microsecond: number;
    nanosecond: number;
};
export const MAX_EPOCH_NANOSECONDS = 8640000000000000000000n;
const monthStarts = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

export function isISOLeapYear(year: number): boolean {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function isoDaysInMonth(year: number, month: number): number {
    if (month === 2) {
        return isISOLeapYear(year) ? 29 : 28;
    }
    return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

export function isValidISODate(date: ISODate): boolean {
    return (
        Number.isInteger(date.year) &&
        Math.abs(date.year) <= 1000000 &&
        Number.isInteger(date.month) &&
        date.month >= 1 &&
        date.month <= 12 &&
        Number.isInteger(date.day) &&
        date.day >= 1 &&
        date.day <= isoDaysInMonth(date.year, date.month)
    );
}

function dayFromYear(year: number): number {
    return (
        365 * (year - 1970) +
        Math.floor((year - 1969) / 4) -
        Math.floor((year - 1901) / 100) +
        Math.floor((year - 1601) / 400)
    );
}

export function isoDateToEpochDay(date: ISODate): number | null {
    if (!isValidISODate(date)) {
        return null;
    }
    const day =
        dayFromYear(date.year) +
        monthStarts[date.month - 1] +
        date.day -
        1 +
        (date.month > 2 && isISOLeapYear(date.year) ? 1 : 0);
    return Math.abs(day) <= 100000001 ? day : null;
}

export function epochDayToISODate(day: number): ISODate | null {
    if (!Number.isInteger(day) || Math.abs(day) > 100000001) {
        return null;
    }
    // A Gregorian 400-year cycle has 146097 days; correct the estimate at year boundaries.
    let year = 1970 + Math.floor((day * 400) / 146097);
    while (dayFromYear(year) > day) {
        year--;
    }
    while (dayFromYear(year + 1) <= day) {
        year++;
    }
    let remaining = day - dayFromYear(year),
        month = 1;
    while (remaining >= isoDaysInMonth(year, month)) {
        remaining -= isoDaysInMonth(year, month++);
    }
    return { year, month, day: remaining + 1 };
}

export function isoDayOfWeek(date: ISODate): number | null {
    const day = isoDateToEpochDay(date);
    return day === null ? null : ((((day + 3) % 7) + 7) % 7) + 1;
}

export function isValidISOTime(time: ISODateTime): boolean {
    return isValidTime(time);
}

export function isValidEpochNanoseconds(value: bigint): boolean {
    return value >= -MAX_EPOCH_NANOSECONDS && value <= MAX_EPOCH_NANOSECONDS;
}

export function utcDateTimeFromEpochNanoseconds(value: bigint): ISODateTime | null {
    if (!isValidEpochNanoseconds(value)) {
        return null;
    }
    return isoDateTimeFromEpochNanoseconds(value);
}

export function isoDateTimeFromEpochNanoseconds(value: bigint): ISODateTime | null {
    if (
        value < -MAX_EPOCH_NANOSECONDS - NANOSECONDS_PER_DAY ||
        value >= MAX_EPOCH_NANOSECONDS + NANOSECONDS_PER_DAY
    ) {
        return null;
    }
    let day = value / NANOSECONDS_PER_DAY,
        within = value % NANOSECONDS_PER_DAY;
    if (within < 0n) {
        day--;
        within += NANOSECONDS_PER_DAY;
    }
    const date = epochDayToISODate(Number(day));
    if (date === null) {
        throw new Error("bounded epoch day invariant");
    }
    const time = timeFromNanoseconds(within);
    if (time === null) {
        throw new Error("within-day nanoseconds invariant");
    }
    return {
        date,
        hour: time.hour,
        minute: time.minute,
        second: time.second,
        millisecond: time.millisecond,
        microsecond: time.microsecond,
        nanosecond: time.nanosecond,
    };
}

export function isoDateTimeToEpochNanoseconds(time: ISODateTime): bigint | null {
    const within = timeToNanoseconds(time);
    if (within === null) {
        return null;
    }
    const day = isoDateToEpochDay(time.date);
    if (day === null) {
        return null;
    }
    return BigInt(day) * NANOSECONDS_PER_DAY + within;
}

export function epochNanosecondsFromUTC(time: ISODateTime): bigint | null {
    const value = isoDateTimeToEpochNanoseconds(time);
    return value !== null && isValidEpochNanoseconds(value) ? value : null;
}
