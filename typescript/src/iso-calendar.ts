export type ISODate = { year: number; month: number; day: number };
export type ISODateTime = {
    date: ISODate; hour: number; minute: number; second: number;
    millisecond: number; microsecond: number; nanosecond: number;
};
export const NANOSECONDS_PER_DAY = 86400000000000n;
export const MAX_EPOCH_NANOSECONDS = 8640000000000000000000n;
const monthStarts = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

export function isISOLeapYear(year: number): boolean {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function isoDaysInMonth(year: number, month: number): number {
    if (month === 2) return isISOLeapYear(year) ? 29 : 28;
    return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

export function isValidISODate(date: ISODate): boolean {
    return Number.isInteger(date.year) && Math.abs(date.year) <= 1000000 &&
        Number.isInteger(date.month) && date.month >= 1 && date.month <= 12 &&
        Number.isInteger(date.day) && date.day >= 1 && date.day <= isoDaysInMonth(date.year, date.month);
}

function dayFromYear(year: number): number {
    return 365 * (year - 1970) + Math.floor((year - 1969) / 4) -
        Math.floor((year - 1901) / 100) + Math.floor((year - 1601) / 400);
}

export function isoDateToEpochDay(date: ISODate): number | null {
    if (!isValidISODate(date)) return null;
    const day = dayFromYear(date.year) + monthStarts[date.month - 1] + date.day - 1 +
        (date.month > 2 && isISOLeapYear(date.year) ? 1 : 0);
    return Math.abs(day) <= 100000001 ? day : null;
}

export function epochDayToISODate(day: number): ISODate | null {
    if (!Number.isInteger(day) || Math.abs(day) > 100000001) return null;
    // A Gregorian 400-year cycle has 146097 days; correct the estimate at year boundaries.
    let year = 1970 + Math.floor(day * 400 / 146097);
    while (dayFromYear(year) > day) year--;
    while (dayFromYear(year + 1) <= day) year++;
    let remaining = day - dayFromYear(year), month = 1;
    while (remaining >= isoDaysInMonth(year, month)) remaining -= isoDaysInMonth(year, month++);
    return { year, month, day: remaining + 1 };
}

export function isoDayOfWeek(date: ISODate): number | null {
    const day = isoDateToEpochDay(date);
    return day === null ? null : ((day + 3) % 7 + 7) % 7 + 1;
}

function inRange(value: number, limit: number): boolean {
    return Number.isInteger(value) && value >= 0 && value < limit;
}

export function isValidISOTime(time: ISODateTime): boolean {
    return inRange(time.hour, 24) && inRange(time.minute, 60) && inRange(time.second, 60) &&
        inRange(time.millisecond, 1000) && inRange(time.microsecond, 1000) && inRange(time.nanosecond, 1000);
}

export function isValidEpochNanoseconds(value: bigint): boolean {
    return value >= -MAX_EPOCH_NANOSECONDS && value <= MAX_EPOCH_NANOSECONDS;
}

export function utcDateTimeFromEpochNanoseconds(value: bigint): ISODateTime | null {
    if (!isValidEpochNanoseconds(value)) return null;
    let day = value / NANOSECONDS_PER_DAY, within = value % NANOSECONDS_PER_DAY;
    if (within < 0n) { day--; within += NANOSECONDS_PER_DAY; }
    const date = epochDayToISODate(Number(day));
    if (date === null) throw new Error("bounded epoch day invariant");
    const seconds = Number(within / 1000000000n), fraction = Number(within % 1000000000n);
    return {
        date, hour: Math.floor(seconds / 3600), minute: Math.floor(seconds / 60) % 60, second: seconds % 60,
        millisecond: Math.floor(fraction / 1000000), microsecond: Math.floor(fraction / 1000) % 1000, nanosecond: fraction % 1000,
    };
}

export function epochNanosecondsFromUTC(time: ISODateTime): bigint | null {
    if (!isValidISOTime(time)) return null;
    const day = isoDateToEpochDay(time.date);
    if (day === null) return null;
    const seconds = time.hour * 3600 + time.minute * 60 + time.second;
    const fraction = time.millisecond * 1000000 + time.microsecond * 1000 + time.nanosecond;
    const value = BigInt(day) * NANOSECONDS_PER_DAY + BigInt(seconds) * 1000000000n + BigInt(fraction);
    return isValidEpochNanoseconds(value) ? value : null;
}
