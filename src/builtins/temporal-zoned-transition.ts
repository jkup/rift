import { timeZoneTransition } from "../temporal-time-zone-operations.js";
import type { Realm } from "../realm.js";
import { createTemporalZonedDateTime, temporalZonedDateTimeObject } from "../temporal-zoned-date-time-object.js";
import { temporalOptionString } from "../temporal-options.js";
import { languageFailure, normal, UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerTemporalZonedTransition(realm: Realm): void {
    realm.registerBuiltin(realm.temporalZonedDateTimePrototype, "getTimeZoneTransition", 1, (receiver, args, context, loc): ValueCompletion => {
        const object = temporalZonedDateTimeObject(receiver, context, loc);
        if (object.type === "throw") return object;
        const supplied = args.length === 0 ? UNDEFINED : args[0];
        let direction = supplied;
        if (supplied.kind !== "string") {
            if (supplied.kind !== "object") return languageFailure(context.realm, "TypeError", "transition direction requires a string or options object", loc);
            const read = supplied.object.internalGet("direction", supplied, context, loc);
            if (read.type === "throw") return read;
            direction = read.value;
        }
        if (direction.kind === "undefined") return languageFailure(context.realm, "RangeError", "transition direction is required", loc);
        const converted = temporalOptionString(direction, context, loc);
        if (converted.type === "throw") return converted;
        if (converted.value !== "next" && converted.value !== "previous") return languageFailure(context.realm, "RangeError", "invalid transition direction", loc);
        const epoch = timeZoneTransition(object.value.timeZone, object.value.epochNanoseconds, converted.value);
        return epoch === null ? normal({ kind: "null" }) : createTemporalZonedDateTime(epoch, object.value.timeZone, context.realm.temporalZonedDateTimePrototype, context, loc);
    });
}
