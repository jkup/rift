import { timeZoneLocalDateTime } from "./temporal-time-zone-operations.js";
import type { Location } from "../syntax.js";
import type { TemporalTimeZone } from "./temporal-time-zone-parse.js";
import { type ISODateTime } from "./iso-calendar.js";
import {
    GuestObject,
    languageFailure,
    normal,
    type Value,
    type ValueCompletion,
    type ThrowCompletion,
    type OperationContext,
} from "../runtime.js";

export class GuestTemporalZonedDateTime extends GuestObject {
    constructor(
        readonly epochNanoseconds: bigint,
        readonly timeZone: TemporalTimeZone,
        proto: GuestObject | null,
    ) {
        super(proto);
    }
}

export function temporalZonedISODateTime(value: GuestTemporalZonedDateTime): ISODateTime {
    const result = timeZoneLocalDateTime(value.timeZone, value.epochNanoseconds);
    if (result === null) {
        throw new Error("ZonedDateTime local projection invariant");
    }
    return result;
}

export function temporalZonedDateTimeObject(
    receiver: Value,
    context: OperationContext,
    loc: Location,
): { type: "normal"; value: GuestTemporalZonedDateTime } | ThrowCompletion {
    if (receiver.kind !== "object" || !(receiver.object instanceof GuestTemporalZonedDateTime)) {
        return languageFailure(
            context.realm,
            "TypeError",
            "receiver is not a Temporal.ZonedDateTime",
            loc,
        );
    }
    return { type: "normal", value: receiver.object };
}

export function createTemporalZonedDateTime(
    epoch: bigint,
    timeZone: TemporalTimeZone,
    proto: GuestObject,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const allocation = context.tick(loc);
    return allocation.type === "throw"
        ? allocation
        : normal({
              kind: "object",
              object: new GuestTemporalZonedDateTime(epoch, timeZone, proto),
          });
}
