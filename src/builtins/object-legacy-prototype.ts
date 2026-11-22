import type { Realm } from "../realm.js";
import type { Location } from "../syntax.js";
import { toObject } from "../object-conversion.js";
import {
    languageFailure,
    normal,
    UNDEFINED,
    type OperationContext,
    type Value,
    type ValueCompletion,
} from "../runtime.js";

// ECMA-262 legacy Object.prototype.__proto__ accessor semantics.
// Unlike Object.setPrototypeOf, this setter ignores invalid prototype values.
function setLegacyPrototype(
    receiver: Value,
    prototype: Value,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    if (receiver.kind === "null" || receiver.kind === "undefined") {
        return languageFailure(context.realm, "TypeError", "prototype receiver is nullish", loc);
    }
    if (prototype.kind !== "object" && prototype.kind !== "null") {
        return normal();
    }
    if (receiver.kind !== "object") {
        return normal();
    }
    const changed = receiver.object.internalSetPrototypeOf(
        prototype.kind === "object" ? prototype.object : null,
        context,
        loc,
    );
    if (changed.type === "throw") {
        return changed;
    }
    if (!changed.value) {
        return languageFailure(context.realm, "TypeError", "cannot set object prototype", loc);
    }
    return normal();
}

export function registerLegacyPrototype(realm: Realm): void {
    const getter = realm.createBuiltin("get __proto__", 0, (receiver, _args, context, loc) => {
        const object = toObject(receiver, context, loc);
        if (object.type === "throw") {
            return object;
        }
        const prototype = object.value.getPrototypeOf();
        return normal(
            prototype === null ? { kind: "null" } : { kind: "object", object: prototype },
        );
    });
    const setter = realm.createBuiltin("set __proto__", 1, (receiver, args, context, loc) =>
        setLegacyPrototype(receiver, args.length === 0 ? UNDEFINED : args[0], context, loc),
    );
    realm.objectPrototype.bootstrapDefine("__proto__", {
        get: { kind: "object", object: getter },
        set: { kind: "object", object: setter },
        enumerable: false,
        configurable: true,
    });
}
