import type { Realm } from "../realm.js";
import { createTemporalDuration, temporalDurationValue } from "../temporal-duration-object.js";
import {
    readTemporalDurationFields,
    toTemporalDurationFields,
} from "../temporal-duration-fields.js";
import { languageFailure, UNDEFINED, type GuestObject, type ValueCompletion } from "../runtime.js";

export function registerTemporalDurationConversion(realm: Realm, constructor: GuestObject): void {
    realm.registerBuiltin(
        constructor,
        "from",
        1,
        (_receiver, args, context, loc): ValueCompletion => {
            const result = toTemporalDurationFields(
                args.length === 0 ? UNDEFINED : args[0],
                context,
                loc,
            );
            return result.type === "throw"
                ? result
                : createTemporalDuration(
                      result.value,
                      context.realm.temporalDurationPrototype,
                      context,
                      loc,
                  );
        },
    );
    realm.registerBuiltin(
        realm.temporalDurationPrototype,
        "with",
        1,
        (receiver, args, context, loc): ValueCompletion => {
            const duration = temporalDurationValue(receiver, context, loc);
            if (duration.type === "throw") {
                return duration;
            }
            const partial = args.length === 0 ? UNDEFINED : args[0];
            if (partial.kind !== "object") {
                return languageFailure(
                    context.realm,
                    "TypeError",
                    "with requires a duration object",
                    loc,
                );
            }
            const fields = readTemporalDurationFields(partial.object, duration.value, context, loc);
            return fields.type === "throw"
                ? fields
                : createTemporalDuration(
                      fields.value,
                      context.realm.temporalDurationPrototype,
                      context,
                      loc,
                  );
        },
    );
}
