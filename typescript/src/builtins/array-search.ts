import type { Realm } from "../realm.js";
import { toObject } from "../object-conversion.js";
import { lengthOfArrayLike } from "../array-like.js";
import { toPrimitive } from "../primitive-conversion.js";
import { numberToString, toIntegerOrInfinity, type NumberCompletion } from "../conversion.js";
import { equal, sameValueZero, normal, UNDEFINED, type Value, type OperationContext } from "../runtime.js";
import type { Location } from "../syntax.js";

function toClampedIndex(value: Value, length: number, context: OperationContext, loc: Location): NumberCompletion {
    const primitive = toPrimitive(value, "number", context, loc);
    if (primitive.type === "throw") return primitive;
    const integer = toIntegerOrInfinity(primitive.value, loc, context.realm);
    if (integer.type === "throw") return integer;
    const index = integer.value < 0 ? length + integer.value : integer.value;
    return { type: "normal", value: Math.min(Math.max(index, 0), length) };
}

export function registerArraySearch(realm: Realm): void {
    realm.registerBuiltin(realm.arrayPrototype, "indexOf", 1, (receiver, args, context, loc) => {
        const boxed = toObject(receiver, context, loc);
        if (boxed.type === "throw") return boxed;
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const length = lengthOfArrayLike(boxed.value, context, loc);
        if (length.type === "throw") return length;
        if (length.value === 0) return normal({ kind: "number", value: -1 });
        const start = toClampedIndex(args.length > 1 ? args[1] : UNDEFINED, length.value, context, loc);
        if (start.type === "throw") return start;
        const search = args.length > 0 ? args[0] : UNDEFINED;
        for (let index = start.value; index < length.value; index++) {
            const iteration = context.tick(loc);
            if (iteration.type === "throw") return iteration;
            const key = numberToString(index);
            const present = boxed.value.internalHasProperty(key, loc);
            if (present.type === "throw") return present;
            if (!present.value) continue;
            const element = boxed.value.internalGet(key, { kind: "object", object: boxed.value }, context, loc);
            if (element.type === "throw") return element;
            if (equal(search, element.value)) return normal({ kind: "number", value: index });
        }
        return normal({ kind: "number", value: -1 });
    });
    realm.registerBuiltin(realm.arrayPrototype, "includes", 1, (receiver, args, context, loc) => {
        const boxed = toObject(receiver, context, loc);
        if (boxed.type === "throw") return boxed;
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const length = lengthOfArrayLike(boxed.value, context, loc);
        if (length.type === "throw") return length;
        if (length.value === 0) return normal({ kind: "boolean", value: false });
        const start = toClampedIndex(args.length > 1 ? args[1] : UNDEFINED, length.value, context, loc);
        if (start.type === "throw") return start;
        const search = args.length > 0 ? args[0] : UNDEFINED;
        for (let index = start.value; index < length.value; index++) {
            const iteration = context.tick(loc);
            if (iteration.type === "throw") return iteration;
            const element = boxed.value.internalGet(numberToString(index), { kind: "object", object: boxed.value }, context, loc);
            if (element.type === "throw") return element;
            if (sameValueZero(search, element.value)) return normal({ kind: "boolean", value: true });
        }
        return normal({ kind: "boolean", value: false });
    });
}
