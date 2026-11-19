import type { Realm } from "../../realm.js";
import {
    temporalDurationValue,
    createTemporalDuration,
} from "../../temporal/temporal-duration-object.js";
import { durationTimeNanoseconds, type DurationFields } from "../../temporal/temporal-duration.js";
import { durationRoundSettings } from "../../temporal/temporal-duration-round-options.js";
import { relativeDurationTarget } from "../../temporal/temporal-relative-duration-target.js";
import { roundDateTimeDifference } from "../../temporal/temporal-relative-date-time-round.js";
import { addTemporalZonedDateTime } from "../../temporal/temporal-zoned-arithmetic.js";
import { roundZonedDateTimeDifference } from "../../temporal/temporal-zoned-difference-round.js";
import { isoDateTimeToEpochNanoseconds } from "../../temporal/iso-calendar.js";
import { dateDuration } from "../../temporal/temporal-calendar-round.js";
import { balanceDurationTime } from "../../temporal/temporal-duration-balance.js";
import { NANOSECONDS_PER_DAY, temporalUnitNanoseconds } from "../../temporal/temporal-time.js";
import { roundTemporalInteger } from "../../temporal/temporal-rounding.js";
import { languageFailure, UNDEFINED, type ValueCompletion } from "../../runtime.js";

export function registerTemporalDurationRound(realm: Realm): void {
    realm.registerBuiltin(
        realm.temporalDurationPrototype,
        "round",
        1,
        (receiver, args, context, loc): ValueCompletion => {
            const duration = temporalDurationValue(receiver, context, loc);
            if (duration.type === "throw") {
                return duration;
            }
            const read = durationRoundSettings(
                args.length === 0 ? UNDEFINED : args[0],
                duration.value,
                context,
                loc,
            );
            if (read.type === "throw") {
                return read;
            }
            const options = read.value,
                fields = duration.value;
            let result: DurationFields | null;
            if (options.relativeTo !== null && options.relativeTo.kind === "zoned") {
                const relative = options.relativeTo;
                const last = addTemporalZonedDateTime(
                    relative.epoch,
                    relative.timeZone,
                    fields,
                    false,
                    false,
                );
                if (last === null) {
                    return languageFailure(
                        context.realm,
                        "RangeError",
                        "relative duration target overflows",
                        loc,
                    );
                }
                const rounded = roundZonedDateTimeDifference(
                    relative.epoch,
                    last,
                    relative.timeZone,
                    options.largest,
                    options.smallest,
                    options.increment,
                    options.mode,
                );
                const calendarUnit =
                    options.largest === "years" ||
                    options.largest === "months" ||
                    options.largest === "weeks" ||
                    options.largest === "days";
                result =
                    rounded === null
                        ? null
                        : balanceDurationTime(
                              rounded.time,
                              rounded.date,
                              calendarUnit ? "hours" : options.largest,
                          );
            } else if (options.relativeTo !== null) {
                const target = relativeDurationTarget(fields, options.relativeTo.date);
                if (target === null) {
                    return languageFailure(
                        context.realm,
                        "RangeError",
                        "relative duration target overflows",
                        loc,
                    );
                }
                const first = isoDateTimeToEpochNanoseconds(target.origin),
                    last = isoDateTimeToEpochNanoseconds(target.destination);
                if (first === null || last === null) {
                    throw new Error("duration round epoch invariant");
                }
                if (first === last) {
                    result = dateDuration(0, 0, 0);
                } else {
                    const rounded = roundDateTimeDifference(
                        target.origin,
                        target.destination,
                        options.largest,
                        options.smallest,
                        options.increment,
                        options.mode,
                    );
                    result =
                        rounded === null
                            ? null
                            : balanceDurationTime(rounded.time, rounded.date, options.largest);
                }
            } else {
                if (
                    fields.years !== 0 ||
                    fields.months !== 0 ||
                    fields.weeks !== 0 ||
                    options.largest === "years" ||
                    options.largest === "months" ||
                    options.largest === "weeks"
                ) {
                    return languageFailure(
                        context.realm,
                        "RangeError",
                        "calendar duration rounding requires relativeTo",
                        loc,
                    );
                }
                const unit =
                    options.smallest === "days"
                        ? NANOSECONDS_PER_DAY
                        : temporalUnitNanoseconds(options.smallest);
                if (unit === null) {
                    throw new Error("duration round unit invariant");
                }
                const total =
                    durationTimeNanoseconds(fields) + BigInt(fields.days) * NANOSECONDS_PER_DAY;
                const rounded = roundTemporalInteger(
                    total,
                    unit * BigInt(options.increment),
                    options.mode,
                );
                result = balanceDurationTime(rounded, dateDuration(0, 0, 0), options.largest);
            }
            return result === null
                ? languageFailure(
                      context.realm,
                      "RangeError",
                      "duration rounding exceeds its range",
                      loc,
                  )
                : createTemporalDuration(
                      result,
                      context.realm.temporalDurationPrototype,
                      context,
                      loc,
                  );
        },
    );
}
