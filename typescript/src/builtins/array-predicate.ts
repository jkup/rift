import type { Realm } from "../realm.js";
import { toObject } from "../object-conversion.js";
import { lengthOfArrayLike } from "../array-like.js";
import { numberToString } from "../conversion.js";
import { languageFailure, normal, truthy, UNDEFINED, type Value, type ValueCompletion, type OperationContext } from "../runtime.js";
import type { Location } from "../syntax.js";

function testElements(method: "every" | "some", receiver: Value, args: Value[], context: OperationContext, loc: Location): ValueCompletion {
    const boxed = toObject(receiver, context, loc);
    if (boxed.type === "throw") return boxed;
    const tick = context.tick(loc);
    if (tick.type === "throw") return tick;
    const length = lengthOfArrayLike(boxed.value, context, loc);
    if (length.type === "throw") return length;
    const callback = args.length > 0 ? args[0] : UNDEFINED;
    if (callback.kind !== "object" || callback.object.callable === null) {
        return languageFailure(context.realm, "TypeError", "Array.prototype." + method + " callback is not callable", loc);
    }
    const thisArg = args.length > 1 ? args[1] : UNDEFINED;
    const object: Value = { kind: "object", object: boxed.value };
    const stopOn = method === "some";
    for (let index = 0; index < length.value; index++) {
        const iteration = context.tick(loc);
        if (iteration.type === "throw") return iteration;
        const key = numberToString(index);
        const present = boxed.value.internalHasProperty(key, loc);
        if (present.type === "throw") return present;
        if (!present.value) continue;
        const element = boxed.value.internalGet(key, object, context, loc);
        if (element.type === "throw") return element;
        const tested = context.call(callback, thisArg, [element.value, { kind: "number", value: index }, object], loc);
        if (tested.type === "throw") return tested;
        if (truthy(tested.value) === stopOn) return normal({ kind: "boolean", value: stopOn });
    }
    return normal({ kind: "boolean", value: !stopOn });
}

export function registerArrayPredicates(realm: Realm): void {
    realm.registerBuiltin(realm.arrayPrototype, "every", 1, (receiver, args, context, loc) =>
        testElements("every", receiver, args, context, loc));
    realm.registerBuiltin(realm.arrayPrototype, "some", 1, (receiver, args, context, loc) =>
        testElements("some", receiver, args, context, loc));
}
