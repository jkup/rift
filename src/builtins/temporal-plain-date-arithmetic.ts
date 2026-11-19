import type { Realm } from "../realm.js";
import { createTemporalPlainDate, temporalPlainDateValue } from "../temporal-plain-date-object.js";
import { toTemporalDurationFields } from "../temporal-duration-fields.js";
import { temporalOverflowReject } from "../temporal-options.js";
import { addTemporalDate } from "../temporal-date-arithmetic.js";
import { languageFailure, UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerTemporalPlainDateArithmetic(realm: Realm): void {
    for (const name of ["add", "subtract"]) {
        realm.registerBuiltin(
            realm.temporalPlainDatePrototype,
            name,
            1,
            (receiver, args, context, loc): ValueCompletion => {
                const date = temporalPlainDateValue(receiver, context, loc);
                if (date.type === "throw") {
                    return date;
                }
                const duration = toTemporalDurationFields(
                    args.length === 0 ? UNDEFINED : args[0],
                    context,
                    loc,
                );
                if (duration.type === "throw") {
                    return duration;
                }
                const overflow = temporalOverflowReject(
                    args.length < 2 ? UNDEFINED : args[1],
                    context,
                    loc,
                );
                if (overflow.type === "throw") {
                    return overflow;
                }
                const result = addTemporalDate(
                    date.value,
                    duration.value,
                    name === "subtract",
                    overflow.value,
                );
                return result === null
                    ? languageFailure(context.realm, "RangeError", "date arithmetic overflows", loc)
                    : createTemporalPlainDate(
                          result,
                          context.realm.temporalPlainDatePrototype,
                          context,
                          loc,
                      );
            },
        );
    }
}
