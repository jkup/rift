import { GuestObject, UNDEFINED, normal, languageFailure, sameValue, type Value, type ValueCompletion, type ThrowCompletion, type OperationContext } from "./runtime.js";
import type { Realm } from "./realm.js";
import type { Location } from "./syntax.js";
import { wellKnownSpecies } from "./symbols.js";

export type PromiseCapability = { promise: Value; resolve: Value; reject: Value };
type Reaction = { capability: PromiseCapability; handler: Value; reject: boolean };
export function intrinsicPromiseCapability(realm: Realm): PromiseCapability {
    const promise = new GuestPromise(realm.promisePrototype);
    const functions = createResolvingFunctions(promise, realm);
    return { promise: { kind: "object", object: promise }, resolve: functions.resolve, reject: functions.reject };
}
export function isCallable(value: Value): boolean { return value.kind === "object" && value.object.callable !== null; }
export function fatalPromiseCompletion(result: ThrowCompletion): boolean {
    return result.origin.kind === "resource-limit" || result.origin.kind === "unsupported-operation";
}

export class GuestPromise extends GuestObject {
    private state: "pending" | "fulfilled" | "rejected" = "pending";
    private result: Value = UNDEFINED;
    private fulfillReactions: Reaction[] = [];
    private rejectReactions: Reaction[] = [];

    settle(value: Value, rejected: boolean, context: OperationContext, loc: Location): ValueCompletion {
        if (this.state !== "pending") throw new Error("Promise already settled");
        const reactions = rejected ? this.rejectReactions : this.fulfillReactions;
        this.state = rejected ? "rejected" : "fulfilled";
        this.result = value;
        this.fulfillReactions = [];
        this.rejectReactions = [];
        for (const reaction of reactions) {
            const queued = enqueueReaction(reaction, value, context, loc);
            if (queued.type === "throw") return queued;
        }
        return normal();
    }

    then(capability: PromiseCapability, onFulfilled: Value, onRejected: Value, context: OperationContext, loc: Location): ValueCompletion {
        const fulfilled: Reaction = { capability, handler: isCallable(onFulfilled) ? onFulfilled : UNDEFINED, reject: false };
        const rejected: Reaction = { capability, handler: isCallable(onRejected) ? onRejected : UNDEFINED, reject: true };
        if (this.state === "pending") {
            this.fulfillReactions.push(fulfilled);
            this.rejectReactions.push(rejected);
        } else {
            const queued = enqueueReaction(this.state === "fulfilled" ? fulfilled : rejected, this.result, context, loc);
            if (queued.type === "throw") return queued;
        }
        return normal(capability.promise);
    }
}

function enqueueReaction(reaction: Reaction, argument: Value, context: OperationContext, loc: Location): ValueCompletion {
    const enqueue = context.enqueueJob;
    if (enqueue === undefined) throw new Error("Promise jobs unavailable");
    const handler = reaction.handler;
    const realm = handler.kind === "object" && handler.object.callable !== null ? handler.object.callable.realm : null;
    return enqueue({ realm, run: (jobContext: OperationContext): ValueCompletion => {
        if (handler.kind === "undefined")
            return jobContext.call(reaction.reject ? reaction.capability.reject : reaction.capability.resolve, UNDEFINED, [argument], loc);
        const result = jobContext.call(handler, UNDEFINED, [argument], loc);
        if (result.type === "throw" && fatalPromiseCompletion(result)) return result;
        return jobContext.call(result.type === "throw" ? reaction.capability.reject : reaction.capability.resolve, UNDEFINED, [result.value], loc);
    } }, loc);
}

