import { temporalOptionString } from "./temporal-options.js";
import type { Location } from "./syntax.js";
import { isValidTime, type TimeFields } from "./temporal-time.js";
import { temporalInteger } from "./temporal-integer.js";
import { GuestObject, languageFailure, type Value, type OperationContext, type ThrowCompletion } from "./runtime.js";

export function readTemporalTimeFields(object: GuestObject, defaults: TimeFields, context: OperationContext, loc: Location): { type: "normal"; value: TimeFields } | ThrowCompletion {
    const names: (keyof TimeFields)[] = ["hour", "microsecond", "millisecond", "minute", "nanosecond", "second"];
    const fields: number[] = [];
    let present = false;
    for (const name of names) {
        const read = object.internalGet(name, { kind: "object", object }, context, loc);
        if (read.type === "throw") return read;
        if (read.value.kind === "undefined") fields.push(defaults[name]);
        else {
            const converted = temporalInteger(read.value, context, loc);
            if (converted.type === "throw") return converted;
            fields.push(converted.value);
            present = true;
        }
    }
    if (!present) return languageFailure(context.realm, "TypeError", "at least one time field is required", loc);
    return { type: "normal", value: { hour: fields[0], minute: fields[3], second: fields[5], millisecond: fields[2], microsecond: fields[1], nanosecond: fields[4] } };
}

export function regulateTemporalTime(value: TimeFields, supplied: Value, context: OperationContext, loc: Location): { type: "normal"; value: TimeFields } | ThrowCompletion {
    let options: GuestObject;
    if (supplied.kind === "undefined") options = new GuestObject(null);
    else if (supplied.kind === "object") options = supplied.object;
    else return languageFailure(context.realm, "TypeError", "Temporal time options must be an object", loc);
    const read = options.internalGet("overflow", { kind: "object", object: options }, context, loc);
    if (read.type === "throw") return read;
    let reject = false;
    if (read.value.kind !== "undefined") {
        const overflow = temporalOptionString(read.value, context, loc);
        if (overflow.type === "throw") return overflow;
        if (overflow.value !== "constrain" && overflow.value !== "reject")
            return languageFailure(context.realm, "RangeError", "invalid overflow option", loc);
        reject = overflow.value === "reject";
    }
    if (reject) {
        if (!isValidTime(value)) return languageFailure(context.realm, "RangeError", "time field is outside its range", loc);
        return { type: "normal", value };
    }
    return { type: "normal", value: {
        hour: Math.max(0, Math.min(23, value.hour)), minute: Math.max(0, Math.min(59, value.minute)), second: Math.max(0, Math.min(59, value.second)),
        millisecond: Math.max(0, Math.min(999, value.millisecond)), microsecond: Math.max(0, Math.min(999, value.microsecond)), nanosecond: Math.max(0, Math.min(999, value.nanosecond)),
    } };
}
