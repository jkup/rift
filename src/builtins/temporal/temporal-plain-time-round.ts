import type { Realm } from "../../realm.js";
import {
    createTemporalPlainTime,
    temporalPlainTimeValue,
} from "../../temporal/temporal-plain-time-object.js";
import { temporalTimeRoundSettings } from "../../temporal/temporal-time-round-options.js";
import {
    NANOSECONDS_PER_DAY,
    timeToNanoseconds,
    timeFromNanoseconds,
} from "../../temporal/temporal-time.js";
import { roundTemporalInstant } from "../../temporal/temporal-rounding.js";
import { UNDEFINED, type ValueCompletion } from "../../runtime.js";

export function registerTemporalPlainTimeRound(realm: Realm): void {
    realm.registerBuiltin(
        realm.temporalPlainTimePrototype,
        "round",
        1,
        (receiver, args, context, loc): ValueCompletion => {
            const time = temporalPlainTimeValue(receiver, context, loc);
            if (time.type === "throw") {
                return time;
            }
            const settings = temporalTimeRoundSettings(
                args.length === 0 ? UNDEFINED : args[0],
                false,
                context,
                loc,
            );
            if (settings.type === "throw") {
                return settings;
            }
            const ns = timeToNanoseconds(time.value);
            if (ns === null) {
                throw new Error("PlainTime field invariant");
            }
            const rounded =
                roundTemporalInstant(ns, settings.quantum, settings.mode) % NANOSECONDS_PER_DAY;
            const result = timeFromNanoseconds(rounded);
            if (result === null) {
                throw new Error("rounded time range invariant");
            }
            return createTemporalPlainTime(
                result,
                context.realm.temporalPlainTimePrototype,
                context,
                loc,
            );
        },
    );
}
