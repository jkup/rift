import type { Realm } from "../realm.js";
import { createTemporalInstant, temporalInstantValue } from "../temporal-instant-object.js";
import { toPrimitive } from "../primitive-conversion.js";
import { toNumber, toString, type NumberCompletion, type StringCompletion } from "../conversion.js";
import { NANOSECONDS_PER_DAY } from "../iso-calendar.js";
import { roundTemporalInstant, type TemporalRoundingMode } from "../temporal-rounding.js";
import { formatUTCInstant } from "../temporal-time-format.js";
import { languageFailure, normal, UNDEFINED, GuestObject, type OperationContext, type ThrowCompletion, type Value, type ValueCompletion } from "../runtime.js";
import type { Location } from "../syntax.js";

function optionString(value: Value, context: OperationContext, loc: Location): StringCompletion {
    const primitive = toPrimitive(value, "string", context, loc);
    return primitive.type === "throw" ? primitive : toString(primitive.value, loc, context.realm);
}

function roundingIncrement(options: GuestObject, context: OperationContext, loc: Location): NumberCompletion {
    const read = options.internalGet("roundingIncrement", { kind: "object", object: options }, context, loc);
    if (read.type === "throw") return read;
    if (read.value.kind === "undefined") return { type: "normal", value: 1 };
    const primitive = toPrimitive(read.value, "number", context, loc);
    if (primitive.type === "throw") return primitive;
    const converted = toNumber(primitive.value, loc, context.realm);
    if (converted.type === "throw") return converted;
    const integer = Math.trunc(converted.value);
    if (!Number.isFinite(integer) || integer < 1 || integer > 1000000000)
        return languageFailure(context.realm, "RangeError", "invalid rounding increment", loc);
    return { type: "normal", value: integer };
}

function roundingMode(options: GuestObject, context: OperationContext, loc: Location): { type: "normal"; value: TemporalRoundingMode } | ThrowCompletion {
    const read = options.internalGet("roundingMode", { kind: "object", object: options }, context, loc);
    if (read.type === "throw") return read;
    if (read.value.kind === "undefined") return { type: "normal", value: "halfExpand" };
    const converted = optionString(read.value, context, loc);
    if (converted.type === "throw") return converted;
    const mode = converted.value;
    if (mode === "ceil" || mode === "floor" || mode === "expand" || mode === "trunc" || mode === "halfCeil" ||
        mode === "halfFloor" || mode === "halfExpand" || mode === "halfTrunc" || mode === "halfEven") return { type: "normal", value: mode };
    return languageFailure(context.realm, "RangeError", "invalid rounding mode", loc);
}

function unitNanoseconds(name: string): bigint | null {
    const unit = name.endsWith("s") ? name.slice(0, -1) : name;
    switch (unit) {
        case "hour": return 3600000000000n;
        case "minute": return 60000000000n;
        case "second": return 1000000000n;
        case "millisecond": return 1000000n;
        case "microsecond": return 1000n;
        case "nanosecond": return 1n;
        default: return null;
    }
}

export function registerTemporalInstantMethods(realm: Realm): void {
    const prototype = realm.temporalInstantPrototype;
    for (const name of ["toJSON", "toLocaleString"]) {
        realm.registerBuiltin(prototype, name, 0, (receiver, _args, context, loc): ValueCompletion => {
            const value = temporalInstantValue(receiver, context, loc);
            if (value.type === "throw") return value;
            const formatted = formatUTCInstant(value.value);
            if (formatted === null) throw new Error("Instant range invariant");
            return normal({ kind: "string", value: formatted });
        });
    }
    realm.registerBuiltin(prototype, "round", 1, (receiver, args, context, loc): ValueCompletion => {
        const value = temporalInstantValue(receiver, context, loc);
        if (value.type === "throw") return value;
        const roundTo = args.length === 0 ? UNDEFINED : args[0];
        let options: GuestObject;
        if (roundTo.kind === "string") {
            options = new GuestObject(null);
            options.bootstrapDefine("smallestUnit", { value: roundTo, writable: true, enumerable: true, configurable: true });
        } else if (roundTo.kind === "object") options = roundTo.object;
        else return languageFailure(context.realm, "TypeError", "round requires a unit string or options object", loc);
        const increment = roundingIncrement(options, context, loc);
        if (increment.type === "throw") return increment;
        const mode = roundingMode(options, context, loc);
        if (mode.type === "throw") return mode;
        const read = options.internalGet("smallestUnit", { kind: "object", object: options }, context, loc);
        if (read.type === "throw") return read;
        if (read.value.kind === "undefined") return languageFailure(context.realm, "TypeError", "smallestUnit is required", loc);
        const unit = optionString(read.value, context, loc);
        if (unit.type === "throw") return unit;
        const length = unitNanoseconds(unit.value);
        if (length === null) return languageFailure(context.realm, "RangeError", "rounding requires a time unit", loc);
        const quantum = BigInt(increment.value) * length;
        if (quantum > NANOSECONDS_PER_DAY || NANOSECONDS_PER_DAY % quantum !== 0n)
            return languageFailure(context.realm, "RangeError", "rounding increment must divide a day", loc);
        return createTemporalInstant(roundTemporalInstant(value.value, quantum, mode.value), context.realm.temporalInstantPrototype, context, loc);
    });
}
