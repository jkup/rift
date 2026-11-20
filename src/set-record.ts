import { toNumber } from "./conversion.js";
import { toPrimitive } from "./primitive-conversion.js";
import {
    languageFailure,
    type OperationContext,
    type ThrowCompletion,
    type Value,
} from "./runtime.js";
import type { Location } from "./syntax.js";

export type SetRecord = { object: Value; size: number; has: Value; keys: Value };
type SetRecordCompletion = { type: "normal"; value: SetRecord } | ThrowCompletion;

// ECMAScript GetSetRecord: property reads and size coercion are observable.
// https://tc39.es/ecma262/#sec-getsetrecord
export function getSetRecord(
    object: Value,
    context: OperationContext,
    loc: Location,
): SetRecordCompletion {
    if (object.kind !== "object") {
        return languageFailure(
            context.realm,
            "TypeError",
            "set-like argument must be an object",
            loc,
        );
    }
    const rawSize = object.object.internalGet("size", object, context, loc);
    if (rawSize.type === "throw") {
        return rawSize;
    }
    const primitive = toPrimitive(rawSize.value, "number", context, loc);
    if (primitive.type === "throw") {
        return primitive;
    }
    const number = toNumber(primitive.value, loc, context.realm);
    if (number.type === "throw") {
        return number;
    }
    if (Number.isNaN(number.value)) {
        return languageFailure(context.realm, "TypeError", "set-like size is NaN", loc);
    }
    const size = Math.trunc(number.value);
    if (size < 0) {
        return languageFailure(context.realm, "RangeError", "set-like size is negative", loc);
    }
    const has = object.object.internalGet("has", object, context, loc);
    if (has.type === "throw") {
        return has;
    }
    if (has.value.kind !== "object" || has.value.object.callable === null) {
        return languageFailure(context.realm, "TypeError", "set-like has is not callable", loc);
    }
    const keys = object.object.internalGet("keys", object, context, loc);
    if (keys.type === "throw") {
        return keys;
    }
    if (keys.value.kind !== "object" || keys.value.object.callable === null) {
        return languageFailure(context.realm, "TypeError", "set-like keys is not callable", loc);
    }
    return { type: "normal", value: { object, size, has: has.value, keys: keys.value } };
}
