import type { Realm } from "../realm.js";
import { toObject } from "../object-conversion.js";
import { normal, type Value } from "../runtime.js";
import { GuestArray } from "../array-object.js";
import { GuestBoolean, GuestNumber, GuestStringObject } from "../primitive-objects.js";
import { wellKnownToStringTag } from "../symbols.js";

export function registerObjectValueOf(realm: Realm): void {
    realm.registerBuiltin(realm.objectPrototype, "valueOf", 0, (receiver, _args, context, loc) => {
        const result = toObject(receiver, context, loc);
        if (result.type === "throw") return result;
        return normal({ kind: "object", object: result.value });
    });
}

export function registerObjectToString(realm: Realm): Value {
    return realm.registerBuiltin(realm.objectPrototype, "toString", 0, (receiver, _args, context, loc) => {
        if (receiver.kind === "undefined") return normal({ kind: "string", value: "[object Undefined]" });
        if (receiver.kind === "null") return normal({ kind: "string", value: "[object Null]" });
        const boxed = toObject(receiver, context, loc);
        if (boxed.type === "throw") return boxed;
        const object = boxed.value;
        // Classification precedes observable Get. Symbol has no builtin tag:
        // its prototype's real symbol property supplies the public tag instead.
        let tag = "Object";
        if (object instanceof GuestArray) tag = "Array";
        else if (object.callable !== null) tag = "Function";
        else if (object instanceof GuestBoolean) tag = "Boolean";
        else if (object instanceof GuestNumber) tag = "Number";
        else if (object instanceof GuestStringObject) tag = "String";
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const custom = object.internalGet(wellKnownToStringTag, { kind: "object", object }, context, loc);
        if (custom.type === "throw") return custom;
        if (custom.value.kind === "string") tag = custom.value.value;
        return normal({ kind: "string", value: "[object " + tag + "]" });
    });
}
