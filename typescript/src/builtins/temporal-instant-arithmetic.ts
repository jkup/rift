import type { Realm } from "../realm.js";
import { createTemporalInstant, temporalInstantValue } from "../temporal-instant-object.js";
import { toTemporalDurationFields } from "../temporal-duration-fields.js";
import { durationTimeNanoseconds } from "../temporal-duration.js";
import { isValidEpochNanoseconds } from "../iso-calendar.js";
import { languageFailure, UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerTemporalInstantArithmetic(realm: Realm): void {
    for (const name of ["add", "subtract"]) {
        realm.registerBuiltin(realm.temporalInstantPrototype, name, 1, (receiver, args, context, loc): ValueCompletion => {
            const instant = temporalInstantValue(receiver, context, loc);
            if (instant.type === "throw") return instant;
            const duration = toTemporalDurationFields(args.length === 0 ? UNDEFINED : args[0], context, loc);
            if (duration.type === "throw") return duration;
            const fields = duration.value;
            if (fields.years !== 0 || fields.months !== 0 || fields.weeks !== 0 || fields.days !== 0)
                return languageFailure(context.realm, "RangeError", "Instant arithmetic requires time units", loc);
            const amount = durationTimeNanoseconds(fields);
            const result = name === "add" ? instant.value + amount : instant.value - amount;
            if (!isValidEpochNanoseconds(result))
                return languageFailure(context.realm, "RangeError", "instant outside the supported range", loc);
            return createTemporalInstant(result, context.realm.temporalInstantPrototype, context, loc);
        });
    }
}
