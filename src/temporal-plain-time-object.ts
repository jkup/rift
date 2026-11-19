import type { Location } from "./syntax.js";
import type { TimeFields } from "./temporal-time.js";
import {
    GuestObject,
    languageFailure,
    normal,
    type Value,
    type ValueCompletion,
    type ThrowCompletion,
    type OperationContext,
} from "./runtime.js";

export class GuestTemporalPlainTime extends GuestObject {
    constructor(
        readonly time: TimeFields,
        proto: GuestObject | null,
    ) {
        super(proto);
    }
}

export function temporalPlainTimeValue(
    receiver: Value,
    context: OperationContext,
    loc: Location,
): { type: "normal"; value: TimeFields } | ThrowCompletion {
    if (receiver.kind !== "object" || !(receiver.object instanceof GuestTemporalPlainTime)) {
        return languageFailure(
            context.realm,
            "TypeError",
            "receiver is not a Temporal.PlainTime",
            loc,
        );
    }
    return { type: "normal", value: receiver.object.time };
}

export function createTemporalPlainTime(
    time: TimeFields,
    proto: GuestObject,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const allocation = context.tick(loc);
    if (allocation.type === "throw") {
        return allocation;
    }
    return normal({ kind: "object", object: new GuestTemporalPlainTime(time, proto) });
}
