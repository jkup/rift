import type { GuestArray } from "./array-object.js";
import { languageFailure, type OperationContext, type ThrowCompletion } from "./runtime.js";
import type { Location } from "./syntax.js";

export type ArrayCompletion = { type: "normal"; value: GuestArray } | ThrowCompletion;

export function createArrayWithLength(length: number, context: OperationContext, loc: Location): ArrayCompletion {
    if (length > 4294967295) return languageFailure(context.realm, "RangeError", "result length exceeds array limit", loc);
    const result = context.realm.createArray();
    const initialized = result.defineOwnProperty("length", { value: { kind: "number", value: length } }, context, loc);
    if (initialized.type === "throw" || !initialized.value) throw new Error("fresh array length invariant");
    return { type: "normal", value: result };
}
