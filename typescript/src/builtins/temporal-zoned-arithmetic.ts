import type { Realm } from "../realm.js";
import { createTemporalZonedDateTime, temporalZonedDateTimeObject } from "../temporal-zoned-date-time-object.js";
import { toTemporalDurationFields } from "../temporal-duration-fields.js";
import { temporalOverflowReject } from "../temporal-options.js";
import { addTemporalZonedDateTime } from "../temporal-zoned-arithmetic.js";
import { languageFailure, UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerTemporalZonedArithmetic(realm: Realm): void {
    for (const name of ["add", "subtract"]) {
        realm.registerBuiltin(realm.temporalZonedDateTimePrototype, name, 1, (receiver, args, context, loc): ValueCompletion => {
            const object = temporalZonedDateTimeObject(receiver, context, loc);
            if (object.type === "throw") return object;
            const duration = toTemporalDurationFields(args.length === 0 ? UNDEFINED : args[0], context, loc);
            if (duration.type === "throw") return duration;
            const overflow = temporalOverflowReject(args.length < 2 ? UNDEFINED : args[1], context, loc);
            if (overflow.type === "throw") return overflow;
            const result = addTemporalZonedDateTime(object.value.epochNanoseconds, object.value.timeZone, duration.value, name === "subtract", overflow.value);
            return result === null ? languageFailure(context.realm, "RangeError", "zoned arithmetic outside the supported range", loc) :
                createTemporalZonedDateTime(result, object.value.timeZone, context.realm.temporalZonedDateTimePrototype, context, loc);
        });
    }
}
