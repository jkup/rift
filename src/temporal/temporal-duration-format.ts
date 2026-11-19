import { durationSign, isValidDuration, type DurationFields } from "./temporal-duration.js";
import { formatTemporalFraction } from "./temporal-time-format.js";

export function formatTemporalDuration(
    duration: DurationFields,
    precision: "auto" | number = "auto",
): string | null {
    if (
        !isValidDuration(duration) ||
        (typeof precision === "number" &&
            (!Number.isInteger(precision) || precision < 0 || precision > 9))
    ) {
        return null;
    }
    let date = "",
        time = "";
    if (duration.years !== 0) {
        date += String(Math.abs(duration.years)) + "Y";
    }
    if (duration.months !== 0) {
        date += String(Math.abs(duration.months)) + "M";
    }
    if (duration.weeks !== 0) {
        date += String(Math.abs(duration.weeks)) + "W";
    }
    if (duration.days !== 0) {
        date += String(Math.abs(duration.days)) + "D";
    }
    if (duration.hours !== 0) {
        time += String(Math.abs(duration.hours)) + "H";
    }
    if (duration.minutes !== 0) {
        time += String(Math.abs(duration.minutes)) + "M";
    }
    let secondsDuration =
        BigInt(duration.seconds) * 1000000000n +
        BigInt(duration.milliseconds) * 1000000n +
        BigInt(duration.microseconds) * 1000n +
        BigInt(duration.nanoseconds);
    if (secondsDuration < 0n) {
        secondsDuration = -secondsDuration;
    }
    if (
        secondsDuration !== 0n ||
        (date.length === 0 && time.length === 0) ||
        precision !== "auto"
    ) {
        const fraction = formatTemporalFraction(Number(secondsDuration % 1000000000n), precision);
        time += (secondsDuration / 1000000000n).toString() + fraction + "S";
    }
    return (durationSign(duration) < 0 ? "-P" : "P") + date + (time.length === 0 ? "" : "T" + time);
}
