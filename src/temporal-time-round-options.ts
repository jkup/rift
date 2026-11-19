import {
    temporalRoundingIncrement,
    temporalRoundingMode,
    temporalSmallestUnit,
    temporalUnitNanoseconds,
} from "./temporal-options.js";
import { NANOSECONDS_PER_DAY } from "./temporal-time.js";
import type { TemporalRoundingMode } from "./temporal-rounding.js";
import type { Location } from "./syntax.js";
import {
    GuestObject,
    languageFailure,
    type Value,
    type OperationContext,
    type ThrowCompletion,
} from "./runtime.js";

export function temporalTimeRoundSettings(
    roundTo: Value,
    allowDay: boolean,
    context: OperationContext,
    loc: Location,
): { type: "normal"; quantum: bigint; mode: TemporalRoundingMode } | ThrowCompletion {
    let options: GuestObject;
    if (roundTo.kind === "string") {
        options = new GuestObject(null);
        options.bootstrapDefine("smallestUnit", {
            value: roundTo,
            writable: true,
            enumerable: true,
            configurable: true,
        });
    } else if (roundTo.kind === "object") {
        options = roundTo.object;
    } else {
        return languageFailure(
            context.realm,
            "TypeError",
            "round requires a unit string or options object",
            loc,
        );
    }
    const increment = temporalRoundingIncrement(options, context, loc);
    if (increment.type === "throw") {
        return increment;
    }
    const mode = temporalRoundingMode(options, context, loc, "halfExpand");
    if (mode.type === "throw") {
        return mode;
    }
    const unit = temporalSmallestUnit(options, context, loc);
    if (unit.type === "throw") {
        return unit;
    }
    if (unit.value === "") {
        return languageFailure(context.realm, "TypeError", "smallestUnit is required", loc);
    }
    const length =
        allowDay && unit.value === "day"
            ? NANOSECONDS_PER_DAY
            : temporalUnitNanoseconds(unit.value);
    if (length === null) {
        return languageFailure(context.realm, "RangeError", "rounding requires a time unit", loc);
    }
    const maximum =
        unit.value === "hour" ? 24 : unit.value === "minute" || unit.value === "second" ? 60 : 1000;
    if (
        unit.value === "day"
            ? increment.value !== 1
            : increment.value >= maximum || maximum % increment.value !== 0
    ) {
        return languageFailure(
            context.realm,
            "RangeError",
            "rounding increment must divide the next time unit",
            loc,
        );
    }
    return { type: "normal", quantum: BigInt(increment.value) * length, mode: mode.value };
}
