import type { Realm } from "../realm.js";
import { createTemporalZonedDateTime, temporalZonedDateTimeObject, temporalZonedISODateTime } from "../temporal-zoned-date-time-object.js";
import { temporalTimeRoundSettings } from "../temporal-time-round-options.js";
import { roundISODateTime } from "../iso-date-time.js";
import { isoDateToEpochDay, isValidEpochNanoseconds } from "../iso-calendar.js";
import { NANOSECONDS_PER_DAY } from "../temporal-time.js";
import { roundTemporalInteger } from "../temporal-rounding.js";
import { interpretTemporalZonedDateTime } from "../temporal-zoned-interpret.js";
import { languageFailure, UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerTemporalZonedRound(realm: Realm): void {
    realm.registerBuiltin(realm.temporalZonedDateTimePrototype, "round", 1, (receiver, args, context, loc): ValueCompletion => {
        const object = temporalZonedDateTimeObject(receiver, context, loc);
        if (object.type === "throw") return object;
        const settings = temporalTimeRoundSettings(args.length === 0 ? UNDEFINED : args[0], true, context, loc);
        if (settings.type === "throw") return settings;
        const value = object.value;
        let epoch: bigint | null = value.epochNanoseconds;
        if (settings.quantum !== 1n) {
            const local = temporalZonedISODateTime(value);
            if (settings.quantum === NANOSECONDS_PER_DAY) {
                const day = isoDateToEpochDay(local.date);
                if (day === null) throw new Error("zoned rounding date invariant");
                const start = BigInt(day) * NANOSECONDS_PER_DAY - value.timeZone.offsetNanoseconds;
                const end = start + NANOSECONDS_PER_DAY;
                if (!isValidEpochNanoseconds(start) || !isValidEpochNanoseconds(end)) epoch = null;
                else epoch = start + roundTemporalInteger(value.epochNanoseconds - start, NANOSECONDS_PER_DAY, settings.mode);
            } else {
                const rounded = roundISODateTime(local, settings.quantum, settings.mode);
                epoch = rounded === null ? null : interpretTemporalZonedDateTime({ dateTime: rounded, timeZone: value.timeZone,
                    startOfDay: false, offsetBehaviour: "option", offsetNanoseconds: value.timeZone.offsetNanoseconds }, "prefer");
            }
        }
        return epoch === null ? languageFailure(context.realm, "RangeError", "rounded zoned time outside the supported range", loc) :
            createTemporalZonedDateTime(epoch, value.timeZone, context.realm.temporalZonedDateTimePrototype, context, loc);
    });
}
