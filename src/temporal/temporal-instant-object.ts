import type { BigIntResult } from "../bigint-arithmetic.js";
import type { Location } from "../syntax.js";
import {
    GuestObject,
    languageFailure,
    normal,
    type Value,
    type ValueCompletion,
    type OperationContext,
} from "../runtime.js";

export class GuestTemporalInstant extends GuestObject {
    constructor(
        readonly epochNanoseconds: bigint,
        proto: GuestObject | null,
    ) {
        super(proto);
    }
}

export function temporalInstantValue(
    receiver: Value,
    context: OperationContext,
    loc: Location,
): BigIntResult {
    if (receiver.kind !== "object" || !(receiver.object instanceof GuestTemporalInstant)) {
        return languageFailure(
            context.realm,
            "TypeError",
            "receiver is not a Temporal.Instant",
            loc,
        );
    }
    return { type: "normal", value: receiver.object.epochNanoseconds };
}

export function createTemporalInstant(
    value: bigint,
    proto: GuestObject,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const allocation = context.tick(loc);
    if (allocation.type === "throw") {
        return allocation;
    }
    return normal({ kind: "object", object: new GuestTemporalInstant(value, proto) });
}
