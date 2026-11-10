import type { Realm } from "../realm.js";
import { GuestTemporalPlainTime, createTemporalPlainTime, temporalPlainTimeValue } from "../temporal-plain-time-object.js";
import { readTemporalTimeFields } from "../temporal-time-fields.js";
import { temporalOptionString } from "../temporal-options.js";
import { isValidTime } from "../temporal-time.js";
import { GuestObject, languageFailure, UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerTemporalPlainTimeWith(realm: Realm): void {
    realm.registerBuiltin(realm.temporalPlainTimePrototype, "with", 1, (receiver, args, context, loc): ValueCompletion => {
        const time = temporalPlainTimeValue(receiver, context, loc);
        if (time.type === "throw") return time;
        const partial = args.length === 0 ? UNDEFINED : args[0];
        if (partial.kind !== "object" || partial.object instanceof GuestTemporalPlainTime)
            return languageFailure(context.realm, "TypeError", "with requires a partial time object", loc);
        for (const name of ["calendar", "timeZone"]) {
            const read = partial.object.internalGet(name, partial, context, loc);
            if (read.type === "throw") return read;
            if (read.value.kind !== "undefined") return languageFailure(context.realm, "TypeError", "partial time must not specify calendar or timeZone", loc);
        }
        const fields = readTemporalTimeFields(partial.object, time.value, context, loc);
        if (fields.type === "throw") return fields;
        const supplied = args.length < 2 ? UNDEFINED : args[1];
        let options: GuestObject;
        if (supplied.kind === "undefined") options = new GuestObject(null);
        else if (supplied.kind === "object") options = supplied.object;
        else return languageFailure(context.realm, "TypeError", "with options must be an object", loc);
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
        const value = fields.value;
        if (reject) {
            if (!isValidTime(value)) return languageFailure(context.realm, "RangeError", "time field is outside its range", loc);
            return createTemporalPlainTime(value, context.realm.temporalPlainTimePrototype, context, loc);
        }
        return createTemporalPlainTime({
            hour: Math.max(0, Math.min(23, value.hour)), minute: Math.max(0, Math.min(59, value.minute)), second: Math.max(0, Math.min(59, value.second)),
            millisecond: Math.max(0, Math.min(999, value.millisecond)), microsecond: Math.max(0, Math.min(999, value.microsecond)), nanosecond: Math.max(0, Math.min(999, value.nanosecond)),
        }, context.realm.temporalPlainTimePrototype, context, loc);
    });
}
