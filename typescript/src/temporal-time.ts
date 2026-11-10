export type TimeFields = {
    readonly hour: number; readonly minute: number; readonly second: number;
    readonly millisecond: number; readonly microsecond: number; readonly nanosecond: number;
};

export const NANOSECONDS_PER_DAY = 86400000000000n;

function inRange(value: number, limit: number): boolean {
    return Number.isInteger(value) && value >= 0 && value < limit;
}

export function isValidTime(time: TimeFields): boolean {
    return inRange(time.hour, 24) && inRange(time.minute, 60) && inRange(time.second, 60) &&
        inRange(time.millisecond, 1000) && inRange(time.microsecond, 1000) && inRange(time.nanosecond, 1000);
}

export function timeToNanoseconds(time: TimeFields): bigint | null {
    if (!isValidTime(time)) return null;
    const seconds = time.hour * 3600 + time.minute * 60 + time.second;
    const fraction = time.millisecond * 1000000 + time.microsecond * 1000 + time.nanosecond;
    return BigInt(seconds) * 1000000000n + BigInt(fraction);
}

export function timeFromNanoseconds(value: bigint): TimeFields | null {
    if (value < 0n || value >= NANOSECONDS_PER_DAY) return null;
    const seconds = Number(value / 1000000000n), fraction = Number(value % 1000000000n);
    return {
        hour: Math.floor(seconds / 3600), minute: Math.floor(seconds / 60) % 60, second: seconds % 60,
        millisecond: Math.floor(fraction / 1000000), microsecond: Math.floor(fraction / 1000) % 1000, nanosecond: fraction % 1000,
    };
}
