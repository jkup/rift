import type { Realm } from "../../realm.js";
import {
    createTemporalPlainDateTime,
    temporalPlainDateTimeValue,
} from "../../temporal/temporal-plain-date-time-object.js";
import {
    readTemporalDateTimeFields,
    resolveTemporalDateTimeFields,
} from "../../temporal/temporal-date-time-fields.js";
import { mergeTemporalDateFields } from "../../temporal/temporal-date-fields.js";
import { temporalPartialObject } from "../../temporal/temporal-partial.js";
import { temporalOverflowReject } from "../../temporal/temporal-options.js";
import { languageFailure, UNDEFINED, type ValueCompletion } from "../../runtime.js";

export function registerTemporalPlainDateTimeWith(realm: Realm): void {
    realm.registerBuiltin(
        realm.temporalPlainDateTimePrototype,
        "with",
        1,
        (receiver, args, context, loc): ValueCompletion => {
            const value = temporalPlainDateTimeValue(receiver, context, loc);
            if (value.type === "throw") {
                return value;
            }
            const partial = temporalPartialObject(
                args.length === 0 ? UNDEFINED : args[0],
                context,
                loc,
            );
            if (partial.type === "throw") {
                return partial;
            }
            const read = readTemporalDateTimeFields(partial.value, context, loc, value.value);
            if (read.type === "throw") {
                return read;
            }
            if (!read.present) {
                return languageFailure(
                    context.realm,
                    "TypeError",
                    "at least one date-time field is required",
                    loc,
                );
            }
            const fields = {
                date: mergeTemporalDateFields(value.value.date, read.value.date),
                time: read.value.time,
            };
            const overflow = temporalOverflowReject(
                args.length < 2 ? UNDEFINED : args[1],
                context,
                loc,
            );
            if (overflow.type === "throw") {
                return overflow;
            }
            const result = resolveTemporalDateTimeFields(fields, overflow.value, context, loc);
            return result.type === "throw"
                ? result
                : createTemporalPlainDateTime(
                      result.value,
                      context.realm.temporalPlainDateTimePrototype,
                      context,
                      loc,
                  );
        },
    );
}
