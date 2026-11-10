import { getIterator, iteratorStepValue } from "./iterator.js";
import type { GuestObject, OperationContext, ThrowCompletion, Value, ValueCompletion } from "./runtime.js";
import type { Location } from "./syntax.js";

export function appendArrayElement(object: GuestObject, index: number, value: Value, spread: boolean,
    context: OperationContext, loc: Location): { type: "normal"; index: number } | ThrowCompletion {
    if (spread) {
        const acquired = getIterator(value, context, loc);
        if (acquired.type === "throw") return acquired;
        while (true) {
            const next = iteratorStepValue(acquired.value, context, loc);
            if (next.type === "throw") return next;
            if (next.done) return { type: "normal", index };
            const defined = object.defineOwnProperty(String(index++), { value: next.value, writable: true, enumerable: true, configurable: true }, context, loc);
            if (defined.type === "throw") return defined;
            if (!defined.value) throw new Error("fresh array spread element invariant");
        }
    }
    const defined = object.defineOwnProperty(String(index++), { value, writable: true, enumerable: true, configurable: true }, context, loc);
    if (defined.type === "throw") return defined;
    if (!defined.value) throw new Error("fresh array literal element invariant");
    return { type: "normal", index };
}

export function finishArrayLiteral(object: GuestObject, length: number, context: OperationContext, loc: Location): ValueCompletion {
    const defined = object.defineOwnProperty("length", { value: { kind: "number", value: length } }, context, loc);
    if (defined.type === "throw") return defined;
    if (!defined.value) throw new Error("fresh array literal length invariant");
    return { type: "normal", value: { kind: "object", object } };
}
