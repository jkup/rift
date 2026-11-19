import type { Realm } from "../realm.js";
import { createTemporalPlainTime, temporalPlainTimeValue } from "../temporal-plain-time-object.js";
import { temporalPartialObject } from "../temporal-partial.js";
import { readTemporalTimeFields, regulateTemporalTime } from "../temporal-time-fields.js";
import { UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerTemporalPlainTimeWith(realm: Realm): void {
    realm.registerBuiltin(
        realm.temporalPlainTimePrototype,
        "with",
        1,
        (receiver, args, context, loc): ValueCompletion => {
            const time = temporalPlainTimeValue(receiver, context, loc);
            if (time.type === "throw") {
                return time;
            }
            const partial = temporalPartialObject(
                args.length === 0 ? UNDEFINED : args[0],
                context,
                loc,
            );
            if (partial.type === "throw") {
                return partial;
            }
            const fields = readTemporalTimeFields(partial.value, time.value, context, loc);
            if (fields.type === "throw") {
                return fields;
            }
            const supplied = args.length < 2 ? UNDEFINED : args[1];
            const result = regulateTemporalTime(fields.value, supplied, context, loc);
            return result.type === "throw"
                ? result
                : createTemporalPlainTime(
                      result.value,
                      context.realm.temporalPlainTimePrototype,
                      context,
                      loc,
                  );
        },
    );
}
