import type { Realm } from "../realm.js";
import { normal, languageFailure, UNDEFINED, type GuestObject, type Value, type ValueCompletion, type OperationContext } from "../runtime.js";
import { GuestRegExpStringIterator } from "../regexp-string-iterator.js";
import { regExpSpecies } from "../regexp-species.js";
import { requireGlobalRegExp } from "../regexp-global-check.js";
import { toPrimitive } from "../primitive-conversion.js";
import { toObject } from "../object-conversion.js";
import { toLength } from "../conversion.js";
import { regExpString, regExpCreate } from "./regexp.js";
import { wellKnownMatchAll, wellKnownToStringTag } from "../symbols.js";
import type { Location } from "../syntax.js";

function matchAll(receiver: Value, args: Value[], constructor: GuestObject, context: OperationContext, loc: Location): ValueCompletion {
    if (receiver.kind !== "object") return languageFailure(context.realm, "TypeError", "RegExp matchAll receiver is not an object", loc);
    const text = regExpString(args.length === 0 ? UNDEFINED : args[0], context, loc);
    if (text.type === "throw") return text;
    const species = regExpSpecies(receiver.object, constructor, context, loc);
    if (species.type === "throw") return species;
    const property = receiver.object.internalGet("flags", receiver, context, loc);
    if (property.type === "throw") return property;
    const flags = regExpString(property.value, context, loc);
    if (flags.type === "throw") return flags;
    const construct = context.construct;
    if (construct === undefined) throw new Error("Script construction unavailable");
    const created = construct(species.value, [receiver, { kind: "string", value: flags.value }], species.value, loc);
    if (created.type === "throw") return created;
    if (created.value.kind !== "object") throw new Error("constructed matcher invariant");
    const lastIndex = receiver.object.internalGet("lastIndex", receiver, context, loc);
    if (lastIndex.type === "throw") return lastIndex;
    const primitive = toPrimitive(lastIndex.value, "number", context, loc);
    if (primitive.type === "throw") return primitive;
    const length = toLength(primitive.value, loc, context.realm);
    if (length.type === "throw") return length;
    const set = created.value.object.set("lastIndex", { kind: "number", value: length.value }, context, loc);
    if (set.type === "throw") return set;
    const tick = context.tick(loc);
    if (tick.type === "throw") return tick;
    return normal({ kind: "object", object: new GuestRegExpStringIterator(created.value.object, text.value,
        flags.value.includes("g"), flags.value.includes("u") || flags.value.includes("v"), context.realm) });
}

function stringMatchAll(receiver: Value, args: Value[], context: OperationContext, loc: Location): ValueCompletion {
    if (receiver.kind === "null" || receiver.kind === "undefined") return languageFailure(context.realm, "TypeError", "String matchAll receiver is nullish", loc);
    const pattern = args.length === 0 ? UNDEFINED : args[0];
    if (pattern.kind !== "null" && pattern.kind !== "undefined") {
        const checked = requireGlobalRegExp(pattern, "matchAll", context, loc);
        if (checked.type === "throw") return checked;
        const boxed = toObject(pattern, context, loc);
        if (boxed.type === "throw") return boxed;
        const method = boxed.value.internalGet(wellKnownMatchAll, pattern, context, loc);
        if (method.type === "throw") return method;
        if (method.value.kind !== "undefined" && method.value.kind !== "null") {
            if (method.value.kind !== "object" || method.value.object.callable === null) return languageFailure(context.realm, "TypeError", "matchAll method is not callable", loc);
            return context.call(method.value, pattern, [receiver], loc);
        }
    }
    const input = regExpString(receiver, context, loc);
    if (input.type === "throw") return input;
    const regexp = regExpCreate(pattern, { kind: "string", value: "g" }, context, loc);
    if (regexp.type === "throw") return regexp;
    if (regexp.value.kind !== "object") throw new Error("RegExpCreate result invariant");
    const method = regexp.value.object.internalGet(wellKnownMatchAll, regexp.value, context, loc);
    return method.type === "throw" ? method : context.call(method.value, regexp.value, [{ kind: "string", value: input.value }], loc);
}

export function registerRegExpMatchAll(realm: Realm, constructor: GuestObject): void {
    const factory = realm.createBuiltin("[Symbol.matchAll]", 1, (receiver, args, context, loc) => matchAll(receiver, args, constructor, context, loc));
    realm.regexpPrototype.bootstrapDefine(wellKnownMatchAll, { value: { kind: "object", object: factory }, writable: true, enumerable: false, configurable: true });
    realm.registerBuiltin(realm.stringPrototype, "matchAll", 1, (receiver, args, context, loc) => stringMatchAll(receiver, args, context, loc));
    realm.registerBuiltin(realm.regexpStringIteratorPrototype, "next", 0, (receiver, _args, context, loc) => {
        if (receiver.kind !== "object" || !(receiver.object instanceof GuestRegExpStringIterator)) return languageFailure(context.realm, "TypeError", "receiver is not a RegExp string iterator", loc);
        return receiver.object.next(context, loc);
    });
    realm.regexpStringIteratorPrototype.bootstrapDefine(wellKnownToStringTag, { value: { kind: "string", value: "RegExp String Iterator" }, writable: false, enumerable: false, configurable: true });
}