export function createResolvingFunctions(promise: GuestPromise, realm: Realm): { resolve: Value; reject: Value } {
    const resolved = { value: false };
    const resolve = realm.createBuiltin("", 1, (_receiver, args, context, loc): ValueCompletion => {
        if (resolved.value) return normal();
        resolved.value = true;
        const resolution = args.length === 0 ? UNDEFINED : args[0];
        if (resolution.kind === "object" && resolution.object === promise)
            return promise.settle(languageFailure(context.realm, "TypeError", "Promise cannot resolve itself", loc).value, true, context, loc);
        if (resolution.kind !== "object") return promise.settle(resolution, false, context, loc);
        const then = resolution.object.internalGet("then", resolution, context, loc);
        if (then.type === "throw") return fatalPromiseCompletion(then) ? then : promise.settle(then.value, true, context, loc);
        const callback = then.value;
        if (callback.kind !== "object" || callback.object.callable === null) return promise.settle(resolution, false, context, loc);
        const enqueue = context.enqueueJob;
        if (enqueue === undefined) throw new Error("Promise jobs unavailable");
        return enqueue({ realm: callback.object.callable.realm, run: (jobContext: OperationContext): ValueCompletion => {
            const functions = createResolvingFunctions(promise, jobContext.realm);
            const result = jobContext.call(callback, resolution, [functions.resolve, functions.reject], loc);
            if (result.type === "throw") {
                if (fatalPromiseCompletion(result)) return result;
                return jobContext.call(functions.reject, UNDEFINED, [result.value], loc);
            }
            return normal();
        } }, loc);
    });
    const reject = realm.createBuiltin("", 1, (_receiver, args, context, loc): ValueCompletion => {
        if (resolved.value) return normal();
        resolved.value = true;
        return promise.settle(args.length === 0 ? UNDEFINED : args[0], true, context, loc);
    });
    return { resolve: { kind: "object", object: resolve }, reject: { kind: "object", object: reject } };
}

export function newPromiseCapability(constructor: Value, context: OperationContext, loc: Location): { type: "normal"; value: PromiseCapability } | ThrowCompletion {
    if (constructor.kind !== "object" || constructor.object.constructorSlot === null)
        return languageFailure(context.realm, "TypeError", "Promise constructor required", loc);
    const functions: { resolve: Value; reject: Value } = { resolve: UNDEFINED, reject: UNDEFINED };
    const executor = context.realm.createBuiltin("", 2, (_receiver, args, callContext, callLoc): ValueCompletion => {
        if (functions.resolve.kind !== "undefined" || functions.reject.kind !== "undefined")
            return languageFailure(callContext.realm, "TypeError", "Promise resolving functions already set", callLoc);
        functions.resolve = args.length === 0 ? UNDEFINED : args[0];
        functions.reject = args.length < 2 ? UNDEFINED : args[1];
        return normal();
    });
    const construct = context.construct;
    if (construct === undefined) throw new Error("Script construction unavailable");
    const promise = construct(constructor, [{ kind: "object", object: executor }], constructor, loc);
    if (promise.type === "throw") return promise;
    if (!isCallable(functions.resolve) || !isCallable(functions.reject))
        return languageFailure(context.realm, "TypeError", "Promise resolving functions are not callable", loc);
    return { type: "normal", value: { promise: promise.value, resolve: functions.resolve, reject: functions.reject } };
}

export function promiseSpecies(promise: Value, defaultConstructor: GuestObject, context: OperationContext, loc: Location): ValueCompletion {
    if (promise.kind !== "object") throw new Error("Promise required");
    const constructor = promise.object.internalGet("constructor", promise, context, loc);
    if (constructor.type === "throw") return constructor;
    if (constructor.value.kind === "undefined") return normal({ kind: "object", object: defaultConstructor });
    if (constructor.value.kind !== "object") return languageFailure(context.realm, "TypeError", "Promise constructor is not an object", loc);
    const species = constructor.value.object.internalGet(wellKnownSpecies, constructor.value, context, loc);
    if (species.type === "throw") return species;
    if (species.value.kind === "undefined" || species.value.kind === "null") return normal({ kind: "object", object: defaultConstructor });
    if (species.value.kind !== "object" || species.value.object.constructorSlot === null)
        return languageFailure(context.realm, "TypeError", "Promise species is not a constructor", loc);
    return species;
}

export function promiseResolve(constructor: Value, value: Value, context: OperationContext, loc: Location): ValueCompletion {
    if (constructor.kind !== "object") return languageFailure(context.realm, "TypeError", "Promise constructor is not an object", loc);
    if (value.kind === "object" && value.object instanceof GuestPromise) {
        const actualConstructor = value.object.internalGet("constructor", value, context, loc);
        if (actualConstructor.type === "throw") return actualConstructor;
        if (sameValue(actualConstructor.value, constructor)) return normal(value);
    }
    const capability = newPromiseCapability(constructor, context, loc);
    if (capability.type === "throw") return capability;
    const result = context.call(capability.value.resolve, UNDEFINED, [value], loc);
    return result.type === "throw" ? result : normal(capability.value.promise);
}
