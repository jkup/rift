import { requireGlobalRegExp } from "../regexp-global-check.js";
import type { Realm } from "../realm.js";
import { GuestObject, normal, languageFailure, UNDEFINED, type Value, type ValueCompletion, type OperationContext, type ThrowCompletion } from "../runtime.js";
import { toObject } from "../object-conversion.js";
import { toPrimitive } from "../primitive-conversion.js";
import { numberToString, toIntegerOrInfinity, toLength, type StringCompletion } from "../conversion.js";
import { lengthOfArrayLike } from "../array-like.js";
import { wellKnownReplace } from "../symbols.js";
import { getSubstitution, ReplacementText } from "../string-substitution.js";
import { regExpString } from "./regexp.js";
import { regExpExec } from "./regexp-execution.js";
import { advanceStringIndex } from "./regexp-match-search.js";
import type { Location } from "../syntax.js";

type Replacement = { kind: "function"; callable: Value } | { kind: "template"; text: string };
function prepareReplacement(value: Value, context: OperationContext, loc: Location): { type: "normal"; value: Replacement } | ThrowCompletion {
    if (value.kind === "object" && value.object.callable !== null) return { type: "normal", value: { kind: "function", callable: value } };
    const text = regExpString(value, context, loc);
    return text.type === "throw" ? text : { type: "normal", value: { kind: "template", text: text.value } };
}

function replacementForMatch(replacement: Replacement, matched: string, input: string, position: number, captures: Value[], named: Value,
    context: OperationContext, loc: Location): StringCompletion {
    if (replacement.kind === "function") {
        const args: Value[] = [{ kind: "string", value: matched }];
        for (const capture of captures) {
            const tick = context.tick(loc);
            if (tick.type === "throw") return tick;
            args.push(capture);
        }
        args.push({ kind: "number", value: position }, { kind: "string", value: input });
        if (named.kind !== "undefined") args.push(named);
        const called = context.call(replacement.callable, UNDEFINED, args, loc);
        return called.type === "throw" ? called : regExpString(called.value, context, loc);
    }
    let groups: GuestObject | null = null;
    if (named.kind !== "undefined") {
        const boxed = toObject(named, context, loc);
        if (boxed.type === "throw") return boxed;
        groups = boxed.value;
    }
    return getSubstitution(matched, input, position, captures, groups, replacement.text, context, loc);
}

function replaceRegExp(receiver: Value, args: Value[], context: OperationContext, loc: Location): ValueCompletion {
    if (receiver.kind !== "object") return languageFailure(context.realm, "TypeError", "RegExp replace receiver is not an object", loc);
    const input = regExpString(args.length === 0 ? UNDEFINED : args[0], context, loc);
    if (input.type === "throw") return input;
    const replacement = prepareReplacement(args.length < 2 ? UNDEFINED : args[1], context, loc);
    if (replacement.type === "throw") return replacement;
    const property = receiver.object.internalGet("flags", receiver, context, loc);
    if (property.type === "throw") return property;
    const flags = regExpString(property.value, context, loc);
    if (flags.type === "throw") return flags;
    const global = flags.value.includes("g");
    if (global) {
        const reset = receiver.object.set("lastIndex", { kind: "number", value: 0 }, context, loc);
        if (reset.type === "throw") return reset;
    }
    const results: GuestObject[] = [];
    while (true) {
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const result = regExpExec(receiver.object, input.value, context, loc);
        if (result.type === "throw") return result;
        if (result.value.kind === "null") break;
        if (result.value.kind !== "object") throw new Error("RegExpExec result invariant");
        results.push(result.value.object);
        if (!global) break;
        const first = result.value.object.internalGet("0", result.value, context, loc);
        if (first.type === "throw") return first;
        const matched = regExpString(first.value, context, loc);
        if (matched.type === "throw") return matched;
        if (matched.value === "") {
            const property = receiver.object.internalGet("lastIndex", receiver, context, loc);
            if (property.type === "throw") return property;
            const primitive = toPrimitive(property.value, "number", context, loc);
            if (primitive.type === "throw") return primitive;
            const index = toLength(primitive.value, loc, context.realm);
            if (index.type === "throw") return index;
            const next = advanceStringIndex(input.value, index.value, flags.value.includes("u") || flags.value.includes("v"));
            const written = receiver.object.set("lastIndex", { kind: "number", value: next }, context, loc);
            if (written.type === "throw") return written;
        }
    }
    if (results.length === 0) return normal({ kind: "string", value: input.value });
    const output = new ReplacementText(context, loc);
    let nextPosition = 0;
    for (const object of results) {
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const result: Value = { kind: "object", object };
        const length = lengthOfArrayLike(object, context, loc);
        if (length.type === "throw") return length;
        const first = object.internalGet("0", result, context, loc);
        if (first.type === "throw") return first;
        const matched = regExpString(first.value, context, loc);
        if (matched.type === "throw") return matched;
        const indexValue = object.internalGet("index", result, context, loc);
        if (indexValue.type === "throw") return indexValue;
        const primitive = toPrimitive(indexValue.value, "number", context, loc);
        if (primitive.type === "throw") return primitive;
        const index = toIntegerOrInfinity(primitive.value, loc, context.realm);
        if (index.type === "throw") return index;
        const position = Math.min(Math.max(index.value, 0), input.value.length);
        const captures: Value[] = [];
        for (let i = 1; i < length.value; i++) {
            const tick = context.tick(loc);
            if (tick.type === "throw") return tick;
            const capture = object.internalGet(numberToString(i), result, context, loc);
            if (capture.type === "throw") return capture;
            if (capture.value.kind === "undefined") captures.push(UNDEFINED);
            else {
                const text = regExpString(capture.value, context, loc);
                if (text.type === "throw") return text;
                captures.push({ kind: "string", value: text.value });
            }
        }
        const named = object.internalGet("groups", result, context, loc);
        if (named.type === "throw") return named;
        const text = replacementForMatch(replacement.value, matched.value, input.value, position, captures, named.value, context, loc);
        if (text.type === "throw") return text;
        // Overlapping custom results still run their conversion and replacement effects.
        if (position >= nextPosition) {
            const prefix = output.append(input.value.slice(nextPosition, position));
            if (prefix !== null) return prefix;
            const replaced = output.append(text.value);
            if (replaced !== null) return replaced;
            nextPosition = position + matched.value.length;
        }
    }
    const suffix = output.append(input.value.slice(Math.min(nextPosition, input.value.length)));
    return suffix !== null ? suffix : normal({ kind: "string", value: output.finish() });
}

