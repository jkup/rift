import type { Realm } from "../realm.js";
import { createTemporalZonedDateTime, temporalZonedDateTimeObject } from "../temporal-zoned-date-time-object.js";
import { temporalPartialObject } from "../temporal-partial.js";
import { resolveTemporalZonedFields } from "./temporal-zoned-conversion.js";
import { interpretTemporalZonedDateTime } from "../temporal-zoned-interpret.js";
import { languageFailure, UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerTemporalZonedWith(realm: Realm): void {
    realm.registerBuiltin(realm.temporalZonedDateTimePrototype, "with", 1, (receiver, args, context, loc): ValueCompletion => {
        const object = temporalZonedDateTimeObject(receiver, context, loc);
        if (object.type === "throw") return object;
        const partial = temporalPartialObject(args.length === 0 ? UNDEFINED : args[0], context, loc);
        if (partial.type === "throw") return partial;
        const fields = resolveTemporalZonedFields(partial.value, args.length < 2 ? UNDEFINED : args[1], context, loc, object.value);
        if (fields.type === "throw") return fields;
        const epoch = interpretTemporalZonedDateTime(fields.record, fields.offset);
        return epoch === null ? languageFailure(context.realm, "RangeError", "invalid zoned replacement offset or range", loc) :
            createTemporalZonedDateTime(epoch, object.value.timeZone, context.realm.temporalZonedDateTimePrototype, context, loc);
    });
}
