import type { TemporalTimePrecision } from "./temporal-time-format.js";
import { toPrimitive } from "./primitive-conversion.js";
import { toString, toNumber, type NumberCompletion, type StringCompletion } from "./conversion.js";
import type { TemporalRoundingMode } from "./temporal-rounding.js";
import { languageFailure, GuestObject, type OperationContext, type ThrowCompletion, type Value } from "./runtime.js";
import type { Location } from "./syntax.js";

export function temporalOptionString(value: Value, context: OperationContext, loc: Location): StringCompletion {
    const primitive = toPrimitive(value, "string", context, loc);
    return primitive.type === "throw" ? primitive : toString(primitive.value, loc, context.realm);
}

export function temporalOverflowReject(supplied: Value, context: OperationContext, loc: Location): { type: "normal"; value: boolean } | ThrowCompletion {
    let options: GuestObject;
    if (supplied.kind === "undefined") options = new GuestObject(null);
    else if (supplied.kind === "object") options = supplied.object;
    else return languageFailure(context.realm, "TypeError", "Temporal options must be an object", loc);
    const read = options.internalGet("overflow", { kind: "object", object: options }, context, loc);
    if (read.type === "throw") return read;
    if (read.value.kind === "undefined") return { type: "normal", value: false };
    const overflow = temporalOptionString(read.value, context, loc);
    if (overflow.type === "throw") return overflow;
    if (overflow.value !== "constrain" && overflow.value !== "reject")
        return languageFailure(context.realm, "RangeError", "invalid overflow option", loc);
    return { type: "normal", value: overflow.value === "reject" };
}

export function temporalRoundingMode(options: GuestObject, context: OperationContext, loc: Location, fallback: TemporalRoundingMode): { type: "normal"; value: TemporalRoundingMode } | ThrowCompletion {
    const read = options.internalGet("roundingMode", { kind: "object", object: options }, context, loc);
    if (read.type === "throw") return read;
    if (read.value.kind === "undefined") return { type: "normal", value: fallback };
    const converted = temporalOptionString(read.value, context, loc);
    if (converted.type === "throw") return converted;
    const mode = converted.value;
    if (mode === "ceil" || mode === "floor" || mode === "expand" || mode === "trunc" || mode === "halfCeil" ||
        mode === "halfFloor" || mode === "halfExpand" || mode === "halfTrunc" || mode === "halfEven") return { type: "normal", value: mode };
    return languageFailure(context.realm, "RangeError", "invalid rounding mode", loc);
}

export function temporalFractionalDigits(options: GuestObject, context: OperationContext, loc: Location): { type: "normal"; value: "auto" | number } | ThrowCompletion {
    const read = options.internalGet("fractionalSecondDigits", { kind: "object", object: options }, context, loc);
    if (read.type === "throw") return read;
    if (read.value.kind === "undefined") return { type: "normal", value: "auto" };
    if (read.value.kind !== "number") {
        const text = temporalOptionString(read.value, context, loc);
        if (text.type === "throw") return text;
        if (text.value === "auto") return { type: "normal", value: "auto" };
    } else {
        const digits = Math.floor(read.value.value);
        if (Number.isFinite(digits) && digits >= 0 && digits <= 9) return { type: "normal", value: digits };
    }
    return languageFailure(context.realm, "RangeError", "invalid fractional second digits", loc);
}

export function temporalSmallestUnit(options: GuestObject, context: OperationContext, loc: Location): { type: "normal"; value: string } | ThrowCompletion {
    return temporalUnitOption(options, "smallestUnit", context, loc);
}

export function temporalUnitOption(options: GuestObject, name: string, context: OperationContext, loc: Location): { type: "normal"; value: string } | ThrowCompletion {
    const read = options.internalGet(name, { kind: "object", object: options }, context, loc);
    if (read.type === "throw") return read;
    if (read.value.kind === "undefined") return { type: "normal", value: "" };
    const text = temporalOptionString(read.value, context, loc);
    if (text.type === "throw") return text;
    if (text.value.length <= 12) {
        const unit = text.value.endsWith("s") ? text.value.slice(0, -1) : text.value;
        if (unit === "year" || unit === "month" || unit === "week" || unit === "day" || unit === "hour" ||
            unit === "minute" || unit === "second" || unit === "millisecond" || unit === "microsecond" || unit === "nanosecond" || text.value === "auto")
            return { type: "normal", value: unit };
    }
    return languageFailure(context.realm, "RangeError", "invalid Temporal unit", loc);
}

export function temporalPrecisionNanoseconds(precision: TemporalTimePrecision): bigint {
    return typeof precision === "number" ? BigInt(Math.pow(10, 9 - precision)) : precision === "minute" ? 60000000000n : 1n;
}

export function temporalStringPrecision(unit: string, digits: "auto" | number): TemporalTimePrecision | null {
    switch (unit) {
        case "": return digits;
        case "minute": return "minute";
        case "second": return 0;
        case "millisecond": return 3;
        case "microsecond": return 6;
        case "nanosecond": return 9;
        default: return null;
    }
}

export function temporalRoundingIncrement(options: GuestObject, context: OperationContext, loc: Location): NumberCompletion {
    const read = options.internalGet("roundingIncrement", { kind: "object", object: options }, context, loc);
    if (read.type === "throw") return read;
    if (read.value.kind === "undefined") return { type: "normal", value: 1 };
    const primitive = toPrimitive(read.value, "number", context, loc);
    if (primitive.type === "throw") return primitive;
    const converted = toNumber(primitive.value, loc, context.realm);
    if (converted.type === "throw") return converted;
    const integer = Math.trunc(converted.value);
    if (!Number.isFinite(integer) || integer < 1 || integer > 1000000000)
        return languageFailure(context.realm, "RangeError", "invalid rounding increment", loc);
    return { type: "normal", value: integer };
}

export function temporalUnitNanoseconds(name: string): bigint | null {
    const unit = name.endsWith("s") ? name.slice(0, -1) : name;
    switch (unit) {
        case "hour": return 3600000000000n;
        case "minute": return 60000000000n;
        case "second": return 1000000000n;
        case "millisecond": return 1000000n;
        case "microsecond": return 1000n;
        case "nanosecond": return 1n;
        default: return null;
    }
}

export function temporalCalendarName(options: GuestObject, context: OperationContext, loc: Location): StringCompletion {
    const read = options.internalGet("calendarName", { kind: "object", object: options }, context, loc);
    if (read.type === "throw") return read;
    if (read.value.kind === "undefined") return { type: "normal", value: "auto" };
    const option = temporalOptionString(read.value, context, loc);
    if (option.type === "throw") return option;
    const name = option.value;
    return name === "auto" || name === "always" || name === "never" || name === "critical" ? option :
        languageFailure(context.realm, "RangeError", "invalid calendarName option", loc);
}
