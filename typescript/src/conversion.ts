import { failure } from "./runtime.js";
import type { Value, ThrowCompletion } from "./runtime.js";
import type { Location } from "./syntax.js";
import type { GuestString } from "./strings.js";

export type NumberCompletion = { type: "normal"; value: number } | ThrowCompletion;

function numericWhitespace(code: number): boolean {
    return code === 0x09 || code === 0x0b || code === 0x0c || code === 0x20
        || code === 0xa0 || code === 0x1680 || (code >= 0x2000 && code <= 0x200a)
        || code === 0x202f || code === 0x205f || code === 0x3000 || code === 0xfeff
        || code === 0x0a || code === 0x0d || code === 0x2028 || code === 0x2029;
}
function digit(code: number): number {
    if (code >= 48 && code <= 57) return code - 48;
    if (code >= 65 && code <= 70) return code - 65 + 10;
    if (code >= 97 && code <= 102) return code - 97 + 10;
    return -1;
}
function decimalDigit(token: string, index: number): boolean {
    const code = token.charCodeAt(index);
    return code >= 48 && code <= 57;
}
// Only the scanner may call this backend. Host parsing supplies binary64
// rounding, never grammar acceptance or conversion of guest object wrappers.
function validatedNumber(token: string): number { return Number(token); }

export function stringToNumber(value: GuestString): number {
    let start = 0;
    let end = value.length;
    while (start < end && numericWhitespace(value.charCodeAt(start))) start++;
    while (end > start && numericWhitespace(value.charCodeAt(end - 1))) end--;
    if (start === end) return 0;
    const token = value.slice(start, end);
    let radix = 0;
    if (token.charAt(0) === "0") {
        const prefix = token.charAt(1);
        if (prefix === "x" || prefix === "X") radix = 16;
        if (prefix === "o" || prefix === "O") radix = 8;
        if (prefix === "b" || prefix === "B") radix = 2;
    }
    if (radix !== 0) {
        if (token.length === 2) return NaN;
        for (let i = 2; i < token.length; i++) {
            const d = digit(token.charCodeAt(i));
            if (d < 0 || d >= radix) return NaN;
        }
        return validatedNumber(token);
    }
    let i = 0;
    if (token.charAt(i) === "+" || token.charAt(i) === "-") i++;
    if (token.slice(i) === "Infinity") return validatedNumber(token);
    let digits = 0;
    while (decimalDigit(token, i)) { i++; digits++; }
    if (token.charAt(i) === ".") {
        i++;
        while (decimalDigit(token, i)) { i++; digits++; }
    }
    if (digits === 0) return NaN;
    if (token.charAt(i) === "e" || token.charAt(i) === "E") {
        i++;
        if (token.charAt(i) === "+" || token.charAt(i) === "-") i++;
        const exponentStart = i;
        while (decimalDigit(token, i)) i++;
        if (i === exponentStart) return NaN;
    }
    return i === token.length ? validatedNumber(token) : NaN;
}

// Partial ToNumber: object-to-primitive guest calls are a separate prerequisite.
export function toNumber(value: Value, loc: Location): NumberCompletion {
    switch (value.kind) {
        case "undefined": return { type: "normal", value: NaN };
        case "null": return { type: "normal", value: 0 };
        case "boolean": return { type: "normal", value: value.value ? 1 : 0 };
        case "number": return { type: "normal", value: value.value };
        case "string": return { type: "normal", value: stringToNumber(value.value) };
        case "object": return failure("TypeError", "object-to-primitive conversion unsupported", loc);
    }
}

export function toUint32(value: Value, loc: Location): NumberCompletion {
    const converted = toNumber(value, loc);
    if (converted.type === "throw") return converted;
    const number = converted.value;
    if (!Number.isFinite(number) || number === 0) return { type: "normal", value: 0 };
    const integer = Math.trunc(number);
    const remainder = integer % 4294967296;
    return { type: "normal", value: remainder === 0 ? 0 : remainder < 0 ? remainder + 4294967296 : remainder };
}

export function toIntegerOrInfinity(value: Value, loc: Location): NumberCompletion {
    const converted = toNumber(value, loc);
    if (converted.type === "throw") return converted;
    const number = converted.value;
    if (Number.isNaN(number) || number === 0) return { type: "normal", value: 0 };
    if (!Number.isFinite(number)) return converted;
    const integer = Math.trunc(number);
    // Mathematical truncation has no negative zero, including for (-1, 0).
    return { type: "normal", value: integer === 0 ? 0 : integer };
}

export function toLength(value: Value, loc: Location): NumberCompletion {
    const integer = toIntegerOrInfinity(value, loc);
    if (integer.type === "throw") return integer;
    return { type: "normal", value: Math.min(Math.max(integer.value, 0), 9007199254740991) };
}
