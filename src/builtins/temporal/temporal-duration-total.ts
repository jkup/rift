import type { Realm } from "../../realm.js";
import { temporalDurationValue } from "../../temporal/temporal-duration-object.js";
import { durationTimeNanoseconds } from "../../temporal/temporal-duration.js";
import { temporalRelativeToOption } from "../../temporal/temporal-relative-to-option.js";
import { temporalUnitOption } from "../../temporal/temporal-options.js";
import { NANOSECONDS_PER_DAY, temporalUnitNanoseconds } from "../../temporal/temporal-time.js";
import { temporalRatioToNumber } from "../../temporal/temporal-ratio-number.js";
import { totalRelativeDuration } from "../../temporal/temporal-relative-duration-total.js";
import { totalZonedRelativeDuration } from "../../temporal/temporal-zoned-duration-total.js";
import {
    GuestObject,
    languageFailure,
    normal,
    UNDEFINED,
    type ValueCompletion,
} from "../../runtime.js";

export function registerTemporalDurationTotal(realm: Realm): void {
    realm.registerBuiltin(
        realm.temporalDurationPrototype,
        "total",
        1,
        (receiver, args, context, loc): ValueCompletion => {
            const duration = temporalDurationValue(receiver, context, loc);
            if (duration.type === "throw") {
                return duration;
            }
            const supplied = args.length === 0 ? UNDEFINED : args[0];
            let options: GuestObject;
            if (supplied.kind === "string") {
                options = new GuestObject(null);
                options.bootstrapDefine("unit", {
                    value: supplied,
                    writable: true,
                    enumerable: true,
                    configurable: true,
                });
            } else if (supplied.kind === "object") {
                options = supplied.object;
            } else {
                return languageFailure(
                    context.realm,
                    "TypeError",
                    "total requires a unit string or options object",
                    loc,
                );
            }
            const relative = temporalRelativeToOption(
                { kind: "object", object: options },
                context,
                loc,
            );
            if (relative.type === "throw") {
                return relative;
            }
            const read = temporalUnitOption(options, "unit", context, loc);
            if (read.type === "throw") {
                return read;
            }
            const unit = read.value,
                fields = duration.value;
            if (unit === "") {
                return languageFailure(context.realm, "RangeError", "total requires a unit", loc);
            }
            if (unit === "auto") {
                return languageFailure(
                    context.realm,
                    "RangeError",
                    "total unit cannot be auto",
                    loc,
                );
            }
            if (relative.value !== null) {
                const value =
                    relative.value.kind === "plain"
                        ? totalRelativeDuration(fields, relative.value.date, unit)
                        : totalZonedRelativeDuration(
                              fields,
                              relative.value.epoch,
                              relative.value.timeZone,
                              unit,
                          );
                return value === null
                    ? languageFailure(
                          context.realm,
                          "RangeError",
                          "relative duration total overflows",
                          loc,
                      )
                    : normal({ kind: "number", value });
            }
            if (
                fields.years !== 0 ||
                fields.months !== 0 ||
                fields.weeks !== 0 ||
                unit === "year" ||
                unit === "month" ||
                unit === "week"
            ) {
                return languageFailure(
                    context.realm,
                    "RangeError",
                    "calendar duration total requires relativeTo",
                    loc,
                );
            }
            const divisor = unit === "day" ? NANOSECONDS_PER_DAY : temporalUnitNanoseconds(unit);
            if (divisor === null) {
                throw new Error("duration total unit invariant");
            }
            const total =
                durationTimeNanoseconds(fields) + BigInt(fields.days) * NANOSECONDS_PER_DAY;
            return normal({ kind: "number", value: temporalRatioToNumber(total, divisor) });
        },
    );
}
