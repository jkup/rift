import type { Realm } from "../realm.js";
import type { Location } from "../syntax.js";
import {
    GuestObject,
    languageFailure,
    normal,
    UNDEFINED,
    type OperationContext,
    type Value,
    type ValueCompletion,
} from "../runtime.js";
import { toObject } from "../object-conversion.js";
import {
    getIteratorDirect,
    getIteratorFromMethod,
    type IteratorRecord,
    type IteratorCompletion,
} from "../iterator.js";
import { iteratorResult } from "../iterator-result.js";
import { wellKnownIterator } from "../symbols.js";
import { ordinaryHasInstance } from "./function.js";

class GuestIteratorWrapper extends GuestObject {
    constructor(
        readonly iterated: IteratorRecord,
        proto: GuestObject,
    ) {
        super(proto);
    }
}

function flattenable(input: Value, context: OperationContext, loc: Location): IteratorCompletion {
    if (input.kind !== "object" && input.kind !== "string") {
        return languageFailure(context.realm, "TypeError", "expected iterator or iterable", loc);
    }
    const boxed = toObject(input, context, loc);
    if (boxed.type === "throw") {
        return boxed;
    }
    const method = boxed.value.internalGet(wellKnownIterator, input, context, loc);
    if (method.type === "throw") {
        return method;
    }
    if (method.value.kind === "undefined" || method.value.kind === "null") {
        if (input.kind !== "object") {
            return languageFailure(context.realm, "TypeError", "iterator must be an object", loc);
        }
        return getIteratorDirect(input.object, context, loc);
    }
    if (method.value.kind !== "object" || method.value.object.callable === null) {
        return languageFailure(context.realm, "TypeError", "iterator method must be callable", loc);
    }
    return getIteratorFromMethod(input, method.value, context, loc);
}

function wrapperCall(
    receiver: Value,
    returning: boolean,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    if (receiver.kind !== "object" || !(receiver.object instanceof GuestIteratorWrapper)) {
        return languageFailure(
            context.realm,
            "TypeError",
            "receiver is not an iterator wrapper",
            loc,
        );
    }
    const record = receiver.object.iterated;
    const target: Value = { kind: "object", object: record.iterator };
    if (!returning) {
        // Wrappers forward the result without reading done/value or passing arguments.
        return context.call(record.nextMethod, target, [], loc);
    }
    const method = record.iterator.internalGet("return", target, context, loc);
    if (method.type === "throw") {
        return method;
    }
    if (method.value.kind === "undefined" || method.value.kind === "null") {
        return iteratorResult(UNDEFINED, true, context, loc);
    }
    return context.call(method.value, target, [], loc);
}

export function registerIteratorFrom(realm: Realm, constructor: GuestObject): void {
    const proto = new GuestObject(realm.iteratorPrototype);
    realm.registerBuiltin(proto, "next", 0, (receiver, _args, context, loc) =>
        wrapperCall(receiver, false, context, loc),
    );
    realm.registerBuiltin(proto, "return", 0, (receiver, _args, context, loc) =>
        wrapperCall(receiver, true, context, loc),
    );
    realm.registerBuiltin(constructor, "from", 1, (_receiver, args, context, loc) => {
        const record = flattenable(args.length > 0 ? args[0] : UNDEFINED, context, loc);
        if (record.type === "throw") {
            return record;
        }
        const iterator: Value = { kind: "object", object: record.value.iterator };
        const instance = ordinaryHasInstance(
            { kind: "object", object: constructor },
            iterator,
            context,
            loc,
        );
        if (instance.type === "throw") {
            return instance;
        }
        if (instance.value.kind === "boolean" && instance.value.value) {
            return normal(iterator);
        }
        return normal({ kind: "object", object: new GuestIteratorWrapper(record.value, proto) });
    });
}
