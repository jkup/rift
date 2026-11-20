import type { Realm } from "../../realm.js";
import type { Location } from "../../syntax.js";
import {
    languageFailure,
    normal,
    UNDEFINED,
    type GuestObject,
    type OperationContext,
    type Value,
    type ValueCompletion,
} from "../../runtime.js";
import { isStringWhitespace } from "../../strings.js";

function hexEscape(code: number): string {
    return code <= 0xff
        ? "\\x" + code.toString(16).padStart(2, "0")
        : "\\u" + code.toString(16).padStart(4, "0");
}

function escapeUnit(char: string, code: number): string {
    if ("^$\\.*+?()[]{}|/".includes(char)) {
        return "\\" + char;
    }
    switch (code) {
        case 9:
            return "\\t";
        case 10:
            return "\\n";
        case 11:
            return "\\v";
        case 12:
            return "\\f";
        case 13:
            return "\\r";
    }
    if (
        ",-=<>#&!%:;@~'\"`".includes(char) ||
        isStringWhitespace(code) ||
        (code >= 0xd800 && code <= 0xdfff)
    ) {
        return hexEscape(code);
    }
    return char;
}

// ECMA-262 RegExp.escape / EncodeForRegExpEscape. Paired surrogates are
// preserved as a code point; only lone surrogates are escaped.
function escape(value: Value, context: OperationContext, loc: Location): ValueCompletion {
    if (value.kind !== "string") {
        return languageFailure(context.realm, "TypeError", "RegExp.escape requires a string", loc);
    }
    const parts: string[] = [];
    const text = value.value;
    for (let i = 0; i < text.length; i++) {
        const tick = context.tick(loc);
        if (tick.type === "throw") {
            return tick;
        }
        const code = text.charCodeAt(i);
        const char = text.charAt(i);
        if (
            i === 0 &&
            ((code >= 48 && code <= 57) ||
                (code >= 65 && code <= 90) ||
                (code >= 97 && code <= 122))
        ) {
            parts.push(hexEscape(code));
        } else if (
            code >= 0xd800 &&
            code <= 0xdbff &&
            i + 1 < text.length &&
            text.charCodeAt(i + 1) >= 0xdc00 &&
            text.charCodeAt(i + 1) <= 0xdfff
        ) {
            parts.push(char + text.charAt(++i));
        } else {
            parts.push(escapeUnit(char, code));
        }
    }
    return normal({ kind: "string", value: parts.join("") });
}

export function registerRegExpEscape(realm: Realm, constructor: GuestObject): void {
    realm.registerBuiltin(constructor, "escape", 1, (_receiver, args, context, loc) =>
        escape(args.length > 0 ? args[0] : UNDEFINED, context, loc),
    );
}
