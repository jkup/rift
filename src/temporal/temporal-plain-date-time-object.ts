import type { Location } from "../syntax.js";
import type { ISODateTime } from "./iso-calendar.js";
import {
    GuestObject,
    languageFailure,
    normal,
    type Value,
    type ValueCompletion,
    type ThrowCompletion,
    type OperationContext,
} from "../runtime.js";

export class GuestTemporalPlainDateTime extends GuestObject {
    constructor(
        readonly dateTime: ISODateTime,
        proto: GuestObject | null,
    ) {
        super(proto);
    }
}

export function temporalPlainDateTimeValue(
    receiver: Value,
    context: OperationContext,
    loc: Location,
): { type: "normal"; value: ISODateTime } | ThrowCompletion {
    if (receiver.kind !== "object" || !(receiver.object instanceof GuestTemporalPlainDateTime)) {
        return languageFailure(
            context.realm,
            "TypeError",
            "receiver is not a Temporal.PlainDateTime",
            loc,
        );
    }
    return { type: "normal", value: receiver.object.dateTime };
}

export function createTemporalPlainDateTime(
    dateTime: ISODateTime,
    proto: GuestObject,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const allocation = context.tick(loc);
    if (allocation.type === "throw") {
        return allocation;
    }
    return normal({ kind: "object", object: new GuestTemporalPlainDateTime(dateTime, proto) });
}
