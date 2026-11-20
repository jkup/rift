import { registerSetMethods } from "./set-methods.js";
import { getPrototypeFromConstructor } from "../constructor-prototype.js";
import type { Realm } from "../realm.js";
import { GuestSet } from "../set-object.js";
import { getIterator, iteratorCloseOnThrow, iteratorStepValue } from "../iterator.js";
import {
    languageFailure,
    normal,
    UNDEFINED,
    type OperationContext,
    type ThrowCompletion,
    type Value,
    type ValueCompletion,
} from "../runtime.js";
import { wellKnownSpecies, wellKnownToStringTag } from "../symbols.js";
import type { Location } from "../syntax.js";

function setReceiver(
    receiver: Value,
    context: OperationContext,
    loc: Location,
): { type: "normal"; value: GuestSet } | ThrowCompletion {
    if (receiver.kind !== "object" || !(receiver.object instanceof GuestSet)) {
        return languageFailure(context.realm, "TypeError", "receiver is not a Set", loc);
    }
    return { type: "normal", value: receiver.object };
}

export function registerSet(realm: Realm): void {
    const constructor = realm.createBuiltinConstructor(
        "Set",
        0,
        (_receiver, _args, context, loc): ValueCompletion =>
            languageFailure(context.realm, "TypeError", "Set requires new", loc),
        (_callee, newTarget, args, context, loc): ValueCompletion => {
            const prototype = getPrototypeFromConstructor(newTarget, "Set", context, loc);
            if (prototype.type === "throw") {
                return prototype;
            }
            const allocation = context.tick(loc);
            if (allocation.type === "throw") {
                return allocation;
            }
            const set = new GuestSet(prototype.value);
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
                return languageFailure(context.realm, "TypeError", "Set add is not callable", loc);
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
        value: { kind: "object", object: realm.setPrototype },
        writable: false,
        enumerable: false,
        configurable: false,
    });
    realm.setPrototype.bootstrapDefine("constructor", {
        value: { kind: "object", object: constructor },
        writable: true,
        enumerable: false,
        configurable: true,
    });
    const species = realm.createBuiltin(
        "get [Symbol.species]",
        0,
        (receiver, _args, _context, _loc) => normal(receiver),
    );
    constructor.bootstrapDefine(wellKnownSpecies, {
        get: { kind: "object", object: species },
        set: UNDEFINED,
        enumerable: false,
        configurable: true,
    });
    realm.setPrototype.bootstrapDefine(wellKnownToStringTag, {
        value: { kind: "string", value: "Set" },
        writable: false,
        enumerable: false,
        configurable: true,
    });

    for (const name of ["add", "has", "delete", "clear"] as const) {
        realm.registerBuiltin(
            realm.setPrototype,
            name,
            name === "clear" ? 0 : 1,
            (receiver, args, context, loc): ValueCompletion => {
                const set = setReceiver(receiver, context, loc);
                if (set.type === "throw") {
                    return set;
                }
                const tick = context.tick(loc);
                if (tick.type === "throw") {
                    return tick;
                }
                const value = args.length === 0 ? UNDEFINED : args[0];
                switch (name) {
                    case "add":
                        set.value.data.set(value, UNDEFINED);
                        return normal(receiver);
                    case "has":
                        return normal({ kind: "boolean", value: set.value.data.has(value) });
                    case "delete":
                        return normal({ kind: "boolean", value: set.value.data.delete(value) });
                    case "clear":
                        return set.value.data.clear(context, loc);
                }
            },
        );
    }
    const size = realm.createBuiltin(
        "get size",
        0,
        (receiver, _args, context, loc): ValueCompletion => {
            const set = setReceiver(receiver, context, loc);
            return set.type === "throw"
                ? set
                : normal({ kind: "number", value: set.value.data.size });
        },
    );
    realm.setPrototype.bootstrapDefine("size", {
        get: { kind: "object", object: size },
        set: UNDEFINED,
        enumerable: false,
        configurable: true,
    });
    registerSetForEach(realm);
    registerSetMethods(realm);
    realm.defineScriptGlobal("Set", {
        value: { kind: "object", object: constructor },
        writable: true,
        enumerable: false,
        configurable: true,
    });
}

function registerSetForEach(realm: Realm): void {
    realm.registerBuiltin(
        realm.setPrototype,
        "forEach",
        1,
        (receiver, args, context, loc): ValueCompletion => {
            const set = setReceiver(receiver, context, loc);
            if (set.type === "throw") {
                return set;
            }
            const callback = args.length === 0 ? UNDEFINED : args[0];
            if (callback.kind !== "object" || callback.object.callable === null) {
                return languageFailure(
                    context.realm,
                    "TypeError",
                    "Set callback is not callable",
                    loc,
                );
            }
            const thisArg = args.length < 2 ? UNDEFINED : args[1];
            const cursor = set.value.data.cursor();
            while (true) {
                const next = cursor.next(context, loc);
                if (next.type === "throw") {
                    return next;
                }
                if (next.entry === null) {
                    return normal();
                }
                const called = context.call(
                    callback,
                    thisArg,
                    [next.entry.key, next.entry.key, receiver],
                    loc,
                );
                if (called.type === "throw") {
                    return called;
                }
            }
        },
    );
}
