import type { Realm } from "../realm.js";
import type { Location } from "../syntax.js";
import {
    getIteratorDirect,
    iteratorStepValue,
    iteratorCloseNormally,
    iteratorCloseOnThrow,
    type IteratorCompletion,
    type IteratorRecord,
} from "../iterator.js";
import { arrayFromList } from "../array-create.js";
import {
    languageFailure,
    normal,
    truthy,
    sameValueZero,
    UNDEFINED,
    type OperationContext,
    type Value,
    type ValueCompletion,
} from "../runtime.js";

type PredicateMethod = "forEach" | "some" | "every" | "find";

function callbackIterator(
    receiver: Value,
    callback: Value,
    context: OperationContext,
    loc: Location,
): IteratorCompletion {
    if (receiver.kind !== "object") {
        return languageFailure(
            context.realm,
            "TypeError",
            "iterator receiver must be an object",
            loc,
        );
    }
    if (callback.kind !== "object" || callback.object.callable === null) {
        const record: IteratorRecord = {
            iterator: receiver.object,
            nextMethod: UNDEFINED,
            done: false,
        };
        const error = languageFailure(
            context.realm,
            "TypeError",
            "iterator callback must be callable",
            loc,
        );
        return iteratorCloseOnThrow(record, error, context, loc);
    }
    return getIteratorDirect(receiver.object, context, loc);
}

// ECMA-262 eager iterator methods share stepping and callback-close semantics.
function consumePredicate(
    method: PredicateMethod,
    receiver: Value,
    callback: Value,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const opened = callbackIterator(receiver, callback, context, loc);
    if (opened.type === "throw") {
        return opened;
    }
    const record = opened.value;
    let index = 0;
    while (true) {
        const step = iteratorStepValue(record, context, loc);
        if (step.type === "throw") {
            return step;
        }
        if (step.done) {
            if (method === "some" || method === "every") {
                return normal({ kind: "boolean", value: method === "every" });
            }
            return normal();
        }
        const result = context.call(
            callback,
            UNDEFINED,
            [step.value, { kind: "number", value: index++ }],
            loc,
        );
        if (result.type === "throw") {
            return iteratorCloseOnThrow(record, result, context, loc);
        }
        if (method === "forEach") {
            continue;
        }
        const matched = truthy(result.value);
        if (matched === (method !== "every")) {
            const closed = iteratorCloseNormally(record, context, loc);
            if (closed.type === "throw") {
                return closed;
            }
            return method === "find"
                ? normal(step.value)
                : normal({ kind: "boolean", value: matched });
        }
    }
}

function reduce(
    receiver: Value,
    args: Value[],
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const callback = args.length > 0 ? args[0] : UNDEFINED;
    const opened = callbackIterator(receiver, callback, context, loc);
    if (opened.type === "throw") {
        return opened;
    }
    const record = opened.value;
    let accumulator: Value = args.length > 1 ? args[1] : UNDEFINED;
    let index = 0;
    if (args.length < 2) {
        const first = iteratorStepValue(record, context, loc);
        if (first.type === "throw") {
            return first;
        }
        if (first.done) {
            return languageFailure(context.realm, "TypeError", "reduce of empty iterator", loc);
        }
        accumulator = first.value;
        index = 1;
    }
    while (true) {
        const step = iteratorStepValue(record, context, loc);
        if (step.type === "throw") {
            return step;
        }
        if (step.done) {
            return normal(accumulator);
        }
        const result = context.call(
            callback,
            UNDEFINED,
            [accumulator, step.value, { kind: "number", value: index++ }],
            loc,
        );
        if (result.type === "throw") {
            return iteratorCloseOnThrow(record, result, context, loc);
        }
        accumulator = result.value;
    }
}

function toArray(receiver: Value, context: OperationContext, loc: Location): ValueCompletion {
    if (receiver.kind !== "object") {
        return languageFailure(
            context.realm,
            "TypeError",
            "iterator receiver must be an object",
            loc,
        );
    }
    const opened = getIteratorDirect(receiver.object, context, loc);
    if (opened.type === "throw") {
        return opened;
    }
    const items: Value[] = [];
    while (true) {
        const step = iteratorStepValue(opened.value, context, loc);
        if (step.type === "throw") {
            return step;
        }
        if (step.done) {
            return arrayFromList(items, context, loc);
        }
        items.push(step.value);
    }
}

// https://tc39.es/proposal-iterator-includes/
function includes(
    receiver: Value,
    args: Value[],
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    if (receiver.kind !== "object") {
        return languageFailure(
            context.realm,
            "TypeError",
            "iterator receiver must be an object",
            loc,
        );
    }
    const record: IteratorRecord = {
        iterator: receiver.object,
        nextMethod: UNDEFINED,
        done: false,
    };
    const skipped = args.length > 1 ? args[1] : UNDEFINED;
    let toSkip = 0;
    if (skipped.kind !== "undefined") {
        // This parameter is validated without coercion, before reading next.
        if (
            skipped.kind !== "number" ||
            Number.isNaN(skipped.value) ||
            (Number.isFinite(skipped.value) && !Number.isInteger(skipped.value))
        ) {
            const error = languageFailure(
                context.realm,
                "TypeError",
                "skippedElements must be an integer Number",
                loc,
            );
            return iteratorCloseOnThrow(record, error, context, loc);
        }
        toSkip = skipped.value;
        if (toSkip < 0 || (Number.isFinite(toSkip) && toSkip > 9007199254740991)) {
            const error = languageFailure(
                context.realm,
                "RangeError",
                "skippedElements is out of range",
                loc,
            );
            return iteratorCloseOnThrow(record, error, context, loc);
        }
    }
    const opened = getIteratorDirect(receiver.object, context, loc);
    if (opened.type === "throw") {
        return opened;
    }
    const search = args.length > 0 ? args[0] : UNDEFINED;
    let count = 0;
    while (true) {
        const step = iteratorStepValue(opened.value, context, loc);
        if (step.type === "throw") {
            return step;
        }
        if (step.done) {
            return normal({ kind: "boolean", value: false });
        }
        if (count < toSkip) {
            count++;
        } else if (sameValueZero(step.value, search)) {
            const closed = iteratorCloseNormally(opened.value, context, loc);
            return closed.type === "throw" ? closed : normal({ kind: "boolean", value: true });
        }
    }
}

export function registerEagerIteratorMethods(realm: Realm): void {
    const methods: PredicateMethod[] = ["forEach", "some", "every", "find"];
    for (const method of methods) {
        realm.registerBuiltin(realm.iteratorPrototype, method, 1, (receiver, args, context, loc) =>
            consumePredicate(method, receiver, args.length > 0 ? args[0] : UNDEFINED, context, loc),
        );
    }
    realm.registerBuiltin(realm.iteratorPrototype, "reduce", 1, (receiver, args, context, loc) =>
        reduce(receiver, args, context, loc),
    );
    realm.registerBuiltin(realm.iteratorPrototype, "toArray", 0, (receiver, _args, context, loc) =>
        toArray(receiver, context, loc),
    );
    realm.registerBuiltin(realm.iteratorPrototype, "includes", 1, (receiver, args, context, loc) =>
        includes(receiver, args, context, loc),
    );
}
