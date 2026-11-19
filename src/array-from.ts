import { createArrayWithLength } from "./array-create.js";
import { lengthOfArrayLike } from "./array-like.js";
import { numberToString } from "./conversion.js";
import { getIteratorFromMethod, iteratorStepValue, iteratorCloseOnThrow } from "./iterator.js";
import { toObject } from "./object-conversion.js";
import { wellKnownIterator } from "./symbols.js";
import {
    languageFailure,
    normal,
    UNDEFINED,
    type GuestObject,
    type OperationContext,
    type Value,
    type ValueCompletion,
} from "./runtime.js";
import type { Location } from "./syntax.js";

function create(
    receiver: Value,
    length: number | null,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    if (receiver.kind === "object" && receiver.object.constructorSlot !== null) {
        if (context.construct === undefined) {
            throw new Error("Array.from construction unavailable");
        }
        return context.construct(
            receiver,
            length === null ? [] : [{ kind: "number", value: length }],
            receiver,
            loc,
        );
    }
    const allocation = context.tick(loc);
    if (allocation.type === "throw") {
        return allocation;
    }
    const array = createArrayWithLength(length === null ? 0 : length, context, loc);
    return array.type === "throw" ? array : normal({ kind: "object", object: array.value });
}

function define(
    target: GuestObject,
    index: number,
    value: Value,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const defined = target.defineOwnProperty(
        numberToString(index),
        { value, writable: true, enumerable: true, configurable: true },
        context,
        loc,
    );
    if (defined.type === "throw") {
        return defined;
    }
    return defined.value
        ? normal()
        : languageFailure(context.realm, "TypeError", "Array.from cannot define element", loc);
}

function finish(
    target: GuestObject,
    length: number,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const resized = target.set("length", { kind: "number", value: length }, context, loc);
    return resized.type === "throw" ? resized : normal({ kind: "object", object: target });
}

export function arrayFrom(
    receiver: Value,
    args: Value[],
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const items = args.length === 0 ? UNDEFINED : args[0];
    const mapper = args.length < 2 ? UNDEFINED : args[1];
    const thisArg = args.length < 3 ? UNDEFINED : args[2];
    const mapping = mapper.kind !== "undefined";
    if (mapping && (mapper.kind !== "object" || mapper.object.callable === null)) {
        return languageFailure(
            context.realm,
            "TypeError",
            "Array.from mapper must be callable",
            loc,
        );
    }
    const boxed = toObject(items, context, loc);
    if (boxed.type === "throw") {
        return boxed;
    }
    const method = boxed.value.internalGet(wellKnownIterator, items, context, loc);
    if (method.type === "throw") {
        return method;
    }
    if (method.value.kind !== "undefined" && method.value.kind !== "null") {
        if (method.value.kind !== "object" || method.value.object.callable === null) {
            return languageFailure(
                context.realm,
                "TypeError",
                "Array.from iterator must be callable",
                loc,
            );
        }
        const made = create(receiver, null, context, loc);
        if (made.type === "throw") {
            return made;
        }
        if (made.value.kind !== "object") {
            throw new Error("constructor result invariant");
        }
        const target = made.value.object;
        const acquired = getIteratorFromMethod(items, method.value, context, loc);
        if (acquired.type === "throw") {
            return acquired;
        }
        const iterator = acquired.value;
        let k = 0;
        while (true) {
            if (k >= 9007199254740991) {
                return iteratorCloseOnThrow(
                    iterator,
                    languageFailure(
                        context.realm,
                        "TypeError",
                        "Array.from exceeds safe length",
                        loc,
                    ),
                    context,
                    loc,
                );
            }
            const next = iteratorStepValue(iterator, context, loc);
            if (next.type === "throw") {
                return next;
            }
            if (next.done) {
                return finish(target, k, context, loc);
            }
            let value = next.value;
            if (mapping) {
                const mapped = context.call(
                    mapper,
                    thisArg,
                    [value, { kind: "number", value: k }],
                    loc,
                );
                if (mapped.type === "throw") {
                    return iteratorCloseOnThrow(iterator, mapped, context, loc);
                }
                value = mapped.value;
            }
            const defined = define(target, k, value, context, loc);
            if (defined.type === "throw") {
                return iteratorCloseOnThrow(iterator, defined, context, loc);
            }
            k++;
        }
    }
    const length = lengthOfArrayLike(boxed.value, context, loc);
    if (length.type === "throw") {
        return length;
    }
    const made = create(receiver, length.value, context, loc);
    if (made.type === "throw") {
        return made;
    }
    if (made.value.kind !== "object") {
        throw new Error("constructor result invariant");
    }
    const target = made.value.object;
    for (let k = 0; k < length.value; k++) {
        const step = context.tick(loc);
        if (step.type === "throw") {
            return step;
        }
        const element = boxed.value.internalGet(
            numberToString(k),
            { kind: "object", object: boxed.value },
            context,
            loc,
        );
        if (element.type === "throw") {
            return element;
        }
        let value = element.value;
        if (mapping) {
            const mapped = context.call(
                mapper,
                thisArg,
                [value, { kind: "number", value: k }],
                loc,
            );
            if (mapped.type === "throw") {
                return mapped;
            }
            value = mapped.value;
        }
        const defined = define(target, k, value, context, loc);
        if (defined.type === "throw") {
            return defined;
        }
    }
    return finish(target, length.value, context, loc);
}
