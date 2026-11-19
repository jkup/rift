import type { Location } from "./syntax.js";
import type { ISODate } from "./iso-calendar.js";
import { GuestObject, languageFailure, normal, type Value, type ValueCompletion, type ThrowCompletion, type OperationContext } from "./runtime.js";

export class GuestTemporalPlainYearMonth extends GuestObject {
    constructor(readonly date: ISODate, proto: GuestObject | null) { super(proto); }
}

export function temporalPlainYearMonthValue(receiver: Value, context: OperationContext, loc: Location): { type: "normal"; value: ISODate } | ThrowCompletion {
    if (receiver.kind !== "object" || !(receiver.object instanceof GuestTemporalPlainYearMonth))
        return languageFailure(context.realm, "TypeError", "receiver is not a Temporal.PlainYearMonth", loc);
    return { type: "normal", value: receiver.object.date };
}

export function createTemporalPlainYearMonth(date: ISODate, proto: GuestObject, context: OperationContext, loc: Location): ValueCompletion {
    const allocation = context.tick(loc);
    if (allocation.type === "throw") return allocation;
    return normal({ kind: "object", object: new GuestTemporalPlainYearMonth(date, proto) });
}
