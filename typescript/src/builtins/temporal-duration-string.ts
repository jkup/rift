import type { Realm } from "../realm.js";
import { temporalDurationValue } from "../temporal-duration-object.js";
import { temporalFractionalDigits, temporalRoundingMode, temporalSmallestUnit, temporalStringPrecision, temporalPrecisionNanoseconds } from "../temporal-options.js";
import { roundDurationForString } from "../temporal-duration-string.js";
import { formatTemporalDuration } from "../temporal-duration-format.js";
import { GuestObject, languageFailure, normal, UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerTemporalDurationString(realm: Realm): void {
    realm.registerBuiltin(realm.temporalDurationPrototype, "toString", 0, (receiver, args, context, loc): ValueCompletion => {
        const duration = temporalDurationValue(receiver, context, loc);
        if (duration.type === "throw") return duration;
        const supplied = args.length === 0 ? UNDEFINED : args[0];
        let options: GuestObject;
        if (supplied.kind === "undefined") options = new GuestObject(null);
        else if (supplied.kind === "object") options = supplied.object;
        else return languageFailure(context.realm, "TypeError", "Duration string options must be an object", loc);
        const digits = temporalFractionalDigits(options, context, loc);
        if (digits.type === "throw") return digits;
        const mode = temporalRoundingMode(options, context, loc, "trunc");
        if (mode.type === "throw") return mode;
        const unit = temporalSmallestUnit(options, context, loc);
        if (unit.type === "throw") return unit;
        const precision = temporalStringPrecision(unit.value, digits.value);
        if (precision === null || precision === "minute")
            return languageFailure(context.realm, "RangeError", "Duration strings require second or smaller units", loc);
        const increment = temporalPrecisionNanoseconds(precision);
        const rounded = increment === 1n ? duration.value : roundDurationForString(duration.value, increment, mode.value);
        if (rounded === null) return languageFailure(context.realm, "RangeError", "rounded duration exceeds its range", loc);
        const formatted = formatTemporalDuration(rounded, precision);
        if (formatted === null) throw new Error("duration string invariant");
        return normal({ kind: "string", value: formatted });
    });
}
