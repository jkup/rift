import type { Realm } from "../realm.js";
import type { Location } from "../syntax.js";
import {
    GuestObject,
    languageFailure,
    normal,
    truthy,
    UNDEFINED,
    type OperationContext,
    type Value,
    type ValueCompletion,
    type ThrowCompletion,
} from "../runtime.js";
import {
    iteratorStepValue,
    iteratorStep,
    getIteratorDirect,
    iteratorCloseNormally,
    iteratorCloseOnThrow,
    type IteratorRecord,
} from "../iterator.js";
import { iteratorResult } from "../iterator-result.js";
import { wellKnownToStringTag } from "../symbols.js";
import { callbackIterator } from "./iterator-eager.js";
import { getIteratorFlattenable } from "./iterator-from.js";
import { toPrimitive } from "../primitive-conversion.js";
import { toNumber } from "../conversion.js";
import { arrayFromList } from "../array-create.js";

type CallbackHelperKind = "map" | "filter" | "flatMap";
type LimitHelperKind = "take" | "drop";
type BufferHelperKind = "chunks" | "windows";
type HelperKind = CallbackHelperKind | LimitHelperKind | BufferHelperKind;

class GuestIteratorHelper extends GuestObject {
    state: "start" | "yield" | "executing" | "done" = "start";
    index = 0;
    inner: IteratorRecord | null = null;
    buffer: Value[] = [];

    constructor(
        proto: GuestObject,
        readonly iterated: IteratorRecord,
        readonly callback: Value,
        readonly resume: GuestObject,
        readonly kind: HelperKind,
        public remaining = 0,
        readonly allowPartial = false,
    ) {
        super(proto);
    }
}

function advanceCallback(
    helper: GuestIteratorHelper,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    while (true) {
        const step = iteratorStepValue(helper.iterated, context, loc);
        if (step.type === "throw") {
            helper.state = "done";
            return step;
        }
        if (step.done) {
            helper.state = "done";
            return iteratorResult(UNDEFINED, true, context, loc);
        }
        const selected = context.call(
            helper.callback,
            UNDEFINED,
            [step.value, { kind: "number", value: helper.index++ }],
            loc,
        );
        if (selected.type === "throw") {
            // Cleanup runs while executing, so recursive next/return calls still fail.
            const closed = iteratorCloseOnThrow(helper.iterated, selected, context, loc);
            helper.state = "done";
            return closed;
        }
        if (helper.kind === "filter" && !truthy(selected.value)) {
            continue;
        }
        const value = helper.kind === "map" ? selected.value : step.value;
        const result = iteratorResult(value, false, context, loc);
        helper.state = result.type === "throw" ? "done" : "yield";
        return result;
    }
}

function failFlatMap(
    helper: GuestIteratorHelper,
    error: ThrowCompletion,
    context: OperationContext,
    loc: Location,
): ThrowCompletion {
    // Abrupt inner acquisition/stepping closes the outer, not the inner iterator.
    const closed = iteratorCloseOnThrow(helper.iterated, error, context, loc);
    helper.state = "done";
    return closed;
}

function advanceFlatMap(
    helper: GuestIteratorHelper,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    while (true) {
        const inner = helper.inner;
        if (inner !== null) {
            const step = iteratorStepValue(inner, context, loc);
            if (step.type === "throw") {
                return failFlatMap(helper, step, context, loc);
            }
            if (!step.done) {
                const result = iteratorResult(step.value, false, context, loc);
                helper.state = result.type === "throw" ? "done" : "yield";
                return result;
            }
            helper.inner = null;
        }
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
            helper.callback,
            UNDEFINED,
            [step.value, { kind: "number", value: helper.index++ }],
            loc,
        );
        if (mapped.type === "throw") {
            return failFlatMap(helper, mapped, context, loc);
        }
        const opened = getIteratorFlattenable(mapped.value, context, loc, false);
        if (opened.type === "throw") {
            return failFlatMap(helper, opened, context, loc);
        }
        helper.inner = opened.value;
    }
}

