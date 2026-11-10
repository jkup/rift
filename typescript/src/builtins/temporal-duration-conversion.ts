import type { Realm } from "../realm.js";
import { GuestTemporalDuration, createTemporalDuration, temporalDurationValue } from "../temporal-duration-object.js";
import { readTemporalDurationFields } from "../temporal-duration-fields.js";
import { parseTemporalDuration } from "../temporal-duration-parse.js";
import { languageFailure, UNDEFINED, type GuestObject, type ValueCompletion } from "../runtime.js";

export function registerTemporalDurationConversion(realm: Realm, constructor: GuestObject): void {
    realm.registerBuiltin(constructor, "from", 1, (_receiver, args, context, loc): ValueCompletion => {
        const value = args.length === 0 ? UNDEFINED : args[0];
        if (value.kind === "object") {
            if (value.object instanceof GuestTemporalDuration)
                return createTemporalDuration(value.object.duration, context.realm.temporalDurationPrototype, context, loc);
            const fields = readTemporalDurationFields(value.object, { years: 0, months: 0, weeks: 0, days: 0, hours: 0, minutes: 0,
                seconds: 0, milliseconds: 0, microseconds: 0, nanoseconds: 0 }, context, loc);
            return fields.type === "throw" ? fields : createTemporalDuration(fields.value, context.realm.temporalDurationPrototype, context, loc);
        }
        if (value.kind !== "string") return languageFailure(context.realm, "TypeError", "Duration requires a string or duration object", loc);
        for (let i = 0; i < value.value.length; i++) {
            const work = context.tick(loc);
            if (work.type === "throw") return work;
        }
        const parsed = parseTemporalDuration(value.value);
        return parsed === null ? languageFailure(context.realm, "RangeError", "invalid Duration string", loc) :
            createTemporalDuration(parsed, context.realm.temporalDurationPrototype, context, loc);
    });
    realm.registerBuiltin(realm.temporalDurationPrototype, "with", 1, (receiver, args, context, loc): ValueCompletion => {
        const duration = temporalDurationValue(receiver, context, loc);
        if (duration.type === "throw") return duration;
        const partial = args.length === 0 ? UNDEFINED : args[0];
        if (partial.kind !== "object") return languageFailure(context.realm, "TypeError", "with requires a duration object", loc);
        const fields = readTemporalDurationFields(partial.object, duration.value, context, loc);
        return fields.type === "throw" ? fields : createTemporalDuration(fields.value, context.realm.temporalDurationPrototype, context, loc);
    });
}
