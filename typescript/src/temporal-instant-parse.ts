import { isoDateToEpochDay, isValidEpochNanoseconds, NANOSECONDS_PER_DAY } from "./iso-calendar.js";
import { parseUTCOffset } from "./utc-offset.js";

function digit(code: number): boolean { return code >= 48 && code <= 57; }
function lower(code: number): boolean { return code >= 97 && code <= 122; }
function alpha(code: number): boolean { return lower(code) || (code >= 65 && code <= 90); }

class InstantScanner {
    index = 0;
    constructor(readonly text: string) {}
    peek(): string { return this.text.charAt(this.index); }
    take(text: string): boolean {
        if (this.peek() !== text) return false;
        this.index++;
        return true;
    }
    digits(count: number): number {
        let value = 0;
        for (let i = 0; i < count; i++) {
            const code = this.text.charCodeAt(this.index++);
            if (!digit(code)) return -1;
            value = value * 10 + code - 48;
        }
        return value;
    }
}

function validZoneName(text: string): boolean {
    let leading = true;
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        if (code === 47) {
            if (leading) return false;
            leading = true;
            continue;
        }
        if (!alpha(code) && code !== 46 && code !== 95 && (leading || (!digit(code) && code !== 45 && code !== 43))) return false;
        leading = false;
    }
    return !leading;
}

function validAnnotationKey(text: string): boolean {
    if (text.length === 0) return false;
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        if (!lower(code) && code !== 95 && (i === 0 || (!digit(code) && code !== 45))) return false;
    }
    return true;
}

function validAnnotationValue(text: string): boolean {
    let leading = true;
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        if (code === 45) {
            if (leading) return false;
            leading = true;
        } else {
            if (!alpha(code) && !digit(code)) return false;
            leading = false;
        }
    }
    return !leading;
}

function annotations(scanner: InstantScanner): boolean {
    let first = true, calendarSeen = false, calendarCritical = false;
    while (scanner.index < scanner.text.length) {
        if (!scanner.take("[")) return false;
        const critical = scanner.take("!");
        const end = scanner.text.indexOf("]", scanner.index);
        if (end < 0) return false;
        const content = scanner.text.slice(scanner.index, end), equals = content.indexOf("=");
        scanner.index = end + 1;
        if (equals < 0) {
            if (!first) return false;
            if (content.charAt(0) === "+" || content.charAt(0) === "-") {
                if (parseUTCOffset(content, false) === null) return false;
            } else if (!validZoneName(content)) return false;
        } else {
            const key = content.slice(0, equals), value = content.slice(equals + 1);
            if (!validAnnotationKey(key) || !validAnnotationValue(value)) return false;
            if (key === "u-ca") {
                if (calendarSeen && (calendarCritical || critical)) return false;
                calendarSeen = true;
                calendarCritical = critical;
            } else if (critical) return false;
        }
        first = false;
    }
    return true;
}

export function parseTemporalInstant(text: string): bigint | null {
    const scanner = new InstantScanner(text);
    const sign = scanner.peek();
    const signedYear = sign === "+" || sign === "-";
    if (signedYear) scanner.index++;
    let year = scanner.digits(signedYear ? 6 : 4);
    if (year < 0 || (sign === "-" && year === 0)) return null;
    if (sign === "-") year = -year;
    const extendedDate = scanner.take("-");
    const month = scanner.digits(2);
    if (extendedDate && !scanner.take("-")) return null;
    const day = scanner.digits(2);
    const epochDay = isoDateToEpochDay({ year, month, day });
    if (epochDay === null || (!scanner.take("T") && !scanner.take("t") && !scanner.take(" "))) return null;
    const hour = scanner.digits(2);
    if (hour < 0 || hour > 23) return null;
    let minute = 0, second = 0, fraction = 0;
    const extendedTime = scanner.take(":");
    if (extendedTime || digit(text.charCodeAt(scanner.index))) {
        minute = scanner.digits(2);
        if (minute < 0 || minute > 59) return null;
        const hasSeconds = extendedTime ? scanner.take(":") : digit(text.charCodeAt(scanner.index));
        if (hasSeconds) {
            second = scanner.digits(2);
            if (second < 0 || second > 60) return null;
            if (second === 60) second = 59;
            if (scanner.take(".") || scanner.take(",")) {
                let count = 0;
                while (digit(text.charCodeAt(scanner.index))) {
                    if (++count > 9) return null;
                    fraction = fraction * 10 + scanner.digits(1);
                }
                if (count === 0) return null;
                fraction *= Math.pow(10, 9 - count);
            }
        }
    }
    let offset = 0n;
    if (!scanner.take("Z") && !scanner.take("z")) {
        const end = text.indexOf("[", scanner.index);
        const parsed = parseUTCOffset(text.slice(scanner.index, end < 0 ? text.length : end));
        if (parsed === null) return null;
        offset = parsed;
        scanner.index = end < 0 ? text.length : end;
    }
    if (!annotations(scanner)) return null;
    const value = BigInt(epochDay) * NANOSECONDS_PER_DAY +
        BigInt(hour * 3600 + minute * 60 + second) * 1000000000n + BigInt(fraction) - offset;
    return isValidEpochNanoseconds(value) ? value : null;
}
