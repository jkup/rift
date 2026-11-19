import type { Realm } from "../realm.js";
import { toObject } from "../object-conversion.js";
import { languageFailure, normal, sameValue, UNDEFINED, type GuestObject, type ValueCompletion } from "../runtime.js";

export function registerObjectPrototypes(realm: Realm, constructor: GuestObject): void {
    realm.registerBuiltin(constructor, "is", 2, (_receiver, args, _context, _loc): ValueCompletion =>
        normal({kind: "boolean", value: sameValue(args.length === 0 ? UNDEFINED : args[0], args.length < 2 ? UNDEFINED : args[1])}));
    realm.registerBuiltin(constructor, "getPrototypeOf", 1, (_receiver, args, context, loc): ValueCompletion => {
        const object = toObject(args.length === 0 ? UNDEFINED : args[0], context, loc);
        if (object.type === "throw") return object;
        const prototype = object.value.getPrototypeOf();
        return normal(prototype === null ? {kind: "null"} : {kind: "object", object: prototype});
    });
    realm.registerBuiltin(constructor, "setPrototypeOf", 2, (_receiver, args, context, loc): ValueCompletion => {
        const target = args.length === 0 ? UNDEFINED : args[0];
        if (target.kind === "undefined" || target.kind === "null") return languageFailure(context.realm, "TypeError", "cannot set prototype of null or undefined", loc);
        const prototype = args.length < 2 ? UNDEFINED : args[1];
        if (prototype.kind !== "object" && prototype.kind !== "null") return languageFailure(context.realm, "TypeError", "prototype must be an object or null", loc);
        if (target.kind !== "object") return normal(target);
        const changed = target.object.internalSetPrototypeOf(prototype.kind === "object" ? prototype.object : null, context, loc);
        if (changed.type === "throw") return changed;
        if (!changed.value) return languageFailure(context.realm, "TypeError", "cannot set object prototype", loc);
        return normal(target);
    });
    realm.registerBuiltin(realm.objectPrototype, "isPrototypeOf", 1, (receiver, args, context, loc): ValueCompletion => {
        const input = args.length === 0 ? UNDEFINED : args[0];
        if (input.kind !== "object") return normal({kind: "boolean", value: false});
        const object = toObject(receiver, context, loc);
        if (object.type === "throw") return object;
        let candidate: GuestObject | null = input.object;
        while (candidate !== null) {
            const tick = context.tick(loc);
            if (tick.type === "throw") return tick;
            candidate = candidate.getPrototypeOf();
            if (candidate === object.value) return normal({kind: "boolean", value: true});
        }
        return normal({kind: "boolean", value: false});
    });
}