function replaceAllMatches(input: string, needle: string, replacement: Replacement, context: OperationContext, loc: Location): ValueCompletion {
    const positions: number[] = [], advance = Math.max(1, needle.length);
    let start = 0;
    while (start <= input.length) {
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const position = input.indexOf(needle, start);
        if (position < 0) break;
        positions.push(position);
        start = position + advance;
    }
    if (positions.length === 0) return normal({ kind: "string", value: input });
    const output = new ReplacementText(context, loc);
    let end = 0;
    for (const position of positions) {
        const text = replacementForMatch(replacement, needle, input, position, [], UNDEFINED, context, loc);
        if (text.type === "throw") return text;
        const prefix = output.append(input.slice(end, position));
        if (prefix !== null) return prefix;
        const replaced = output.append(text.value);
        if (replaced !== null) return replaced;
        end = position + needle.length;
    }
    const suffix = output.append(input.slice(end));
    return suffix !== null ? suffix : normal({ kind: "string", value: output.finish() });
}

function replaceString(receiver: Value, args: Value[], all: boolean, context: OperationContext, loc: Location): ValueCompletion {
    if (receiver.kind === "null" || receiver.kind === "undefined") return languageFailure(context.realm, "TypeError", "String replace receiver is nullish", loc);
    const search = args.length === 0 ? UNDEFINED : args[0], replacementValue = args.length < 2 ? UNDEFINED : args[1];
    if (search.kind !== "null" && search.kind !== "undefined") {
        if (all) {
            const checked = requireGlobalRegExp(search, "replaceAll", context, loc);
            if (checked.type === "throw") return checked;
        }
        const boxed = toObject(search, context, loc);
        if (boxed.type === "throw") return boxed;
        const method = boxed.value.internalGet(wellKnownReplace, search, context, loc);
        if (method.type === "throw") return method;
        if (method.value.kind !== "undefined" && method.value.kind !== "null") {
            if (method.value.kind !== "object" || method.value.object.callable === null) return languageFailure(context.realm, "TypeError", "String replace method is not callable", loc);
            return context.call(method.value, search, [receiver, replacementValue], loc);
        }
    }
    const input = regExpString(receiver, context, loc);
    if (input.type === "throw") return input;
    const needle = regExpString(search, context, loc);
    if (needle.type === "throw") return needle;
    const replacement = prepareReplacement(replacementValue, context, loc);
    if (replacement.type === "throw") return replacement;
    if (all) return replaceAllMatches(input.value, needle.value, replacement.value, context, loc);
    const position = input.value.indexOf(needle.value);
    if (position < 0) return normal({ kind: "string", value: input.value });
    const text = replacementForMatch(replacement.value, needle.value, input.value, position, [], UNDEFINED, context, loc);
    if (text.type === "throw") return text;
    const output = new ReplacementText(context, loc);
    for (const part of [input.value.slice(0, position), text.value, input.value.slice(position + needle.value.length)]) {
        const appended = output.append(part);
        if (appended !== null) return appended;
    }
    return normal({ kind: "string", value: output.finish() });
}

export function registerRegExpReplace(realm: Realm): void {
    const method = realm.createBuiltin("[Symbol.replace]", 2, (receiver, args, context, loc) => replaceRegExp(receiver, args, context, loc));
    realm.regexpPrototype.bootstrapDefine(wellKnownReplace, { value: { kind: "object", object: method }, writable: true, enumerable: false, configurable: true });
    realm.registerBuiltin(realm.stringPrototype, "replace", 2, (receiver, args, context, loc) => replaceString(receiver, args, false, context, loc));
    realm.registerBuiltin(realm.stringPrototype, "replaceAll", 2, (receiver, args, context, loc) => replaceString(receiver, args, true, context, loc));
}
