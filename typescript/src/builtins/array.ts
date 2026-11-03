import type { Realm } from "../realm.js";
import { toObject } from "../object-conversion.js";
import { lengthOfArrayLike } from "../array-like.js";
import { toPrimitive } from "../primitive-conversion.js";
import { toString, numberToString, type StringCompletion } from "../conversion.js";
import { stringConcat } from "../strings.js";
import { normal, UNDEFINED, type Value, type OperationContext } from "../runtime.js";
import type { Location } from "../syntax.js";

function toElementString(value: Value, context: OperationContext, loc: Location): StringCompletion {
    const primitive = toPrimitive(value, "string", context, loc);
    if (primitive.type === "throw") return primitive;
    return toString(primitive.value, loc);
}

export function registerArrayConversions(realm: Realm, objectToString: Value): void {
    realm.registerBuiltin(realm.arrayPrototype, "join", 1, (receiver, args, context, loc) => {
        const boxed = toObject(receiver, context, loc);
        if (boxed.type === "throw") return boxed;
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const length = lengthOfArrayLike(boxed.value, context, loc);
        if (length.type === "throw") return length;
        const separator = args.length === 0 ? UNDEFINED : args[0];
        let separatorText = ",";
        if (separator.kind !== "undefined") {
            const converted = toElementString(separator, context, loc);
            if (converted.type === "throw") return converted;
            separatorText = converted.value;
        }
        let text = "";
        for (let k = 0; k < length.value; k++) {
            const iteration = context.tick(loc);
            if (iteration.type === "throw") return iteration;
            if (k > 0) text = stringConcat(text, separatorText);
            const element = boxed.value.internalGet(numberToString(k), { kind: "object", object: boxed.value }, context, loc);
            if (element.type === "throw") return element;
            if (element.value.kind !== "null" && element.value.kind !== "undefined") {
                const converted = toElementString(element.value, context, loc);
                if (converted.type === "throw") return converted;
                text = stringConcat(text, converted.value);
            }
        }
        return normal({ kind: "string", value: text });
    });
    realm.registerBuiltin(realm.arrayPrototype, "toString", 0, (receiver, _args, context, loc) => {
        const boxed = toObject(receiver, context, loc);
        if (boxed.type === "throw") return boxed;
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const value: Value = { kind: "object", object: boxed.value };
        const join = boxed.value.internalGet("join", value, context, loc);
        if (join.type === "throw") return join;
        const method = join.value.kind === "object" && join.value.object.callable !== null
            ? join.value : objectToString;
        return context.call(method, value, [], loc);
    });
}
