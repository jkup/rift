import type {Realm} from "../realm.js";
import {toObject} from "../object-conversion.js";
import {lengthOfArrayLike} from "../array-like.js";
import {arraySpeciesCreate} from "../array-species.js";
import {mapObject} from "../array-map.js";
import {numberToString} from "../conversion.js";
import {languageFailure, normal, truthy, UNDEFINED, type Value, type ValueCompletion} from "../runtime.js";

export function registerScriptArrayIteration(realm: Realm): void {
    realm.registerBuiltin(realm.arrayPrototype, "map", 1, (receiver, args, context, loc) => {
        const object = toObject(receiver, context, loc);
        if (object.type === "throw") return object;
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        return mapObject(object.value, args.length === 0 ? UNDEFINED : args[0],
            args.length < 2 ? UNDEFINED : args[1], context, loc);
    });
    realm.registerBuiltin(realm.arrayPrototype, "forEach", 1, (receiver, args, context, loc) => {
        const object = toObject(receiver, context, loc);
        if (object.type === "throw") return object;
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const length = lengthOfArrayLike(object.value, context, loc);
        if (length.type === "throw") return length;
        const callback = args.length === 0 ? UNDEFINED : args[0];
        if (callback.kind !== "object" || callback.object.callable === null)
            return languageFailure(context.realm, "TypeError", "Array.prototype.forEach callback is not callable", loc);
        const thisArg = args.length < 2 ? UNDEFINED : args[1];
        const input: Value = {kind: "object", object: object.value};
        for (let index = 0; index < length.value; index++) {
            const step = context.tick(loc);
            if (step.type === "throw") return step;
            const key = numberToString(index);
            const present = object.value.internalHasProperty(key, loc);
            if (present.type === "throw") return present;
            if (!present.value) continue;
            const element = object.value.internalGet(key, input, context, loc);
            if (element.type === "throw") return element;
            const called = context.call(callback, thisArg, [element.value, {kind: "number", value: index}, input], loc);
            if (called.type === "throw") return called;
        }
        return normal();
    });
    realm.registerBuiltin(realm.arrayPrototype, "filter", 1, (receiver, args, context, loc): ValueCompletion => {
        const object = toObject(receiver, context, loc);
        if (object.type === "throw") return object;
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const length = lengthOfArrayLike(object.value, context, loc);
        if (length.type === "throw") return length;
        const callback = args.length === 0 ? UNDEFINED : args[0];
        if (callback.kind !== "object" || callback.object.callable === null)
            return languageFailure(context.realm, "TypeError", "Array.prototype.filter callback is not callable", loc);
        const created = arraySpeciesCreate(object.value, 0, "filter", context, loc);
        if (created.type === "throw") return created;
        const result = created.value;
        const thisArg = args.length < 2 ? UNDEFINED : args[1];
        const input: Value = {kind: "object", object: object.value};
        let nextIndex = 0;
        for (let index = 0; index < length.value; index++) {
            const step = context.tick(loc);
            if (step.type === "throw") return step;
            const key = numberToString(index);
            const present = object.value.internalHasProperty(key, loc);
            if (present.type === "throw") return present;
            if (!present.value) continue;
            const element = object.value.internalGet(key, input, context, loc);
            if (element.type === "throw") return element;
            const selected = context.call(callback, thisArg, [element.value, {kind: "number", value: index}, input], loc);
            if (selected.type === "throw") return selected;
            if (!truthy(selected.value)) continue;
            const defined = result.defineOwnProperty(numberToString(nextIndex), {
                value: element.value, writable: true, enumerable: true, configurable: true,
            }, context, loc);
            if (defined.type === "throw") return defined;
            if (!defined.value) return languageFailure(context.realm, "TypeError", "filter cannot define result element", loc);
            nextIndex++;
        }
        return normal({kind: "object", object: result});
    });
}
