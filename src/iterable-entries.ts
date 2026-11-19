import { getIterator, iteratorCloseOnThrow, iteratorStepValue } from "./iterator.js";
import {
    languageFailure,
    normal,
    type OperationContext,
    type Value,
    type ValueCompletion,
} from "./runtime.js";
import type { Location } from "./syntax.js";

type EntryAdder = (
    key: Value,
    value: Value,
    context: OperationContext,
    loc: Location,
) => ValueCompletion;

export function addEntriesFromIterable(
    input: Value,
    add: EntryAdder,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const acquired = getIterator(input, context, loc);
    if (acquired.type === "throw") {
        return acquired;
    }
    const iterator = acquired.value;
    while (true) {
        const step = iteratorStepValue(iterator, context, loc);
        if (step.type === "throw") {
            return step;
        }
        if (step.done) {
            return normal();
        }
        const entry = step.value;
        if (entry.kind !== "object") {
            return iteratorCloseOnThrow(
                iterator,
                languageFailure(
                    context.realm,
                    "TypeError",
                    "iterator entry must be an object",
                    loc,
                ),
                context,
                loc,
            );
        }
        const key = entry.object.internalGet("0", entry, context, loc);
        if (key.type === "throw") {
            return iteratorCloseOnThrow(iterator, key, context, loc);
        }
        const value = entry.object.internalGet("1", entry, context, loc);
        if (value.type === "throw") {
            return iteratorCloseOnThrow(iterator, value, context, loc);
        }
        const added = add(key.value, value.value, context, loc);
        if (added.type === "throw") {
            return iteratorCloseOnThrow(iterator, added, context, loc);
        }
    }
}