function closeHelper(
    helper: GuestIteratorHelper,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const inner = helper.inner;
    if (inner !== null) {
        const closed = iteratorCloseNormally(inner, context, loc);
        if (closed.type === "throw") {
            return iteratorCloseOnThrow(helper.iterated, closed, context, loc);
        }
    }
    // A final partial chunk/window yields after the source is already exhausted.
    return helper.iterated.done ? normal() : iteratorCloseNormally(helper.iterated, context, loc);
}

function advanceBuffer(
    helper: GuestIteratorHelper,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    if (helper.iterated.done) {
        helper.state = "done";
        return iteratorResult(UNDEFINED, true, context, loc);
    }
    if (helper.kind === "chunks") {
        helper.buffer = [];
    }
    while (true) {
        const step = iteratorStepValue(helper.iterated, context, loc);
        if (step.type === "throw") {
            helper.state = "done";
            return step;
        }
        if (step.done) {
            if (
                !helper.allowPartial ||
                helper.buffer.length === 0 ||
                helper.buffer.length === helper.remaining
            ) {
                helper.state = "done";
                return iteratorResult(UNDEFINED, true, context, loc);
            }
            break;
        }
        if (helper.buffer.length === helper.remaining) {
            helper.buffer.shift();
        }
        helper.buffer.push(step.value);
        if (helper.buffer.length === helper.remaining) {
            break;
        }
    }
    // Copy the buffer into a fresh guest array; yielded arrays never alias it.
    const array = arrayFromList(helper.buffer, context, loc);
    const result =
        array.type === "throw" ? array : iteratorResult(array.value, false, context, loc);
    helper.state = result.type === "throw" ? "done" : "yield";
    return result;
}

function advanceLimit(
    helper: GuestIteratorHelper,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    if (helper.kind === "take") {
        if (helper.remaining === 0) {
            const closed = iteratorCloseNormally(helper.iterated, context, loc);
            helper.state = "done";
            return closed.type === "throw" ? closed : iteratorResult(UNDEFINED, true, context, loc);
        }
        helper.remaining--;
    } else {
        while (helper.remaining > 0) {
            helper.remaining--;
            // Dropping observes done but must not read the discarded value.
            const skipped = iteratorStep(helper.iterated, context, loc);
            if (skipped.type === "throw") {
                helper.state = "done";
                return skipped;
            }
            if (skipped.value === null) {
                helper.state = "done";
                return iteratorResult(UNDEFINED, true, context, loc);
            }
        }
    }
    const step = iteratorStepValue(helper.iterated, context, loc);
    if (step.type === "throw") {
        helper.state = "done";
        return step;
    }
    const result = iteratorResult(step.value, step.done, context, loc);
    helper.state = step.done || result.type === "throw" ? "done" : "yield";
    return result;
}

