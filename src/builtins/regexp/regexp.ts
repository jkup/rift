import { registerRegExpEscape } from "./regexp-escape.js";
import { registerRegExpMatchAll } from "./regexp-match-all.js";
import type { Realm } from "../../realm.js";
import { registerRegExpExecution } from "./regexp-execution.js";
import { registerRegExpMatchSearch } from "./regexp-match-search.js";
import { registerRegExpReplace } from "./regexp-replace.js";
import { registerRegExpSplit } from "./regexp-split.js";
import { registerRegExpStatics } from "./regexp-statics.js";
import {
    GuestObject,
    normal,
    languageFailure,
    unsupportedFailure,
    truthy,
    UNDEFINED,
    type Value,
    type ValueCompletion,
    type OperationContext,
} from "../../runtime.js";
import { GuestRegExp, isRegExp } from "../../regexp/regexp-object.js";
import { getPrototypeFromConstructor } from "../../constructor-prototype.js";
import { parseRegExpPattern } from "../../regexp/regexp-pattern.js";
import { compileRegExpPattern } from "../../regexp/regexp-matcher.js";
import { toPrimitive } from "../../primitive-conversion.js";
import { toString, type StringCompletion } from "../../conversion.js";
import { wellKnownSpecies } from "../../symbols.js";
import type { Location } from "../../syntax.js";

export function regExpString(
    value: Value,
    context: OperationContext,
    loc: Location,
): StringCompletion {
    const primitive = toPrimitive(value, "string", context, loc);
    return primitive.type === "throw" ? primitive : toString(primitive.value, loc, context.realm);
}

function constructRegExp(
    target: GuestObject,
    args: Value[],
    called: boolean,
    context: OperationContext,
    loc: Location,
    legacyFeaturesEnabled: boolean,
): ValueCompletion {
    const pattern = args.length === 0 ? UNDEFINED : args[0];
    let flags = args.length < 2 ? UNDEFINED : args[1];
    const regexp = isRegExp(pattern, context, loc);
    if (regexp.type === "throw") {
        return regexp;
    }
    if (called && regexp.value && flags.kind === "undefined" && pattern.kind === "object") {
        const constructor = pattern.object.internalGet("constructor", pattern, context, loc);
        if (constructor.type === "throw") {
            return constructor;
        }
        if (constructor.value.kind === "object" && constructor.value.object === target) {
            return normal(pattern);
        }
    }
    let source = pattern;
    if (pattern.kind === "object" && pattern.object instanceof GuestRegExp) {
        source = { kind: "string", value: pattern.object.originalSource };
        if (flags.kind === "undefined") {
            flags = { kind: "string", value: pattern.object.originalFlags };
        }
    } else if (regexp.value && pattern.kind === "object") {
        const property = pattern.object.internalGet("source", pattern, context, loc);
        if (property.type === "throw") {
            return property;
        }
        source = property.value;
        if (flags.kind === "undefined") {
            const propertyFlags = pattern.object.internalGet("flags", pattern, context, loc);
            if (propertyFlags.type === "throw") {
                return propertyFlags;
            }
            flags = propertyFlags.value;
        }
    }
    const prototype = getPrototypeFromConstructor(target, "RegExp", context, loc);
    if (prototype.type === "throw") {
        return prototype;
    }
    return initializeRegExp(prototype.value, source, flags, context, loc, legacyFeaturesEnabled);
}

export function regExpCreate(
    source: Value,
    flags: Value,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    return initializeRegExp(context.realm.regexpPrototype, source, flags, context, loc);
}

