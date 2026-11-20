import type { Realm } from "../realm.js";
import type { Location } from "../syntax.js";
import {
    GuestObject,
    languageFailure,
    normal,
    UNDEFINED,
    type OperationContext,
    type PropertyKey,
    type Value,
    type ValueCompletion,
} from "../runtime.js";
import { getPrototypeFromConstructor } from "../constructor-prototype.js";
import { wellKnownIterator, wellKnownToStringTag } from "../symbols.js";
import { registerEagerIteratorMethods } from "./iterator-eager.js";
import { registerIteratorFrom } from "./iterator-from.js";

function setInheritedProperty(
    receiver: Value,
    home: GuestObject,
    key: PropertyKey,
    value: Value,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    if (receiver.kind !== "object" || receiver.object === home) {
        return languageFailure(
            context.realm,
            "TypeError",
            "cannot set iterator prototype property",
            loc,
        );
    }
    const own = receiver.object.getOwnProperty(key);
    const result =
        own === undefined
            ? receiver.object.defineOwnProperty(
                  key,
                  { value, writable: true, enumerable: true, configurable: true },
                  context,
                  loc,
              )
            : receiver.object.internalSet(key, value, receiver, context, loc);
    if (result.type === "throw") {
        return result;
    }
    if (!result.value) {
        return languageFailure(context.realm, "TypeError", "cannot set iterator property", loc);
    }
    return normal();
}

// These accessors allow derived objects to shadow constructor/tag without making
// the shared Iterator.prototype properties assignable (ECMA-262 web compatibility).
function registerInheritedProperty(
    realm: Realm,
    key: PropertyKey,
    name: string,
    value: Value,
): void {
    const home = realm.iteratorPrototype;
    const getter = realm.createBuiltin("get " + name, 0, (_receiver, _args, _context, _loc) =>
        normal(value),
    );
    const setter = realm.createBuiltin("set " + name, 1, (receiver, args, context, loc) =>
        setInheritedProperty(
            receiver,
            home,
            key,
            args.length > 0 ? args[0] : UNDEFINED,
            context,
            loc,
        ),
    );
    home.bootstrapDefine(key, {
        get: { kind: "object", object: getter },
        set: { kind: "object", object: setter },
        configurable: true,
    });
}

export function registerIterator(realm: Realm): void {
    const constructor = realm.createBuiltinConstructor(
        "Iterator",
        0,
        (_receiver, _args, context, loc) =>
            languageFailure(context.realm, "TypeError", "Iterator requires a subclass", loc),
        (_callee, newTarget, _args, context, loc) => {
            if (newTarget === constructor) {
                return languageFailure(
                    context.realm,
                    "TypeError",
                    "Iterator requires a subclass",
                    loc,
                );
            }
            const proto = getPrototypeFromConstructor(newTarget, "Iterator", context, loc);
            return proto.type === "throw"
                ? proto
                : normal({ kind: "object", object: new GuestObject(proto.value) });
        },
    );
    constructor.bootstrapDefine("prototype", {
        value: { kind: "object", object: realm.iteratorPrototype },
    });
    registerInheritedProperty(realm, "constructor", "constructor", {
        kind: "object",
        object: constructor,
    });
    registerInheritedProperty(realm, wellKnownToStringTag, "[Symbol.toStringTag]", {
        kind: "string",
        value: "Iterator",
    });
    const identity = realm.createBuiltin(
        "[Symbol.iterator]",
        0,
        (receiver, _args, _context, _loc) => normal(receiver),
    );
    realm.iteratorPrototype.bootstrapDefine(wellKnownIterator, {
        value: { kind: "object", object: identity },
        writable: true,
        configurable: true,
    });
    registerEagerIteratorMethods(realm);
    registerIteratorFrom(realm, constructor);
    realm.defineScriptGlobal("Iterator", {
        value: { kind: "object", object: constructor },
        writable: true,
        configurable: true,
    });
}
