import type { Location } from "./syntax.js";
import type { DurationFields } from "./temporal-duration.js";
import { GuestObject, languageFailure, normal, type Value, type ValueCompletion, type ThrowCompletion, type OperationContext } from "./runtime.js";

export class GuestTemporalDuration extends GuestObject {
    constructor(readonly duration: DurationFields, proto: GuestObject | null) { super(proto); }
}

export function temporalDurationValue(receiver: Value, context: OperationContext, loc: Location): { type: "normal"; value: DurationFields } | ThrowCompletion {
    if (receiver.kind !== "object" || !(receiver.object instanceof GuestTemporalDuration))
        return languageFailure(context.realm, "TypeError", "receiver is not a Temporal.Duration", loc);
    return { type: "normal", value: receiver.object.duration };
}

export function createTemporalDuration(duration: DurationFields, proto: GuestObject, context: OperationContext, loc: Location): ValueCompletion {
    const allocation = context.tick(loc);
    if (allocation.type === "throw") return allocation;
    return normal({ kind: "object", object: new GuestTemporalDuration(duration, proto) });
}
