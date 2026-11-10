import type { Realm } from "../realm.js";
import { createTemporalPlainTime, temporalPlainTimeValue } from "../temporal-plain-time-object.js";
import { toTemporalDurationFields } from "../temporal-duration-fields.js";
import { durationTimeNanoseconds } from "../temporal-duration.js";
import { NANOSECONDS_PER_DAY, timeFromNanoseconds, timeToNanoseconds } from "../temporal-time.js";
import { UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerTemporalPlainTimeArithmetic(realm: Realm): void {
    for (const name of ["add", "subtract"]) {
        realm.registerBuiltin(realm.temporalPlainTimePrototype, name, 1, (receiver, args, context, loc): ValueCompletion => {
            const time = temporalPlainTimeValue(receiver, context, loc);
            if (time.type === "throw") return time;
            const duration = toTemporalDurationFields(args.length === 0 ? UNDEFINED : args[0], context, loc);
            if (duration.type === "throw") return duration;
            const start = timeToNanoseconds(time.value);
            if (start === null) throw new Error("PlainTime field invariant");
            const amount = durationTimeNanoseconds(duration.value);
            let within = (name === "add" ? start + amount : start - amount) % NANOSECONDS_PER_DAY;
            if (within < 0n) within += NANOSECONDS_PER_DAY;
            const result = timeFromNanoseconds(within);
            if (result === null) throw new Error("wrapped time range invariant");
            return createTemporalPlainTime(result, context.realm.temporalPlainTimePrototype, context, loc);
        });
    }
}
