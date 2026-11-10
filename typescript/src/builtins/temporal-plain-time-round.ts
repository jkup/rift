import type { Realm } from "../realm.js";
import { createTemporalPlainTime, temporalPlainTimeValue } from "../temporal-plain-time-object.js";
import { temporalRoundingIncrement, temporalRoundingMode, temporalSmallestUnit, temporalUnitNanoseconds } from "../temporal-options.js";
import { NANOSECONDS_PER_DAY, timeToNanoseconds, timeFromNanoseconds } from "../temporal-time.js";
import { roundTemporalInstant } from "../temporal-rounding.js";
import { GuestObject, languageFailure, UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerTemporalPlainTimeRound(realm: Realm): void {
    realm.registerBuiltin(realm.temporalPlainTimePrototype, "round", 1, (receiver, args, context, loc): ValueCompletion => {
        const time = temporalPlainTimeValue(receiver, context, loc);
        if (time.type === "throw") return time;
        const roundTo = args.length === 0 ? UNDEFINED : args[0];
        let options: GuestObject;
        if (roundTo.kind === "string") {
            options = new GuestObject(null);
            options.bootstrapDefine("smallestUnit", { value: roundTo, writable: true, enumerable: true, configurable: true });
        } else if (roundTo.kind === "object") options = roundTo.object;
        else return languageFailure(context.realm, "TypeError", "round requires a unit string or options object", loc);
        const increment = temporalRoundingIncrement(options, context, loc);
        if (increment.type === "throw") return increment;
        const mode = temporalRoundingMode(options, context, loc, "halfExpand");
        if (mode.type === "throw") return mode;
        const unit = temporalSmallestUnit(options, context, loc);
        if (unit.type === "throw") return unit;
        if (unit.value === "") return languageFailure(context.realm, "TypeError", "smallestUnit is required", loc);
        const length = temporalUnitNanoseconds(unit.value);
        if (length === null) return languageFailure(context.realm, "RangeError", "rounding requires a time unit", loc);
        const maximum = unit.value === "hour" ? 24 : unit.value === "minute" || unit.value === "second" ? 60 : 1000;
        if (increment.value >= maximum || maximum % increment.value !== 0)
            return languageFailure(context.realm, "RangeError", "rounding increment must divide the next time unit", loc);
        const ns = timeToNanoseconds(time.value);
        if (ns === null) throw new Error("PlainTime field invariant");
        const rounded = roundTemporalInstant(ns, BigInt(increment.value) * length, mode.value) % NANOSECONDS_PER_DAY;
        const result = timeFromNanoseconds(rounded);
        if (result === null) throw new Error("rounded time range invariant");
        return createTemporalPlainTime(result, context.realm.temporalPlainTimePrototype, context, loc);
    });
}
