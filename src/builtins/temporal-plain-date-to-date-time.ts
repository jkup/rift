import type { Realm } from "../realm.js";
import { temporalPlainDateValue } from "../temporal-plain-date-object.js";
import { createTemporalPlainDateTime } from "../temporal-plain-date-time-object.js";
import { combineISODateTime, isoDateTimeWithinLimits } from "../iso-date-time.js";
import { toTimeFieldsOrMidnight } from "./temporal-plain-time-conversion.js";
import { languageFailure, UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerTemporalPlainDateToDateTime(realm: Realm): void {
    realm.registerBuiltin(
        realm.temporalPlainDatePrototype,
        "toPlainDateTime",
        0,
        (receiver, args, context, loc): ValueCompletion => {
            const date = temporalPlainDateValue(receiver, context, loc);
            if (date.type === "throw") {
                return date;
            }
            const time = toTimeFieldsOrMidnight(
                args.length === 0 ? UNDEFINED : args[0],
                context,
                loc,
            );
            if (time.type === "throw") {
                return time;
            }
            const result = combineISODateTime(date.value, time.value);
            return isoDateTimeWithinLimits(result)
                ? createTemporalPlainDateTime(
                      result,
                      context.realm.temporalPlainDateTimePrototype,
                      context,
                      loc,
                  )
                : languageFailure(
                      context.realm,
                      "RangeError",
                      "date-time is outside its range",
                      loc,
                  );
        },
    );
}
