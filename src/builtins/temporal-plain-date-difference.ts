import type { Realm } from "../realm.js";
import { temporalPlainDateValue } from "../temporal-plain-date-object.js";
import { toDateFields } from "./temporal-plain-date-conversion.js";
import { createTemporalDuration } from "../temporal-duration-object.js";
import { dateDifferenceSettings } from "../temporal-date-difference-options.js";
import { roundDateDifference } from "../temporal-date-round.js";
import { dateDuration } from "../temporal-calendar-round.js";
import { negateTemporalRoundingMode } from "../temporal-rounding.js";
import { languageFailure, UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerTemporalPlainDateDifference(realm: Realm): void {
    for (const name of ["until", "since"]) {
        realm.registerBuiltin(realm.temporalPlainDatePrototype, name, 1, (receiver, args, context, loc): ValueCompletion => {
            const left = temporalPlainDateValue(receiver, context, loc);
            if (left.type === "throw") return left;
            const right = toDateFields(args.length === 0 ? UNDEFINED : args[0], UNDEFINED, context, loc);
            if (right.type === "throw") return right;
            const settings = dateDifferenceSettings(args.length < 2 ? UNDEFINED : args[1], context, loc);
            if (settings.type === "throw") return settings;
            const options = settings.value;
            const mode = name === "since" ? negateTemporalRoundingMode(options.mode) : options.mode;
            const rounded = roundDateDifference(left.value, right.value, options.largest, options.smallest, options.increment, mode);
            if (rounded === null) return languageFailure(context.realm, "RangeError", "date difference rounding exceeds date range", loc);
            const result = name === "since" ? dateDuration(-rounded.years, -rounded.months, -rounded.weeks, -rounded.days) : rounded;
            return createTemporalDuration(result, context.realm.temporalDurationPrototype, context, loc);
        });
    }
}
