import type { Realm } from "../realm.js";
import { toObject } from "../object-conversion.js";
import { lengthOfArrayLike, toClampedIndex } from "../array-like.js";
import { createDefaultSpeciesArray } from "../array-species.js";
import { numberToString } from "../conversion.js";
import { normal, UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerArraySlice(realm: Realm): void {
    realm.registerBuiltin(realm.arrayPrototype, "slice", 2, (receiver, args, context, loc): ValueCompletion => {
        const boxed = toObject(receiver, context, loc);
        if (boxed.type === "throw") return boxed;
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const object = boxed.value;
        const length = lengthOfArrayLike(object, context, loc);
        if (length.type === "throw") return length;
        const start = toClampedIndex(args.length === 0 ? UNDEFINED : args[0], length.value, context, loc);
        if (start.type === "throw") return start;
        let end = length.value;
        if (args.length > 1 && args[1].kind !== "undefined") {
            const converted = toClampedIndex(args[1], length.value, context, loc);
            if (converted.type === "throw") return converted;
            end = converted.value;
        }
        const count = Math.max(end - start.value, 0);
        const created = createDefaultSpeciesArray(object, count, "slice", context, loc);
        if (created.type === "throw") return created;
        const result = created.value;
        for (let index = 0; index < count; index++) {
            const step = context.tick(loc);
            if (step.type === "throw") return step;
            const key = numberToString(start.value + index);
            const present = object.internalHasProperty(key, loc);
            if (present.type === "throw") return present;
            if (!present.value) continue;
            const value = object.internalGet(key, { kind: "object", object }, context, loc);
            if (value.type === "throw") return value;
            const defined = result.defineOwnProperty(numberToString(index), { value: value.value, writable: true, enumerable: true, configurable: true }, context, loc);
            if (defined.type === "throw") return defined;
            if (!defined.value) throw new Error("fresh slice array element invariant");
        }
        return normal({ kind: "object", object: result });
    });
}
