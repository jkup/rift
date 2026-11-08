import type { Realm } from "../realm.js";
import { addEntriesFromIterable } from "../iterable-entries.js";
import { toPropertyKey } from "../conversion.js";
import { languageFailure, normal, UNDEFINED, type GuestObject, type ValueCompletion } from "../runtime.js";

export function registerObjectFromEntries(realm: Realm, constructor: GuestObject): void {
    realm.registerBuiltin(constructor, "fromEntries", 1, (_receiver, args, context, loc): ValueCompletion => {
        const input = args.length === 0 ? UNDEFINED : args[0];
        if (input.kind === "null" || input.kind === "undefined")
            return languageFailure(context.realm, "TypeError", "cannot convert null or undefined to object", loc);
        const allocation = context.tick(loc);
        if (allocation.type === "throw") return allocation;
        const target = context.realm.createObject();
        const added = addEntriesFromIterable(input, (key, value, adderContext, adderLoc) => {
            const propertyKey = toPropertyKey(key, adderContext, adderLoc);
            if (propertyKey.type === "throw") return propertyKey;
            const defined = target.defineOwnProperty(propertyKey.value, {
                value, writable: true, enumerable: true, configurable: true,
            }, adderContext, adderLoc);
            if (defined.type === "throw") return defined;
            if (!defined.value) throw new Error("fresh fromEntries target rejected data property");
            return normal();
        }, context, loc);
        return added.type === "throw" ? added : normal({ kind: "object", object: target });
    });
}
