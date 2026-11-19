import { GuestObject, languageFailure, type Value, type OperationContext, type ThrowCompletion } from "./runtime.js";
import type { Location } from "./syntax.js";

export class GuestDate extends GuestObject {
    constructor(public dateValue: number, prototype: GuestObject | null) { super(prototype); }
}

export function dateObject(value: Value, context: OperationContext, loc: Location): { type: "normal"; value: GuestDate } | ThrowCompletion {
    return value.kind === "object" && value.object instanceof GuestDate ? { type: "normal", value: value.object } :
        languageFailure(context.realm, "TypeError", "receiver is not a Date", loc);
}
