import { getPrototypeFromConstructor } from "../constructor-prototype.js";
import {
    GuestDisposableStack,
    addDisposableResource,
    addDisposalCallback,
    disposeStack,
    moveStack,
} from "../disposable-stack.js";
import type { Realm } from "../realm.js";
import {
    languageFailure,
    normal,
    UNDEFINED,
    type OperationContext,
    type Value,
    type ValueCompletion,
} from "../runtime.js";
import { wellKnownDispose, wellKnownToStringTag } from "../symbols.js";
import type { Location } from "../syntax.js";

type StackMethod = "use" | "adopt" | "defer" | "move" | "dispose" | "get disposed";

// https://tc39.es/ecma262/#sec-disposablestack-objects
function invokeStackMethod(
    name: StackMethod,
    receiver: Value,
    args: Value[],
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    if (receiver.kind !== "object" || !(receiver.object instanceof GuestDisposableStack)) {
        return languageFailure(
            context.realm,
            "TypeError",
            "receiver is not a DisposableStack",
            loc,
        );
    }
    const stack = receiver.object;
    if (name === "get disposed") {
        return normal({ kind: "boolean", value: stack.disposed });
    }
    if (name === "dispose") {
        return disposeStack(stack, context, loc);
    }
    if (stack.disposed) {
        return languageFailure(context.realm, "ReferenceError", "stack is already disposed", loc);
    }
    const value = args.length === 0 ? UNDEFINED : args[0];
    switch (name) {
        case "use":
            return addDisposableResource(stack.resources, value, context, loc);
        case "adopt":
            return addDisposalCallback(
                stack,
                value,
                args.length < 2 ? UNDEFINED : args[1],
                true,
                context,
                loc,
            );
        case "defer":
            return addDisposalCallback(stack, UNDEFINED, value, false, context, loc);
        case "move":
            return moveStack(stack, context, loc);
    }
}

function registerStackMethods(realm: Realm): void {
    const methods: { name: StackMethod; length: number }[] = [
        { name: "use", length: 1 },
        { name: "adopt", length: 2 },
        { name: "defer", length: 1 },
        { name: "move", length: 0 },
        { name: "dispose", length: 0 },
    ];
    for (const { name, length } of methods) {
        const method = realm.registerBuiltin(
            realm.disposableStackPrototype,
            name,
            length,
            (receiver, args, context, loc) => invokeStackMethod(name, receiver, args, context, loc),
        );
        if (name === "dispose") {
            realm.disposableStackPrototype.bootstrapDefine(wellKnownDispose, {
                value: method,
                writable: true,
                enumerable: false,
                configurable: true,
            });
        }
    }
    const getter = realm.createBuiltin("get disposed", 0, (receiver, args, context, loc) =>
        invokeStackMethod("get disposed", receiver, args, context, loc),
    );
    realm.disposableStackPrototype.bootstrapDefine("disposed", {
        get: { kind: "object", object: getter },
        set: UNDEFINED,
        enumerable: false,
        configurable: true,
    });
}

export function registerDisposableStack(realm: Realm): void {
    const constructor = realm.createBuiltinConstructor(
        "DisposableStack",
        0,
        (_receiver, _args, context, loc) =>
            languageFailure(context.realm, "TypeError", "DisposableStack requires new", loc),
        (_callee, newTarget, _args, context, loc) => {
            const prototype = getPrototypeFromConstructor(
                newTarget,
                "DisposableStack",
                context,
                loc,
            );
            if (prototype.type === "throw") {
                return prototype;
            }
            const allocation = context.tick(loc);
            if (allocation.type === "throw") {
                return allocation;
            }
            return normal({ kind: "object", object: new GuestDisposableStack(prototype.value) });
        },
    );
    constructor.bootstrapDefine("prototype", {
        value: { kind: "object", object: realm.disposableStackPrototype },
        writable: false,
        enumerable: false,
        configurable: false,
    });
    realm.disposableStackPrototype.bootstrapDefine("constructor", {
        value: { kind: "object", object: constructor },
        writable: true,
        enumerable: false,
        configurable: true,
    });
    realm.disposableStackPrototype.bootstrapDefine(wellKnownToStringTag, {
        value: { kind: "string", value: "DisposableStack" },
        writable: false,
        enumerable: false,
        configurable: true,
    });
    registerStackMethods(realm);
    realm.defineScriptGlobal("DisposableStack", {
        value: { kind: "object", object: constructor },
        writable: true,
        enumerable: false,
        configurable: true,
    });
}
