import { getPrototypeFromConstructor } from "../constructor-prototype.js";
import { getIterator, iteratorCloseOnThrow, iteratorStepValue } from "../iterator.js";
import type { Realm } from "../realm.js";
import {
    languageFailure,
    normal,
    unsupportedFailure,
    UNDEFINED,
    type Value,
    type ValueCompletion,
} from "../runtime.js";
import { keyForSymbol, wellKnownToStringTag } from "../symbols.js";
import { GuestWeakSet } from "../weak-set-object.js";

export function registerWeakSet(realm: Realm): void {
    const constructor = realm.createBuiltinConstructor(
        "WeakSet",
        0,
        (_receiver, _args, context, loc): ValueCompletion =>
            languageFailure(context.realm, "TypeError", "WeakSet requires new", loc),
        (_callee, newTarget, args, context, loc): ValueCompletion => {
            const prototype = getPrototypeFromConstructor(newTarget, "WeakSet", context, loc);
            if (prototype.type === "throw") {
                return prototype;
            }
            const allocation = context.tick(loc);
            if (allocation.type === "throw") {
                return allocation;
            }
            const set = new GuestWeakSet(prototype.value);
            const receiver: Value = { kind: "object", object: set };
            const input = args.length === 0 ? UNDEFINED : args[0];
            if (input.kind === "undefined" || input.kind === "null") {
                return normal(receiver);
            }
            const adder = set.internalGet("add", receiver, context, loc);
            if (adder.type === "throw") {
                return adder;
            }
            if (adder.value.kind !== "object" || adder.value.object.callable === null) {
                return languageFailure(
                    context.realm,
                    "TypeError",
                    "WeakSet add is not callable",
                    loc,
                );
            }
            const acquired = getIterator(input, context, loc);
            if (acquired.type === "throw") {
                return acquired;
            }
            while (true) {
                const next = iteratorStepValue(acquired.value, context, loc);
                if (next.type === "throw") {
                    return next;
                }
                if (next.done) {
                    return normal(receiver);
                }
                const added = context.call(adder.value, receiver, [next.value], loc);
                if (added.type === "throw") {
                    return iteratorCloseOnThrow(acquired.value, added, context, loc);
                }
            }
        },
    );
    constructor.bootstrapDefine("prototype", {
        value: { kind: "object", object: realm.weakSetPrototype },
        writable: false,
        enumerable: false,
        configurable: false,
    });
    realm.weakSetPrototype.bootstrapDefine("constructor", {
        value: { kind: "object", object: constructor },
        writable: true,
        enumerable: false,
        configurable: true,
    });
    realm.weakSetPrototype.bootstrapDefine(wellKnownToStringTag, {
        value: { kind: "string", value: "WeakSet" },
        writable: false,
        enumerable: false,
        configurable: true,
    });
    for (const name of ["add", "has", "delete"] as const) {
        realm.registerBuiltin(
            realm.weakSetPrototype,
            name,
            1,
            (receiver, args, context, loc): ValueCompletion => {
                if (receiver.kind !== "object" || !(receiver.object instanceof GuestWeakSet)) {
                    return languageFailure(
                        context.realm,
                        "TypeError",
                        "receiver is not a WeakSet",
                        loc,
                    );
                }
                const value = args.length === 0 ? UNDEFINED : args[0];
                if (value.kind === "symbol" && keyForSymbol(value.value) === undefined) {
                    return unsupportedFailure(
                        "runtime.weak-symbol-key",
                        "TypeError",
                        "weak symbol keys require native ownership support",
                        loc,
                    );
                }
                if (value.kind !== "object") {
                    if (name === "add") {
                        return languageFailure(
                            context.realm,
                            "TypeError",
                            "invalid WeakSet value",
                            loc,
                        );
                    }
                    return normal({ kind: "boolean", value: false });
                }
                const tick = context.tick(loc);
                if (tick.type === "throw") {
                    return tick;
                }
                const set = receiver.object.data;
                switch (name) {
                    case "has":
                        return normal({ kind: "boolean", value: set.has(value.object) });
                    case "delete":
                        return normal({ kind: "boolean", value: set.delete(value.object) });
                    case "add":
                        set.set(value.object, true);
                        return normal(receiver);
                }
            },
        );
    }
    realm.defineScriptGlobal("WeakSet", {
        value: { kind: "object", object: constructor },
        writable: true,
        enumerable: false,
        configurable: true,
    });
}
