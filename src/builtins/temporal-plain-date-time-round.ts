import type { Realm } from "../realm.js";
import { createTemporalPlainDateTime, temporalPlainDateTimeValue } from "../temporal-plain-date-time-object.js";
import { temporalTimeRoundSettings } from "../temporal-time-round-options.js";
import { roundISODateTime } from "../iso-date-time.js";
import { languageFailure, UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerTemporalPlainDateTimeRound(realm: Realm): void {
    realm.registerBuiltin(realm.temporalPlainDateTimePrototype, "round", 1, (receiver, args, context, loc): ValueCompletion => {
        const value = temporalPlainDateTimeValue(receiver, context, loc);
        if (value.type === "throw") return value;
        const settings = temporalTimeRoundSettings(args.length === 0 ? UNDEFINED : args[0], true, context, loc);
        if (settings.type === "throw") return settings;
        const result = roundISODateTime(value.value, settings.quantum, settings.mode);
        return result === null ? languageFailure(context.realm, "RangeError", "rounded date-time is outside its range", loc) :
            createTemporalPlainDateTime(result, context.realm.temporalPlainDateTimePrototype, context, loc);
    });
}
