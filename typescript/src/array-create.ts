import { numberToString } from "./conversion.js";
import type { GuestArray } from "./array-object.js";
import { languageFailure, normal, type Value, type ValueCompletion, type OperationContext, type ThrowCompletion } from "./runtime.js";
import type { Location } from "./syntax.js";

export type ArrayCompletion = { type: "normal"; value: GuestArray } | ThrowCompletion;

export function createArrayWithLength(length: number, context: OperationContext, loc: Location): ArrayCompletion {
    if (length > 4294967295) return languageFailure(context.realm, "RangeError", "result length exceeds array limit", loc);
    const result = context.realm.createArray();
    const initialized = result.defineOwnProperty("length", { value: { kind: "number", value: length } }, context, loc);
    if (initialized.type === "throw" || !initialized.value) throw new Error("fresh array length invariant");
    return { type: "normal", value: result };
}

export function arrayFromList(values: Value[], context: OperationContext, loc: Location): ValueCompletion {
    const allocation = context.tick(loc);
    if (allocation.type === "throw") return allocation;
    const array = context.realm.createArray();
    for (let i = 0; i < values.length; i++) {
        const step = context.tick(loc);
        if (step.type === "throw") return step;
        const defined = array.defineOwnProperty(numberToString(i), {
            value: values[i], writable: true, enumerable: true, configurable: true,
        }, context, loc);
        if (defined.type === "throw") return defined;
        if (!defined.value) throw new Error("fresh array definition failed");
    }
    return normal({kind: "object", object: array});
}
