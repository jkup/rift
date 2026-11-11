import { timeZoneLocalDateTime, timeZoneOffsetNanoseconds, type TemporalTimeZone } from "../temporal-time-zone-operations.js";
import { formatUTCOffset } from "../utc-offset.js";
import type { Realm } from "../realm.js";
import { temporalInstantValue } from "../temporal-instant-object.js";
import { temporalFractionalDigits, temporalRoundingMode, temporalSmallestUnit, temporalStringPrecision, temporalPrecisionNanoseconds } from "../temporal-options.js";
import { roundTemporalInstant } from "../temporal-rounding.js";
import { formatUTCInstant, formatISODateTime } from "../temporal-time-format.js";
import { toTemporalTimeZone } from "../temporal-time-zone.js";
import { GuestObject, languageFailure, normal, UNDEFINED, type ValueCompletion } from "../runtime.js";

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
        let timeZone: TemporalTimeZone | null = null;
        if (zone.value.kind !== "undefined") {
            const parsed = toTemporalTimeZone(zone.value, context, loc);
            if (parsed.type === "throw") return parsed;
            timeZone = parsed.value;
        }
        const rounded = roundTemporalInstant(value.value, temporalPrecisionNanoseconds(precision), mode.value);
        let formatted: string | null;
        if (timeZone === null) formatted = formatUTCInstant(rounded, precision);
        else {
            const local = timeZoneLocalDateTime(timeZone, rounded), offset = timeZoneOffsetNanoseconds(timeZone, rounded);
            if (local === null || offset === null) throw new Error("Instant timezone projection invariant");
            const dateTime = formatISODateTime(local, precision), suffix = formatUTCOffset(offset, "minute");
            formatted = dateTime === null || suffix === null ? null : dateTime + suffix;
        }
        if (formatted === null) throw new Error("Instant string range invariant");
        return normal({ kind: "string", value: formatted });
    });
}
