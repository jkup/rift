import type { Realm } from "../realm.js";
import { arrayFromList } from "../array-create.js";
import { getIterator, iteratorStepValue, iteratorCloseOnThrow, type IteratorRecord } from "../iterator.js";
import { toObject } from "../object-conversion.js";
import { newPromiseCapability, isCallable, fatalPromiseCompletion, type PromiseCapability } from "../promise.js";
import { UNDEFINED, normal, languageFailure, type GuestObject, type Value, type ValueCompletion, type ThrowCompletion, type OperationContext } from "../runtime.js";
import type { Location } from "../syntax.js";

function rejectAbrupt(completion: ThrowCompletion, capability: PromiseCapability, context: OperationContext, loc: Location): ValueCompletion {
    if (fatalPromiseCompletion(completion)) return completion;
    const rejected = context.call(capability.reject, UNDEFINED, [completion.value], loc);
    return rejected.type === "throw" ? rejected : normal(capability.promise);
}

function resolveArray(values: Value[], capability: PromiseCapability, context: OperationContext, loc: Location): ValueCompletion {
    const array = arrayFromList(values, context, loc);
    return array.type === "throw" ? array : context.call(capability.resolve, UNDEFINED, [array.value], loc);
}

function allElement(index: number, values: Value[], remaining: { value: number }, capability: PromiseCapability, realm: Realm): Value {
    const called = { value: false };
    const callback = realm.createBuiltin("", 1, (_receiver, args, context, loc): ValueCompletion => {
        if (called.value) return normal();
        called.value = true;
        values[index] = args.length === 0 ? UNDEFINED : args[0];
        remaining.value--;
        return remaining.value === 0 ? resolveArray(values, capability, context, loc) : normal();
    });
    return { kind: "object", object: callback };
}

function performCombinator(all: boolean, iterator: IteratorRecord, constructor: Value, resolve: Value,
    capability: PromiseCapability, context: OperationContext, loc: Location): ValueCompletion {
    const values: Value[] = [];
    // The extra element keeps synchronous then callbacks from resolving early.
    const remaining = { value: 1 };
    while (true) {
        const step = iteratorStepValue(iterator, context, loc);
        if (step.type === "throw") return step;
        if (step.done) {
            if (all) {
                remaining.value--;
                if (remaining.value === 0) {
                    const result = resolveArray(values, capability, context, loc);
                    if (result.type === "throw") return result;
                }
            }
            return normal(capability.promise);
        }
        const index = values.length;
        if (all) values.push(UNDEFINED);
        const nextPromise = context.call(resolve, constructor, [step.value], loc);
        if (nextPromise.type === "throw") return nextPromise;
        const fulfilled = all ? allElement(index, values, remaining, capability, context.realm) : capability.resolve;
        if (all) remaining.value++;
        const object = toObject(nextPromise.value, context, loc);
        if (object.type === "throw") return object;
        const then = object.value.internalGet("then", nextPromise.value, context, loc);
        if (then.type === "throw") return then;
        const result = context.call(then.value, nextPromise.value, [fulfilled, capability.reject], loc);
        if (result.type === "throw") return result;
    }
}

export function registerPromiseCombinators(realm: Realm, constructor: GuestObject): void {
    for (const name of ["all", "race"] as const) {
        realm.registerBuiltin(constructor, name, 1, (receiver, args, context, loc): ValueCompletion => {
            const capability = newPromiseCapability(receiver, context, loc);
            if (capability.type === "throw") return capability;
            if (receiver.kind !== "object") throw new Error("Promise constructor required");
            const resolve = receiver.object.internalGet("resolve", receiver, context, loc);
            if (resolve.type === "throw") return rejectAbrupt(resolve, capability.value, context, loc);
            if (!isCallable(resolve.value))
                return rejectAbrupt(languageFailure(context.realm, "TypeError", "Promise resolve is not callable", loc), capability.value, context, loc);
            const acquired = getIterator(args.length === 0 ? UNDEFINED : args[0], context, loc);
            if (acquired.type === "throw") return rejectAbrupt(acquired, capability.value, context, loc);
            const result = performCombinator(name === "all", acquired.value, receiver, resolve.value, capability.value, context, loc);
            if (result.type !== "throw") return result;
            const closed = acquired.value.done ? result : iteratorCloseOnThrow(acquired.value, result, context, loc);
            return rejectAbrupt(closed, capability.value, context, loc);
        });
    }
}
