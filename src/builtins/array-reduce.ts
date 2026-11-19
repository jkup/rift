import type { Realm } from "../realm.js";
import { toObject } from "../object-conversion.js";
import { lengthOfArrayLike } from "../array-like.js";
import { numberToString } from "../conversion.js";
import {
    languageFailure,
    normal,
    UNDEFINED,
    type Value,
    type ValueCompletion,
    type OperationContext,
} from "../runtime.js";
import type { Location } from "../syntax.js";

function reduceElements(
    method: "reduce" | "reduceRight",
    receiver: Value,
    args: Value[],
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const boxed = toObject(receiver, context, loc);
    if (boxed.type === "throw") {
        return boxed;
    }
    const tick = context.tick(loc);
    if (tick.type === "throw") {
        return tick;
    }
    const length = lengthOfArrayLike(boxed.value, context, loc);
    if (length.type === "throw") {
        return length;
    }
    const callback = args.length === 0 ? UNDEFINED : args[0];
    if (callback.kind !== "object" || callback.object.callable === null) {
        return languageFailure(
            context.realm,
            "TypeError",
            "Array.prototype." + method + " callback is not callable",
            loc,
        );
    }
    let initialized = args.length > 1;
    let accumulator = initialized ? args[1] : UNDEFINED;
    const object: Value = { kind: "object", object: boxed.value };
    const direction = method === "reduce" ? 1 : -1;
    for (
        let index = direction === 1 ? 0 : length.value - 1;
        index >= 0 && index < length.value;
        index += direction
    ) {
        const iteration = context.tick(loc);
        if (iteration.type === "throw") {
            return iteration;
        }
        const key = numberToString(index);
        const present = boxed.value.internalHasProperty(key, loc);
        if (present.type === "throw") {
            return present;
        }
        if (!present.value) {
            continue;
        }
        const element = boxed.value.internalGet(key, object, context, loc);
        if (element.type === "throw") {
            return element;
        }
        if (!initialized) {
            accumulator = element.value;
            initialized = true;
        } else {
            const next = context.call(
                callback,
                UNDEFINED,
                [accumulator, element.value, { kind: "number", value: index }, object],
                loc,
            );
            if (next.type === "throw") {
                return next;
            }
            accumulator = next.value;
        }
    }
    if (!initialized) {
        return languageFailure(
            context.realm,
            "TypeError",
            "Array.prototype." + method + " has no initial value or elements",
            loc,
        );
    }
    return normal(accumulator);
}

export function registerArrayReduction(realm: Realm): void {
    realm.registerBuiltin(realm.arrayPrototype, "reduce", 1, (receiver, args, context, loc) =>
        reduceElements("reduce", receiver, args, context, loc),
    );
    realm.registerBuiltin(realm.arrayPrototype, "reduceRight", 1, (receiver, args, context, loc) =>
        reduceElements("reduceRight", receiver, args, context, loc),
    );
}
