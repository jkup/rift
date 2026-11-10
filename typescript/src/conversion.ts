import type { Realm } from "./realm.js";
import { toPrimitive } from "./primitive-conversion.js";
import { languageFailure, unsupportedFailure } from "./runtime.js";
import type { Value, ThrowCompletion, PropertyKey, OperationContext } from "./runtime.js";
import type { Location } from "./syntax.js";
import { isStringWhitespace, type GuestString } from "./strings.js";

export type NumberCompletion = { type: "normal"; value: number } | ThrowCompletion;

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
    while (start < end && isStringWhitespace(value.charCodeAt(start))) start++;
    while (end > start && isStringWhitespace(value.charCodeAt(end - 1))) end--;
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
export function toNumber(value: Value, loc: Location, realm: Realm | null): NumberCompletion {
    switch (value.kind) {
        case "undefined": return { type: "normal", value: NaN };
        case "null": return { type: "normal", value: 0 };
        case "boolean": return { type: "normal", value: value.value ? 1 : 0 };
        case "number": return { type: "normal", value: value.value };
        case "string": return { type: "normal", value: stringToNumber(value.value) };
        case "symbol": return languageFailure(realm, "TypeError", "cannot convert symbol to number", loc);
        case "bigint": return languageFailure(realm, "TypeError", "cannot implicitly convert BigInt to number", loc);
        case "object": return unsupportedFailure("runtime.object-to-number", "TypeError", "object-to-primitive conversion unsupported", loc);
    }
}

export function toUint32(value: Value, loc: Location, realm: Realm | null): NumberCompletion {
    const converted = toNumber(value, loc, realm);
    if (converted.type === "throw") return converted;
    const number = converted.value;
    if (!Number.isFinite(number) || number === 0) return { type: "normal", value: 0 };
    const integer = Math.trunc(number);
    const remainder = integer % 4294967296;
    return { type: "normal", value: remainder === 0 ? 0 : remainder < 0 ? remainder + 4294967296 : remainder };
}

export function toIntegerOrInfinity(value: Value, loc: Location, realm: Realm | null): NumberCompletion {
    const converted = toNumber(value, loc, realm);
    if (converted.type === "throw") return converted;
    const number = converted.value;
    if (Number.isNaN(number) || number === 0) return { type: "normal", value: 0 };
    if (!Number.isFinite(number)) return converted;
    const integer = Math.trunc(number);
    // Mathematical truncation has no negative zero, including for (-1, 0).
    return { type: "normal", value: integer === 0 ? 0 : integer };
}

export function toLength(value: Value, loc: Location, realm: Realm | null): NumberCompletion {
    const integer = toIntegerOrInfinity(value, loc, realm);
    if (integer.type === "throw") return integer;
    return { type: "normal", value: Math.min(Math.max(integer.value, 0), 9007199254740991) };
}

export type StringCompletion = { type: "normal"; value: GuestString } | ThrowCompletion;
export type PropertyKeyCompletion = { type: "normal"; value: PropertyKey } | ThrowCompletion;

// The sole numeric formatting backend accepts a typed binary64 payload.
export function numberToString(value: number): GuestString { return String(value); }

// Partial ToString: object coercion requires guest calls and is not supported.
export function toString(value: Value, loc: Location, realm: Realm | null): StringCompletion {
    switch (value.kind) {
        case "undefined": return { type: "normal", value: "undefined" };
        case "null": return { type: "normal", value: "null" };
        case "boolean": return { type: "normal", value: value.value ? "true" : "false" };
        case "string": return { type: "normal", value: value.value };
        case "number": return { type: "normal", value: numberToString(value.value) };
        case "bigint": return { type: "normal", value: value.value.toString() };
        case "symbol": return languageFailure(realm, "TypeError", "cannot convert symbol to string", loc);
        case "object": return unsupportedFailure("runtime.object-to-string", "TypeError", "object-to-primitive conversion unsupported", loc);
    }
}

// Property keys preserve symbol identity after ordinary primitive conversion.
export function toPropertyKey(value: Value, context: OperationContext, loc: Location): PropertyKeyCompletion {
    const primitive = toPrimitive(value, "string", context, loc);
    if (primitive.type === "throw") return primitive;
    if (primitive.value.kind === "symbol") return { type: "normal", value: primitive.value.value };
    return toString(primitive.value, loc, context.realm);
}

export function toIndex(value: Value, context: OperationContext, loc: Location): NumberCompletion {
    const primitive = toPrimitive(value, "number", context, loc);
    if (primitive.type === "throw") return primitive;
    const integer = toIntegerOrInfinity(primitive.value, loc, context.realm);
    if (integer.type === "throw") return integer;
    if (integer.value < 0 || integer.value > 9007199254740991)
        return languageFailure(context.realm, "RangeError", "index outside the safe integer range", loc);
    return { type: "normal", value: integer.value === 0 ? 0 : integer.value };
}
