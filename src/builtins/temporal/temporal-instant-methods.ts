import {
    temporalOptionString,
    temporalRoundingMode,
    temporalRoundingIncrement,
    temporalUnitNanoseconds,
} from "../../temporal/temporal-options.js";
import type { Realm } from "../../realm.js";
import {
    createTemporalInstant,
    temporalInstantValue,
} from "../../temporal/temporal-instant-object.js";
import { NANOSECONDS_PER_DAY } from "../../temporal/iso-calendar.js";
import { roundTemporalInstant } from "../../temporal/temporal-rounding.js";
import { formatUTCInstant } from "../../temporal/temporal-time-format.js";
import {
    languageFailure,
    normal,
    UNDEFINED,
    GuestObject,
    type ValueCompletion,
} from "../../runtime.js";

export function registerTemporalInstantMethods(realm: Realm): void {
    const prototype = realm.temporalInstantPrototype;
    for (const name of ["toJSON", "toLocaleString"]) {
        realm.registerBuiltin(
            prototype,
            name,
            0,
            (receiver, _args, context, loc): ValueCompletion => {
                const value = temporalInstantValue(receiver, context, loc);
                if (value.type === "throw") {
                    return value;
                }
                const formatted = formatUTCInstant(value.value);
                if (formatted === null) {
                    throw new Error("Instant range invariant");
                }
                return normal({ kind: "string", value: formatted });
            },
        );
    }
    realm.registerBuiltin(
        prototype,
        "round",
        1,
        (receiver, args, context, loc): ValueCompletion => {
            const value = temporalInstantValue(receiver, context, loc);
            if (value.type === "throw") {
                return value;
            }
            const roundTo = args.length === 0 ? UNDEFINED : args[0];
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
            const read = options.internalGet(
                "smallestUnit",
                { kind: "object", object: options },
                context,
                loc,
            );
            if (read.type === "throw") {
                return read;
            }
            if (read.value.kind === "undefined") {
                return languageFailure(context.realm, "TypeError", "smallestUnit is required", loc);
            }
            const unit = temporalOptionString(read.value, context, loc);
            if (unit.type === "throw") {
                return unit;
            }
            const length = temporalUnitNanoseconds(unit.value);
            if (length === null) {
                return languageFailure(
                    context.realm,
                    "RangeError",
                    "rounding requires a time unit",
                    loc,
                );
            }
            const quantum = BigInt(increment.value) * length;
            if (quantum > NANOSECONDS_PER_DAY || NANOSECONDS_PER_DAY % quantum !== 0n) {
                return languageFailure(
                    context.realm,
                    "RangeError",
                    "rounding increment must divide a day",
                    loc,
                );
            }
            return createTemporalInstant(
                roundTemporalInstant(value.value, quantum, mode.value),
                context.realm.temporalInstantPrototype,
                context,
                loc,
            );
        },
    );
}
