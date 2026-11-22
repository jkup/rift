import type { Realm } from "../../realm.js";
import {
    normal,
    languageFailure,
    sameValue,
    UNDEFINED,
    type Value,
    type ValueCompletion,
    type OperationContext,
} from "../../runtime.js";
import { toPrimitive } from "../../primitive-conversion.js";
import { numberToString, toLength } from "../../conversion.js";
import { wellKnownMatch, wellKnownSearch } from "../../symbols.js";
import { regExpCreate, regExpString } from "./regexp.js";
import { regExpExec } from "./regexp-execution.js";
import type { Location } from "../../syntax.js";

export function advanceStringIndex(input: string, index: number, unicode: boolean): number {
    if (!unicode || index + 1 >= input.length) {
        return index + 1;
    }
    const first = input.charCodeAt(index),
        second = input.charCodeAt(index + 1);
    return (
        index + (first >= 0xd800 && first <= 0xdbff && second >= 0xdc00 && second <= 0xdfff ? 2 : 1)
    );
}

function match(
    receiver: Value,
    args: Value[],
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    if (receiver.kind !== "object") {
        return languageFailure(
            context.realm,
            "TypeError",
            "RegExp match receiver is not an object",
            loc,
        );
    }
    const input = regExpString(args.length === 0 ? UNDEFINED : args[0], context, loc);
    if (input.type === "throw") {
        return input;
    }
    const property = receiver.object.internalGet("flags", receiver, context, loc);
    if (property.type === "throw") {
        return property;
    }
    const flags = regExpString(property.value, context, loc);
    if (flags.type === "throw") {
        return flags;
    }
    if (!flags.value.includes("g")) {
        return regExpExec(receiver.object, input.value, context, loc);
    }
    const unicode = flags.value.includes("u") || flags.value.includes("v");
    const reset = receiver.object.set("lastIndex", { kind: "number", value: 0 }, context, loc);
    if (reset.type === "throw") {
        return reset;
    }
    const allocation = context.tick(loc);
    if (allocation.type === "throw") {
        return allocation;
    }
    const array = context.realm.createArray();
    let count = 0;
    while (true) {
        const tick = context.tick(loc);
        if (tick.type === "throw") {
            return tick;
        }
        const result = regExpExec(receiver.object, input.value, context, loc);
        if (result.type === "throw") {
            return result;
        }
        if (result.value.kind === "null") {
            return normal(count === 0 ? { kind: "null" } : { kind: "object", object: array });
        }
        if (result.value.kind !== "object") {
            throw new Error("RegExpExec result invariant");
        }
        const first = result.value.object.internalGet("0", result.value, context, loc);
        if (first.type === "throw") {
            return first;
        }
        const text = regExpString(first.value, context, loc);
        if (text.type === "throw") {
            return text;
        }
        const added = array.defineOwnProperty(
            numberToString(count++),
            {
                value: { kind: "string", value: text.value },
                writable: true,
                enumerable: true,
                configurable: true,
            },
            context,
            loc,
        );
        if (added.type === "throw") {
            return added;
        }
        if (!added.value) {
            throw new Error("fresh match array definition failed");
        }
        if (text.value === "") {
            const property = receiver.object.internalGet("lastIndex", receiver, context, loc);
            if (property.type === "throw") {
                return property;
            }
            const primitive = toPrimitive(property.value, "number", context, loc);
            if (primitive.type === "throw") {
                return primitive;
            }
            const index = toLength(primitive.value, loc, context.realm);
            if (index.type === "throw") {
                return index;
            }
            const next = advanceStringIndex(input.value, index.value, unicode);
            const written = receiver.object.set(
                "lastIndex",
                { kind: "number", value: next },
                context,
                loc,
            );
            if (written.type === "throw") {
                return written;
            }
        }
    }
}

function search(
    receiver: Value,
    args: Value[],
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    if (receiver.kind !== "object") {
        return languageFailure(
            context.realm,
            "TypeError",
            "RegExp search receiver is not an object",
            loc,
        );
    }
    const input = regExpString(args.length === 0 ? UNDEFINED : args[0], context, loc);
    if (input.type === "throw") {
        return input;
    }
    const previous = receiver.object.internalGet("lastIndex", receiver, context, loc);
    if (previous.type === "throw") {
        return previous;
    }
    if (!sameValue(previous.value, { kind: "number", value: 0 })) {
        const reset = receiver.object.set("lastIndex", { kind: "number", value: 0 }, context, loc);
        if (reset.type === "throw") {
            return reset;
        }
    }
    const result = regExpExec(receiver.object, input.value, context, loc);
    if (result.type === "throw") {
        return result;
    }
    const current = receiver.object.internalGet("lastIndex", receiver, context, loc);
    if (current.type === "throw") {
        return current;
    }
    if (!sameValue(current.value, previous.value)) {
        const restored = receiver.object.set("lastIndex", previous.value, context, loc);
        if (restored.type === "throw") {
            return restored;
        }
    }
    if (result.value.kind === "null") {
        return normal({ kind: "number", value: -1 });
    }
    if (result.value.kind !== "object") {
        throw new Error("RegExpExec result invariant");
    }
    return result.value.object.internalGet("index", result.value, context, loc);
}

export function registerRegExpMatchSearch(realm: Realm): void {
    const matchMethod = realm.createBuiltin("[Symbol.match]", 1, (receiver, args, context, loc) =>
        match(receiver, args, context, loc),
    );
    const searchMethod = realm.createBuiltin("[Symbol.search]", 1, (receiver, args, context, loc) =>
        search(receiver, args, context, loc),
    );
    realm.regexpPrototype.bootstrapDefine(wellKnownMatch, {
        value: { kind: "object", object: matchMethod },
        writable: true,
        enumerable: false,
        configurable: true,
    });
    realm.regexpPrototype.bootstrapDefine(wellKnownSearch, {
        value: { kind: "object", object: searchMethod },
        writable: true,
        enumerable: false,
        configurable: true,
    });
    for (const name of ["match", "search"]) {
        const symbol = name === "match" ? wellKnownMatch : wellKnownSearch;
        realm.registerBuiltin(realm.stringPrototype, name, 1, (receiver, args, context, loc) => {
            if (receiver.kind === "null" || receiver.kind === "undefined") {
                return languageFailure(
                    context.realm,
                    "TypeError",
                    "String match/search receiver is nullish",
                    loc,
                );
            }
            const pattern = args.length === 0 ? UNDEFINED : args[0];
            if (pattern.kind === "object") {
                const method = pattern.object.internalGet(symbol, pattern, context, loc);
                if (method.type === "throw") {
                    return method;
                }
                if (method.value.kind !== "undefined" && method.value.kind !== "null") {
                    if (method.value.kind !== "object" || method.value.object.callable === null) {
                        return languageFailure(
                            context.realm,
                            "TypeError",
                            "String match/search method is not callable",
                            loc,
                        );
                    }
                    return context.call(method.value, pattern, [receiver], loc);
                }
            }
            const input = regExpString(receiver, context, loc);
            if (input.type === "throw") {
                return input;
            }
            const regexp = regExpCreate(pattern, UNDEFINED, context, loc);
            if (regexp.type === "throw") {
                return regexp;
            }
            if (regexp.value.kind !== "object") {
                throw new Error("RegExpCreate result invariant");
            }
            const method = regexp.value.object.internalGet(symbol, regexp.value, context, loc);
            return method.type === "throw"
                ? method
                : context.call(
                      method.value,
                      regexp.value,
                      [{ kind: "string", value: input.value }],
                      loc,
                  );
        });
    }
}
