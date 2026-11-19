export type DurationFields = {
    readonly years: number;
    readonly months: number;
    readonly weeks: number;
    readonly days: number;
    readonly hours: number;
    readonly minutes: number;
    readonly seconds: number;
    readonly milliseconds: number;
    readonly microseconds: number;
    readonly nanoseconds: number;
};

const durationFields: (keyof DurationFields)[] = [
    "years",
    "months",
    "weeks",
    "days",
    "hours",
    "minutes",
    "seconds",
    "milliseconds",
    "microseconds",
    "nanoseconds",
];
const durationNanosecondLimit = 9007199254740992000000000n;

export function durationSign(duration: DurationFields): number {
    for (const name of durationFields) {
        if (duration[name] < 0) {
            return -1;
        }
        if (duration[name] > 0) {
            return 1;
        }
    }
    return 0;
}

export function isValidDuration(duration: DurationFields): boolean {
    let sign = 0;
    for (const name of durationFields) {
        const value = duration[name];
        if (!Number.isInteger(value)) {
            return false;
        }
        if (value !== 0) {
            const current = value < 0 ? -1 : 1;
            if (sign !== 0 && current !== sign) {
                return false;
            }
            sign = current;
        }
        // Equal signs prevent cancellation; bound host BigInt conversion before allocation.
        if (Math.abs(value) >= Number(durationNanosecondLimit)) {
            return false;
        }
    }
    if (
        Math.abs(duration.years) >= 4294967296 ||
        Math.abs(duration.months) >= 4294967296 ||
        Math.abs(duration.weeks) >= 4294967296
    ) {
        return false;
    }
    const nanoseconds = BigInt(duration.days) * 86400000000000n + durationTimeNanoseconds(duration);
    return nanoseconds > -durationNanosecondLimit && nanoseconds < durationNanosecondLimit;
}

export function durationTimeNanoseconds(duration: DurationFields): bigint {
    return (
        BigInt(duration.hours) * 3600000000000n +
        BigInt(duration.minutes) * 60000000000n +
        BigInt(duration.seconds) * 1000000000n +
        BigInt(duration.milliseconds) * 1000000n +
        BigInt(duration.microseconds) * 1000n +
        BigInt(duration.nanoseconds)
    );
}
