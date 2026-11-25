import type { Realm } from "../../realm.js";
import {
    GuestObject,
    normal,
    languageFailure,
    UNDEFINED,
    type Value,
    type ValueCompletion,
    type OperationContext,
} from "../../runtime.js";
import { GuestRegExp } from "../../regexp/regexp-object.js";
import { matchRegExp } from "../../regexp/regexp-matcher.js";
import { toPrimitive } from "../../primitive-conversion.js";
import { toLength } from "../../conversion.js";
import { arrayFromList } from "../../array-create.js";
import { regExpString } from "./regexp.js";
import { registerRegExpCompile } from "./regexp-compile.js";
import type { Location } from "../../syntax.js";

export function regExpBuiltinExec(
    regexp: GuestRegExp,
    input: string,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const receiver: Value = { kind: "object", object: regexp };
    const lastIndex = regexp.internalGet("lastIndex", receiver, context, loc);
    if (lastIndex.type === "throw") {
        return lastIndex;
    }
    const primitive = toPrimitive(lastIndex.value, "number", context, loc);
    if (primitive.type === "throw") {
        return primitive;
    }
    const length = toLength(primitive.value, loc, context.realm);
    if (length.type === "throw") {
        return length;
    }
    const global = regexp.originalFlags.includes("g"),
        sticky = regexp.originalFlags.includes("y");
    const result = matchRegExp(
        regexp.program,
        input,
        global || sticky ? length.value : 0,
        sticky,
        context,
        loc,
    );
    if (result.kind === "abrupt") {
        return result.completion;
    }
    if (global || sticky) {
        const written = regexp.set(
            "lastIndex",
            { kind: "number", value: result.kind === "match" ? result.end : 0 },
            context,
            loc,
        );
        if (written.type === "throw") {
            return written;
        }
    }
    if (result.kind === "no-match") {
        return normal({ kind: "null" });
    }
    const captures: Value[] = [],
        indices: Value[] = [];
    const hasIndices = regexp.originalFlags.includes("d");
    for (let i = 0; i < result.captures.length; i += 2) {
        const tick = context.tick(loc);
        if (tick.type === "throw") {
            return tick;
        }
        const from = result.captures[i],
            to = result.captures[i + 1];
        captures.push(from === -1 ? UNDEFINED : { kind: "string", value: input.slice(from, to) });
        if (hasIndices) {
            if (from === -1) {
                indices.push(UNDEFINED);
            } else {
                const pair = arrayFromList(
                    [
                        { kind: "number", value: from },
                        { kind: "number", value: to },
                    ],
                    context,
                    loc,
                );
                if (pair.type === "throw") {
                    return pair;
                }
                indices.push(pair.value);
            }
        }
    }
    const groups = regexp.program.names.length === 0 ? null : new GuestObject(null);
    const indexGroups = groups !== null && hasIndices ? new GuestObject(null) : null;
    const matchedNames = groups === null ? null : new Set<string>();
    for (const capture of regexp.program.names) {
        const tick = context.tick(loc);
        if (tick.type === "throw") {
            return tick;
        }
        if (groups === null || matchedNames === null) {
            throw new Error("named capture groups invariant");
        }
        const participating = captures[capture.index].kind !== "undefined";
        if (matchedNames.has(capture.name)) {
            if (participating) {
                throw new Error("multiple participating named captures");
            }
            continue;
        }
        if (participating) {
            matchedNames.add(capture.name);
        }
        groups.bootstrapDefine(capture.name, {
            value: captures[capture.index],
            writable: true,
            enumerable: true,
            configurable: true,
        });
        if (indexGroups !== null) {
            indexGroups.bootstrapDefine(capture.name, {
                value: indices[capture.index],
                writable: true,
                enumerable: true,
                configurable: true,
            });
        }
    }
    const array = arrayFromList(captures, context, loc);
    if (array.type === "throw") {
        return array;
    }
    if (array.value.kind !== "object") {
        throw new Error("match array invariant");
    }
    array.value.object.bootstrapDefine("index", {
        value: { kind: "number", value: result.start },
        writable: true,
        enumerable: true,
        configurable: true,
    });
    array.value.object.bootstrapDefine("input", {
        value: { kind: "string", value: input },
        writable: true,
        enumerable: true,
        configurable: true,
    });
    array.value.object.bootstrapDefine("groups", {
        value: groups === null ? UNDEFINED : { kind: "object", object: groups },
        writable: true,
        enumerable: true,
        configurable: true,
    });
    if (hasIndices) {
        const list = arrayFromList(indices, context, loc);
        if (list.type === "throw") {
            return list;
        }
        if (list.value.kind !== "object") {
            throw new Error("indices array invariant");
        }
        list.value.object.bootstrapDefine("groups", {
            value: indexGroups === null ? UNDEFINED : { kind: "object", object: indexGroups },
            writable: true,
            enumerable: true,
            configurable: true,
        });
        array.value.object.bootstrapDefine("indices", {
            value: list.value,
            writable: true,
            enumerable: true,
            configurable: true,
        });
    }
    return array;
}

export function regExpExec(
    object: GuestObject,
    input: string,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const receiver: Value = { kind: "object", object };
    const exec = object.internalGet("exec", receiver, context, loc);
    if (exec.type === "throw") {
        return exec;
    }
    if (exec.value.kind === "object" && exec.value.object.callable !== null) {
        const result = context.call(exec.value, receiver, [{ kind: "string", value: input }], loc);
        if (result.type === "throw") {
            return result;
        }
        if (result.value.kind !== "null" && result.value.kind !== "object") {
            return languageFailure(
                context.realm,
                "TypeError",
                "RegExp exec must return an object or null",
                loc,
            );
        }
        return result;
    }
    if (!(object instanceof GuestRegExp)) {
        return languageFailure(
            context.realm,
            "TypeError",
            "RegExp exec receiver lacks matcher slots",
            loc,
        );
    }
    return regExpBuiltinExec(object, input, context, loc);
}

export function registerRegExpExecution(realm: Realm): void {
    registerRegExpCompile(realm);
    realm.registerBuiltin(realm.regexpPrototype, "exec", 1, (receiver, args, context, loc) => {
        if (receiver.kind !== "object" || !(receiver.object instanceof GuestRegExp)) {
            return languageFailure(
                context.realm,
                "TypeError",
                "RegExp exec receiver lacks matcher slots",
                loc,
            );
        }
        const input = regExpString(args.length === 0 ? UNDEFINED : args[0], context, loc);
        return input.type === "throw"
            ? input
            : regExpBuiltinExec(receiver.object, input.value, context, loc);
    });
    realm.registerBuiltin(realm.regexpPrototype, "test", 1, (receiver, args, context, loc) => {
        if (receiver.kind !== "object") {
            return languageFailure(
                context.realm,
                "TypeError",
                "RegExp test receiver is not an object",
                loc,
            );
        }
        const input = regExpString(args.length === 0 ? UNDEFINED : args[0], context, loc);
        if (input.type === "throw") {
            return input;
        }
        const match = regExpExec(receiver.object, input.value, context, loc);
        return match.type === "throw"
            ? match
            : normal({ kind: "boolean", value: match.value.kind !== "null" });
    });
}