function registerLimitMethods(realm: Realm, proto: GuestObject, resume: GuestObject): void {
    const methods: LimitHelperKind[] = ["take", "drop"];
    for (const kind of methods) {
        realm.registerBuiltin(realm.iteratorPrototype, kind, 1, (receiver, args, context, loc) => {
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
            const primitive = toPrimitive(
                args.length === 0 ? UNDEFINED : args[0],
                "number",
                context,
                loc,
            );
            if (primitive.type === "throw") {
                return iteratorCloseOnThrow(record, primitive, context, loc);
            }
            const number = toNumber(primitive.value, loc, context.realm);
            if (number.type === "throw") {
                return iteratorCloseOnThrow(record, number, context, loc);
            }
            const limit = Math.trunc(number.value);
            if (
                Number.isNaN(limit) ||
                limit < 0 ||
                (Number.isFinite(number.value) && number.value > 9007199254740991)
            ) {
                const error = languageFailure(
                    context.realm,
                    "RangeError",
                    "invalid iterator limit",
                    loc,
                );
                return iteratorCloseOnThrow(record, error, context, loc);
            }
            const opened = getIteratorDirect(receiver.object, context, loc);
            if (opened.type === "throw") {
                return opened;
            }
            const allocation = context.tick(loc);
            return allocation.type === "throw"
                ? allocation
                : normal({
                      kind: "object",
                      object: new GuestIteratorHelper(
                          proto,
                          opened.value,
                          UNDEFINED,
                          resume,
                          kind,
                          limit,
                      ),
                  });
        });
    }
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

function registerBufferMethods(realm: Realm, proto: GuestObject, resume: GuestObject): void {
    const methods: BufferHelperKind[] = ["chunks", "windows"];
    for (const kind of methods) {
        realm.registerBuiltin(realm.iteratorPrototype, kind, 1, (receiver, args, context, loc) => {
            if (receiver.kind !== "object") {
                return languageFailure(context.realm, "TypeError", "expected an iterator", loc);
            }
            const record: IteratorRecord = {
                iterator: receiver.object,
                nextMethod: UNDEFINED,
                done: false,
            };
            const size = args.length === 0 ? UNDEFINED : args[0];
            if (size.kind !== "number" || !Number.isInteger(size.value)) {
                const error = languageFailure(
                    context.realm,
                    "TypeError",
                    "expected integral size",
                    loc,
                );
                return iteratorCloseOnThrow(record, error, context, loc);
            }
            if (size.value < 1 || size.value > 4294967295) {
                const error = languageFailure(
                    context.realm,
                    "RangeError",
                    "invalid buffer size",
                    loc,
                );
                return iteratorCloseOnThrow(record, error, context, loc);
            }
            const undersized = args.length < 2 ? UNDEFINED : args[1];
            let allowPartial = kind === "chunks";
            if (kind === "windows" && undersized.kind !== "undefined") {
                if (
                    undersized.kind !== "string" ||
                    (undersized.value !== "only-full" && undersized.value !== "allow-partial")
                ) {
                    const error = languageFailure(
                        context.realm,
                        "TypeError",
                        "invalid undersized option",
                        loc,
                    );
                    return iteratorCloseOnThrow(record, error, context, loc);
                }
                allowPartial = undersized.value === "allow-partial";
            }
            const opened = getIteratorDirect(receiver.object, context, loc);
            if (opened.type === "throw") {
                return opened;
            }
            const allocation = context.tick(loc);
            return allocation.type === "throw"
                ? allocation
                : normal({
                      kind: "object",
                      object: new GuestIteratorHelper(
                          proto,
                          opened.value,
                          UNDEFINED,
                          resume,
                          kind,
                          size.value,
                          allowPartial,
                      ),
                  });
        });
    }
}

export function registerLazyIteratorMethods(realm: Realm): void {
    const proto = new GuestObject(realm.iteratorPrototype);
    const resume = realm.createBuiltin("", 0, (receiver, args, context, loc) => {
        if (receiver.kind !== "object" || !(receiver.object instanceof GuestIteratorHelper)) {
            throw new Error("iterator helper resume invariant");
        }
        const helper = receiver.object;
        if (args[0].kind === "boolean" && args[0].value) {
            const closed = closeHelper(helper, context, loc);
            helper.state = "done";
            return closed.type === "throw" ? closed : iteratorResult(UNDEFINED, true, context, loc);
        }
        if (helper.kind === "flatMap") {
            return advanceFlatMap(helper, context, loc);
        }
        if (helper.kind === "chunks" || helper.kind === "windows") {
            return advanceBuffer(helper, context, loc);
        }
        return helper.kind === "map" || helper.kind === "filter"
            ? advanceCallback(helper, context, loc)
            : advanceLimit(helper, context, loc);
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
    const methods: CallbackHelperKind[] = ["map", "filter", "flatMap"];
    for (const kind of methods) {
        realm.registerBuiltin(realm.iteratorPrototype, kind, 1, (receiver, args, context, loc) => {
            const callback = args.length === 0 ? UNDEFINED : args[0];
            const opened = callbackIterator(receiver, callback, context, loc);
            if (opened.type === "throw") {
                return opened;
            }
            const allocation = context.tick(loc);
            return allocation.type === "throw"
                ? allocation
                : normal({
                      kind: "object",
                      object: new GuestIteratorHelper(proto, opened.value, callback, resume, kind),
                  });
        });
    }
    registerLimitMethods(realm, proto, resume);
    registerBufferMethods(realm, proto, resume);
}
