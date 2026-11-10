import type { Realm } from "../realm.js";
import { temporalZonedDateTimeObject } from "../temporal-zoned-date-time-object.js";
import { toTemporalZonedFields } from "./temporal-zoned-conversion.js";
import { dateTimeDifferenceSettings } from "../temporal-date-time-difference-options.js";
import { roundZonedDateTimeDifference } from "../temporal-zoned-difference-round.js";
import { createTemporalDuration } from "../temporal-duration-object.js";
import { balanceDurationTime } from "../temporal-duration-balance.js";
import { dateDuration } from "../temporal-calendar-round.js";
import { negateTemporalRoundingMode } from "../temporal-rounding.js";
import { languageFailure, UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerTemporalZonedDifference(realm: Realm): void {
    for (const name of ["until", "since"]) {
        realm.registerBuiltin(realm.temporalZonedDateTimePrototype, name, 1, (receiver, args, context, loc): ValueCompletion => {
            const left = temporalZonedDateTimeObject(receiver, context, loc);
            if (left.type === "throw") return left;
            const right = toTemporalZonedFields(args.length === 0 ? UNDEFINED : args[0], UNDEFINED, context, loc);
            if (right.type === "throw") return right;
            const settings = dateTimeDifferenceSettings(args.length < 2 ? UNDEFINED : args[1], context, loc, "hour");
            if (settings.type === "throw") return settings;
            const options = settings.value, largest = options.largest;
            const calendarUnit = largest === "years" || largest === "months" || largest === "weeks" || largest === "days";
            if (calendarUnit && left.value.timeZone.identifier !== right.timeZone.identifier)
                return languageFailure(context.realm, "RangeError", "calendar differences require matching time zones", loc);
            if (calendarUnit && left.value.epochNanoseconds === right.epoch)
                return createTemporalDuration(dateDuration(0, 0, 0), context.realm.temporalDurationPrototype, context, loc);
            const mode = name === "since" ? negateTemporalRoundingMode(options.mode) : options.mode;
            const rounded = roundZonedDateTimeDifference(left.value.epochNanoseconds, right.epoch, left.value.timeZone, largest, options.smallest, options.increment, mode);
            if (rounded === null) return languageFailure(context.realm, "RangeError", "zoned difference rounding exceeds range", loc);
            const date = name === "since" ? dateDuration(-rounded.date.years, -rounded.date.months, -rounded.date.weeks, -rounded.date.days) : rounded.date;
            const result = balanceDurationTime(name === "since" ? -rounded.time : rounded.time, date, calendarUnit ? "hours" : largest);
            return result === null ? languageFailure(context.realm, "RangeError", "zoned difference exceeds duration range", loc) :
                createTemporalDuration(result, context.realm.temporalDurationPrototype, context, loc);
        });
    }
}