function initializeRegExp(
    prototype: GuestObject,
    source: Value,
    flags: Value,
    context: OperationContext,
    loc: Location,
    legacyFeaturesEnabled = true,
): ValueCompletion {
    const allocation = context.tick(loc);
    if (allocation.type === "throw") {
        return allocation;
    }
    const text: StringCompletion =
        source.kind === "undefined"
            ? { type: "normal", value: "" }
            : regExpString(source, context, loc);
    if (text.type === "throw") {
        return text;
    }
    const options: StringCompletion =
        flags.kind === "undefined"
            ? { type: "normal", value: "" }
            : regExpString(flags, context, loc);
    if (options.type === "throw") {
        return options;
    }
    let seen = "";
    for (let i = 0; i < options.value.length; i++) {
        const tick = context.tick(loc);
        if (tick.type === "throw") {
            return tick;
        }
        const flag = options.value.charAt(i);
        if (!"dgimsuvy".includes(flag) || seen.includes(flag)) {
            return languageFailure(context.realm, "SyntaxError", "invalid RegExp flags", loc);
        }
        seen += flag;
    }
    if (seen.includes("u") && seen.includes("v")) {
        return languageFailure(
            context.realm,
            "SyntaxError",
            "RegExp u and v flags are mutually exclusive",
            loc,
        );
    }
    if (seen.includes("v")) {
        return unsupportedFailure(
            "runtime.regexp-pattern",
            "SyntaxError",
            "Unicode sets mode is unsupported",
            loc,
        );
    }
    const unicode = seen.includes("u");
    const parsed = parseRegExpPattern(text.value, context, loc, unicode);
    if (parsed.kind === "abrupt") {
        return parsed.completion;
    }
    if (parsed.kind !== "ready") {
        return parsed.kind === "syntax-error"
            ? languageFailure(context.realm, "SyntaxError", parsed.message, loc)
            : unsupportedFailure("runtime.regexp-pattern", "SyntaxError", parsed.message, loc);
    }
    const compiled = compileRegExpPattern(
        parsed.pattern,
        {
            ignoreCase: seen.includes("i"),
            multiline: seen.includes("m"),
            dotAll: seen.includes("s"),
        },
        context,
        loc,
        unicode,
    );
    if (compiled.kind === "abrupt") {
        return compiled.completion;
    }
    return normal({
        kind: "object",
        object: new GuestRegExp(
            context.realm,
            prototype,
            text.value,
            options.value,
            compiled.program,
            legacyFeaturesEnabled,
        ),
    });
}

function escapedSource(source: string, context: OperationContext, loc: Location): StringCompletion {
    if (source === "") {
        return { type: "normal", value: "(?:)" };
    }
    let result = "",
        inClass = false;
    for (let i = 0; i < source.length; i++) {
        const tick = context.tick(loc);
        if (tick.type === "throw") {
            return tick;
        }
        let char = source.charAt(i);
        if (char === "\\") {
            const next = source.charAt(++i);
            if (next !== "\n" && next !== "\r" && next !== "\u2028" && next !== "\u2029") {
                result += "\\" + next;
                continue;
            }
            char = next;
        } else if (char === "[") {
            inClass = true;
        } else if (char === "]") {
            inClass = false;
        }
        if (char === "\n") {
            result += "\\n";
        } else if (char === "\r") {
            result += "\\r";
        } else if (char === "\u2028") {
            result += "\\u2028";
        } else if (char === "\u2029") {
            result += "\\u2029";
        } else if (char === "/" && !inClass) {
            result += "\\/";
        } else {
            result += char;
        }
    }
    return { type: "normal", value: result };
}

function registerRegExpToString(realm: Realm): void {
    realm.registerBuiltin(realm.regexpPrototype, "toString", 0, (receiver, _args, context, loc) => {
        if (receiver.kind !== "object") {
            return languageFailure(
                context.realm,
                "TypeError",
                "RegExp toString receiver is not an object",
                loc,
            );
        }
        const source = receiver.object.internalGet("source", receiver, context, loc);
        if (source.type === "throw") {
            return source;
        }
        const text = regExpString(source.value, context, loc);
        if (text.type === "throw") {
            return text;
        }
        const flags = receiver.object.internalGet("flags", receiver, context, loc);
        if (flags.type === "throw") {
            return flags;
        }
        const options = regExpString(flags.value, context, loc);
        return options.type === "throw"
            ? options
            : normal({ kind: "string", value: "/" + text.value + "/" + options.value });
    });
}

