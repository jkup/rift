import type { Realm } from "../../realm.js";
import type { GuestRegExp } from "../../regexp/regexp-object.js";
import { GuestObject, languageFailure, normal, UNDEFINED, type Value } from "../../runtime.js";
import { regExpString } from "./regexp.js";

// Legacy RegExp proposal: https://github.com/tc39/proposal-regexp-legacy-features
// null represents an invalidated internal slot; the empty string is a valid value.
function registerAccessor(realm: Realm, constructor: GuestObject, name: string, key: string): void {
    const getter = realm.createBuiltin("get " + name, 0, (receiver, _args, context, loc) => {
        if (receiver.kind !== "object" || receiver.object !== constructor) {
            return languageFailure(
                context.realm,
                "TypeError",
                "invalid RegExp static receiver",
                loc,
            );
        }
        const value = realm.regexpLegacy.get(key);
        if (value === null) {
            return languageFailure(context.realm, "TypeError", "RegExp static is unavailable", loc);
        }
        return normal({ kind: "string", value: value ?? "" });
    });
    let setter: Value = UNDEFINED;
    if (key === "input") {
        const builtin = realm.createBuiltin("set " + name, 1, (receiver, args, context, loc) => {
            if (receiver.kind !== "object" || receiver.object !== constructor) {
                return languageFailure(
                    context.realm,
                    "TypeError",
                    "invalid RegExp static receiver",
                    loc,
                );
            }
            const text = regExpString(args.length === 0 ? UNDEFINED : args[0], context, loc);
            if (text.type === "throw") {
                return text;
            }
            realm.regexpLegacy.set(key, text.value);
            return normal();
        });
        setter = { kind: "object", object: builtin };
    }
    constructor.bootstrapDefine(name, {
        get: { kind: "object", object: getter },
        set: setter,
        enumerable: false,
        configurable: true,
    });
}

export function registerRegExpStatics(realm: Realm, constructor: GuestObject): void {
    const properties = [
        ["input", "$_"],
        ["lastMatch", "$&"],
        ["lastParen", "$+"],
        ["leftContext", "$`"],
        ["rightContext", "$'"],
    ];
    for (let i = 1; i <= 9; i++) {
        properties.push(["$" + i]);
    }
    for (const names of properties) {
        const key = names[0];
        realm.regexpLegacy.set(key, "");
        for (const name of names) {
            registerAccessor(realm, constructor, name, key);
        }
    }
}

export function updateRegExpStatics(
    regexp: GuestRegExp,
    input: string,
    start: number,
    end: number,
    captures: Value[],
    realm: Realm,
): void {
    if (regexp.realm !== realm) {
        return;
    }
    const slots = realm.regexpLegacy;
    if (!regexp.legacyFeaturesEnabled) {
        for (const key of slots.keys()) {
            slots.set(key, null);
        }
        return;
    }
    slots.set("input", input);
    slots.set("lastMatch", input.slice(start, end));
    slots.set("leftContext", input.slice(0, start));
    slots.set("rightContext", input.slice(end));
    const last = captures[captures.length - 1];
    slots.set("lastParen", captures.length > 1 && last.kind === "string" ? last.value : "");
    for (let i = 1; i <= 9; i++) {
        const value = i < captures.length ? captures[i] : UNDEFINED;
        slots.set("$" + i, value.kind === "string" ? value.value : "");
    }
}
