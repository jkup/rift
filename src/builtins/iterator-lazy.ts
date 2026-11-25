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
import {
    iteratorStepValue,
    iteratorCloseNormally,
    iteratorCloseOnThrow,
    type IteratorRecord,
} from "../iterator.js";
import { iteratorResult } from "../iterator-result.js";
import { wellKnownToStringTag } from "../symbols.js";
import { callbackIterator } from "./iterator-eager.js";

class GuestIteratorHelper extends GuestObject {
    state: "start" | "yield" | "executing" | "done" = "start";
    index = 0;

    constructor(
        proto: GuestObject,
        readonly iterated: IteratorRecord,
        readonly mapper: Value,
        readonly resume: GuestObject,
    ) {
        super(proto);
    }
}

function advanceMap(
    helper: GuestIteratorHelper,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const step = iteratorStepValue(helper.iterated, context, loc);
    if (step.type === "throw") {
        helper.state = "done";
        return step;
    }
    if (step.done) {
        helper.state = "done";
        return iteratorResult(UNDEFINED, true, context, loc);
    }
    const mapped = context.call(
        helper.mapper,
        UNDEFINED,
        [step.value, { kind: "number", value: helper.index++ }],
        loc,
    );
    if (mapped.type === "throw") {
        // Cleanup runs while executing, so recursive next/return calls still fail.
        const closed = iteratorCloseOnThrow(helper.iterated, mapped, context, loc);
        helper.state = "done";
        return closed;
    }
    const result = iteratorResult(mapped.value, false, context, loc);
    helper.state = result.type === "throw" ? "done" : "yield";
    return result;
}

function helperCall(
    receiver: Value,
    returning: boolean,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    if (receiver.kind !== "object" || !(receiver.object instanceof GuestIteratorHelper)) {
        return languageFailure(
            context.realm,
            "TypeError",
            "receiver is not an iterator helper",
            loc,
        );
    }
    const helper = receiver.object;
    if (helper.state === "executing") {
        return languageFailure(
            context.realm,
            "TypeError",
            "iterator helper is already running",
            loc,
        );
    }
    if (helper.state === "done") {
        return iteratorResult(UNDEFINED, true, context, loc);
    }
    if (returning && helper.state === "start") {
        // Unlike a suspended yield, returning before the first next completes
        // the helper before looking up or invoking the underlying return method.
        helper.state = "done";
        const closed = iteratorCloseNormally(helper.iterated, context, loc);
        return closed.type === "throw" ? closed : iteratorResult(UNDEFINED, true, context, loc);
    }
    helper.state = "executing";
    // The private resume builtin belongs to the creator Realm. Borrowing another
    // Realm's public next/return must not change the closure's result/error Realm.
    const result = context.call(
        { kind: "object", object: helper.resume },
        receiver,
        [{ kind: "boolean", value: returning }],
        loc,
    );
    if (result.type === "throw") {
        helper.state = "done";
    }
    return result;
}

export function registerLazyIteratorMethods(realm: Realm): void {
    const proto = new GuestObject(realm.iteratorPrototype);
    const resume = realm.createBuiltin("", 0, (receiver, args, context, loc) => {
        if (receiver.kind !== "object" || !(receiver.object instanceof GuestIteratorHelper)) {
            throw new Error("iterator helper resume invariant");
        }
        const helper = receiver.object;
        if (args[0].kind === "boolean" && args[0].value) {
            const closed = iteratorCloseNormally(helper.iterated, context, loc);
            helper.state = "done";
            return closed.type === "throw" ? closed : iteratorResult(UNDEFINED, true, context, loc);
        }
        return advanceMap(helper, context, loc);
    });
    realm.registerBuiltin(proto, "next", 0, (receiver, _args, context, loc) =>
        helperCall(receiver, false, context, loc),
    );
    realm.registerBuiltin(proto, "return", 0, (receiver, _args, context, loc) =>
        helperCall(receiver, true, context, loc),
    );
    proto.bootstrapDefine(wellKnownToStringTag, {
        value: { kind: "string", value: "Iterator Helper" },
        configurable: true,
    });
    realm.registerBuiltin(realm.iteratorPrototype, "map", 1, (receiver, args, context, loc) => {
        const mapper = args.length === 0 ? UNDEFINED : args[0];
        const opened = callbackIterator(receiver, mapper, context, loc);
        if (opened.type === "throw") {
            return opened;
        }
        const allocation = context.tick(loc);
        return allocation.type === "throw"
            ? allocation
            : normal({
                  kind: "object",
                  object: new GuestIteratorHelper(proto, opened.value, mapper, resume),
              });
    });
}
