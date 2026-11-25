import type { Realm } from "../../realm.js";
import { GuestRegExp } from "../../regexp/regexp-object.js";
import { languageFailure, normal, UNDEFINED } from "../../runtime.js";
import { regExpCreate } from "./regexp.js";

export function registerRegExpCompile(realm: Realm): void {
    realm.registerBuiltin(realm.regexpPrototype, "compile", 2, (receiver, args, context, loc) => {
        if (receiver.kind !== "object" || !(receiver.object instanceof GuestRegExp)) {
            return languageFailure(
                context.realm,
                "TypeError",
                "RegExp compile receiver lacks matcher slots",
                loc,
            );
        }
        let pattern = args.length === 0 ? UNDEFINED : args[0];
        let flags = args.length < 2 ? UNDEFINED : args[1];
        if (pattern.kind === "object" && pattern.object instanceof GuestRegExp) {
            if (flags.kind !== "undefined") {
                return languageFailure(
                    context.realm,
                    "TypeError",
                    "RegExp compile cannot override a RegExp pattern's flags",
                    loc,
                );
            }
            flags = { kind: "string", value: pattern.object.originalFlags };
            pattern = { kind: "string", value: pattern.object.originalSource };
        }
        // Prepare all matcher state before mutating the receiver. A failed coercion
        // or parse must leave its slots intact, including for self-compilation.
        const compiled = regExpCreate(pattern, flags, context, loc);
        if (compiled.type === "throw") {
            return compiled;
        }
        if (compiled.value.kind !== "object" || !(compiled.value.object instanceof GuestRegExp)) {
            throw new Error("RegExp initialization invariant");
        }
        const target = receiver.object;
        target.originalSource = compiled.value.object.originalSource;
        target.originalFlags = compiled.value.object.originalFlags;
        target.program = compiled.value.object.program;
        // RegExpInitialize changes the slots before Set(lastIndex), even when
        // the property is non-writable and the Set throws.
        const reset = target.set("lastIndex", { kind: "number", value: 0 }, context, loc);
        return reset.type === "throw" ? reset : normal(receiver);
    });
}
