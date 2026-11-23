import {
    getIterator,
    getIteratorFromMethod,
    iteratorCloseNormally,
    iteratorCloseOnThrow,
    type IteratorRecord,
} from "./iterator.js";
import { iteratorResult } from "./iterator-result.js";
import { toObject } from "./object-conversion.js";
import {
    GuestPromise,
    intrinsicPromiseCapability,
    promiseResolve,
    fatalPromiseCompletion,
    type PromiseCapability,
} from "./promise.js";
import {
    GuestObject,
    UNDEFINED,
    normal,
    truthy,
    languageFailure,
    type Value,
    type ValueCompletion,
    type ThrowCompletion,
    type OperationContext,
} from "./runtime.js";
import type { Realm } from "./realm.js";
import type { Location } from "./syntax.js";
import { wellKnownAsyncDispose, wellKnownAsyncIterator } from "./symbols.js";

class AsyncFromSyncIterator extends GuestObject {
    constructor(
        readonly sync: IteratorRecord,
        prototype: GuestObject,
    ) {
        super(prototype);
    }
}

export function getAsyncIterator(
    input: Value,
    context: OperationContext,
    loc: Location,
): { type: "normal"; value: IteratorRecord } | ThrowCompletion {
    const object = toObject(input, context, loc);
    if (object.type === "throw") {
        return object;
    }
    const method = object.value.internalGet(wellKnownAsyncIterator, input, context, loc);
    if (method.type === "throw") {
        return method;
    }
    if (method.value.kind !== "undefined" && method.value.kind !== "null") {
        if (method.value.kind !== "object" || method.value.object.callable === null) {
            return languageFailure(
                context.realm,
                "TypeError",
                "async iterator method is not callable",
                loc,
            );
        }
        return getIteratorFromMethod(input, method.value, context, loc);
    }
    const sync = getIterator(input, context, loc);
    if (sync.type === "throw") {
        return sync;
    }
    const iterator = new AsyncFromSyncIterator(
        sync.value,
        context.realm.asyncFromSyncIteratorPrototype,
    );
    const next = iterator.internalGet("next", { kind: "object", object: iterator }, context, loc);
    return next.type === "throw"
        ? next
        : { type: "normal", value: { iterator, nextMethod: next.value, done: false } };
}

function reject(
    capability: PromiseCapability,
    failure: ThrowCompletion,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    if (fatalPromiseCompletion(failure)) {
        return failure;
    }
    const result = context.call(capability.reject, UNDEFINED, [failure.value], loc);
    return result.type === "throw" ? result : normal(capability.promise);
}

function continueSync(
    result: Value,
    capability: PromiseCapability,
    sync: IteratorRecord,
    closeOnRejection: boolean,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    if (result.kind !== "object") {
        return reject(
            capability,
            languageFailure(context.realm, "TypeError", "iterator result must be an object", loc),
            context,
            loc,
        );
    }
    const doneResult = result.object.internalGet("done", result, context, loc);
    if (doneResult.type === "throw") {
        return reject(capability, doneResult, context, loc);
    }
    const done = truthy(doneResult.value);
    const value = result.object.internalGet("value", result, context, loc);
    if (value.type === "throw") {
        return reject(capability, value, context, loc);
    }
    const constructor = context.realm.promiseConstructor;
    if (constructor === null) {
        throw new Error("Promise intrinsic unavailable");
    }
    const wrapped = promiseResolve(
        { kind: "object", object: constructor },
        value.value,
        context,
        loc,
    );
    if (wrapped.type === "throw") {
        const failure =
            !done && closeOnRejection ? iteratorCloseOnThrow(sync, wrapped, context, loc) : wrapped;
        return reject(capability, failure, context, loc);
    }
    if (wrapped.value.kind !== "object" || !(wrapped.value.object instanceof GuestPromise)) {
        throw new Error("intrinsic Promise required");
    }
    const fulfilled = context.realm.createBuiltin(
        "",
        1,
        (_receiver, args, jobContext, jobLoc): ValueCompletion =>
            iteratorResult(args.length === 0 ? UNDEFINED : args[0], done, jobContext, jobLoc),
    );
    let rejected: Value = UNDEFINED;
    if (!done && closeOnRejection) {
        const handler = context.realm.createBuiltin(
            "",
            1,
            (_receiver, args, jobContext, jobLoc): ValueCompletion => {
                const failure: ThrowCompletion = {
                    type: "throw",
                    origin: { kind: "guest" },
                    value: args.length === 0 ? UNDEFINED : args[0],
                    diagnostic: {
                        phase: "runtime",
                        name: "Uncaught",
                        message: "guest throw",
                        loc: jobLoc,
                    },
                };
                return iteratorCloseOnThrow(sync, failure, jobContext, jobLoc);
            },
        );
        rejected = { kind: "object", object: handler };
    }
    return wrapped.value.object.then(
        capability,
        { kind: "object", object: fulfilled },
        rejected,
        context,
        loc,
    );
}

