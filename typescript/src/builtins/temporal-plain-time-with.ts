import type { Realm } from "../realm.js";
import { GuestTemporalPlainTime, createTemporalPlainTime, temporalPlainTimeValue } from "../temporal-plain-time-object.js";
import { readTemporalTimeFields, regulateTemporalTime } from "../temporal-time-fields.js";
import { languageFailure, UNDEFINED, type ValueCompletion } from "../runtime.js";

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
        const result = regulateTemporalTime(fields.value, supplied, context, loc);
        return result.type === "throw" ? result : createTemporalPlainTime(result.value, context.realm.temporalPlainTimePrototype, context, loc);
    });
}
