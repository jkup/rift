import type { Location } from "./syntax.js";
import { isValidDuration, type DurationFields } from "./temporal-duration.js";
import { toPrimitive } from "./primitive-conversion.js";
import { toNumber, type NumberCompletion } from "./conversion.js";
import { languageFailure, type GuestObject, type Value, type OperationContext, type ThrowCompletion } from "./runtime.js";

export function temporalDurationInteger(value: Value, context: OperationContext, loc: Location): NumberCompletion {
    const primitive = toPrimitive(value, "number", context, loc);
    if (primitive.type === "throw") return primitive;
    const converted = toNumber(primitive.value, loc, context.realm);
    if (converted.type === "throw") return converted;
    if (!Number.isInteger(converted.value)) return languageFailure(context.realm, "RangeError", "duration fields must be finite integers", loc);
    return { type: "normal", value: converted.value === 0 ? 0 : converted.value };
}

export function readTemporalDurationFields(object: GuestObject, defaults: DurationFields, context: OperationContext, loc: Location): { type: "normal"; value: DurationFields } | ThrowCompletion {
    const names: (keyof DurationFields)[] = ["days", "hours", "microseconds", "milliseconds", "minutes", "months", "nanoseconds", "seconds", "weeks", "years"];
    const fields: number[] = [];
    let present = false;
    for (const name of names) {
        const read = object.internalGet(name, { kind: "object", object }, context, loc);
        if (read.type === "throw") return read;
        if (read.value.kind === "undefined") fields.push(defaults[name]);
        else {
            const converted = temporalDurationInteger(read.value, context, loc);
            if (converted.type === "throw") return converted;
            fields.push(converted.value);
            present = true;
        }
    }
    if (!present) return languageFailure(context.realm, "TypeError", "at least one duration field is required", loc);
    const value: DurationFields = {
        years: fields[9], months: fields[5], weeks: fields[8], days: fields[0], hours: fields[1], minutes: fields[4],
        seconds: fields[7], milliseconds: fields[3], microseconds: fields[2], nanoseconds: fields[6],
    };
    return isValidDuration(value) ? { type: "normal", value } : languageFailure(context.realm, "RangeError", "duration has mixed signs or exceeds its range", loc);
}
