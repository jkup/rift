import type { Realm } from "../realm.js";
import { getIterator, iteratorCloseOnThrow, iteratorStepValue } from "../iterator.js";
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
        const acquired = getIterator(input, context, loc);
        if (acquired.type === "throw") return acquired;
        const iterator = acquired.value;
        while (true) {
            const step = iteratorStepValue(iterator, context, loc);
            if (step.type === "throw") return step;
            if (step.done) return normal({ kind: "object", object: target });
            const entry = step.value;
            if (entry.kind !== "object")
                return iteratorCloseOnThrow(iterator, languageFailure(context.realm, "TypeError", "iterator entry must be an object", loc), context, loc);
            const key = entry.object.internalGet("0", entry, context, loc);
            if (key.type === "throw") return iteratorCloseOnThrow(iterator, key, context, loc);
            const value = entry.object.internalGet("1", entry, context, loc);
            if (value.type === "throw") return iteratorCloseOnThrow(iterator, value, context, loc);
            const propertyKey = toPropertyKey(key.value, context, loc);
            if (propertyKey.type === "throw") return iteratorCloseOnThrow(iterator, propertyKey, context, loc);
            const defined = target.defineOwnProperty(propertyKey.value, {
                value: value.value, writable: true, enumerable: true, configurable: true,
            }, context, loc);
            if (defined.type === "throw") return iteratorCloseOnThrow(iterator, defined, context, loc);
            if (!defined.value) throw new Error("fresh fromEntries target rejected data property");
        }
    });
}
