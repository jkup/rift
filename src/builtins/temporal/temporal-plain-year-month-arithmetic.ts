import { durationTimeNanoseconds } from "../../temporal/temporal-duration.js";
import type { Realm } from "../../realm.js";
import {
    createTemporalPlainYearMonth,
    temporalPlainYearMonthValue,
} from "../../temporal/temporal-plain-year-month-object.js";
import { toTemporalDurationFields } from "../../temporal/temporal-duration-fields.js";
import { temporalOverflowReject } from "../../temporal/temporal-options.js";
import { addTemporalDate } from "../../temporal/temporal-date-arithmetic.js";
import { languageFailure, UNDEFINED, type ValueCompletion } from "../../runtime.js";

export function registerTemporalPlainYearMonthArithmetic(realm: Realm): void {
    for (const name of ["add", "subtract"]) {
        realm.registerBuiltin(
            realm.temporalPlainYearMonthPrototype,
            name,
            1,
            (receiver, args, context, loc): ValueCompletion => {
                const date = temporalPlainYearMonthValue(receiver, context, loc);
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
                const fields = duration.value;
                if (
                    fields.weeks !== 0 ||
                    fields.days !== 0 ||
                    durationTimeNanoseconds(fields) !== 0n
                ) {
                    return languageFailure(
                        context.realm,
                        "RangeError",
                        "year-month arithmetic requires only years and months",
                        loc,
                    );
                }
                const first = { year: date.value.year, month: date.value.month, day: 1 };
                const result = addTemporalDate(first, fields, name === "subtract", overflow.value);
                return result === null
                    ? languageFailure(
                          context.realm,
                          "RangeError",
                          "year-month arithmetic overflows",
                          loc,
                      )
                    : createTemporalPlainYearMonth(
                          result,
                          context.realm.temporalPlainYearMonthPrototype,
                          context,
                          loc,
                      );
            },
        );
    }
}
