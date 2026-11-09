import { toObject } from "./object-conversion.js";
import { languageFailure, normal, truthy, UNDEFINED, type GuestObject, type OperationContext,
    type ThrowCompletion, type Value, type ValueCompletion } from "./runtime.js";
import { wellKnownIterator } from "./symbols.js";
import type { Location } from "./syntax.js";

export type IteratorRecord = { iterator: GuestObject; nextMethod: Value; done: boolean };
type IteratorCompletion = { type: "normal"; value: IteratorRecord } | ThrowCompletion;
type IteratorResultCompletion = { type: "normal"; value: GuestObject | null } | ThrowCompletion;
type IteratorStepCompletion = { type: "normal"; done: boolean; value: Value } | ThrowCompletion;

export function getIterator(input: Value, context: OperationContext, loc: Location): IteratorCompletion {
    const boxed = toObject(input, context, loc);
    if (boxed.type === "throw") return boxed;
    const method = boxed.value.internalGet(wellKnownIterator, input, context, loc);
    if (method.type === "throw") return method;
    if (method.value.kind !== "object" || method.value.object.callable === null)
        return languageFailure(context.realm, "TypeError", "value is not iterable", loc);
    const called = context.call(method.value, input, [], loc);
    if (called.type === "throw") return called;
    if (called.value.kind !== "object")
        return languageFailure(context.realm, "TypeError", "iterator must be an object", loc);
    const iterator = called.value.object;
    const next = iterator.internalGet("next", called.value, context, loc);
    if (next.type === "throw") return next;
    return { type: "normal", value: { iterator, nextMethod: next.value, done: false } };
}

export function iteratorStep(record: IteratorRecord, context: OperationContext, loc: Location): IteratorResultCompletion {
    const tick = context.tick(loc);
    if (tick.type === "throw") return tick;
    const result = context.call(record.nextMethod, { kind: "object", object: record.iterator }, [], loc);
    if (result.type === "throw") {
        record.done = true;
        return result;
    }
    if (result.value.kind !== "object") {
        record.done = true;
        return languageFailure(context.realm, "TypeError", "iterator result must be an object", loc);
    }
    const object = result.value.object;
    const done = object.internalGet("done", result.value, context, loc);
    if (done.type === "throw") {
        record.done = true;
        return done;
    }
    if (truthy(done.value)) {
        record.done = true;
        return { type: "normal", value: null };
    }
    return { type: "normal", value: object };
}

export function iteratorStepValue(record: IteratorRecord, context: OperationContext, loc: Location): IteratorStepCompletion {
    const result = iteratorStep(record, context, loc);
    if (result.type === "throw") return result;
    if (result.value === null) return { type: "normal", done: true, value: UNDEFINED };
    const value = result.value.internalGet("value", { kind: "object", object: result.value }, context, loc);
    if (value.type === "throw") {
        record.done = true;
        return value;
    }
    return { type: "normal", done: false, value: value.value };
}

function engineStop(completion: ThrowCompletion): boolean {
    return completion.origin.kind === "resource-limit" || completion.origin.kind === "unsupported-operation";
}

export function iteratorCloseNormally(record: IteratorRecord, context: OperationContext, loc: Location): ValueCompletion {
    const receiver: Value = { kind: "object", object: record.iterator };
    const method = record.iterator.internalGet("return", receiver, context, loc);
    if (method.type === "throw") return method;
    if (method.value.kind === "undefined" || method.value.kind === "null") return normal();
    if (method.value.kind !== "object" || method.value.object.callable === null)
        return languageFailure(context.realm, "TypeError", "iterator return must be callable", loc);
    const result = context.call(method.value, receiver, [], loc);
    if (result.type === "throw") return result;
    if (result.value.kind !== "object")
        return languageFailure(context.realm, "TypeError", "iterator return result must be an object", loc);
    return normal();
}

export function iteratorCloseOnThrow(record: IteratorRecord, pending: ThrowCompletion, context: OperationContext, loc: Location): ThrowCompletion {
    // Engine stop conditions cannot resume guest cleanup or become catchable.
    if (engineStop(pending)) return pending;
    const receiver: Value = { kind: "object", object: record.iterator };
    const method = record.iterator.internalGet("return", receiver, context, loc);
    if (method.type === "throw") return engineStop(method) ? method : pending;
    if (method.value.kind !== "object" || method.value.object.callable === null) return pending;
    const closed = context.call(method.value, receiver, [], loc);
    if (closed.type === "throw" && engineStop(closed)) return closed;
    // An existing guest throw wins over cleanup errors and non-object results.
    return pending;
}
