import type { DurationFields } from "./temporal-duration.js";
import {
    largestDurationUnit,
    largerDurationUnit,
    durationUnit,
    type DurationUnit,
} from "./temporal-duration-balance.js";
import {
    temporalUnitOption,
    temporalRoundingIncrement,
    temporalRoundingMode,
} from "./temporal-options.js";
import {
    temporalRelativeToOption,
    type TemporalRelativeTo,
} from "./temporal-relative-to-option.js";
import type { TemporalRoundingMode } from "./temporal-rounding.js";
import type { Location } from "./syntax.js";
import {
    GuestObject,
    languageFailure,
    type Value,
    type OperationContext,
    type ThrowCompletion,
} from "./runtime.js";

export interface DurationRoundSettings {
    readonly relativeTo: TemporalRelativeTo | null;
    readonly largest: DurationUnit;
    readonly smallest: DurationUnit;
    readonly increment: number;
    readonly mode: TemporalRoundingMode;
}

export function durationRoundSettings(
    supplied: Value,
    duration: DurationFields,
    context: OperationContext,
    loc: Location,
): { type: "normal"; value: DurationRoundSettings } | ThrowCompletion {
    let options: GuestObject;
    if (supplied.kind === "string") {
        options = new GuestObject(null);
        options.bootstrapDefine("smallestUnit", {
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
            "round requires a unit string or options object",
            loc,
        );
    }
    const largestOption = temporalUnitOption(options, "largestUnit", context, loc);
    if (largestOption.type === "throw") {
        return largestOption;
    }
    const relative = temporalRelativeToOption({ kind: "object", object: options }, context, loc);
    if (relative.type === "throw") {
        return relative;
    }
    const increment = temporalRoundingIncrement(options, context, loc);
    if (increment.type === "throw") {
        return increment;
    }
    const mode = temporalRoundingMode(options, context, loc, "halfExpand");
    if (mode.type === "throw") {
        return mode;
    }
    const smallestOption = temporalUnitOption(options, "smallestUnit", context, loc);
    if (smallestOption.type === "throw") {
        return smallestOption;
    }
    if (smallestOption.value === "auto") {
        return languageFailure(context.realm, "RangeError", "smallestUnit cannot be auto", loc);
    }
    if (smallestOption.value === "" && largestOption.value === "") {
        return languageFailure(
            context.realm,
            "RangeError",
            "round requires smallestUnit or largestUnit",
            loc,
        );
    }
    const smallest = durationUnit(
        smallestOption.value === "" ? "nanosecond" : smallestOption.value,
    );
    const largest =
        largestOption.value === "" || largestOption.value === "auto"
            ? largerDurationUnit(largestDurationUnit(duration), smallest)
            : durationUnit(largestOption.value);
    if (largerDurationUnit(largest, smallest) !== largest) {
        return languageFailure(
            context.realm,
            "RangeError",
            "largestUnit must be at least as large as smallestUnit",
            loc,
        );
    }
    const maximum =
        smallest === "hours"
            ? 24
            : smallest === "minutes" || smallest === "seconds"
              ? 60
              : smallest === "milliseconds" ||
                  smallest === "microseconds" ||
                  smallest === "nanoseconds"
                ? 1000
                : 0;
    if (maximum !== 0 && (increment.value >= maximum || maximum % increment.value !== 0)) {
        return languageFailure(
            context.realm,
            "RangeError",
            "roundingIncrement must divide the unit's radix",
            loc,
        );
    }
    if (maximum === 0 && increment.value > 1 && largest !== smallest) {
        return languageFailure(
            context.realm,
            "RangeError",
            "date increments require matching largestUnit and smallestUnit",
            loc,
        );
    }
    return {
        type: "normal",
        value: {
            relativeTo: relative.value,
            largest,
            smallest,
            increment: increment.value,
            mode: mode.value,
        },
    };
}
