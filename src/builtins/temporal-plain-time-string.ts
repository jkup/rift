import type { Realm } from "../realm.js";
import { temporalPlainTimeValue } from "../temporal-plain-time-object.js";
import {
    temporalFractionalDigits,
    temporalRoundingMode,
    temporalSmallestUnit,
    temporalStringPrecision,
    temporalPrecisionNanoseconds,
} from "../temporal-options.js";
import { NANOSECONDS_PER_DAY, timeToNanoseconds, timeFromNanoseconds } from "../temporal-time.js";
import { roundTemporalInstant } from "../temporal-rounding.js";
import { formatTemporalTime } from "../temporal-time-format.js";
import {
    GuestObject,
    languageFailure,
    normal,
    UNDEFINED,
    type ValueCompletion,
} from "../runtime.js";

export function registerTemporalPlainTimeString(realm: Realm): void {
    realm.registerBuiltin(
        realm.temporalPlainTimePrototype,
        "toString",
        0,
        (receiver, args, context, loc): ValueCompletion => {
            const time = temporalPlainTimeValue(receiver, context, loc);
            if (time.type === "throw") {
                return time;
            }
            const supplied = args.length === 0 ? UNDEFINED : args[0];
            let options: GuestObject;
            if (supplied.kind === "undefined") {
                options = new GuestObject(null);
            } else if (supplied.kind === "object") {
                options = supplied.object;
            } else {
                return languageFailure(
                    context.realm,
                    "TypeError",
                    "PlainTime string options must be an object",
                    loc,
                );
            }
            const digits = temporalFractionalDigits(options, context, loc);
            if (digits.type === "throw") {
                return digits;
            }
            const mode = temporalRoundingMode(options, context, loc, "trunc");
            if (mode.type === "throw") {
                return mode;
            }
            const unit = temporalSmallestUnit(options, context, loc);
            if (unit.type === "throw") {
                return unit;
            }
            const precision = temporalStringPrecision(unit.value, digits.value);
            if (precision === null) {
                return languageFailure(
                    context.realm,
                    "RangeError",
                    "PlainTime strings require minute or smaller units",
                    loc,
                );
            }
            const ns = timeToNanoseconds(time.value);
            if (ns === null) {
                throw new Error("PlainTime field invariant");
            }
            const rounded =
                roundTemporalInstant(ns, temporalPrecisionNanoseconds(precision), mode.value) %
                NANOSECONDS_PER_DAY;
            const result = timeFromNanoseconds(rounded);
            if (result === null) {
                throw new Error("rounded time range invariant");
            }
            const formatted = formatTemporalTime(result, precision);
            if (formatted === null) {
                throw new Error("time string precision invariant");
            }
            return normal({ kind: "string", value: formatted });
        },
    );
}
