import type { Location } from "./syntax.js";
import type { TimeFields } from "./temporal-time.js";
import { toPrimitive } from "./primitive-conversion.js";
import { toNumber, type NumberCompletion } from "./conversion.js";
import { languageFailure, type GuestObject, type Value, type OperationContext, type ThrowCompletion } from "./runtime.js";

export function temporalTimeInteger(value: Value, context: OperationContext, loc: Location): NumberCompletion {
    const primitive = toPrimitive(value, "number", context, loc);
    if (primitive.type === "throw") return primitive;
    const converted = toNumber(primitive.value, loc, context.realm);
    if (converted.type === "throw") return converted;
    if (!Number.isFinite(converted.value)) return languageFailure(context.realm, "RangeError", "time field must be finite", loc);
    const integer = Math.trunc(converted.value);
    return { type: "normal", value: integer === 0 ? 0 : integer };
}

export function readTemporalTimeFields(object: GuestObject, defaults: TimeFields, context: OperationContext, loc: Location): { type: "normal"; value: TimeFields } | ThrowCompletion {
    const names: (keyof TimeFields)[] = ["hour", "microsecond", "millisecond", "minute", "nanosecond", "second"];
    const fields: number[] = [];
    let present = false;
    for (const name of names) {
        const read = object.internalGet(name, { kind: "object", object }, context, loc);
        if (read.type === "throw") return read;
        if (read.value.kind === "undefined") fields.push(defaults[name]);
        else {
            const converted = temporalTimeInteger(read.value, context, loc);
            if (converted.type === "throw") return converted;
            fields.push(converted.value);
            present = true;
        }
    }
    if (!present) return languageFailure(context.realm, "TypeError", "at least one time field is required", loc);
    return { type: "normal", value: { hour: fields[0], minute: fields[3], second: fields[5], millisecond: fields[2], microsecond: fields[1], nanosecond: fields[4] } };
}
