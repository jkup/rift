import type { Realm } from "../realm.js";
import type { Location } from "../syntax.js";
import { temporalInstantValue } from "../temporal-instant-object.js";
import { temporalOptionString, temporalRoundingMode } from "../temporal-options.js";
import { roundTemporalInstant } from "../temporal-rounding.js";
import { formatUTCInstant, formatOffsetInstant, type TemporalTimePrecision } from "../temporal-time-format.js";
import { parseUTCOffset } from "../utc-offset.js";
import { GuestObject, languageFailure, normal, unsupportedFailure, UNDEFINED, type OperationContext, type ThrowCompletion, type ValueCompletion } from "../runtime.js";

function fractionalDigits(options: GuestObject, context: OperationContext, loc: Location): { type: "normal"; value: "auto" | number } | ThrowCompletion {
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

function smallestUnit(options: GuestObject, context: OperationContext, loc: Location): { type: "normal"; value: string } | ThrowCompletion {
    const read = options.internalGet("smallestUnit", { kind: "object", object: options }, context, loc);
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

function precisionNanoseconds(precision: TemporalTimePrecision): bigint {
    return typeof precision === "number" ? BigInt(Math.pow(10, 9 - precision)) : precision === "minute" ? 60000000000n : 1n;
}

export function registerTemporalInstantString(realm: Realm): void {
    realm.registerBuiltin(realm.temporalInstantPrototype, "toString", 0, (receiver, args, context, loc): ValueCompletion => {
        const value = temporalInstantValue(receiver, context, loc);
        if (value.type === "throw") return value;
        const supplied = args.length === 0 ? UNDEFINED : args[0];
        let options: GuestObject;
        if (supplied.kind === "undefined") options = new GuestObject(null);
        else if (supplied.kind === "object") options = supplied.object;
        else return languageFailure(context.realm, "TypeError", "Instant string options must be an object", loc);
        const digits = fractionalDigits(options, context, loc);
        if (digits.type === "throw") return digits;
        const mode = temporalRoundingMode(options, context, loc, "trunc");
        if (mode.type === "throw") return mode;
        const unit = smallestUnit(options, context, loc);
        if (unit.type === "throw") return unit;
        const zone = options.internalGet("timeZone", { kind: "object", object: options }, context, loc);
        if (zone.type === "throw") return zone;
        let precision: TemporalTimePrecision = digits.value;
        switch (unit.value) {
            case "": break;
            case "minute": precision = "minute"; break;
            case "second": precision = 0; break;
            case "millisecond": precision = 3; break;
            case "microsecond": precision = 6; break;
            case "nanosecond": precision = 9; break;
            default: return languageFailure(context.realm, "RangeError", "Instant strings require minute or smaller units", loc);
        }
        let offset: number | null = null;
        if (zone.value.kind !== "undefined") {
            if (zone.value.kind !== "string") return languageFailure(context.realm, "TypeError", "timeZone must be a string", loc);
            const text = zone.value.value;
            if (text.length === 3 && text.toUpperCase() === "UTC") offset = 0;
            else {
                const parsed = parseUTCOffset(text, false);
                if (parsed === null) return unsupportedFailure("runtime.temporal-time-zone", "TypeError", "time-zone identifier requires an unavailable backend or grammar", loc);
                offset = Number(parsed / 60000000000n);
            }
        }
        const rounded = roundTemporalInstant(value.value, precisionNanoseconds(precision), mode.value);
        const formatted = offset === null ? formatUTCInstant(rounded, precision) : formatOffsetInstant(rounded, offset, precision);
        if (formatted === null) throw new Error("Instant string range invariant");
        return normal({ kind: "string", value: formatted });
    });
}
