import type { Realm } from "../realm.js";
import { temporalInstantValue } from "../temporal-instant-object.js";
import { temporalFractionalDigits, temporalRoundingMode, temporalSmallestUnit, temporalStringPrecision, temporalPrecisionNanoseconds } from "../temporal-options.js";
import { roundTemporalInstant } from "../temporal-rounding.js";
import { formatUTCInstant, formatOffsetInstant } from "../temporal-time-format.js";
import { parseUTCOffset } from "../utc-offset.js";
import { GuestObject, languageFailure, normal, unsupportedFailure, UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerTemporalInstantString(realm: Realm): void {
    realm.registerBuiltin(realm.temporalInstantPrototype, "toString", 0, (receiver, args, context, loc): ValueCompletion => {
        const value = temporalInstantValue(receiver, context, loc);
        if (value.type === "throw") return value;
        const supplied = args.length === 0 ? UNDEFINED : args[0];
        let options: GuestObject;
        if (supplied.kind === "undefined") options = new GuestObject(null);
        else if (supplied.kind === "object") options = supplied.object;
        else return languageFailure(context.realm, "TypeError", "Instant string options must be an object", loc);
        const digits = temporalFractionalDigits(options, context, loc);
        if (digits.type === "throw") return digits;
        const mode = temporalRoundingMode(options, context, loc, "trunc");
        if (mode.type === "throw") return mode;
        const unit = temporalSmallestUnit(options, context, loc);
        if (unit.type === "throw") return unit;
        const zone = options.internalGet("timeZone", { kind: "object", object: options }, context, loc);
        if (zone.type === "throw") return zone;
        const precision = temporalStringPrecision(unit.value, digits.value);
        if (precision === null) return languageFailure(context.realm, "RangeError", "Instant strings require minute or smaller units", loc);
        let offset: number | null = null;
        if (zone.value.kind !== "undefined") {
            if (zone.value.kind !== "string") return languageFailure(context.realm, "TypeError", "timeZone must be a string", loc);
            const text = zone.value.value;
            if (text.length === 3 && text.toUpperCase() === "UTC") offset = 0;
            else {
                const parsed = parseUTCOffset(text, false);
                if (parsed === null) return unsupportedFailure("runtime.temporal-time-zone", "TypeError", "time-zone identifier requires an unavailable backend or grammar", loc);
                offset = Number(parsed / 60000000000n);
            }
        }
        const rounded = roundTemporalInstant(value.value, temporalPrecisionNanoseconds(precision), mode.value);
        const formatted = offset === null ? formatUTCInstant(rounded, precision) : formatOffsetInstant(rounded, offset, precision);
        if (formatted === null) throw new Error("Instant string range invariant");
        return normal({ kind: "string", value: formatted });
    });
}
