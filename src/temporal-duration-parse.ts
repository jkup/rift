import { isValidDuration, type DurationFields } from "./temporal-duration.js";

function digit(code: number): boolean {
    return code >= 48 && code <= 57;
}
function signed(value: number, sign: number): number {
    return value === 0 ? 0 : value * sign;
}
function unitIndex(unit: string, time: boolean): number {
    if (time) {
        if (unit === "H" || unit === "h") {
            return 4;
        }
        if (unit === "M" || unit === "m") {
            return 5;
        }
        if (unit === "S" || unit === "s") {
            return 6;
        }
    } else {
        if (unit === "Y" || unit === "y") {
            return 0;
        }
        if (unit === "M" || unit === "m") {
            return 1;
        }
        if (unit === "W" || unit === "w") {
            return 2;
        }
        if (unit === "D" || unit === "d") {
            return 3;
        }
    }
    return -1;
}

export function parseTemporalDuration(text: string): DurationFields | null {
    let index = 0,
        sign = 1;
    if (text.charAt(index) === "-" || text.charAt(index) === "+") {
        if (text.charAt(index) === "-") {
            sign = -1;
        }
        index++;
    }
    if (text.charAt(index) !== "P" && text.charAt(index) !== "p") {
        return null;
    }
    index++;
    const fields: number[] = [0, 0, 0, 0, 0, 0, 0];
    let time = false,
        last = -1,
        count = 0,
        timeCount = 0,
        fractionNanoseconds = 0n;
    while (index < text.length) {
        if (text.charAt(index) === "T" || text.charAt(index) === "t") {
            if (time) {
                return null;
            }
            time = true;
            index++;
            continue;
        }
        let value = 0,
            digits = 0;
        while (digit(text.charCodeAt(index))) {
            value = value * 10 + (text.charCodeAt(index++) - 48);
            digits++;
            if (value >= 9007199254740992) {
                return null;
            }
        }
        if (digits === 0) {
            return null;
        }
        let fraction = 0,
            fractionDigits = 0;
        if (text.charAt(index) === "." || text.charAt(index) === ",") {
            if (!time) {
                return null;
            }
            index++;
            while (digit(text.charCodeAt(index))) {
                if (++fractionDigits > 9) {
                    return null;
                }
                fraction = fraction * 10 + (text.charCodeAt(index++) - 48);
            }
            if (fractionDigits === 0) {
                return null;
            }
            fraction *= Math.pow(10, 9 - fractionDigits);
        }
        const unit = unitIndex(text.charAt(index++), time);
        if (unit < 0 || unit <= last) {
            return null;
        }
        fields[unit] = value;
        last = unit;
        count++;
        if (time) {
            timeCount++;
        }
        if (fractionDigits > 0) {
            if (index !== text.length) {
                return null;
            }
            fractionNanoseconds = BigInt(fraction) * (unit === 4 ? 3600n : unit === 5 ? 60n : 1n);
        }
    }
    if (count === 0 || (time && timeCount === 0)) {
        return null;
    }
    const duration: DurationFields = {
        years: signed(fields[0], sign),
        months: signed(fields[1], sign),
        weeks: signed(fields[2], sign),
        days: signed(fields[3], sign),
        hours: signed(fields[4], sign),
        minutes: signed(fields[5] + Number(fractionNanoseconds / 60000000000n), sign),
        seconds: signed(fields[6] + Number((fractionNanoseconds / 1000000000n) % 60n), sign),
        milliseconds: signed(Number((fractionNanoseconds / 1000000n) % 1000n), sign),
        microseconds: signed(Number((fractionNanoseconds / 1000n) % 1000n), sign),
        nanoseconds: signed(Number(fractionNanoseconds % 1000n), sign),
    };
    return isValidDuration(duration) ? duration : null;
}