function createRegExpConstructor(realm: Realm): GuestObject {
    const constructor = realm.createBuiltinConstructor(
        "RegExp",
        2,
        (_receiver, args, context, loc) =>
            constructRegExp(constructor, args, true, context, loc, true),
        (_callee, newTarget, args, context, loc) =>
            constructRegExp(newTarget, args, false, context, loc, newTarget === constructor),
    );
    constructor.bootstrapDefine("prototype", {
        value: { kind: "object", object: realm.regexpPrototype },
        writable: false,
        enumerable: false,
        configurable: false,
    });
    registerRegExpStatics(realm, constructor);
    return constructor;
}

export function registerRegExp(realm: Realm): void {
    const proto = realm.regexpPrototype;
    const constructor = createRegExpConstructor(realm);
    proto.bootstrapDefine("constructor", {
        value: { kind: "object", object: constructor },
        writable: true,
        enumerable: false,
        configurable: true,
    });
    const species = realm.createBuiltin(
        "get [Symbol.species]",
        0,
        (receiver, _args, _context, _loc) => normal(receiver),
    );
    constructor.bootstrapDefine(wellKnownSpecies, {
        get: { kind: "object", object: species },
        enumerable: false,
        configurable: true,
    });
    const names = [
        "hasIndices",
        "global",
        "ignoreCase",
        "multiline",
        "dotAll",
        "unicode",
        "unicodeSets",
        "sticky",
    ];
    for (let i = 0; i < names.length; i++) {
        const name = names[i],
            flag = "dgimsuvy".charAt(i);
        const getter = realm.createBuiltin("get " + name, 0, (receiver, _args, context, loc) => {
            if (receiver.kind !== "object") {
                return languageFailure(
                    context.realm,
                    "TypeError",
                    "RegExp flag receiver is not an object",
                    loc,
                );
            }
            if (receiver.object instanceof GuestRegExp) {
                return normal({
                    kind: "boolean",
                    value: receiver.object.originalFlags.includes(flag),
                });
            }
            if (receiver.object === proto) {
                return normal();
            }
            return languageFailure(
                context.realm,
                "TypeError",
                "RegExp flag receiver lacks matcher slots",
                loc,
            );
        });
        proto.bootstrapDefine(name, {
            get: { kind: "object", object: getter },
            enumerable: false,
            configurable: true,
        });
    }
    const source = realm.createBuiltin("get source", 0, (receiver, _args, context, loc) => {
        if (receiver.kind !== "object") {
            return languageFailure(
                context.realm,
                "TypeError",
                "RegExp source receiver is not an object",
                loc,
            );
        }
        if (receiver.object === proto) {
            return normal({ kind: "string", value: "(?:)" });
        }
        if (!(receiver.object instanceof GuestRegExp)) {
            return languageFailure(
                context.realm,
                "TypeError",
                "RegExp source receiver lacks matcher slots",
                loc,
            );
        }
        const escaped = escapedSource(receiver.object.originalSource, context, loc);
        return escaped.type === "throw"
            ? escaped
            : normal({ kind: "string", value: escaped.value });
    });
    proto.bootstrapDefine("source", {
        get: { kind: "object", object: source },
        enumerable: false,
        configurable: true,
    });
    const flags = realm.createBuiltin("get flags", 0, (receiver, _args, context, loc) => {
        if (receiver.kind !== "object") {
            return languageFailure(
                context.realm,
                "TypeError",
                "RegExp flags receiver is not an object",
                loc,
            );
        }
        let result = "";
        for (let i = 0; i < names.length; i++) {
            const value = receiver.object.internalGet(names[i], receiver, context, loc);
            if (value.type === "throw") {
                return value;
            }
            if (truthy(value.value)) {
                result += "dgimsuvy".charAt(i);
            }
        }
        return normal({ kind: "string", value: result });
    });
    proto.bootstrapDefine("flags", {
        get: { kind: "object", object: flags },
        enumerable: false,
        configurable: true,
    });
    registerRegExpToString(realm);
    registerRegExpEscape(realm, constructor);
    registerRegExpExecution(realm);
    registerRegExpMatchSearch(realm);
    registerRegExpReplace(realm);
    registerRegExpSplit(realm, constructor);
    registerRegExpMatchAll(realm, constructor);
    realm.defineScriptGlobal("RegExp", {
        value: { kind: "object", object: constructor },
        writable: true,
        enumerable: false,
        configurable: true,
    });
}
