import type { Realm } from "../realm.js";
import {
    createTemporalPlainDateTime,
    temporalPlainDateTimeValue,
} from "../temporal-plain-date-time-object.js";
import { toTemporalDurationFields } from "../temporal-duration-fields.js";
import { temporalOverflowReject } from "../temporal-options.js";
import { addTemporalDateTime } from "../temporal-date-time-arithmetic.js";
import { languageFailure, UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerTemporalPlainDateTimeArithmetic(realm: Realm): void {
    for (const name of ["add", "subtract"]) {
        realm.registerBuiltin(
            realm.temporalPlainDateTimePrototype,
            name,
            1,
            (receiver, args, context, loc): ValueCompletion => {
                const date = temporalPlainDateTimeValue(receiver, context, loc);
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
                const result = addTemporalDateTime(
                    date.value,
                    duration.value,
                    name === "subtract",
                    overflow.value,
                );
                return result === null
                    ? languageFailure(context.realm, "RangeError", "date arithmetic overflows", loc)
                    : createTemporalPlainDateTime(
                          result,
                          context.realm.temporalPlainDateTimePrototype,
                          context,
                          loc,
                      );
            },
        );
    }
}
