import { isValidDuration, type DurationFields } from "./temporal-duration.js";

export type DurationUnit = keyof DurationFields;
const units: DurationUnit[] = ["years", "months", "weeks", "days", "hours", "minutes", "seconds", "milliseconds", "microseconds", "nanoseconds"];

export function largestDurationUnit(value: DurationFields): DurationUnit {
    for (const unit of units) if (value[unit] !== 0) return unit;
    return "nanoseconds";
}

export function largerDurationUnit(one: DurationUnit, two: DurationUnit): DurationUnit {
    for (const unit of units) if (unit === one || unit === two) return unit;
    throw new Error("duration unit invariant");
}

export function balanceDurationTime(time: bigint, date: DurationFields, largest: DurationUnit): DurationFields | null {
    if (time <= -9007199254740992000000000n || time >= 9007199254740992000000000n) return null;
    const dateUnit = largest === "years" || largest === "months" || largest === "weeks" || largest === "days";
    let rest = time;
    const nanoseconds = Number(largest === "nanoseconds" ? rest : rest % 1000n);
    rest = largest === "nanoseconds" ? 0n : rest / 1000n;
    const microseconds = Number(largest === "microseconds" ? rest : rest % 1000n);
    rest = largest === "microseconds" ? 0n : rest / 1000n;
    const milliseconds = Number(largest === "milliseconds" ? rest : rest % 1000n);
    rest = largest === "milliseconds" ? 0n : rest / 1000n;
    const seconds = Number(largest === "seconds" ? rest : rest % 60n);
    rest = largest === "seconds" ? 0n : rest / 60n;
    const minutes = Number(largest === "minutes" ? rest : rest % 60n);
    rest = largest === "minutes" ? 0n : rest / 60n;
    const hours = Number(dateUnit ? rest % 24n : rest);
    const days = date.days + Number(dateUnit ? rest / 24n : 0n);
    const value = { years: date.years, months: date.months, weeks: date.weeks, days,
        hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
    return isValidDuration(value) ? value : null;
}
