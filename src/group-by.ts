import { toPropertyKey } from "./conversion.js";
import { KeyedCollection } from "./keyed-collection.js";
import { getIterator, iteratorCloseOnThrow, iteratorStepValue } from "./iterator.js";
import { languageFailure, UNDEFINED, type OperationContext, type ThrowCompletion, type Value } from "./runtime.js";
import type { Location } from "./syntax.js";

export type GroupingMode = "property" | "collection";
export type KeyedGroup = { key: Value; elements: Value[] };
type GroupCompletion = { type: "normal"; groups: KeyedGroup[] } | ThrowCompletion;

export function groupBy(items: Value, callback: Value, mode: GroupingMode, context: OperationContext, loc: Location): GroupCompletion {
    if (items.kind === "undefined" || items.kind === "null")
        return languageFailure(context.realm, "TypeError", "cannot group null or undefined", loc);
    if (callback.kind !== "object" || callback.object.callable === null)
        return languageFailure(context.realm, "TypeError", "grouping callback is not callable", loc);
    const groups: KeyedGroup[] = [];
    const groupIndex = new KeyedCollection();
    const acquired = getIterator(items, context, loc);
    if (acquired.type === "throw") return acquired;
    const iterator = acquired.value;
    let index = 0;
    while (true) {
        if (index >= 9007199254740991)
            return iteratorCloseOnThrow(iterator, languageFailure(context.realm, "TypeError", "grouping index exceeds safe integer limit", loc), context, loc);
        const step = iteratorStepValue(iterator, context, loc);
        if (step.type === "throw") return step;
        if (step.done) return { type: "normal", groups };
        const called = context.call(callback, UNDEFINED, [step.value, {kind: "number", value: index}], loc);
        if (called.type === "throw") return iteratorCloseOnThrow(iterator, called, context, loc);
        let key = called.value;
        if (mode === "property") {
            const converted = toPropertyKey(key, context, loc);
            if (converted.type === "throw") return iteratorCloseOnThrow(iterator, converted, context, loc);
            key = typeof converted.value === "string" ? {kind: "string", value: converted.value} : {kind: "symbol", value: converted.value};
        } else if (key.kind === "number" && key.value === 0) key = {kind: "number", value: 0};
        const existing = groupIndex.get(key);
        if (existing === undefined) {
            groupIndex.set(key, {kind: "number", value: groups.length});
            groups.push({key, elements: [step.value]});
        } else {
            if (existing.kind !== "number") throw new Error("invalid group index");
            groups[existing.value].elements.push(step.value);
        }
        index++;
    }
}
