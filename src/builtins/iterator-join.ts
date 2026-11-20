import type { Realm } from "../realm.js";
import type { Location } from "../syntax.js";
import {
    getIteratorDirect,
    iteratorStepValue,
    iteratorCloseOnThrow,
    type IteratorRecord,
} from "../iterator.js";
import { toPrimitive } from "../primitive-conversion.js";
import { toString, type StringCompletion } from "../conversion.js";
import {
    languageFailure,
    normal,
    UNDEFINED,
    type OperationContext,
    type Value,
    type ValueCompletion,
} from "../runtime.js";

function joinString(value: Value, context: OperationContext, loc: Location): StringCompletion {
    const primitive = toPrimitive(value, "string", context, loc);
    return primitive.type === "throw" ? primitive : toString(primitive.value, loc, context.realm);
}

function append(
    parts: string[],
    text: string,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    // Charge output growth before retaining it, including repeated separators.
    for (let i = 0; i < text.length; i++) {
        const tick = context.tick(loc);
        if (tick.type === "throw") {
            return tick;
        }
    }
    parts.push(text);
    return normal();
}

// https://tc39.es/proposal-iterator-join/
function join(
    receiver: Value,
    separator: Value,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    if (receiver.kind !== "object") {
        return languageFailure(
            context.realm,
            "TypeError",
            "iterator receiver must be an object",
            loc,
        );
    }
    const record: IteratorRecord = {
        iterator: receiver.object,
        nextMethod: UNDEFINED,
        done: false,
    };
    let sep = ",";
    if (separator.kind !== "undefined") {
        const converted = joinString(separator, context, loc);
        if (converted.type === "throw") {
            return iteratorCloseOnThrow(record, converted, context, loc);
        }
        sep = converted.value;
    }
    // Separator conversion precedes next lookup, even for an empty iterator.
    const opened = getIteratorDirect(receiver.object, context, loc);
    if (opened.type === "throw") {
        return opened;
    }
    const parts: string[] = [];
    let first = true;
    while (true) {
        const step = iteratorStepValue(opened.value, context, loc);
        if (step.type === "throw") {
            return step;
        }
        if (step.done) {
            return normal({ kind: "string", value: parts.join("") });
        }
        if (!first) {
            const added = append(parts, sep, context, loc);
            if (added.type === "throw") {
                return added;
            }
        }
        first = false;
        if (step.value.kind === "undefined" || step.value.kind === "null") {
            continue;
        }
        const converted = joinString(step.value, context, loc);
        if (converted.type === "throw") {
            return iteratorCloseOnThrow(opened.value, converted, context, loc);
        }
        const added = append(parts, converted.value, context, loc);
        if (added.type === "throw") {
            return added;
        }
    }
}

export function registerIteratorJoin(realm: Realm): void {
    realm.registerBuiltin(realm.iteratorPrototype, "join", 1, (receiver, args, context, loc) =>
        join(receiver, args.length > 0 ? args[0] : UNDEFINED, context, loc),
    );
}
