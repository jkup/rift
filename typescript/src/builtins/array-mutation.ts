import type { Realm } from "../realm.js";
import { toObject } from "../object-conversion.js";
import { lengthOfArrayLike } from "../array-like.js";
import { numberToString } from "../conversion.js";
import { languageFailure, normal, UNDEFINED } from "../runtime.js";

export function registerArrayMutators(realm: Realm): void {
    realm.registerBuiltin(realm.arrayPrototype, "push", 1, (receiver, args, context, loc) => {
        const boxed = toObject(receiver, context, loc);
        if (boxed.type === "throw") return boxed;
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const length = lengthOfArrayLike(boxed.value, context, loc);
        if (length.type === "throw") return length;
        if (length.value + args.length > 9007199254740991) {
            return languageFailure(context.realm, "TypeError", "push exceeds maximum array-like length", loc);
        }
        let next = length.value;
        for (const item of args) {
            const iteration = context.tick(loc);
            if (iteration.type === "throw") return iteration;
            const written = boxed.value.set(numberToString(next), item, context, loc);
            if (written.type === "throw") return written;
            next++;
        }
        // Set length even for zero arguments. Set is strict regardless of caller mode.
        const written = boxed.value.set("length", { kind: "number", value: next }, context, loc);
        if (written.type === "throw") return written;
        return normal({ kind: "number", value: next });
    });
    realm.registerBuiltin(realm.arrayPrototype, "pop", 0, (receiver, _args, context, loc) => {
        const boxed = toObject(receiver, context, loc);
        if (boxed.type === "throw") return boxed;
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const length = lengthOfArrayLike(boxed.value, context, loc);
        if (length.type === "throw") return length;
        if (length.value === 0) {
            const written = boxed.value.set("length", { kind: "number", value: 0 }, context, loc);
            return written.type === "throw" ? written : normal(UNDEFINED);
        }
        const next = length.value - 1;
        const key = numberToString(next);
        const element = boxed.value.internalGet(key, { kind: "object", object: boxed.value }, context, loc);
        if (element.type === "throw") return element;
        const deleted = boxed.value.internalDelete(key);
        if (deleted.type === "throw") return deleted;
        if (!deleted.value) {
            return languageFailure(context.realm, "TypeError", "property is not configurable: " + key, loc);
        }
        const written = boxed.value.set("length", { kind: "number", value: next }, context, loc);
        return written.type === "throw" ? written : element;
    });
}
