import { getPrototypeFromConstructor } from "../constructor-prototype.js";
import { addEntriesFromIterable } from "../iterable-entries.js";
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
import { GuestWeakMap } from "../weak-map-object.js";

export function registerWeakMap(realm: Realm): void {
    const constructor = realm.createBuiltinConstructor(
        "WeakMap",
        0,
        (_receiver, _args, context, loc): ValueCompletion =>
            languageFailure(context.realm, "TypeError", "WeakMap requires new", loc),
        (_callee, newTarget, args, context, loc): ValueCompletion => {
            const prototype = getPrototypeFromConstructor(newTarget, "WeakMap", context, loc);
            if (prototype.type === "throw") {
                return prototype;
            }
            const allocation = context.tick(loc);
            if (allocation.type === "throw") {
                return allocation;
            }
            const map = new GuestWeakMap(prototype.value);
            const receiver: Value = { kind: "object", object: map };
            const input = args.length === 0 ? UNDEFINED : args[0];
            if (input.kind === "undefined" || input.kind === "null") {
                return normal(receiver);
            }
            const adder = map.internalGet("set", receiver, context, loc);
            if (adder.type === "throw") {
                return adder;
            }
            if (adder.value.kind !== "object" || adder.value.object.callable === null) {
                return languageFailure(
                    context.realm,
                    "TypeError",
                    "WeakMap set is not callable",
                    loc,
                );
            }
            const result = addEntriesFromIterable(
                input,
                (key, value, adderContext, adderLoc) =>
                    adderContext.call(adder.value, receiver, [key, value], adderLoc),
                context,
                loc,
            );
            return result.type === "throw" ? result : normal(receiver);
        },
    );
    constructor.bootstrapDefine("prototype", {
        value: { kind: "object", object: realm.weakMapPrototype },
        writable: false,
        enumerable: false,
        configurable: false,
    });
    realm.weakMapPrototype.bootstrapDefine("constructor", {
        value: { kind: "object", object: constructor },
        writable: true,
        enumerable: false,
        configurable: true,
    });
    realm.weakMapPrototype.bootstrapDefine(wellKnownToStringTag, {
        value: { kind: "string", value: "WeakMap" },
        writable: false,
        enumerable: false,
        configurable: true,
    });
    for (const name of [
        "get",
        "set",
        "has",
        "delete",
        "getOrInsert",
        "getOrInsertComputed",
    ] as const) {
        realm.registerBuiltin(
            realm.weakMapPrototype,
            name,
            name === "get" || name === "has" || name === "delete" ? 1 : 2,
            (receiver, args, context, loc): ValueCompletion => {
                if (receiver.kind !== "object" || !(receiver.object instanceof GuestWeakMap)) {
                    return languageFailure(
                        context.realm,
                        "TypeError",
                        "receiver is not a WeakMap",
                        loc,
                    );
                }
                const key = args.length === 0 ? UNDEFINED : args[0];
                if (key.kind === "symbol" && keyForSymbol(key.value) === undefined) {
                    return unsupportedFailure(
                        "runtime.weak-symbol-key",
                        "TypeError",
                        "weak symbol keys require native ownership support",
                        loc,
                    );
                }
                if (key.kind !== "object") {
                    if (name === "get") {
                        return normal();
                    }
                    if (name === "has" || name === "delete") {
                        return normal({ kind: "boolean", value: false });
                    }
                    return languageFailure(context.realm, "TypeError", "invalid WeakMap key", loc);
                }
                const supplied = args.length < 2 ? UNDEFINED : args[1];
                if (
                    name === "getOrInsertComputed" &&
                    (supplied.kind !== "object" || supplied.object.callable === null)
                ) {
                    return languageFailure(
                        context.realm,
                        "TypeError",
                        "WeakMap callback is not callable",
                        loc,
                    );
                }
                const tick = context.tick(loc);
                if (tick.type === "throw") {
                    return tick;
                }
                const map = receiver.object.data;
                switch (name) {
                    case "get":
                        return normal(map.get(key.object) ?? UNDEFINED);
                    case "has":
                        return normal({ kind: "boolean", value: map.has(key.object) });
                    case "delete":
                        return normal({ kind: "boolean", value: map.delete(key.object) });
                    case "set":
                        map.set(key.object, supplied);
                        return normal(receiver);
                    case "getOrInsert":
                    case "getOrInsertComputed": {
                        const existing = map.get(key.object);
                        if (existing !== undefined) {
                            return normal(existing);
                        }
                        let value = supplied;
                        if (name === "getOrInsertComputed") {
                            const called = context.call(supplied, UNDEFINED, [key], loc);
                            if (called.type === "throw") {
                                return called;
                            }
                            value = called.value;
                        }
                        const insertion = context.tick(loc);
                        if (insertion.type === "throw") {
                            return insertion;
                        }
                        map.set(key.object, value);
                        return normal(value);
                    }
                }
            },
        );
    }
    realm.defineScriptGlobal("WeakMap", {
        value: { kind: "object", object: constructor },
        writable: true,
        enumerable: false,
        configurable: true,
    });
}
