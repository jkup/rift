import { timeZoneOffsetNanoseconds, timeZoneStartOfDay } from "../temporal-time-zone-operations.js";
import type { Realm } from "../realm.js";
import {
    createTemporalZonedDateTime,
    temporalZonedDateTimeObject,
    temporalZonedISODateTime,
} from "../temporal-zoned-date-time-object.js";
import { temporalTimeRoundSettings } from "../temporal-time-round-options.js";
import { roundISODateTime } from "../iso-date-time.js";
import { isoDateToEpochDay, epochDayToISODate } from "../iso-calendar.js";
import { NANOSECONDS_PER_DAY } from "../temporal-time.js";
import { roundTemporalInteger } from "../temporal-rounding.js";
import { interpretTemporalZonedDateTime } from "../temporal-zoned-interpret.js";
import { languageFailure, UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerTemporalZonedRound(realm: Realm): void {
    realm.registerBuiltin(
        realm.temporalZonedDateTimePrototype,
        "round",
        1,
        (receiver, args, context, loc): ValueCompletion => {
            const object = temporalZonedDateTimeObject(receiver, context, loc);
            if (object.type === "throw") {
                return object;
            }
            const settings = temporalTimeRoundSettings(
                args.length === 0 ? UNDEFINED : args[0],
                true,
                context,
                loc,
            );
            if (settings.type === "throw") {
                return settings;
            }
            const value = object.value;
            let epoch: bigint | null = value.epochNanoseconds;
            if (settings.quantum !== 1n) {
                const local = temporalZonedISODateTime(value);
                if (settings.quantum === NANOSECONDS_PER_DAY) {
                    const day = isoDateToEpochDay(local.date);
                    if (day === null) {
                        throw new Error("zoned rounding date invariant");
                    }
                    const nextDate = epochDayToISODate(day + 1);
                    const start = timeZoneStartOfDay(value.timeZone, local.date);
                    const end =
                        nextDate === null ? null : timeZoneStartOfDay(value.timeZone, nextDate);
                    if (start === null || end === null) {
                        epoch = null;
                    } else {
                        epoch =
                            start +
                            roundTemporalInteger(
                                value.epochNanoseconds - start,
                                end - start,
                                settings.mode,
                            );
                    }
                } else {
                    const rounded = roundISODateTime(local, settings.quantum, settings.mode);
                    const offset = timeZoneOffsetNanoseconds(
                        value.timeZone,
                        value.epochNanoseconds,
                    );
                    if (offset === null) {
                        throw new Error("zoned rounding offset invariant");
                    }
                    epoch =
                        rounded === null
                            ? null
                            : interpretTemporalZonedDateTime(
                                  {
                                      dateTime: rounded,
                                      timeZone: value.timeZone,
                                      startOfDay: false,
                                      offsetBehaviour: "option",
                                      offsetNanoseconds: offset,
                                      matchMinutes: false,
                                  },
                                  "prefer",
                              );
                }
            }
            return epoch === null
                ? languageFailure(
                      context.realm,
                      "RangeError",
                      "rounded zoned time outside the supported range",
                      loc,
                  )
                : createTemporalZonedDateTime(
                      epoch,
                      value.timeZone,
                      context.realm.temporalZonedDateTimePrototype,
                      context,
                      loc,
                  );
        },
    );
}