function disposeAsyncIterator(
    receiver: Value,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const capability = intrinsicPromiseCapability(context.realm);
    const object = toObject(receiver, context, loc);
    if (object.type === "throw") {
        return reject(capability, object, context, loc);
    }
    const method = object.value.internalGet("return", receiver, context, loc);
    if (method.type === "throw") {
        return reject(capability, method, context, loc);
    }
    if (method.value.kind === "undefined" || method.value.kind === "null") {
        const settled = context.call(capability.resolve, UNDEFINED, [UNDEFINED], loc);
        return settled.type === "throw" ? settled : normal(capability.promise);
    }
    const result = context.call(method.value, receiver, [], loc);
    if (result.type === "throw") {
        return reject(capability, result, context, loc);
    }
    const constructor = context.realm.promiseConstructor;
    if (constructor === null) {
        throw new Error("Promise intrinsic unavailable");
    }
    const wrapped = promiseResolve(
        { kind: "object", object: constructor },
        result.value,
        context,
        loc,
    );
    if (wrapped.type === "throw") {
        return reject(capability, wrapped, context, loc);
    }
    if (wrapped.value.kind !== "object" || !(wrapped.value.object instanceof GuestPromise)) {
        throw new Error("intrinsic Promise required");
    }
    // ECMA-262 async iterator disposal awaits return(), then discards its result.
    // Use the internal reaction operation, not an observable .then/species lookup.
    const fulfilled = context.realm.createBuiltin("", 1, (_receiver, _args, _context, _loc) =>
        normal(),
    );
    return wrapped.value.object.then(
        capability,
        { kind: "object", object: fulfilled },
        UNDEFINED,
        context,
        loc,
    );
}

export function registerAsyncIterators(realm: Realm): void {
    const dispose = realm.createBuiltin(
        "[Symbol.asyncDispose]",
        0,
        (receiver, _args, context, loc) => disposeAsyncIterator(receiver, context, loc),
    );
    realm.asyncIteratorPrototype.bootstrapDefine(wellKnownAsyncDispose, {
        value: { kind: "object", object: dispose },
        writable: true,
        configurable: true,
    });
    const identity = realm.createBuiltin(
        "[Symbol.asyncIterator]",
        0,
        (receiver, _args, _context, _loc): ValueCompletion => normal(receiver),
    );
    realm.asyncIteratorPrototype.bootstrapDefine(wellKnownAsyncIterator, {
        value: { kind: "object", object: identity },
        writable: true,
        configurable: true,
    });
    for (const name of ["next", "return", "throw"] as const) {
        realm.registerBuiltin(
            realm.asyncFromSyncIteratorPrototype,
            name,
            1,
            (receiver, args, context, loc): ValueCompletion => {
                if (
                    receiver.kind !== "object" ||
                    !(receiver.object instanceof AsyncFromSyncIterator)
                ) {
                    throw new Error("AsyncFromSync iterator required");
                }
                const sync = receiver.object.sync,
                    capability = intrinsicPromiseCapability(context.realm);
                const input: Value = { kind: "object", object: sync.iterator };
                let method = sync.nextMethod;
                if (name !== "next") {
                    const found = sync.iterator.internalGet(name, input, context, loc);
                    if (found.type === "throw") {
                        return reject(capability, found, context, loc);
                    }
                    method = found.value;
                    if (method.kind === "undefined" || method.kind === "null") {
                        if (name === "return") {
                            const result = iteratorResult(
                                args.length === 0 ? UNDEFINED : args[0],
                                true,
                                context,
                                loc,
                            );
                            if (result.type === "throw") {
                                return reject(capability, result, context, loc);
                            }
                            const settled = context.call(
                                capability.resolve,
                                UNDEFINED,
                                [result.value],
                                loc,
                            );
                            return settled.type === "throw" ? settled : normal(capability.promise);
                        }
                        const closed = iteratorCloseNormally(sync, context, loc);
                        return reject(
                            capability,
                            closed.type === "throw"
                                ? closed
                                : languageFailure(
                                      context.realm,
                                      "TypeError",
                                      "iterator has no throw method",
                                      loc,
                                  ),
                            context,
                            loc,
                        );
                    }
                }
                const result = context.call(method, input, args.length === 0 ? [] : [args[0]], loc);
                return result.type === "throw"
                    ? reject(capability, result, context, loc)
                    : continueSync(result.value, capability, sync, name !== "return", context, loc);
            },
        );
    }
}
