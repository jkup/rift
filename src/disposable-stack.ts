import {
    GuestObject,
    GuestError,
    languageFailure,
    normal,
    UNDEFINED,
    type OperationContext,
    type ThrowCompletion,
    type Value,
    type ValueCompletion,
} from "./runtime.js";
import { wellKnownDispose } from "./symbols.js";
import type { Location } from "./syntax.js";

type DisposableResource = { receiver: Value; method: Value };

export class GuestDisposableStack extends GuestObject {
    disposed = false;
    resources: DisposableResource[] = [];
}

// Synchronous AddDisposableResource, ECMA-262 §7.5.2:
// https://tc39.es/ecma262/#sec-adddisposableresource
// Capture the list before invoking a getter: it may move or dispose the stack.
export function addDisposableResource(
    resources: DisposableResource[],
    value: Value,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    if (value.kind === "null" || value.kind === "undefined") {
        return normal(value);
    }
    if (value.kind !== "object") {
        return languageFailure(context.realm, "TypeError", "resource must be an object", loc);
    }
    const method = value.object.internalGet(wellKnownDispose, value, context, loc);
    if (method.type === "throw") {
        return method;
    }
    if (method.value.kind !== "object" || method.value.object.callable === null) {
        return languageFailure(context.realm, "TypeError", "resource is not disposable", loc);
    }
    const allocation = context.tick(loc);
    if (allocation.type === "throw") {
        return allocation;
    }
    resources.push({ receiver: value, method: method.value });
    return normal(value);
}

export function addDisposalCallback(
    stack: GuestDisposableStack,
    value: Value,
    callback: Value,
    adopt: boolean,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    if (callback.kind !== "object" || callback.object.callable === null) {
        return languageFailure(
            context.realm,
            "TypeError",
            "disposal callback must be callable",
            loc,
        );
    }
    const allocation = context.tick(loc);
    if (allocation.type === "throw") {
        return allocation;
    }
    let method = callback;
    if (adopt) {
        const wrapper = context.realm.createBuiltin(
            "",
            0,
            (_receiver, _args, innerContext, innerLoc) =>
                innerContext.call(callback, UNDEFINED, [value], innerLoc),
        );
        method = { kind: "object", object: wrapper };
    }
    stack.resources.push({ receiver: UNDEFINED, method });
    return normal(adopt ? value : UNDEFINED);
}

function suppressDisposalError(
    error: ThrowCompletion,
    suppressed: ThrowCompletion,
    context: OperationContext,
    loc: Location,
): ThrowCompletion {
    // Allocate the intrinsic directly; neither the global constructor nor inherited
    // setters participate in DisposeResources (ECMA-262 §7.5.4).
    const object = new GuestError(context.realm.getErrorPrototype("SuppressedError"));
    object.bootstrapDefine("error", {
        value: error.value,
        writable: true,
        enumerable: false,
        configurable: true,
    });
    object.bootstrapDefine("suppressed", {
        value: suppressed.value,
        writable: true,
        enumerable: false,
        configurable: true,
    });
    return {
        type: "throw",
        value: { kind: "object", object },
        origin: { kind: "engine-diagnostic" },
        diagnostic: { phase: "runtime", name: "SuppressedError", message: "disposal failed", loc },
    };
}

export function disposeStack(
    stack: GuestDisposableStack,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    if (stack.disposed) {
        return normal();
    }
    stack.disposed = true;
    const resources = stack.resources;
    stack.resources = [];
    let pending: ThrowCompletion | null = null;
    for (let index = resources.length - 1; index >= 0; index--) {
        const tick = context.tick(loc);
        if (tick.type === "throw") {
            return tick;
        }
        const resource = resources[index];
        const result = context.call(resource.method, resource.receiver, [], loc);
        if (result.type !== "throw") {
            continue;
        }
        // Engine stops must neither become catchable nor run further guest cleanup.
        if (
            result.origin.kind === "resource-limit" ||
            result.origin.kind === "unsupported-operation"
        ) {
            return result;
        }
        pending = pending === null ? result : suppressDisposalError(result, pending, context, loc);
    }
    return pending === null ? normal() : pending;
}

export function moveStack(
    stack: GuestDisposableStack,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const allocation = context.tick(loc);
    if (allocation.type === "throw") {
        return allocation;
    }
    // The method's Realm supplies the intrinsic, regardless of the receiver's
    // constructor, subclass, or any guest mutation of the global constructor.
    const moved = new GuestDisposableStack(context.realm.disposableStackPrototype);
    moved.resources = stack.resources;
    stack.resources = [];
    stack.disposed = true;
    return normal({ kind: "object", object: moved });
}
