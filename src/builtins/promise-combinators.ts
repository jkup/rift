import type { Realm } from "../realm.js";
import { arrayFromList } from "../array-create.js";
import {
    getIterator,
    iteratorStepValue,
    iteratorCloseOnThrow,
    type IteratorRecord,
} from "../iterator.js";
import { toObject } from "../object-conversion.js";
import {
    newPromiseCapability,
    isCallable,
    fatalPromiseCompletion,
    type PromiseCapability,
} from "../promise.js";
import {
    UNDEFINED,
    normal,
    languageFailure,
    type GuestObject,
    type Value,
    type ValueCompletion,
    type ThrowCompletion,
    type OperationContext,
} from "../runtime.js";
import type { Location } from "../syntax.js";

type Combinator = "all" | "allSettled" | "any" | "race";
type Aggregation = {
    mode: Combinator;
    values: Value[];
    remaining: number;
    capability: PromiseCapability;
};

function rejectAbrupt(
    completion: ThrowCompletion,
    capability: PromiseCapability,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    if (fatalPromiseCompletion(completion)) {
        return completion;
    }
    const rejected = context.call(capability.reject, UNDEFINED, [completion.value], loc);
    return rejected.type === "throw" ? rejected : normal(capability.promise);
}

function finishAggregation(
    state: Aggregation,
    throwRejection: boolean,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const array = arrayFromList(state.values, context, loc);
    if (array.type === "throw") {
        return array;
    }
    if (state.mode !== "any") {
        return context.call(state.capability.resolve, UNDEFINED, [array.value], loc);
    }
    const error = languageFailure(
        context.realm,
        "AggregateError",
        "All promises were rejected",
        loc,
    );
    if (error.value.kind !== "object") {
        throw new Error("AggregateError intrinsic unavailable");
    }
    error.value.object.bootstrapDefine("errors", {
        value: array.value,
        writable: true,
        enumerable: false,
        configurable: true,
    });
    // Iteration reports an abrupt completion; its caller invokes reject once.
    return throwRejection
        ? error
        : context.call(state.capability.reject, UNDEFINED, [error.value], loc);
}

function aggregateElement(
    index: number,
    state: Aggregation,
    rejected: boolean,
    called: { value: boolean },
    realm: Realm,
): Value {
    const callback = realm.createBuiltin(
        "",
        1,
        (_receiver, args, context, loc): ValueCompletion => {
            if (called.value) {
                return normal();
            }
            called.value = true;
            const value = args.length === 0 ? UNDEFINED : args[0];
            if (state.mode === "allSettled") {
                const tick = context.tick(loc);
                if (tick.type === "throw") {
                    return tick;
                }
                const object = context.realm.createObject();
                object.bootstrapDefine("status", {
                    value: { kind: "string", value: rejected ? "rejected" : "fulfilled" },
                    writable: true,
                    enumerable: true,
                    configurable: true,
                });
                object.bootstrapDefine(rejected ? "reason" : "value", {
                    value,
                    writable: true,
                    enumerable: true,
                    configurable: true,
                });
                state.values[index] = { kind: "object", object };
            } else {
                state.values[index] = value;
            }
            state.remaining--;
            return state.remaining === 0 ? finishAggregation(state, false, context, loc) : normal();
        },
    );
    return { kind: "object", object: callback };
}

function performCombinator(
    mode: Combinator,
    iterator: IteratorRecord,
    constructor: Value,
    resolve: Value,
    capability: PromiseCapability,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    // The extra element keeps synchronous then callbacks from resolving early.
    const state: Aggregation = { mode, values: [], remaining: 1, capability };
    while (true) {
        const step = iteratorStepValue(iterator, context, loc);
        if (step.type === "throw") {
            return step;
        }
        if (step.done) {
            if (mode !== "race") {
                state.remaining--;
                if (state.remaining === 0) {
                    const result = finishAggregation(state, true, context, loc);
                    if (result.type === "throw") {
                        return result;
                    }
                }
            }
            return normal(capability.promise);
        }
        const index = state.values.length;
        if (mode !== "race") {
            state.values.push(UNDEFINED);
        }
        const nextPromise = context.call(resolve, constructor, [step.value], loc);
        if (nextPromise.type === "throw") {
            return nextPromise;
        }
        const called = { value: false };
        const fulfilled =
            mode === "all" || mode === "allSettled"
                ? aggregateElement(index, state, false, called, context.realm)
                : capability.resolve;
        const rejected =
            mode === "any" || mode === "allSettled"
                ? aggregateElement(index, state, true, called, context.realm)
                : capability.reject;
        if (mode !== "race") {
            state.remaining++;
        }
        const object = toObject(nextPromise.value, context, loc);
        if (object.type === "throw") {
            return object;
        }
        const then = object.value.internalGet("then", nextPromise.value, context, loc);
        if (then.type === "throw") {
            return then;
        }
        const result = context.call(then.value, nextPromise.value, [fulfilled, rejected], loc);
        if (result.type === "throw") {
            return result;
        }
    }
}

export function registerPromiseCombinators(realm: Realm, constructor: GuestObject): void {
    for (const name of ["all", "allSettled", "any", "race"] as const) {
        realm.registerBuiltin(
            constructor,
            name,
            1,
            (receiver, args, context, loc): ValueCompletion => {
                const capability = newPromiseCapability(receiver, context, loc);
                if (capability.type === "throw") {
                    return capability;
                }
                if (receiver.kind !== "object") {
                    throw new Error("Promise constructor required");
                }
                const resolve = receiver.object.internalGet("resolve", receiver, context, loc);
                if (resolve.type === "throw") {
                    return rejectAbrupt(resolve, capability.value, context, loc);
                }
                if (!isCallable(resolve.value)) {
                    return rejectAbrupt(
                        languageFailure(
                            context.realm,
                            "TypeError",
                            "Promise resolve is not callable",
                            loc,
                        ),
                        capability.value,
                        context,
                        loc,
                    );
                }
                const acquired = getIterator(args.length === 0 ? UNDEFINED : args[0], context, loc);
                if (acquired.type === "throw") {
                    return rejectAbrupt(acquired, capability.value, context, loc);
                }
                const result = performCombinator(
                    name,
                    acquired.value,
                    receiver,
                    resolve.value,
                    capability.value,
                    context,
                    loc,
                );
                if (result.type !== "throw") {
                    return result;
                }
                const closed = acquired.value.done
                    ? result
                    : iteratorCloseOnThrow(acquired.value, result, context, loc);
                return rejectAbrupt(closed, capability.value, context, loc);
            },
        );
    }
}
